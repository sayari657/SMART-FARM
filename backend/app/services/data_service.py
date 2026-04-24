"""
Smart Farm AI - Telemetry, CV, Anomaly, Alert, Recommendation, Report, Settings Services
"""

from typing import List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.repositories.data_repo import (
    TelemetryRepository, CVEventRepository, AnomalyRepository,
    AlertRepository, RecommendationRepository, ReportRepository, SettingsRepository
)
from app.repositories.farm_repo import AnimalUnitRepository, FarmRepository
from app.schemas.domain import (
    TelemetryCreate, CVEventCreate, AlertCreate,
    RecommendationCreate, ReportGenerateRequest, SettingCreate, SettingUpdate,
    AlertResolve, DashboardStats
)
from app.models.domain import Report, AnimalUnit


class TelemetryService:
    def __init__(self, db: Session):
        self.repo = TelemetryRepository(db)
        self.unit_repo = AnimalUnitRepository(db)

    def get_history(self, unit_id: int, limit: int = 200):
        return self.repo.get_by_unit(unit_id, limit=limit)

    def get_latest(self, unit_id: int):
        record = self.repo.get_latest(unit_id)
        unit = self.unit_repo.get_with_relations(unit_id)
        if not unit:
            raise HTTPException(status_code=404, detail="Animal unit not found")
        return {
            "unit_id": unit_id,
            "unit_name": unit.name,
            "species": unit.animal_type.species if unit.animal_type else "unknown",
            "timestamp": record.timestamp if record else None,
            "metrics": record.metrics if record else {},
        }

    def ingest(self, data: TelemetryCreate):
        payload = data.model_dump()
        if not payload.get("timestamp"):
            payload["timestamp"] = datetime.utcnow()
        return self.repo.create(payload)

    def get_range(self, unit_id: int, start: datetime, end: datetime):
        return self.repo.get_range(unit_id, start, end)


class CVService:
    def __init__(self, db: Session):
        self.repo = CVEventRepository(db)

    def get_by_unit(self, unit_id: int, limit: int = 100):
        return self.repo.get_by_unit(unit_id, limit=limit)

    def get_recent(self, limit: int = 50):
        return self.repo.get_recent(limit=limit)

    def ingest(self, data: CVEventCreate):
        payload = data.model_dump()
        if not payload.get("timestamp"):
            payload["timestamp"] = datetime.utcnow()
        return self.repo.create(payload)


class AnomalyService:
    def __init__(self, db: Session):
        self.repo = AnomalyRepository(db)

    def get_by_unit(self, unit_id: int, limit: int = 50):
        return self.repo.get_by_unit(unit_id, limit=limit)

    def get_recent(self, limit: int = 50):
        return self.repo.get_recent(limit=limit)

    def count_recent(self, hours: int = 24) -> int:
        return self.repo.count_recent(hours=hours)


class AlertService:
    def __init__(self, db: Session):
        self.repo = AlertRepository(db)

    def list_alerts(self, resolved: Optional[bool] = None, limit: int = 200):
        if resolved is False or resolved is None:
            return self.repo.get_active(limit=limit)
        return self.repo.get_all(limit=limit)

    def get_critical(self, limit: int = 50):
        return self.repo.get_critical(limit=limit)

    def get_by_unit(self, unit_id: int, limit: int = 50):
        return self.repo.get_by_unit(unit_id, limit=limit)

    def create_alert(self, data: AlertCreate):
        payload = data.model_dump()
        payload["timestamp"] = datetime.utcnow()
        return self.repo.create(payload)

    def resolve_alert(self, alert_id: int, resolved_by: str = "system"):
        alert = self.repo.resolve(alert_id, resolved_by)
        if not alert:
            raise HTTPException(status_code=404, detail="Alert not found")
        return alert

    def count_active(self) -> int:
        return self.repo.count_active()

    def count_critical(self) -> int:
        return self.repo.count_critical()


class RecommendationService:
    def __init__(self, db: Session):
        self.repo = RecommendationRepository(db)
        self.unit_repo = AnimalUnitRepository(db)

    def get_by_unit(self, unit_id: int, limit: int = 50):
        recs = self.repo.get_by_unit(unit_id, limit=limit)
        # attach unit name
        for r in recs:
            pass  # unit is joined via ORM
        return recs

    def get_pending(self, limit: int = 100):
        return self.repo.get_pending(limit=limit)

    def create(self, data: RecommendationCreate):
        payload = data.model_dump()
        payload["timestamp"] = datetime.utcnow()
        return self.repo.create(payload)


class ReportService:
    def __init__(self, db: Session):
        self.repo = ReportRepository(db)
        self.unit_repo = AnimalUnitRepository(db)
        self.alert_repo = AlertRepository(db)
        self.anomaly_repo = AnomalyRepository(db)
        self.telemetry_repo = TelemetryRepository(db)

    def list_reports(self, farm_id: Optional[int] = None):
        if farm_id:
            return self.repo.get_by_farm(farm_id)
        return self.repo.get_all(limit=200)

    def generate(self, data: ReportGenerateRequest):
        """Build summary stats and persist report."""
        from sqlalchemy import func as sqlfunc
        db = self.repo.db

        # Count units in farm
        unit_count = db.query(func.count(AnimalUnit.id)).filter(
            AnimalUnit.farm_id == data.farm_id
        ).scalar() or 0

        # Active alerts in period
        from app.models.domain import Alert
        alert_count = db.query(func.count(Alert.id)).join(
            AnimalUnit, Alert.unit_id == AnimalUnit.id
        ).filter(
            AnimalUnit.farm_id == data.farm_id,
            Alert.timestamp >= data.period_start,
            Alert.timestamp <= data.period_end,
        ).scalar() or 0

        # Average health score
        avg_health = db.query(func.avg(AnimalUnit.health_score)).filter(
            AnimalUnit.farm_id == data.farm_id
        ).scalar()

        summary = {
            "unit_count": unit_count,
            "total_alerts": alert_count,
            "avg_health_score": round(float(avg_health), 1) if avg_health else 0.0,
            "period": {
                "start": data.period_start.isoformat(),
                "end": data.period_end.isoformat(),
            },
        }

        title = f"{data.report_type.capitalize()} Report — Farm {data.farm_id}"
        report = Report(
            farm_id=data.farm_id,
            report_type=data.report_type,
            title=title,
            period_start=data.period_start,
            period_end=data.period_end,
            summary=summary,
            generated_by=data.generated_by,
        )
        db.add(report)
        db.commit()
        db.refresh(report)
        return report


class SettingsService:
    def __init__(self, db: Session):
        self.repo = SettingsRepository(db)

    def list_settings(self, farm_id: Optional[int] = None):
        if farm_id:
            return self.repo.get_by_farm(farm_id)
        return self.repo.get_all(limit=500)

    def upsert(self, data: SettingCreate):
        return self.repo.upsert(
            key=data.key,
            value=data.value,
            farm_id=data.farm_id,
            animal_type_id=data.animal_type_id,
            description=data.description or "",
        )

    def get_by_key(self, key: str, farm_id: Optional[int] = None):
        setting = self.repo.get_by_key(key, farm_id)
        if not setting:
            raise HTTPException(status_code=404, detail="Setting not found")
        return setting


class DashboardService:
    def __init__(self, db: Session):
        self.db = db

    def get_stats(self) -> DashboardStats:
        from app.models.domain import Farm, AnimalUnit, AnimalType, Alert, Anomaly, BeeHive
        total_farms = self.db.query(func.count(Farm.id)).scalar() or 0
        
        # Count classic animal units
        total_units = self.db.query(func.count(AnimalUnit.id)).scalar() or 0
        # Count bee hives from Smart Bee module
        total_hives = self.db.query(func.count(BeeHive.id)).scalar() or 0
        
        active_alerts = self.db.query(func.count(Alert.id)).filter(Alert.is_resolved == False).scalar() or 0
        critical_alerts = self.db.query(func.count(Alert.id)).filter(
            Alert.is_resolved == False, Alert.severity == "critical"
        ).scalar() or 0
        avg_health = self.db.query(func.avg(AnimalUnit.health_score)).scalar()
        cutoff = datetime.utcnow() - timedelta(hours=24)
        recent_anomalies = self.db.query(func.count(Anomaly.id)).filter(
            Anomaly.timestamp >= cutoff
        ).scalar() or 0

        # Units per species
        species_counts_list = (
            self.db.query(AnimalType.species, func.count(AnimalUnit.id))
            .join(AnimalUnit, AnimalUnit.type_id == AnimalType.id)
            .group_by(AnimalType.species)
            .all()
        )
        
        species_counts = dict(species_counts_list)
        
        # Add bees from Smart Bee module if any
        if total_hives > 0:
            species_counts["bee"] = species_counts.get("bee", 0) + total_hives
            total_units += total_hives

        return DashboardStats(
            total_farms=total_farms,
            total_units=total_units,
            active_alerts=active_alerts,
            critical_alerts=critical_alerts,
            avg_health_score=round(float(avg_health), 1) if avg_health else 0.0,
            units_by_species=species_counts,
            recent_anomalies=recent_anomalies,
        )
