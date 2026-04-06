"""Smart Farm AI - Services package"""
from app.services.auth_service import AuthService
from app.services.farm_service import FarmService, AnimalService
from app.services.data_service import (
    TelemetryService, CVService, AnomalyService, AlertService,
    RecommendationService, ReportService, SettingsService, DashboardService
)
