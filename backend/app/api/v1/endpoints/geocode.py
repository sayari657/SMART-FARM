from fastapi import APIRouter, Depends, HTTPException
from typing import Optional
from app.core.security import get_current_user
from app.services.geocode_service import geocode_service

router = APIRouter()

@router.get("/search")
async def search_address(
    q: str,
    current_user = Depends(get_current_user)
):
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")
        
    data = await geocode_service.search_address(q)
    if data is None:
        raise HTTPException(status_code=503, detail="Geocode service unavailable")
        
    return data

@router.get("/reverse")
async def reverse_geocode(
    lat: float,
    lon: float,
    current_user = Depends(get_current_user)
):
    data = await geocode_service.reverse_geocode(lat, lon)
    if data is None:
        raise HTTPException(status_code=503, detail="Reverse geocode service unavailable")
        
    return data

