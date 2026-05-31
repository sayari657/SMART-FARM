"""
Feedback Routes — Active Learning Pipeline
==========================================
Permet aux utilisateurs de corriger les détections YOLO.
Déclenche le ré-entraînement quand le seuil est atteint.
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import User
from app.services import active_learning_service as als

router = APIRouter(prefix="/cv", tags=["Active Learning"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class FeedbackCreate(BaseModel):
    cv_event_id: int | None = None
    original_label: str
    corrected_label: str
    category: str | None = None
    confidence_original: float | None = None
    notes: str | None = None


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/feedback", summary="Soumettre une correction de détection YOLO")
def submit_feedback(
    payload: FeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Enregistre la correction d'un label YOLO par l'utilisateur.
    Quand 50 corrections s'accumulent, le retrain devient disponible.
    """
    return als.submit_feedback(
        db=db,
        cv_event_id=payload.cv_event_id,
        original_label=payload.original_label,
        corrected_label=payload.corrected_label,
        user_id=current_user.id,
        category=payload.category,
        confidence_original=payload.confidence_original,
        notes=payload.notes,
    )


@router.get("/feedback/stats", summary="Statistiques des corrections soumises")
def feedback_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Retourne la distribution des corrections, le nombre en attente,
    et si le seuil de ré-entraînement est atteint.
    """
    return als.get_feedback_stats(db)


@router.post("/retrain/trigger", summary="Déclencher le ré-entraînement si seuil atteint")
async def trigger_retrain(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lance DVC repro en arrière-plan si ≥50 corrections non utilisées.
    Notifie via WebSocket. Réservé aux owners.
    """
    if current_user.role != "owner":
        raise HTTPException(status_code=403, detail="Réservé aux propriétaires de ferme")

    # Import socket_manager lazily to avoid circular imports
    try:
        from app.main import socket_manager
    except ImportError:
        socket_manager = None

    return await als.trigger_retrain(db=db, socket_manager=socket_manager)
