"""Smart Farm AI - Services package"""
from app.services.auth_service import AuthService  # noqa: F401
from app.services.farm_service import FarmService, AnimalService  # noqa: F401
from app.services.data_service import (  # noqa: F401
    TelemetryService, CVService, AnomalyService, AlertService,
    RecommendationService, ReportService, SettingsService, DashboardService
)
