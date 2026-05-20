from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.weather_service import weather_service
from app.models.domain import Farm
from sqlalchemy.orm import Session

router = APIRouter()

# Default coordinates (Tunis) used when farm has no GPS
_DEFAULT_LAT = 36.8065
_DEFAULT_LON = 10.1815


def _resolve_coords(farm: Farm, fallback_lat: Optional[float], fallback_lon: Optional[float]):
    """Return (lat, lon) from farm GPS, query-param override, or Tunisia default."""
    lat = fallback_lat or farm.latitude or _DEFAULT_LAT
    lon = fallback_lon or farm.longitude or _DEFAULT_LON
    return lat, lon


@router.get("/current/{farm_id}")
async def get_current_weather(
    farm_id: int,
    lat: Optional[float] = Query(None, description="Override latitude"),
    lon: Optional[float] = Query(None, description="Override longitude"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    resolved_lat, resolved_lon = _resolve_coords(farm, lat, lon)
    data = await weather_service.get_current_weather(resolved_lat, resolved_lon)
    if not data:
        raise HTTPException(status_code=503, detail="Weather service unavailable")

    data["coords_source"] = (
        "query_params" if (lat or lon)
        else ("farm_gps" if (farm.latitude and farm.longitude) else "default_tunis")
    )
    return data


@router.get("/coords")
async def get_weather_by_coords(lat: float, lon: float):
    data = await weather_service.get_current_weather(lat, lon)
    if not data:
        raise HTTPException(status_code=503, detail="Weather service unavailable for these coordinates")
    return data


@router.get("/forecast/{farm_id}")
async def get_forecast(
    farm_id: int,
    lat: Optional[float] = Query(None, description="Override latitude"),
    lon: Optional[float] = Query(None, description="Override longitude"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    resolved_lat, resolved_lon = _resolve_coords(farm, lat, lon)
    data = await weather_service.get_forecast(resolved_lat, resolved_lon)
    if not data:
        raise HTTPException(status_code=503, detail="Weather forecast service unavailable")
    return data

