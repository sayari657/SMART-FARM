"""Smart Farm AI - Animal Unit Routes"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.farm_service import AnimalService
from app.schemas.domain import AnimalUnitCreate, AnimalUnitUpdate
from app.models.domain import AnimalUnit, AnimalLog, User
from pydantic import BaseModel

router = APIRouter(prefix="/animals", tags=["Animals"])

class AnimalLogCreate(BaseModel):
    type: str
    value: Optional[float] = None
    unit: Optional[str] = None
    notes: Optional[str] = None


def _serialize_unit(u):
    return {
        "id": u.id, "name": u.name, "farm_id": u.farm_id, "type_id": u.type_id,
        "identifier": u.identifier, "tag_id": u.tag_id, 
        "status": u.status, "lifecycle_status": u.lifecycle_status,
        "health_score": u.health_score,
        "notes": u.notes,
        "species": u.animal_type.species if u.animal_type else None,
        "species_display": u.animal_type.display_name if u.animal_type else None,
        "farm_name": u.farm.name if u.farm else None,
        "entry_date": u.entry_date.isoformat() if u.entry_date else None,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }

@router.get("")
def list_animals(
    farm_id: Optional[int] = Query(None),
    species: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    from app.models.domain import BeeHive
    units = AnimalService(db).list_animals(farm_id=farm_id, species=species)
    serialized = [_serialize_unit(u) for u in units]
    
    # Also include BeeHives from the Smart Bee module
    if species is None or species == "bee":
        hives = db.query(BeeHive).all()
        for h in hives:
            serialized.append({
                "id": f"bee_{h.id}", 
                "name": h.identifier,
                "farm_id": h.apiary_id,
                "type_id": None,
                "identifier": h.identifier,
                "status": "healthy" if h.health_score > 7 else ("warning" if h.health_score > 4 else "critical"),
                "health_score": h.health_score * 10,
                "species": "bee",
                "species_display": "Abeilles (Smart Bee)",
                "farm_name": h.apiary.name if h.apiary else "Smart Apiary",
                "created_at": h.created_at.isoformat() if h.created_at else None,
            })
    return serialized

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
def get_animal(unit_id: str, db: Session = Depends(get_db), _=Depends(get_current_user)):
    if str(unit_id).startswith("bee_"):
        from app.models.domain import BeeHive
        hive_id = int(str(unit_id).split("_")[1])
        h = db.query(BeeHive).filter(BeeHive.id == hive_id).first()
        if not h: raise HTTPException(status_code=404, detail="Ruche non trouvée")
        return {
            "id": f"bee_{h.id}", "name": h.identifier, "farm_id": h.apiary_id,
            "identifier": h.identifier, "status": "healthy" if h.health_score > 7 else "warning",
            "health_score": h.health_score * 10, "notes": h.notes,
            "species": "bee", "species_display": "Abeilles (Smart Bee)",
            "farm_name": h.apiary.name if h.apiary else "Smart Apiary",
        }
    
    unit = AnimalService(db).get_animal(int(unit_id))
    return _serialize_unit(unit)

@router.put("/{unit_id}")
def update_animal(unit_id: int, data: AnimalUnitUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    unit = AnimalService(db).update_animal(unit_id, data)
    return _serialize_unit(unit)

@router.delete("/{unit_id}", status_code=204)
def delete_animal(unit_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    AnimalService(db).delete_animal(unit_id)

# --- Animal Logs (FMIS) ---

@router.get("/{unit_id}/logs")
def list_animal_logs(
    unit_id: int,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    query = db.query(AnimalLog).filter(AnimalLog.animal_id == unit_id)
    if type:
        query = query.filter(AnimalLog.type == type)
    logs = query.order_by(AnimalLog.timestamp.desc()).all()
    return [{
        "id": l.id, "type": l.type, "value": l.value, "unit": l.unit,
        "notes": l.notes, "timestamp": l.timestamp.isoformat(),
        "recorded_by": l.recorded_by
    } for l in logs]

@router.post("/{unit_id}/logs", status_code=201)
def create_animal_log(
    unit_id: int,
    log_in: AnimalLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = AnimalLog(
        animal_id=unit_id,
        type=log_in.type,
        value=log_in.value,
        unit=log_in.unit,
        notes=log_in.notes,
        recorded_by=current_user.id
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "id": log.id, "type": log.type, "value": log.value, "unit": log.unit,
        "notes": log.notes, "timestamp": log.timestamp.isoformat()
    }

