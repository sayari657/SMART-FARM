"""Smart Farm AI - Anomaly, Alert, Recommendation, Report, Settings, Dashboard Routes"""
from typing import Optional, List, Literal as _PydLiteral
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel as _PydBaseModel, Field as _PydField
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.core.farm_guard import get_user_farm_ids, assert_farm_owner, get_scoped_farm_ids
from app.services.data_service import (
    AnomalyService, AlertService, RecommendationService,
    ReportService, SettingsService, DashboardService
)
from app.schemas.domain import (
    AlertCreate, AlertResolve,
    RecommendationCreate, ReportGenerateRequest,
    SettingCreate, DashboardStats
)

# ---- Anomaly ---------------------------------------------------------------
anomaly_router = APIRouter(prefix="/anomalies", tags=["Anomalies"])

def _serialize_anomaly(a):
    return {
        "id": a.id, "unit_id": a.unit_id,
        "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        "anomaly_type": a.anomaly_type, "description": a.description,
        "severity": a.severity, "isolation_score": a.isolation_score,
        "rules_triggered": a.rules_triggered,
        "feature_contributions": a.feature_contributions,
        "is_acknowledged": a.is_acknowledged,
    }

@anomaly_router.get("/recent")
def recent_anomalies(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_scoped_farm_ids),
):
    """Anomalies scoped to the selected farm (farm_id param) or all user farms."""
    return [_serialize_anomaly(a) for a in AnomalyService(db).get_recent_by_farms(farm_ids, limit=limit)]

@anomaly_router.get("/{unit_id}")
def anomalies_by_unit(
    unit_id: int,
    limit: int = Query(50),
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    return [_serialize_anomaly(a) for a in AnomalyService(db).get_by_unit(unit_id, limit=limit)]


# ---- Alerts ----------------------------------------------------------------
alert_router = APIRouter(prefix="/alerts", tags=["Alerts"])

def _serialize_alert(a):
    return {
        "id": a.id, "unit_id": a.unit_id,
        "timestamp": a.timestamp.isoformat() if a.timestamp else None,
        "alert_type": a.alert_type, "message": a.message,
        "severity": a.severity, "is_resolved": a.is_resolved,
        "resolved_at": a.resolved_at.isoformat() if a.resolved_at else None,
        "resolved_by": a.resolved_by,
        "unit_name": a.unit.name if a.unit else None,
        "farm_name": a.unit.farm.name if a.unit and a.unit.farm else None,
    }

@alert_router.get("")
def list_alerts(
    limit: int = Query(200),
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_scoped_farm_ids),
):
    """Alerts scoped to the selected farm (farm_id param) or all user farms."""
    from app.core.cache import cache_get, cache_set
    key = f"alerts:{sorted(farm_ids)}:{limit}"
    hit = cache_get(key)
    if hit is not None:
        return hit
    result = [_serialize_alert(a) for a in AlertService(db).list_alerts_by_farms(farm_ids, limit=limit)]
    cache_set(key, result, ttl=30)   # 30s — alertes = données fraîches
    return result

@alert_router.get("/critical")
def critical_alerts(
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_scoped_farm_ids),
):
    return [_serialize_alert(a) for a in AlertService(db).get_critical_by_farms(farm_ids)]

@alert_router.post("", status_code=201)
def create_alert(data: AlertCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _serialize_alert(AlertService(db).create_alert(data))

@alert_router.put("/{alert_id}/resolve")
def resolve_alert(alert_id: int, body: AlertResolve, db: Session = Depends(get_db), user=Depends(get_current_user)):
    resolved_by = body.resolved_by or user.username
    return _serialize_alert(AlertService(db).resolve_alert(alert_id, resolved_by))

@alert_router.delete("/{alert_id}", status_code=204)
def delete_alert(alert_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    from app.models.domain import Alert
    db.query(Alert).filter(Alert.id == alert_id).delete()
    db.commit()

class AlertNotifyRequest(_PydBaseModel):
    farm_id: int
    title: str = _PydField(..., min_length=1, max_length=120)
    message: str = _PydField(..., min_length=1, max_length=2000)
    target: _PydLiteral["all", "owner", "workers"] = "all"


@alert_router.post("/notify")
def notify_farm(
    body: AlertNotifyRequest,
    db: Session = Depends(get_db),
    user=Depends(require_roles("owner", "superadmin")),
):
    """Dispatch an alert to the farm owner + assigned workers (WhatsApp + push)."""
    from app.models.domain import Farm
    from app.services.alert_notify_service import notify_farm_alert

    farm = db.query(Farm).filter(Farm.id == body.farm_id).first()
    if not farm:
        raise HTTPException(404, "Ferme introuvable")
    if user.role != "superadmin" and farm.owner_id != user.id:
        raise HTTPException(403, "Accès non autorisé à cette ferme")

    return notify_farm_alert(
        db, body.farm_id, body.title, body.message,
        target=body.target, sent_by=user.username,
    )


@alert_router.get("/emergency")
def emergency_monitor(db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Consolidated high-priority emergency monitoring data."""
    from app.models.domain import Alert, CVEvent, Anomaly
    from sqlalchemy import desc

    # 1. Critical Alerts (Animal/System)
    critical_alerts = db.query(Alert).filter(Alert.is_resolved == False, Alert.severity == "critical").order_by(desc(Alert.timestamp)).limit(10).all()

    # 2. Fire/Smoke Detections — match text labels OR any critical fire-camera event
    from sqlalchemy import or_, and_
    fire_events = db.query(CVEvent).filter(
        or_(
            CVEvent.object_class.in_(["fire", "smoke", "incendie"]),
            and_(CVEvent.camera_id == "fire", CVEvent.severity == "critical")
        ),
        CVEvent.timestamp >= datetime.now(timezone.utc) - timedelta(hours=24)
    ).order_by(desc(CVEvent.timestamp)).limit(20).all()

    # 3. Critical Anomalies
    critical_anomalies = db.query(Anomaly).filter(
        Anomaly.severity == "critical",
        Anomaly.is_acknowledged == False,
        Anomaly.timestamp >= datetime.now(timezone.utc) - timedelta(hours=48)
    ).order_by(desc(Anomaly.timestamp)).limit(10).all()

    # 4. Tree Diseases (Critical from CV)
    tree_diseases = db.query(CVEvent).filter(
        CVEvent.camera_id.in_(["leaves", "olive", "lemon", "orange"]),
        CVEvent.severity == "critical",
        CVEvent.timestamp >= datetime.now(timezone.utc) - timedelta(days=7)
    ).order_by(desc(CVEvent.timestamp)).limit(10).all()

    return {
        "critical_alerts": [_serialize_alert(a) for a in critical_alerts],  # type: ignore[arg-type]
        "fire_events": [_serialize_cv(e) for e in fire_events],
        "critical_anomalies": [_serialize_anomaly(a) for a in critical_anomalies],
        "tree_diseases": [_serialize_cv(e) for e in tree_diseases],
        "system_status": "emergency" if (fire_events or critical_alerts) else "stable",
        "last_update": datetime.now(timezone.utc).isoformat()
    }

def _serialize_cv(e):
    return {
        "id": e.id, "unit_id": e.unit_id, "timestamp": e.timestamp.isoformat(),
        "object_class": e.object_class, "confidence": e.confidence,
        "severity": e.severity, "camera_id": e.camera_id,
        "thumbnail_url": e.thumbnail_url,
        "frame_metadata": e.frame_metadata,
    }


# ---- Recommendations -------------------------------------------------------
rec_router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

def _serialize_rec(r):
    return {
        "id": r.id, "unit_id": r.unit_id, "alert_id": r.alert_id,
        "timestamp": r.timestamp.isoformat() if r.timestamp else None,
        "probable_cause": r.probable_cause,
        "recommendation_text": r.recommendation_text,
        "urgency_level": r.urgency_level,
        "confidence_score": r.confidence_score,
        "is_actioned": r.is_actioned,
        "unit_name": r.unit.name if r.unit else None,
    }

@rec_router.get("")
def list_recommendations(
    include_actioned: bool = Query(False),
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_scoped_farm_ids),
):
    """Recommendations scoped to the selected farm (farm_id param) or all user farms."""
    from app.core.cache import cache_get, cache_set
    key = f"recs:{sorted(farm_ids)}:{include_actioned}"
    hit = cache_get(key)
    if hit is not None:
        return hit
    svc = RecommendationService(db)
    recs = svc.get_all_by_farms(farm_ids) if include_actioned else svc.get_pending_by_farms(farm_ids)
    result = [_serialize_rec(r) for r in recs]
    cache_set(key, result, ttl=60)
    return result

@rec_router.put("/{rec_id}/action")
def action_recommendation(rec_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    rec = RecommendationService(db).mark_actioned(rec_id)
    if not rec:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Recommendation not found")
    return _serialize_rec(rec)

@rec_router.get("/{unit_id}")
def recs_by_unit(unit_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_serialize_rec(r) for r in RecommendationService(db).get_by_unit(unit_id)]

@rec_router.post("", status_code=201)
def create_rec(data: RecommendationCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _serialize_rec(RecommendationService(db).create(data))


# ---- Reports ---------------------------------------------------------------
report_router = APIRouter(prefix="/reports", tags=["Reports"])

def _serialize_report(r):
    return {
        "id": r.id, "farm_id": r.farm_id, "report_type": r.report_type,
        "title": r.title,
        "period_start": r.period_start.isoformat() if r.period_start else None,
        "period_end": r.period_end.isoformat() if r.period_end else None,
        "summary": r.summary, "file_url": r.file_url,
        "generated_by": r.generated_by,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }

@report_router.get("")
def list_reports(
    farm_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    """BUG#4 FIXED: filter reports by user's farms."""
    if farm_id is not None and farm_id not in farm_ids:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette ferme.")
    target_ids = [farm_id] if farm_id else farm_ids
    return [_serialize_report(r) for r in ReportService(db).list_reports_by_farms(target_ids)]

@report_router.post("/generate", status_code=201)
def generate_report(data: ReportGenerateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    data.generated_by = user.username
    return _serialize_report(ReportService(db).generate(data))

@report_router.post("/generate-intelligent", status_code=201)
async def generate_intelligent_report(
    report_type: str = Query("general"),
    farm_id: int = Query(..., description="ID de la ferme — doit appartenir à l'utilisateur"),
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
    user=Depends(get_current_user),
):
    """BUG#19 FIXED: farm_id no longer defaults to 1; ownership is validated."""
    if farm_id not in farm_ids:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette ferme.")
    return _serialize_report(await ReportService(db).generate_intelligent(farm_id, report_type))


# ---- Settings --------------------------------------------------------------
settings_router = APIRouter(prefix="/settings", tags=["Settings"])

def _serialize_setting(s):
    return {
        "id": s.id, "farm_id": s.farm_id, "animal_type_id": s.animal_type_id,
        "key": s.key, "value": s.value, "description": s.description,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }

@settings_router.get("")
def list_settings(
    farm_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    if farm_id is not None and farm_id not in farm_ids:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette ferme.")
    return [_serialize_setting(s) for s in SettingsService(db).list_settings(farm_id=farm_id)]

@settings_router.put("")
def upsert_setting(data: SettingCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _serialize_setting(SettingsService(db).upsert(data))


# ---- Dashboard -------------------------------------------------------------
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@dashboard_router.get("/ai-insight")
async def dashboard_ai_insight(
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_scoped_farm_ids),
):
    """
    Generate a real-time Darija AI insight based on the selected farm's live stats.
    Calls Groq (primary) → Ollama (fallback) → static fallback.
    """
    from app.services.mllm_service import mllm_service

    # Build real farm stats
    stats_obj = DashboardService(db).get_stats(farm_ids=farm_ids)
    stats = {
        "animal_count":    stats_obj.total_units,
        "plant_count":     0,
        "avg_health":      stats_obj.avg_health_score,
        "active_alerts":   stats_obj.active_alerts,
        "critical_alerts": stats_obj.critical_alerts,
        "top_anomalies":   "Aucune",
    }

    # Add recent anomaly types if any
    if farm_ids:
        from app.models.domain import Anomaly, AnimalUnit
        from sqlalchemy import func as _f
        recent = (
            db.query(Anomaly.anomaly_type)
            .join(AnimalUnit, Anomaly.unit_id == AnimalUnit.id)
            .filter(AnimalUnit.farm_id.in_(farm_ids))
            .order_by(Anomaly.timestamp.desc())
            .limit(5)
            .all()
        )
        if recent:
            stats["top_anomalies"] = ", ".join(list({r[0] for r in recent}))

    insight_text = await mllm_service.generate_strategic_report(stats)
    return {
        "text":   insight_text,
        "stats":  stats,
        "source": "Groq llama-3.3-70b" if insight_text and len(insight_text) > 80 else "Labess-7B / Statique",
    }


@dashboard_router.get("/stats", response_model=DashboardStats)
def dashboard_stats(
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_scoped_farm_ids),
):
    """Stats scoped to the selected farm (farm_id param) or all user farms."""
    from app.core.cache import cache_get, cache_set
    key = f"dashboard:stats:{sorted(farm_ids)}"
    hit = cache_get(key)
    if hit is not None:
        return hit
    result = DashboardService(db).get_stats(farm_ids=farm_ids)
    cache_set(key, result if isinstance(result, dict) else result.model_dump(), ttl=60)
    return result


@dashboard_router.get("/analytics")
def dashboard_analytics(
    days: int = Query(30, le=90),
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_scoped_farm_ids),
):
    """Analytics scoped to the selected farm (farm_id param) or all user farms."""
    from app.core.cache import cache_get, cache_set
    key = f"dashboard:analytics:{sorted(farm_ids)}:{days}"
    hit = cache_get(key)
    if hit is not None:
        return hit

    from app.models.domain import Anomaly, Alert, AnimalUnit, AnimalType
    from sqlalchemy import func
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    if not farm_ids:
        return {
            "timeline": [],
            "species_health": [],
            "alert_severity_distribution": [],
            "anomaly_type_distribution": [],
        }

    # Join through AnimalUnit to apply farm filter
    daily_anomalies = (
        db.query(
            func.date(Anomaly.timestamp).label("day"),
            func.count(Anomaly.id).label("count"),
        )
        .join(AnimalUnit, Anomaly.unit_id == AnimalUnit.id)
        .filter(Anomaly.timestamp >= cutoff, AnimalUnit.farm_id.in_(farm_ids))
        .group_by(func.date(Anomaly.timestamp))
        .order_by(func.date(Anomaly.timestamp))
        .all()
    )

    daily_alerts = (
        db.query(
            func.date(Alert.timestamp).label("day"),
            Alert.severity,
            func.count(Alert.id).label("count"),
        )
        .join(AnimalUnit, Alert.unit_id == AnimalUnit.id)
        .filter(Alert.timestamp >= cutoff, AnimalUnit.farm_id.in_(farm_ids))
        .group_by(func.date(Alert.timestamp), Alert.severity)
        .order_by(func.date(Alert.timestamp))
        .all()
    )

    species_health = (
        db.query(
            AnimalType.species,
            func.avg(AnimalUnit.health_score).label("avg_health"),
            func.count(AnimalUnit.id).label("unit_count"),
        )
        .join(AnimalUnit, AnimalUnit.type_id == AnimalType.id)
        .filter(AnimalUnit.farm_id.in_(farm_ids))
        .group_by(AnimalType.species)
        .all()
    )

    alert_severity_dist = (
        db.query(Alert.severity, func.count(Alert.id).label("count"))
        .join(AnimalUnit, Alert.unit_id == AnimalUnit.id)
        .filter(Alert.timestamp >= cutoff, AnimalUnit.farm_id.in_(farm_ids))
        .group_by(Alert.severity)
        .all()
    )

    anomaly_type_dist = (
        db.query(Anomaly.anomaly_type, func.count(Anomaly.id).label("count"))
        .join(AnimalUnit, Anomaly.unit_id == AnimalUnit.id)
        .filter(Anomaly.timestamp >= cutoff, AnimalUnit.farm_id.in_(farm_ids))
        .group_by(Anomaly.anomaly_type)
        .order_by(func.count(Anomaly.id).desc())
        .limit(8)
        .all()
    )

    day_map = {}
    for row in daily_anomalies:
        day_map.setdefault(str(row.day), {"day": str(row.day), "anomalies": 0, "alerts_warning": 0, "alerts_critical": 0})
        day_map[str(row.day)]["anomalies"] = row.count
    for row in daily_alerts:
        key = str(row.day)
        day_map.setdefault(key, {"day": key, "anomalies": 0, "alerts_warning": 0, "alerts_critical": 0})
        if row.severity == "critical":
            day_map[key]["alerts_critical"] = row.count
        elif row.severity == "warning":
            day_map[key]["alerts_warning"] = row.count

    analytics_result = {
        "timeline": sorted(day_map.values(), key=lambda x: x["day"]),
        "species_health": [
            {
                "species": r.species,
                "avg_health": round(float(r.avg_health), 1),
                "unit_count": r.unit_count,
            }
            for r in species_health
        ],
        "alert_severity_distribution": [{"severity": r.severity, "count": r.count} for r in alert_severity_dist],
        "anomaly_type_distribution":   [{"type": r.anomaly_type, "count": r.count} for r in anomaly_type_dist],
    }
    cache_set(key, analytics_result, ttl=300)
    return analytics_result


# ---------------------------------------------------------------------------
# Forecasting Router
# ---------------------------------------------------------------------------
forecast_router = APIRouter(prefix="/forecast", tags=["Forecasting"])

from app.services.forecasting_service import (  # noqa: E402
    forecast_telemetry, forecast_honey_production, decompose_telemetry,
)
from app.models.domain import TelemetryRecord, BeeProduction  # noqa: E402


@forecast_router.get("/telemetry/{unit_id}", summary="Prévision métriques IoT (Prophet)")
def forecast_telemetry_endpoint(
    unit_id: int,
    metric: str = Query("temperature", description="Métrique à prévoir"),
    days: int = Query(7, ge=1, le=30),
    history_days: int = Query(60, ge=7, le=365),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=history_days)
    records = (
        db.query(TelemetryRecord)
        .filter(TelemetryRecord.unit_id == unit_id, TelemetryRecord.timestamp >= since)
        .order_by(TelemetryRecord.timestamp.asc())
        .all()
    )
    raw = [{"timestamp": r.timestamp.isoformat(), "metrics": r.metrics or {}} for r in records]
    return forecast_telemetry(raw, metric=metric, horizon_days=days)


@forecast_router.get("/honey/{hive_id}", summary="Prévision production miel (SARIMA/Prophet)")
def forecast_honey_endpoint(
    hive_id: int,
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    records = (
        db.query(BeeProduction)
        .filter(BeeProduction.hive_id == hive_id)
        .order_by(BeeProduction.production_date.asc())
        .all()
    )
    raw = [{"production_date": r.production_date.isoformat(), "honey_kg": float(r.honey_kg or 0)} for r in records]
    return forecast_honey_production(raw, horizon_days=days)


# ---------------------------------------------------------------------------
# Analytics Extras Router
# ---------------------------------------------------------------------------
analytics_router = APIRouter(prefix="/analytics", tags=["Analytics"])


@analytics_router.get("/correlation", summary="Corrélation croisée entre deux métriques IoT")
def correlation_endpoint(
    unit_id: int = Query(...),
    metric_x: str = Query(...),
    metric_y: str = Query(...),
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    import numpy as np  # noqa: PLC0415
    try:
        from scipy import stats as sp_stats  # noqa: PLC0415
        _has_scipy = True
    except ImportError:
        _has_scipy = False

    since = datetime.utcnow() - timedelta(days=days)
    records = (
        db.query(TelemetryRecord)
        .filter(TelemetryRecord.unit_id == unit_id, TelemetryRecord.timestamp >= since)
        .order_by(TelemetryRecord.timestamp.asc())
        .all()
    )

    xs, ys = [], []
    for r in records:
        m = r.metrics or {}
        x_val = m.get(metric_x)
        y_val = m.get(metric_y)
        if x_val is not None and y_val is not None:
            try:
                xs.append(float(x_val))
                ys.append(float(y_val))
            except (TypeError, ValueError):
                pass

    if len(xs) < 5:
        raise HTTPException(
            status_code=404,
            detail=f"Données insuffisantes ({len(xs)} points — minimum 5 requis)",
        )

    x_arr = np.array(xs)
    y_arr = np.array(ys)

    pearson_r, p_value = (None, None)
    if _has_scipy:
        pearson_r, p_value = sp_stats.pearsonr(x_arr, y_arr)
        pearson_r = round(float(pearson_r), 4)
        p_value = round(float(p_value), 6)

    # Cross-correlation with lag
    cross_corr = np.correlate(x_arr - x_arr.mean(), y_arr - y_arr.mean(), mode="full")
    norm = np.sqrt(np.sum((x_arr - x_arr.mean())**2) * np.sum((y_arr - y_arr.mean())**2))
    cross_corr_norm = (cross_corr / norm if norm > 0 else cross_corr).tolist()
    lags = list(range(-len(xs) + 1, len(xs)))
    optimal_lag_idx = int(np.argmax(np.abs(cross_corr)))
    optimal_lag = lags[optimal_lag_idx]

    significant = bool(p_value is not None and p_value < 0.05)
    if pearson_r is not None:
        if abs(pearson_r) > 0.7:
            interpretation = "forte corrélation " + ("positive" if pearson_r > 0 else "négative")
        elif abs(pearson_r) > 0.4:
            interpretation = "corrélation modérée " + ("positive" if pearson_r > 0 else "négative")
        else:
            interpretation = "corrélation faible ou absente"
    else:
        interpretation = "corrélation calculée sans scipy"

    return {
        "unit_id": unit_id,
        "metric_x": metric_x,
        "metric_y": metric_y,
        "n_points": len(xs),
        "pearson_r": pearson_r,
        "p_value": p_value,
        "significant": significant,
        "lag_optimal": optimal_lag,
        "cross_correlation": [round(v, 4) for v in cross_corr_norm[:50]],
        "interpretation": interpretation,
        "days_analyzed": days,
    }


@analytics_router.get("/decompose/{unit_id}", summary="Décomposition saisonnière d'une métrique IoT")
def decompose_endpoint(
    unit_id: int,
    metric: str = Query("temperature"),
    days: int = Query(30, ge=14, le=365),
    period: int = Query(24, ge=2, le=168, description="Période de saisonnalité (ex: 24 pour quotidien)"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    since = datetime.utcnow() - timedelta(days=days)
    records = (
        db.query(TelemetryRecord)
        .filter(TelemetryRecord.unit_id == unit_id, TelemetryRecord.timestamp >= since)
        .order_by(TelemetryRecord.timestamp.asc())
        .all()
    )
    raw = [{"timestamp": r.timestamp.isoformat(), "metrics": r.metrics or {}} for r in records]
    return decompose_telemetry(raw, metric=metric, period=period)


# ---------------------------------------------------------------------------
# Poultry Explainability Router
# ---------------------------------------------------------------------------
poultry_explain_router = APIRouter(prefix="/poultry", tags=["Poultry ML"])

from app.models.domain import PoultryBatch, PoultryFeedLog, PoultryHealthLog  # noqa: E402
from app.services.poultry_ml_service import explain_prediction, validate_models  # noqa: E402


@poultry_explain_router.get("/{batch_id}/explain", summary="SHAP — contributions des features au score de risque")
def explain_batch(
    batch_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    batch = db.query(PoultryBatch).filter(PoultryBatch.id == batch_id).first()
    if not batch:
        from fastapi import HTTPException  # noqa: PLC0415
        raise HTTPException(status_code=404, detail="Lot introuvable")

    feed_logs = db.query(PoultryFeedLog).filter(PoultryFeedLog.batch_id == batch_id).all()
    health_logs = db.query(PoultryHealthLog).filter(PoultryHealthLog.batch_id == batch_id).all()
    from datetime import date  # noqa: PLC0415
    batch_day = (date.today() - batch.arrival_date.date()).days if batch.arrival_date else 0

    return explain_prediction(
        feed_logs=feed_logs,
        health_logs=health_logs,
        batch_day=batch_day,
        initial_qty=batch.initial_quantity or 1,
    )


@poultry_explain_router.get("/models/validation", summary="Cross-validation K-Fold des modèles poultry")
def validate_poultry_models(_=Depends(get_current_user)):
    return validate_models()


# ---------------------------------------------------------------------------
# Irrigation Router
# ---------------------------------------------------------------------------
irrigation_router = APIRouter(prefix="/irrigation", tags=["Irrigation"])

from app.services.irrigation_service import get_crop_water_requirement, get_farm_et0  # noqa: E402
from app.models.domain import Farm  # noqa: E402


@irrigation_router.get("/et0/{farm_id}", summary="ET₀ Penman-Monteith + besoins en eau de la culture")
async def et0_endpoint(
    farm_id: int,
    crop: str = Query("tomate"),
    stage: str = Query("mid", description="Stade phénologique : ini, dev, mid, flowering, late, end, harvest"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        from fastapi import HTTPException  # noqa: PLC0415
        raise HTTPException(status_code=404, detail="Ferme introuvable")

    et0_data = await get_farm_et0(farm, days=1)
    et0_mm = et0_data["forecasts"][0]["et0_mm_day"] if et0_data.get("forecasts") else 4.0
    crop_req = get_crop_water_requirement(crop=crop, stage=stage, et0_mm_day=et0_mm)

    return {
        "farm_id": farm_id,
        "et0": et0_data["forecasts"][0] if et0_data.get("forecasts") else {"et0_mm_day": 4.0},
        "crop_water_requirement": crop_req,
    }


# ---------------------------------------------------------------------------
# Crop Calendar Router
# ---------------------------------------------------------------------------
calendar_router = APIRouter(prefix="/calendar", tags=["Crop Calendar"])

from app.services.crop_calendar_service import (  # noqa: E402
    get_crops_for_month, get_crop_timeline, get_phenological_alerts, list_available_crops,
)


@calendar_router.get("/crops", summary="Cultures et actions pour un mois/zone donnée")
def crops_for_month(
    zone: str = Query("nord", description="Zone : nord, centre, sud, cotier"),
    month: int = Query(None, ge=1, le=12, description="Mois (1-12). Défaut = mois courant"),
    _=Depends(get_current_user),
):
    if month is None:
        month = datetime.utcnow().month
    return {"zone": zone, "month": month, "crops": get_crops_for_month(zone, month)}


@calendar_router.get("/crops/{crop}/timeline", summary="Calendrier complet d'une culture sur 12 mois")
def crop_timeline(
    crop: str,
    zone: str = Query("nord"),
    _=Depends(get_current_user),
):
    return get_crop_timeline(crop=crop, zone=zone)


@calendar_router.get("/alerts/{farm_id}", summary="Alertes phénologiques basées sur météo actuelle")
async def phenological_alerts(
    farm_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    import httpx  # noqa: PLC0415
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        from fastapi import HTTPException  # noqa: PLC0415
        raise HTTPException(status_code=404, detail="Ferme introuvable")

    # BUG#21 FIXED: farm uses .latitude/.longitude not .lat/.lon
    lat = float(farm.latitude or 36.8)
    lon = float(farm.longitude or 10.1)
    if lat > 36.5:
        zone = "nord"
    elif lat > 34.5:
        zone = "centre"
    elif lat > 33.0:
        zone = "cotier"
    else:
        zone = "sud"

    # Get current temperature for frost alerts
    temperature = None
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}"
                f"&current=temperature_2m&timezone=Africa%2FTunis"
            )
            temperature = resp.json().get("current", {}).get("temperature_2m")
    except Exception:
        pass

    alerts = get_phenological_alerts(zone=zone, lat=lat, temperature=temperature)
    return {"farm_id": farm_id, "zone": zone, "alerts": alerts, "month": datetime.utcnow().month}


@calendar_router.get("/available", summary="Liste des cultures disponibles par zone")
def available_crops(
    zone: str = Query(None),
    _=Depends(get_current_user),
):
    return list_available_crops(zone=zone)


# ---------------------------------------------------------------------------
# Market Prices Router
# ---------------------------------------------------------------------------
market_router = APIRouter(prefix="/market", tags=["Market Prices"])

from app.services.market_price_service import (  # noqa: E402
    get_prices, compute_farm_profitability, list_available_products,
)


@market_router.get("/prices", summary="Prix des produits agricoles tunisiens")
def market_prices(
    products: str = Query(..., description="Produits séparés par virgule : tomate,miel,lait_vache"),
    _=Depends(get_current_user),
):
    product_list = [p.strip() for p in products.split(",") if p.strip()]
    return {"prices": get_prices(product_list), "count": len(product_list)}


@market_router.get("/profitability/{farm_id}", summary="Rentabilité estimée basée sur prix marché actuels")
def farm_profitability(
    farm_id: int,
    products: str = Query("miel,lait_vache,tomate", description="Produits séparés par virgule"),
    quantities: str = Query("50,500,1000", description="Quantités en kg (même ordre que products)"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    product_list = [p.strip() for p in products.split(",")]
    qty_list = [float(q.strip()) for q in quantities.split(",")]
    if len(product_list) != len(qty_list):
        from fastapi import HTTPException  # noqa: PLC0415
        raise HTTPException(status_code=400, detail="Nombre de produits et quantités doivent correspondre")
    products_produced = dict(zip(product_list, qty_list))
    return compute_farm_profitability(db, farm_id=farm_id, products_produced=products_produced)


@market_router.get("/products", summary="Liste des produits disponibles")
def available_products(
    category: str = Query(None, description="Filtrer par catégorie : légumes, fruits, élevage, apiculture…"),
    _=Depends(get_current_user),
):
    return list_available_products(category=category)


# ---------------------------------------------------------------------------
# Telemetry Quality Router (added here to avoid new file)
# ---------------------------------------------------------------------------
quality_router = APIRouter(prefix="/telemetry", tags=["Data Quality"])

from app.services.data_quality_service import get_quality_report  # noqa: E402


@quality_router.get("/{unit_id}/quality", summary="Rapport qualité des données télémétriques")
def telemetry_quality(
    unit_id: int,
    days: int = Query(7, ge=1, le=90),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    return get_quality_report(db=db, unit_id=unit_id, days=days)
