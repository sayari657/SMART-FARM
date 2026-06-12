"""
Smart Farm AI — Multi-Tenant Farm Ownership Guard

Provides reusable FastAPI dependencies that enforce data isolation:
every query on farm-scoped data must pass through one of these guards.
"""

from typing import List, Optional
from fastapi import Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user


def get_user_farm_ids(
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
) -> List[int]:
    """Return the list of farm IDs owned by (or accessible to) the current user."""
    from app.models.domain import FarmOwner, WorkerAssignment
    if user.role == "worker":
        rows = (
            db.query(WorkerAssignment.farm_id)
            .filter(
                WorkerAssignment.worker_id == user.id,
                WorkerAssignment.is_active == True,
            )
            .all()
        )
    else:
        rows = (
            db.query(FarmOwner.farm_id)
            .filter(FarmOwner.owner_id == user.id)
            .all()
        )
    return [r[0] for r in rows]


def assert_farm_owner(
    farm_id: int,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
) -> int:
    """Raise 404 for an absent farm, otherwise enforce tenant ownership."""
    from app.models.domain import Farm
    if not db.query(Farm.id).filter(Farm.id == farm_id).first():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ferme introuvable.",
        )
    if farm_id not in farm_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès non autorisé à cette ferme.",
        )
    return farm_id


def get_scoped_farm_ids(
    farm_id: Optional[int] = None,
    all_farm_ids: List[int] = Depends(get_user_farm_ids),
) -> List[int]:
    """
    If farm_id is provided and the user owns it → scope to that single farm.
    Otherwise → return all the user's farm IDs.
    This is the core of per-farm data privacy: every page passes its
    selected farmId and only sees data for that farm.
    """
    if farm_id is not None:
        if farm_id not in all_farm_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Accès non autorisé à cette ferme.",
            )
        return [farm_id]
    return all_farm_ids
