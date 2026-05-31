"""
Smart Farm AI — API v2
Improvements over v1:
  - Unified response envelope: { data, meta, errors }
  - Pagination on all list endpoints
  - Multi-farm filtering
  - Richer CV detection schema (includes model tag + translated label)
"""
from fastapi import APIRouter
from app.api.v2.endpoints.cv_v2 import router as cv_v2_router
from app.api.v2.endpoints.animals_v2 import router as animals_v2_router
from app.api.v2.endpoints.health_v2 import router as health_v2_router

api_v2_router = APIRouter()
api_v2_router.include_router(health_v2_router)
api_v2_router.include_router(cv_v2_router,      prefix="/cv",      tags=["CV v2"])
api_v2_router.include_router(animals_v2_router,  prefix="/animals", tags=["Animals v2"])
