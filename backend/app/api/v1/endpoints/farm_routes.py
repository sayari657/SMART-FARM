"""Smart Farm AI - Farm Routes"""
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.farm_service import FarmService
from app.schemas.domain import FarmCreate, FarmUpdate, FarmResponse

router = APIRouter(prefix="/farms", tags=["Farms"])

@router.get("", response_model=List[dict])
def list_farms(db: Session = Depends(get_db), _=Depends(get_current_user)):
    svc = FarmService(db)
    results = svc.list_farms()
    # Serialize: extract farm fields + computed stats
    out = []
    for r in results:
        f = r["farm"]
        out.append({
            "id": f.id, "name": f.name, "location": f.location,
            "description": f.description, "status": f.status,
            "latitude": f.latitude, "longitude": f.longitude,
            "total_area_ha": f.total_area_ha, "owner_id": f.owner_id,
            "created_at": f.created_at.isoformat() if f.created_at else None,
            "unit_count": r["unit_count"],
            "active_alerts": r["active_alerts"],
            "avg_health_score": r["avg_health_score"],
        })
    return out

@router.post("", status_code=201)
def create_farm(data: FarmCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return FarmService(db).create_farm(data, owner_id=user.id)

@router.get("/{farm_id}")
def get_farm(farm_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    r = FarmService(db).get_farm(farm_id)
    f = r["farm"]
    return {
        "id": f.id, "name": f.name, "location": f.location,
        "description": f.description, "status": f.status,
        "latitude": f.latitude, "longitude": f.longitude,
        "total_area_ha": f.total_area_ha, "owner_id": f.owner_id,
        "created_at": f.created_at.isoformat() if f.created_at else None,
        "unit_count": r["unit_count"],
        "active_alerts": r["active_alerts"],
        "avg_health_score": r["avg_health_score"],
    }

@router.put("/{farm_id}")
def update_farm(farm_id: int, data: FarmUpdate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    return FarmService(db).update_farm(farm_id, data)

@router.delete("/{farm_id}", status_code=204)
def delete_farm(farm_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    FarmService(db).delete_farm(farm_id)
