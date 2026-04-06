from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.recommendation_service import recommendation_service
from app.models.domain import Farm
from sqlalchemy.orm import Session

router = APIRouter()

@router.get("/{farm_id}")
async def get_farm_recommendations(
    farm_id: int,
    plant: str = "grass",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
        
    data = await recommendation_service.generate_recommendations(farm, plant_query=plant)
    return data
