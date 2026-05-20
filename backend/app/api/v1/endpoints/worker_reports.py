"""
Worker Reports — Incident reports submitted by workers from the mobile PWA.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import WorkerReport, User, WorkerAssignment

router = APIRouter(prefix="/worker/reports", tags=["Worker Reports"])


class ReportIn(BaseModel):
    type: str = "other"
    notes: Optional[str] = None
    photo_b64: Optional[str] = None
    created_at: Optional[datetime] = None

class ReportOut(BaseModel):
    id: int
    worker_id: Optional[int]
    farm_id: Optional[int]
    type: str
    notes: Optional[str]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


@router.post("", response_model=ReportOut, status_code=201)
def create_report(
    report_in: ReportIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = db.query(WorkerAssignment).filter(
        WorkerAssignment.worker_id == current_user.id,
        WorkerAssignment.is_active == True
    ).first()
    farm_id = assignment.farm_id if assignment else None

    report = WorkerReport(
        worker_id=current_user.id,
        farm_id=farm_id,
        type=report_in.type,
        notes=report_in.notes,
        photo_b64=report_in.photo_b64,
        created_at=report_in.created_at or datetime.now(timezone.utc),
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return report


@router.get("", response_model=List[ReportOut])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "worker":
        return db.query(WorkerReport).filter(WorkerReport.worker_id == current_user.id).all()
    return db.query(WorkerReport).all()
