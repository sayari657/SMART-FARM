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
    farm_id: Optional[int] = None          # worker can pick which farm
    created_at: Optional[datetime] = None


class WorkerFarmOut(BaseModel):
    id: int
    name: str
    model_config = ConfigDict(from_attributes=True)


@router.get("/farms", response_model=List[WorkerFarmOut], tags=["Worker Reports"])
def my_farms(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Farms the current worker is actively assigned to (for the farm selector)."""
    from app.models.domain import Farm
    rows = (
        db.query(Farm.id, Farm.name)
        .join(WorkerAssignment, WorkerAssignment.farm_id == Farm.id)
        .filter(WorkerAssignment.worker_id == current_user.id,
                WorkerAssignment.is_active == True)  # noqa: E712
        .all()
    )
    return [{"id": r.id, "name": r.name} for r in rows]

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
    # The worker may target a specific farm they're assigned to; otherwise
    # default to their first active assignment.
    assignments = db.query(WorkerAssignment).filter(
        WorkerAssignment.worker_id == current_user.id,
        WorkerAssignment.is_active == True  # noqa: E712
    ).all()
    allowed_farm_ids = {a.farm_id for a in assignments}
    if report_in.farm_id and report_in.farm_id in allowed_farm_ids:
        farm_id = report_in.farm_id
    else:
        farm_id = assignments[0].farm_id if assignments else None

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

    # Notify the farm owner (push + email, best-effort) — "envoyer au propriétaire"
    if farm_id:
        try:
            from app.models.domain import Farm
            from app.services.push_service import send_to_user
            from app.services.otp_service import send_email_alert
            farm = db.query(Farm).filter(Farm.id == farm_id).first()
            if farm and farm.owner_id:
                worker_name = current_user.full_name or current_user.username
                title = f"Rapport ouvrier — {farm.name}"
                body = f"{worker_name} ({report.type}) : {report.notes or '(sans description)'}"
                try:
                    send_to_user(db, farm.owner_id, title, body, {"type": "worker_report", "farm_id": farm_id})
                except Exception:
                    pass
                owner = db.query(User).filter(User.id == farm.owner_id).first()
                if owner and owner.email:
                    send_email_alert(owner.email, title, body)
        except Exception:
            pass

    return report


@router.get("", response_model=List[ReportOut])
def list_reports(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "worker":
        return db.query(WorkerReport).filter(WorkerReport.worker_id == current_user.id).all()
    return db.query(WorkerReport).all()
