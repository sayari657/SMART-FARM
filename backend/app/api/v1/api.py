"""Smart Farm AI - API v1 Router (aggregates all sub-routers)"""
from fastapi import APIRouter
from app.api.v1.endpoints.auth_routes import router as auth_router
from app.api.v1.endpoints.farm_routes import router as farm_router
from app.api.v1.endpoints.animal_routes import router as animal_router
from app.api.v1.endpoints.telemetry_routes import router as telemetry_router
from app.api.v1.endpoints.cv_routes import router as cv_router
from app.api.v1.endpoints.other_routes import (
    anomaly_router, alert_router, rec_router,
    report_router, settings_router, dashboard_router,
    forecast_router, analytics_router, poultry_explain_router,
    irrigation_router, calendar_router, market_router, quality_router,
)
from app.api.v1.endpoints.weather import router as weather_ext_router
from app.api.v1.endpoints.geocode import router as geocode_router
from app.api.v1.endpoints.plants import router as plants_router
from app.api.v1.endpoints.recommendations import router as recommendations_ext_router
from app.api.v1.endpoints.agent import router as agent_router
from app.api.v1.endpoints.bee import router as bee_router
from app.api.v1.endpoints.bee_history import router as bee_history_router
from app.api.v1.endpoints.bee_analytics import router as bee_analytics_router
from app.api.v1.endpoints.bee_expenses import router as bee_expenses_router
from app.api.v1.endpoints.bee_planning import router as bee_planning_router
from app.api.v1.endpoints.bee_stock import router as bee_stock_router
from app.api.v1.endpoints.geo_routes import router as geo_router
from app.api.v1.endpoints.diagnostic_routes import router as diagnostic_router
from app.api.v1.endpoints.worker_tasks import router as worker_tasks_router
from app.api.v1.endpoints.worker_reports import router as worker_reports_router
from app.api.v1.endpoints.poultry_erp import router as poultry_erp_router
from app.api.v1.endpoints.warehouse_routes import router as warehouse_router

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
api_router.include_router(poultry_erp_router, prefix="/poultry", tags=["Poultry Management ERP"])
api_router.include_router(bee_history_router)
api_router.include_router(bee_analytics_router)
api_router.include_router(bee_expenses_router)
api_router.include_router(bee_planning_router)
api_router.include_router(bee_stock_router)
api_router.include_router(geo_router)
api_router.include_router(diagnostic_router, prefix="/diagnostics", tags=["Diagnostic History"])
api_router.include_router(worker_tasks_router)
api_router.include_router(worker_reports_router)
api_router.include_router(warehouse_router)

# External integrations
api_router.include_router(weather_ext_router, prefix="/weather", tags=["Weather"])
api_router.include_router(geocode_router, prefix="/geocode", tags=["Geocode"])
api_router.include_router(plants_router, prefix="/plants", tags=["Plants"])
api_router.include_router(recommendations_ext_router, prefix="/recommendations-advanced", tags=["Recommendations"])

# v3.1 — New smart features
api_router.include_router(forecast_router)
api_router.include_router(analytics_router)
api_router.include_router(poultry_explain_router)
api_router.include_router(irrigation_router)
api_router.include_router(calendar_router)
api_router.include_router(market_router)
api_router.include_router(quality_router)

# Active Learning / CV Feedback
from app.api.v1.endpoints.feedback_routes import router as feedback_router  # noqa: E402
api_router.include_router(feedback_router)

# Video Streaming (WebSocket) — registered directly on app in main.py via stream_routes
from app.api.v1.endpoints.stream_routes import router as stream_router  # noqa: E402
api_router.include_router(stream_router)

# Data Drift Detection
from app.api.v1.endpoints.drift_routes import router as drift_router  # noqa: E402
api_router.include_router(drift_router)

# Model A/B Testing
from app.api.v1.endpoints.ab_testing_routes import router as ab_router  # noqa: E402
api_router.include_router(ab_router)

# SuperAdmin — platform management (commercial + maintenance)
from app.api.v1.endpoints.superadmin_routes import router as superadmin_router  # noqa: E402
api_router.include_router(superadmin_router)

# 2FA TOTP
from app.api.v1.endpoints.totp_routes import router as totp_router  # noqa: E402
api_router.include_router(totp_router)

# IoT Device Management
from app.api.v1.endpoints.iot_devices_routes import router as iot_devices_router  # noqa: E402
api_router.include_router(iot_devices_router)

# Stripe Billing
from app.api.v1.endpoints.billing_routes import router as billing_router  # noqa: E402
api_router.include_router(billing_router)
