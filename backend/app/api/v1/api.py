"""Smart Farm AI - API v1 Router (aggregates all sub-routers)"""
from fastapi import APIRouter
from app.api.v1.endpoints.auth_routes import router as auth_router
from app.api.v1.endpoints.farm_routes import router as farm_router
from app.api.v1.endpoints.animal_routes import router as animal_router
from app.api.v1.endpoints.telemetry_routes import router as telemetry_router
from app.api.v1.endpoints.cv_routes import router as cv_router
from app.api.v1.endpoints.other_routes import (
    anomaly_router, alert_router, rec_router,
    report_router, settings_router, dashboard_router
)
from app.api.v1.endpoints.weather import router as weather_ext_router
from app.api.v1.endpoints.geocode import router as geocode_router
from app.api.v1.endpoints.plants import router as plants_router
from app.api.v1.endpoints.recommendations import router as recommendations_ext_router
from app.api.v1.endpoints.agent import router as agent_router
from app.api.v1.endpoints.bee import router as bee_router
from app.api.v1.endpoints.bee_history import router as bee_history_router
from app.api.v1.endpoints.geo_routes import router as geo_router
from app.api.v1.endpoints.diagnostic_routes import router as diagnostic_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(farm_router)
api_router.include_router(animal_router)
api_router.include_router(telemetry_router)
api_router.include_router(cv_router)
api_router.include_router(anomaly_router)
api_router.include_router(alert_router)
api_router.include_router(rec_router)
api_router.include_router(report_router)
api_router.include_router(settings_router)
api_router.include_router(dashboard_router)
api_router.include_router(agent_router, prefix="/agent", tags=["Sovereign Agent"])
api_router.include_router(bee_router, prefix="/bee", tags=["Bee Management"])
api_router.include_router(bee_history_router)
api_router.include_router(geo_router)
api_router.include_router(diagnostic_router, prefix="/diagnostics", tags=["Diagnostic History"])

# External integrations
api_router.include_router(weather_ext_router, prefix="/weather", tags=["Weather"])
api_router.include_router(geocode_router, prefix="/geocode", tags=["Geocode"])
api_router.include_router(plants_router, prefix="/plants", tags=["Plants"])
api_router.include_router(recommendations_ext_router, prefix="/recommendations-advanced", tags=["Recommendations"])
