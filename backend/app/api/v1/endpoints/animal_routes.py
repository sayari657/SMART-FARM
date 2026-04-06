"""Smart Farm AI - Animal Unit Routes"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.farm_service import AnimalService
from app.schemas.domain import AnimalUnitCreate, AnimalUnitUpdate

router = APIRouter(prefix="/animals", tags=["Animals"])

def _serialize_unit(u):
    return {
        "id": u.id, "name": u.name, "farm_id": u.farm_id, "type_id": u.type_id,
        "identifier": u.identifier, "status": u.status, "health_score": u.health_score,
        "notes": u.notes,
        "species": u.animal_type.species if u.animal_type else None,
        "species_display": u.animal_type.display_name if u.animal_type else None,
        "farm_name": u.farm.name if u.farm else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }

@router.get("")
def list_animals(
    farm_id: Optional[int] = Query(None),
    species: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    units = AnimalService(db).list_animals(farm_id=farm_id, species=species)
    return [_serialize_unit(u) for u in units]

@router.post("", status_code=201)
def create_animal(data: AnimalUnitCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    unit = AnimalService(db).create_animal(data)
    return _serialize_unit(unit)

@router.get("/types")
def list_types(db: Session = Depends(get_db), _=Depends(get_current_user)):
    types = AnimalService(db).list_types()
    return [{"id": t.id, "species": t.species, "display_name": t.display_name,
             "description": t.description, "cv_classes": t.cv_classes,
             "telemetry_schema": t.telemetry_schema} for t in types]

@router.get("/{unit_id}")
def get_animal(unit_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    unit = AnimalService(db).get_animal(unit_id)
    return _serialize_unit(unit)

@router.put("/{unit_id}")
def update_animal(unit_id: int, data: AnimalUnitUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    unit = AnimalService(db).update_animal(unit_id, data)
    return _serialize_unit(unit)

@router.delete("/{unit_id}", status_code=204)
def delete_animal(unit_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    AnimalService(db).delete_animal(unit_id)
