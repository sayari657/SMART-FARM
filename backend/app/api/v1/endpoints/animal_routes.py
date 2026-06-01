"""Smart Farm AI - Animal Unit Routes"""
from typing import Optional, List
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.farm_guard import get_user_farm_ids, assert_farm_owner
from app.services.farm_service import AnimalService
from app.schemas.domain import AnimalUnitCreate, AnimalUnitUpdate, AnimalTypeCreate
from app.models.domain import AnimalLog, User
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
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    """BUG#3 FIXED: returns only animals from farms the user owns/has access to."""
    from app.models.domain import BeeHive, BeeApiary
    from sqlalchemy.orm import joinedload as _jl

    # Determine which farm IDs to query
    if farm_id is not None:
        if farm_id not in farm_ids:
            raise HTTPException(status_code=403, detail="Accès non autorisé à cette ferme.")
        target_farm_ids = [farm_id]
    else:
        target_farm_ids = farm_ids

    units = AnimalService(db).list_animals_by_farms(target_farm_ids, species=species)
    serialized = [_serialize_unit(u) for u in units]

    # Include BeeHives — filtered by user's farm (via apiary.farm_id)
    if species is None or species == "bee":
        bee_query = db.query(BeeHive).options(_jl(BeeHive.apiary)).join(
            BeeApiary, BeeHive.apiary_id == BeeApiary.id
        )
        if target_farm_ids:
            bee_query = bee_query.filter(BeeApiary.farm_id.in_(target_farm_ids))
        hives = bee_query.all()
        for h in hives:
            serialized.append({
                "id": f"bee_{h.id}",
                "name": h.identifier,
                "farm_id": h.apiary.farm_id if h.apiary else None,
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
def create_animal(
    data: AnimalUnitCreate,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    if data.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Accès non autorisé à cette ferme.")
    unit = AnimalService(db).create_animal(data)
    return _serialize_unit(unit)


@router.get("/types")
def list_types(db: Session = Depends(get_db), _=Depends(get_current_user)):
    types = AnimalService(db).list_types()
    return [{"id": t.id, "species": t.species, "display_name": t.display_name,
             "description": t.description, "cv_classes": t.cv_classes,
             "telemetry_schema": t.telemetry_schema} for t in types]


@router.post("/types", status_code=201)
def create_type(data: AnimalTypeCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    t = AnimalService(db).create_type(data)
    return {"id": t.id, "species": t.species, "display_name": t.display_name}


@router.get("/{unit_id}")
def get_animal(
    unit_id: str,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    if str(unit_id).startswith("bee_"):
        from app.models.domain import BeeHive, BeeApiary
        hive_id = int(str(unit_id).split("_")[1])
        h = db.query(BeeHive).filter(BeeHive.id == hive_id).first()
        if not h:
            raise HTTPException(status_code=404, detail="Ruche non trouvée")
        apiary = db.query(BeeApiary).filter(BeeApiary.id == h.apiary_id).first()
        if apiary and apiary.farm_id and apiary.farm_id not in farm_ids:
            raise HTTPException(status_code=403, detail="Accès non autorisé.")
        return {
            "id": f"bee_{h.id}", "name": h.identifier,
            "farm_id": apiary.farm_id if apiary else None,
            "identifier": h.identifier,
            "status": "healthy" if h.health_score > 7 else "warning",
            "health_score": h.health_score * 10, "notes": h.notes,
            "species": "bee", "species_display": "Abeilles (Smart Bee)",
            "farm_name": h.apiary.name if h.apiary else "Smart Apiary",
        }

    unit = AnimalService(db).get_animal(int(unit_id))
    if unit.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")
    return _serialize_unit(unit)


@router.put("/{unit_id}")
def update_animal(
    unit_id: int,
    data: AnimalUnitUpdate,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    unit = AnimalService(db).get_animal(unit_id)
    if unit.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")
    unit = AnimalService(db).update_animal(unit_id, data)
    return _serialize_unit(unit)


@router.delete("/{unit_id}", status_code=204)
def delete_animal(
    unit_id: int,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    unit = AnimalService(db).get_animal(unit_id)
    if unit.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")
    AnimalService(db).delete_animal(unit_id)


# --- Animal Logs (FMIS) ---

@router.get("/{unit_id}/logs")
def list_animal_logs(
    unit_id: int,
    type: Optional[str] = None,
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    unit = AnimalService(db).get_animal(unit_id)
    if unit.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")
    query = db.query(AnimalLog).filter(AnimalLog.animal_id == unit_id)
    if type:
        query = query.filter(AnimalLog.type == type)
    logs = query.order_by(AnimalLog.timestamp.desc()).all()
    return [{
        "id": log.id, "type": log.type, "value": log.value, "unit": log.unit,
        "notes": log.notes, "timestamp": log.timestamp.isoformat(),
        "recorded_by": log.recorded_by,
    } for log in logs]


@router.post("/{unit_id}/logs", status_code=201)
def create_animal_log(
    unit_id: int,
    log_in: AnimalLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    farm_ids: List[int] = Depends(get_user_farm_ids),
):
    unit = AnimalService(db).get_animal(unit_id)
    if unit.farm_id not in farm_ids:
        raise HTTPException(status_code=403, detail="Accès non autorisé.")
    log = AnimalLog(
        animal_id=unit_id,
        type=log_in.type,
        value=log_in.value,
        unit=log_in.unit,
        notes=log_in.notes,
        recorded_by=current_user.id,
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return {
        "id": log.id, "type": log.type, "value": log.value, "unit": log.unit,
        "notes": log.notes, "timestamp": log.timestamp.isoformat(),
    }
