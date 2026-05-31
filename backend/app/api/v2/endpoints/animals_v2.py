"""Animals v2 — paginated list with farm filtering."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import AnimalUnit

router = APIRouter()


@router.get("", summary="Animals — paginated, farm-filtered")
def list_animals_v2(
    page:     int = Query(1,    ge=1),
    per_page: int = Query(20,   ge=1, le=100),
    species:  str = Query(None, description="Filter: cow|goat|sheep|rabbit|chicken"),
    farm_id:  int = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(AnimalUnit)
    if species:
        q = q.filter(AnimalUnit.species == species)
    if farm_id:
        q = q.filter(AnimalUnit.farm_id == farm_id)

    total   = q.count()
    animals = q.offset((page - 1) * per_page).limit(per_page).all()
    data = [{"id": a.id, "name": a.name, "species": a.species, "farm_id": a.farm_id} for a in animals]

    return {
        "data": data,
        "meta": {"total": total, "page": page, "per_page": per_page,
                 "timestamp": datetime.utcnow().isoformat()},
        "errors": [],
    }
