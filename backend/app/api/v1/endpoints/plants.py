from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_current_user
from app.services.agro_service import agro_service

router = APIRouter()

@router.get("/search")
async def search_plants(
    q: str,
    current_user = Depends(get_current_user)
):
    if not q:
        raise HTTPException(status_code=400, detail="Query parameter 'q' is required")
        
    data = await agro_service.search_plants(q)
    if data is None:
        raise HTTPException(status_code=503, detail="Agro plant service unavailable")
        
    return data

@router.get("/details/{plant_id}")
async def get_plant_details(
    plant_id: str,
    current_user = Depends(get_current_user)
):
    data = await agro_service.get_plant_details(plant_id)
    if data is None:
        raise HTTPException(status_code=503, detail="Agro plant details service unavailable")
        
    return data

