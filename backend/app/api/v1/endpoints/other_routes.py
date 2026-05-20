"""Smart Farm AI - Anomaly, Alert, Recommendation, Report, Settings, Dashboard Routes"""
from typing import Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.data_service import (
    AnomalyService, AlertService, RecommendationService,
    ReportService, SettingsService, DashboardService
)
from app.schemas.domain import (
    AlertCreate, AlertResolve,
    RecommendationCreate, ReportGenerateRequest,
    SettingCreate, SettingUpdate, DashboardStats
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
def recent_anomalies(limit: int = Query(50, le=200), db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_serialize_anomaly(a) for a in AnomalyService(db).get_recent(limit=limit)]

@anomaly_router.get("/{unit_id}")
def anomalies_by_unit(unit_id: int, limit: int = Query(50), db: Session = Depends(get_db), _=Depends(get_current_user)):
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
def list_alerts(limit: int = Query(200), db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_serialize_alert(a) for a in AlertService(db).list_alerts()]

@alert_router.get("/critical")
def critical_alerts(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_serialize_alert(a) for a in AlertService(db).get_critical()]

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
        CVEvent.timestamp >= datetime.utcnow() - timedelta(hours=24)
    ).order_by(desc(CVEvent.timestamp)).limit(20).all()
    
    # 3. Critical Anomalies
    critical_anomalies = db.query(Anomaly).filter(
        Anomaly.severity == "critical",
        Anomaly.is_acknowledged == False,
        Anomaly.timestamp >= datetime.utcnow() - timedelta(hours=48)
    ).order_by(desc(Anomaly.timestamp)).limit(10).all()
    
    # 4. Tree Diseases (Critical from CV)
    tree_diseases = db.query(CVEvent).filter(
        CVEvent.camera_id.in_(["leaves", "olive", "lemon", "orange"]),
        CVEvent.severity == "critical",
        CVEvent.timestamp >= datetime.utcnow() - timedelta(days=7)
    ).order_by(desc(CVEvent.timestamp)).limit(10).all()

    return {
        "critical_alerts": [_serialize_alert(a) for a in critical_alerts],
        "fire_events": [_serialize_cv(e) for e in fire_events],
        "critical_anomalies": [_serialize_anomaly(a) for a in critical_anomalies],
        "tree_diseases": [_serialize_cv(e) for e in tree_diseases],
        "system_status": "emergency" if (fire_events or critical_alerts) else "stable",
        "last_update": datetime.utcnow().isoformat()
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
    _=Depends(get_current_user)
):
    svc = RecommendationService(db)
    recs = svc.get_all() if include_actioned else svc.get_pending()
    return [_serialize_rec(r) for r in recs]

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
def list_reports(farm_id: Optional[int] = Query(None), db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_serialize_report(r) for r in ReportService(db).list_reports(farm_id=farm_id)]

@report_router.post("/generate", status_code=201)
def generate_report(data: ReportGenerateRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    data.generated_by = user.username
    return _serialize_report(ReportService(db).generate(data))

@report_router.post("/generate-intelligent", status_code=201)
async def generate_intelligent_report(
    report_type: str = Query("general"),
    farm_id: int = Query(1),
    db: Session = Depends(get_db),
    user = Depends(get_current_user)
):
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
def list_settings(farm_id: Optional[int] = Query(None), db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_serialize_setting(s) for s in SettingsService(db).list_settings(farm_id=farm_id)]

@settings_router.put("")
def upsert_setting(data: SettingCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return _serialize_setting(SettingsService(db).upsert(data))


# ---- Dashboard -------------------------------------------------------------
dashboard_router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@dashboard_router.get("/stats", response_model=DashboardStats)
def dashboard_stats(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return DashboardService(db).get_stats()


@dashboard_router.get("/analytics")
def dashboard_analytics(days: int = Query(30, le=90), db: Session = Depends(get_db), _=Depends(get_current_user)):
    """Full analytics: telemetry averages per day, anomaly counts, alert severity breakdown."""
    from app.models.domain import TelemetryRecord, Anomaly, Alert, AnimalUnit, AnimalType
    from sqlalchemy import func, cast, Date
    cutoff = datetime.utcnow() - timedelta(days=days)

    daily_anomalies = (
        db.query(
            func.date(Anomaly.timestamp).label("day"),
            func.count(Anomaly.id).label("count")
        )
        .filter(Anomaly.timestamp >= cutoff)
        .group_by(func.date(Anomaly.timestamp))
        .order_by(func.date(Anomaly.timestamp))
        .all()
    )

    daily_alerts = (
        db.query(
            func.date(Alert.timestamp).label("day"),
            Alert.severity,
            func.count(Alert.id).label("count")
        )
        .filter(Alert.timestamp >= cutoff)
        .group_by(func.date(Alert.timestamp), Alert.severity)
        .order_by(func.date(Alert.timestamp))
        .all()
    )

    species_health = (
        db.query(AnimalType.species, func.avg(AnimalUnit.health_score).label("avg_health"))
        .join(AnimalUnit, AnimalUnit.type_id == AnimalType.id)
        .group_by(AnimalType.species)
        .all()
    )

    alert_severity_dist = (
        db.query(Alert.severity, func.count(Alert.id).label("count"))
        .filter(Alert.timestamp >= cutoff)
        .group_by(Alert.severity)
        .all()
    )

    anomaly_type_dist = (
        db.query(Anomaly.anomaly_type, func.count(Anomaly.id).label("count"))
        .filter(Anomaly.timestamp >= cutoff)
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

    return {
        "timeline": sorted(day_map.values(), key=lambda x: x["day"]),
        "species_health": [{"species": r.species, "avg_health": round(float(r.avg_health), 1)} for r in species_health],
        "alert_severity_distribution": [{"severity": r.severity, "count": r.count} for r in alert_severity_dist],
        "anomaly_type_distribution":   [{"type": r.anomaly_type, "count": r.count} for r in anomaly_type_dist],
    }
