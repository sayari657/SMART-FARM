"""Smart Farm AI - Telemetry Routes"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.data_service import TelemetryService
from app.schemas.domain import TelemetryCreate

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])

def _serialize(r):
    return {"id": r.id, "unit_id": r.unit_id,
            "timestamp": r.timestamp.isoformat() if r.timestamp else None,
            "metrics": r.metrics, "source": r.source}

@router.get("/{unit_id}")
def get_history(
    unit_id: int,
    limit: int = Query(200, le=1000),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    records = TelemetryService(db).get_history(unit_id, limit=limit)
    return [_serialize(r) for r in records]

@router.get("/{unit_id}/latest")
def get_latest(unit_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return TelemetryService(db).get_latest(unit_id)

@router.post("", status_code=201)
def ingest(data: TelemetryCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    r = TelemetryService(db).ingest(data)
    return _serialize(r)
