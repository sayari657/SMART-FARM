"""
Smart Farm AI - __init__.py for repositories package
"""
from app.repositories.base import BaseRepository  # noqa: F401
from app.repositories.farm_repo import FarmRepository, AnimalUnitRepository, AnimalTypeRepository, SensorRepository  # noqa: F401
from app.repositories.data_repo import (  # noqa: F401
    TelemetryRepository, CVEventRepository, AnomalyRepository,
    AlertRepository, RecommendationRepository, ReportRepository, SettingsRepository
)
