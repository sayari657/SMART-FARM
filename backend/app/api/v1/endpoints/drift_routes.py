"""Data drift detection endpoints — Smart Farm AI v3.0"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.drift_detection_service import DriftDetectionService

router = APIRouter(prefix="/drift", tags=["Data Drift Detection"])


@router.get("/cv/{category}", summary="Label + confidence drift for a CV category")
def cv_drift(
    category: str,
    baseline_days: int = Query(30, ge=7),
    recent_days:   int = Query(7,  ge=1),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    svc = DriftDetectionService(db)
    return {
        "label_drift":      svc.detect_cv_label_drift(category, baseline_days, recent_days),
        "confidence_drift": svc.detect_confidence_drift(category, baseline_days, recent_days),
    }


@router.get("/telemetry/{unit_id}", summary="Sensor reading drift for an animal unit")
def telemetry_drift(
    unit_id: int,
    feature: str = Query("temperature", description="Column name: temperature|humidity|weight"),
    baseline_days: int = Query(30, ge=7),
    recent_days:   int = Query(7,  ge=1),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    svc = DriftDetectionService(db)
    return svc.detect_telemetry_drift(unit_id, feature, baseline_days, recent_days)


@router.get("/audit", summary="Full drift audit across all CV categories")
def drift_audit(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    svc = DriftDetectionService(db)
    return svc.run_full_audit()
