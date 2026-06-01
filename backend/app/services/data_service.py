"""
Smart Farm AI - Telemetry, CV, Anomaly, Alert, Recommendation, Report, Settings Services
"""

from typing import Optional
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException
from app.repositories.data_repo import (
    TelemetryRepository, CVEventRepository, AnomalyRepository,
    AlertRepository, RecommendationRepository, ReportRepository, SettingsRepository
)
from app.repositories.farm_repo import AnimalUnitRepository
from app.schemas.domain import (
    TelemetryCreate, CVEventCreate, AlertCreate,
    RecommendationCreate, ReportGenerateRequest, SettingCreate, DashboardStats
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
            payload["timestamp"] = datetime.now(timezone.utc)
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

    def get_recent_by_farms(self, farm_ids: list, limit: int = 50):
        """Return CV events scoped to the given farms (via unit → farm)."""
        if not farm_ids:
            return []
        from app.models.domain import CVEvent, AnimalUnit
        return (
            self.repo.db.query(CVEvent)
            .join(AnimalUnit, CVEvent.unit_id == AnimalUnit.id)
            .filter(AnimalUnit.farm_id.in_(farm_ids))
            .order_by(CVEvent.timestamp.desc())
            .limit(limit)
            .all()
        )

    def ingest(self, data: CVEventCreate):
        payload = data.model_dump()
        if not payload.get("timestamp"):
            payload["timestamp"] = datetime.now(timezone.utc)
        return self.repo.create(payload)


class AnomalyService:
    def __init__(self, db: Session):
        self.repo = AnomalyRepository(db)

    def get_by_unit(self, unit_id: int, limit: int = 50):
        return self.repo.get_by_unit(unit_id, limit=limit)

    def get_recent(self, limit: int = 50):
        return self.repo.get_recent(limit=limit)

    def get_recent_by_farms(self, farm_ids: list, limit: int = 50):
        """BUG#4 FIXED: return only recent anomalies from the given farms."""
        if not farm_ids:
            return []
        from app.models.domain import Anomaly, AnimalUnit
        return (
            self.repo.db.query(Anomaly)
            .join(AnimalUnit, Anomaly.unit_id == AnimalUnit.id)
            .filter(AnimalUnit.farm_id.in_(farm_ids))
            .order_by(Anomaly.timestamp.desc())
            .limit(limit)
            .all()
        )

    def count_recent(self, hours: int = 24) -> int:
        return self.repo.count_recent(hours=hours)


class AlertService:
    def __init__(self, db: Session):
        self.repo = AlertRepository(db)

    def list_alerts(self, resolved: Optional[bool] = None, limit: int = 200):
        if resolved is False or resolved is None:
            return self.repo.get_active(limit=limit)
        return self.repo.get_all(limit=limit)

    def list_alerts_by_farms(self, farm_ids: list, limit: int = 200):
        """BUG#4 FIXED: return only active alerts from the given farms."""
        if not farm_ids:
            return []
        from app.models.domain import Alert, AnimalUnit
        return (
            self.repo.db.query(Alert)
            .join(AnimalUnit, Alert.unit_id == AnimalUnit.id)
            .filter(Alert.is_resolved == False, AnimalUnit.farm_id.in_(farm_ids))
            .order_by(Alert.timestamp.desc())
            .limit(limit)
            .all()
        )

    def get_critical(self, limit: int = 50):
        return self.repo.get_critical(limit=limit)

    def get_critical_by_farms(self, farm_ids: list, limit: int = 50):
        if not farm_ids:
            return []
        from app.models.domain import Alert, AnimalUnit
        return (
            self.repo.db.query(Alert)
            .join(AnimalUnit, Alert.unit_id == AnimalUnit.id)
            .filter(
                Alert.is_resolved == False,
                Alert.severity == "critical",
                AnimalUnit.farm_id.in_(farm_ids),
            )
            .order_by(Alert.timestamp.desc())
            .limit(limit)
            .all()
        )

    def get_by_unit(self, unit_id: int, limit: int = 50):
        return self.repo.get_by_unit(unit_id, limit=limit)

    def create_alert(self, data: AlertCreate):
        payload = data.model_dump()
        payload["timestamp"] = datetime.now(timezone.utc)
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
        return self.repo.get_by_unit(unit_id, limit=limit)

    def get_pending(self, limit: int = 100):
        return self.repo.get_pending(limit=limit)

    def get_pending_by_farms(self, farm_ids: list, limit: int = 100):
        """BUG#4 FIXED: pending recommendations from given farms only."""
        if not farm_ids:
            return []
        from app.models.domain import Recommendation, AnimalUnit
        return (
            self.repo.db.query(Recommendation)
            .join(AnimalUnit, Recommendation.unit_id == AnimalUnit.id)
            .filter(Recommendation.is_actioned == False, AnimalUnit.farm_id.in_(farm_ids))
            .order_by(Recommendation.timestamp.desc())
            .limit(limit)
            .all()
        )

    def get_all_by_farms(self, farm_ids: list, limit: int = 200):
        if not farm_ids:
            return []
        from app.models.domain import Recommendation, AnimalUnit
        return (
            self.repo.db.query(Recommendation)
            .join(AnimalUnit, Recommendation.unit_id == AnimalUnit.id)
            .filter(AnimalUnit.farm_id.in_(farm_ids))
            .order_by(Recommendation.timestamp.desc())
            .limit(limit)
            .all()
        )

    def create(self, data: RecommendationCreate):
        payload = data.model_dump()
        payload["timestamp"] = datetime.now(timezone.utc)
        return self.repo.create(payload)

    def get_all(self, limit: int = 200):
        return self.repo.get_all(limit=limit)

    def mark_actioned(self, rec_id: int):
        return self.repo.mark_actioned(rec_id)


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

    def list_reports_by_farms(self, farm_ids: list):
        """BUG#4 FIXED: scoped to user's farms."""
        if not farm_ids:
            return []
        from app.models.domain import Report
        return (
            self.repo.db.query(Report)
            .filter(Report.farm_id.in_(farm_ids))
            .order_by(Report.created_at.desc())
            .limit(200)
            .all()
        )

    def generate(self, data: ReportGenerateRequest):
        """Build summary stats and persist report."""
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

    async def generate_intelligent(self, farm_id: int, report_type: str):
        """
        Build an intelligent strategic report using AI.
        """
        from app.services.mllm_service import mllm_service
        from app.models.domain import Alert, Anomaly, AnimalUnit
        db = self.repo.db

        # 1. Collect Data
        animal_count = db.query(func.count(AnimalUnit.id)).filter(AnimalUnit.farm_id == farm_id).scalar() or 0
        avg_health = db.query(func.avg(AnimalUnit.health_score)).filter(AnimalUnit.farm_id == farm_id).scalar() or 0
        active_alerts = db.query(func.count(Alert.id)).join(AnimalUnit).filter(
            AnimalUnit.farm_id == farm_id, Alert.is_resolved == False
        ).scalar() or 0
        critical_alerts = db.query(func.count(Alert.id)).join(AnimalUnit).filter(
            AnimalUnit.farm_id == farm_id, Alert.is_resolved == False, Alert.severity == "critical"
        ).scalar() or 0

        recent_anomalies = db.query(Anomaly.anomaly_type).join(AnimalUnit).filter(
            AnimalUnit.farm_id == farm_id
        ).order_by(Anomaly.timestamp.desc()).limit(5).all()
        top_anomalies = ", ".join(list(set([r[0] for r in recent_anomalies]))) if recent_anomalies else "Aucune"

        # 2. Call AI
        stats = {
            "animal_count": animal_count,
            "avg_health": round(float(avg_health), 1),
            "active_alerts": active_alerts,
            "critical_alerts": critical_alerts,
            "top_anomalies": top_anomalies
        }

        summary_text = await mllm_service.generate_strategic_report(stats)

        # 3. Save Report
        title = f"Rapport Intelligent ({report_type.capitalize()}) — {datetime.now().strftime('%d/%m/%Y')}"
        report = Report(
            farm_id=farm_id,
            report_type=report_type,
            title=title,
            period_start=datetime.now(timezone.utc) - timedelta(days=7),
            period_end=datetime.now(timezone.utc),
            summary={"ai_insight": summary_text, **stats},
            generated_by="AI Agent",
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

    def get_stats(self, farm_ids: list = None) -> DashboardStats:
        """BUG#5 FIXED: all counts scoped to the user's own farms."""
        from app.models.domain import Farm, AnimalUnit, AnimalType, Alert, Anomaly, BeeHive, BeeApiary

        if farm_ids is None:
            farm_ids = []

        total_farms = len(farm_ids)

        # Classic animal units
        unit_q = self.db.query(func.count(AnimalUnit.id))
        if farm_ids:
            unit_q = unit_q.filter(AnimalUnit.farm_id.in_(farm_ids))
        total_units = unit_q.scalar() or 0

        # Bee hives — filter via apiary.farm_id
        hive_q = (
            self.db.query(func.count(BeeHive.id))
            .join(BeeApiary, BeeHive.apiary_id == BeeApiary.id)
        )
        if farm_ids:
            hive_q = hive_q.filter(BeeApiary.farm_id.in_(farm_ids))
        total_hives = hive_q.scalar() or 0

        # Active & critical alerts
        alert_base = (
            self.db.query(func.count(Alert.id))
            .join(AnimalUnit, Alert.unit_id == AnimalUnit.id)
            .filter(Alert.is_resolved == False)
        )
        if farm_ids:
            alert_base = alert_base.filter(AnimalUnit.farm_id.in_(farm_ids))

        active_alerts = alert_base.scalar() or 0
        critical_alerts = (
            alert_base.filter(Alert.severity == "critical").scalar() or 0
            if False  # can't re-filter after .scalar() — rebuild
            else (
                self.db.query(func.count(Alert.id))
                .join(AnimalUnit, Alert.unit_id == AnimalUnit.id)
                .filter(
                    Alert.is_resolved == False,
                    Alert.severity == "critical",
                    *(([AnimalUnit.farm_id.in_(farm_ids)] if farm_ids else [])),
                )
                .scalar() or 0
            )
        )

        # Average health score
        health_q = self.db.query(func.avg(AnimalUnit.health_score))
        if farm_ids:
            health_q = health_q.filter(AnimalUnit.farm_id.in_(farm_ids))
        avg_health = health_q.scalar()

        # Recent anomalies (24 h)
        cutoff = datetime.now(timezone.utc) - timedelta(hours=24)
        anom_q = (
            self.db.query(func.count(Anomaly.id))
            .join(AnimalUnit, Anomaly.unit_id == AnimalUnit.id)
            .filter(Anomaly.timestamp >= cutoff)
        )
        if farm_ids:
            anom_q = anom_q.filter(AnimalUnit.farm_id.in_(farm_ids))
        recent_anomalies = anom_q.scalar() or 0

        # Units per species
        species_q = (
            self.db.query(AnimalType.species, func.count(AnimalUnit.id))
            .join(AnimalUnit, AnimalUnit.type_id == AnimalType.id)
        )
        if farm_ids:
            species_q = species_q.filter(AnimalUnit.farm_id.in_(farm_ids))
        species_counts = dict(species_q.group_by(AnimalType.species).all())

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
