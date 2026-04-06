from fastapi import APIRouter, Depends, HTTPException
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.weather_service import weather_service
from app.models.domain import Farm
from sqlalchemy.orm import Session

router = APIRouter()

@router.get("/current/{farm_id}")
async def get_current_weather(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
        
    if not farm.latitude or not farm.longitude:
        raise HTTPException(status_code=400, detail="Farm has no GPS coordinates configured")
        
    data = await weather_service.get_current_weather(farm.latitude, farm.longitude)
    if not data:
        raise HTTPException(status_code=503, detail="Weather service unavailable")
        
    return data

@router.get("/forecast/{farm_id}")
async def get_forecast(
    farm_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")
        
    if not farm.latitude or not farm.longitude:
        raise HTTPException(status_code=400, detail="Farm has no GPS coordinates configured")
        
    data = await weather_service.get_forecast(farm.latitude, farm.longitude)
    if not data:
        raise HTTPException(status_code=503, detail="Weather forecast service unavailable")
        
    return data

