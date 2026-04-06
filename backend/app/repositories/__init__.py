"""
Smart Farm AI - __init__.py for repositories package
"""
from app.repositories.base import BaseRepository
from app.repositories.farm_repo import FarmRepository, AnimalUnitRepository, AnimalTypeRepository, SensorRepository
from app.repositories.data_repo import (
    TelemetryRepository, CVEventRepository, AnomalyRepository,
    AlertRepository, RecommendationRepository, ReportRepository, SettingsRepository
)
