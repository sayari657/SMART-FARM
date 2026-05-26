from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.domain import DiagnosticHistory, User
from app.core.security import get_current_user
from app.schemas.domain import DiagnosticSave, DiagnosticRead

router = APIRouter()

# ─── Endpoints ─────────────────────────────────────────────────────────────

@router.post("/", response_model=DiagnosticRead)
def create_history_record(
    data: DiagnosticSave,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Saves a diagnostic session to history"""
    record = DiagnosticHistory(
        user_id=current_user.id,
        category=data.category,
        image_url=data.image_url,
        detections=data.detections,
        chat_log=data.chat_log,
        notes=data.notes
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record

@router.get("/", response_model=List[DiagnosticRead])
def get_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieves all diagnostic records for the current user"""
    if not current_user:
        return []
    try:
        results = db.query(DiagnosticHistory).filter(DiagnosticHistory.user_id == current_user.id).order_by(DiagnosticHistory.timestamp.desc()).all()
        # Ensure no crash if results is empty or if serialization fails for one item
        validated = []
        for r in results:
            try:
                validated.append(DiagnosticRead.model_validate(r))
            except Exception as ser_err:
                print(f"Skipping corrupt history record {getattr(r,'id','?')}: {ser_err}")
                continue
        return validated
    except Exception as e:
        print(f"RESILIENT ROUTE LOG: Returning [] for diagnostic history due to error: {e}")
        # Log to server console but DON'T crash the request
        return []

@router.delete("/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deletes a specific diagnostic record"""
    record = db.query(DiagnosticHistory).filter(
        DiagnosticHistory.id == record_id,
        DiagnosticHistory.user_id == current_user.id
    ).first()

    if not record:
        raise HTTPException(status_code=404, detail="Record not found")

    db.delete(record)
    db.commit()
    return None
