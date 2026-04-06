"""Smart Farm AI - Anomaly, Alert, Recommendation, Report, Settings, Dashboard Routes"""
from typing import Optional
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
def list_recommendations(db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_serialize_rec(r) for r in RecommendationService(db).get_pending()]

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
