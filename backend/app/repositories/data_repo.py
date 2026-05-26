"""
Smart Farm AI - Telemetry, CV, Anomaly, Alert, Recommendation, Report, Settings Repositories
"""

from typing import List, Optional, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from app.repositories.base import BaseRepository
from app.models.domain import (
    TelemetryRecord, CVEvent, Anomaly, Alert,
    Recommendation, Report, Settings, AnimalUnit
)


class TelemetryRepository(BaseRepository[TelemetryRecord]):
    def __init__(self, db: Session):
        super().__init__(TelemetryRecord, db)

    def get_by_unit(self, unit_id: int, limit: int = 200) -> List[TelemetryRecord]:
        return (
            self.db.query(TelemetryRecord)
            .filter(TelemetryRecord.unit_id == unit_id)
            .order_by(desc(TelemetryRecord.timestamp))
            .limit(limit)
            .all()
        )

    def get_latest(self, unit_id: int) -> Optional[TelemetryRecord]:
        return (
            self.db.query(TelemetryRecord)
            .filter(TelemetryRecord.unit_id == unit_id)
            .order_by(desc(TelemetryRecord.timestamp))
            .first()
        )

    def get_range(self, unit_id: int, start: datetime, end: datetime) -> List[TelemetryRecord]:
        return (
            self.db.query(TelemetryRecord)
            .filter(
                TelemetryRecord.unit_id == unit_id,
                TelemetryRecord.timestamp >= start,
                TelemetryRecord.timestamp <= end,
            )
            .order_by(TelemetryRecord.timestamp)
            .all()
        )

    def get_recent_all_units(self, limit_per_unit: int = 1) -> List[TelemetryRecord]:
        """Latest record for every unit (used for dashboard KPIs)."""
        subq = (
            self.db.query(
                TelemetryRecord.unit_id,
                func.max(TelemetryRecord.timestamp).label("max_ts"),
            )
            .group_by(TelemetryRecord.unit_id)
            .subquery()
        )
        return (
            self.db.query(TelemetryRecord)
            .join(subq, (TelemetryRecord.unit_id == subq.c.unit_id) &
                        (TelemetryRecord.timestamp == subq.c.max_ts))
            .all()
        )


class CVEventRepository(BaseRepository[CVEvent]):
    def __init__(self, db: Session):
        super().__init__(CVEvent, db)

    def get_by_unit(self, unit_id: int, limit: int = 100) -> List[CVEvent]:
        return (
            self.db.query(CVEvent)
            .filter(CVEvent.unit_id == unit_id)
            .order_by(desc(CVEvent.timestamp))
            .limit(limit)
            .all()
        )

    def get_recent(self, limit: int = 50) -> List[CVEvent]:
        return (
            self.db.query(CVEvent)
            .options(joinedload(CVEvent.unit))
            .order_by(desc(CVEvent.timestamp))
            .limit(limit)
            .all()
        )

    def get_by_severity(self, severity: str, limit: int = 100) -> List[CVEvent]:
        return (
            self.db.query(CVEvent)
            .filter(CVEvent.severity == severity)
            .order_by(desc(CVEvent.timestamp))
            .limit(limit)
            .all()
        )


class AnomalyRepository(BaseRepository[Anomaly]):
    def __init__(self, db: Session):
        super().__init__(Anomaly, db)

    def get_by_unit(self, unit_id: int, limit: int = 50) -> List[Anomaly]:
        return (
            self.db.query(Anomaly)
            .filter(Anomaly.unit_id == unit_id)
            .order_by(desc(Anomaly.timestamp))
            .limit(limit)
            .all()
        )

    def get_recent(self, limit: int = 50) -> List[Anomaly]:
        return (
            self.db.query(Anomaly)
            .order_by(desc(Anomaly.timestamp))
            .limit(limit)
            .all()
        )

    def count_recent(self, hours: int = 24) -> int:
        from datetime import timedelta
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        return (
            self.db.query(func.count(Anomaly.id))
            .filter(Anomaly.timestamp >= cutoff)
            .scalar()
        )


class AlertRepository(BaseRepository[Alert]):
    def __init__(self, db: Session):
        super().__init__(Alert, db)

    def get_by_unit(self, unit_id: int, limit: int = 50) -> List[Alert]:
        return (
            self.db.query(Alert)
            .filter(Alert.unit_id == unit_id)
            .order_by(desc(Alert.timestamp))
            .limit(limit)
            .all()
        )

    def get_active(self, limit: int = 200) -> List[Alert]:
        return (
            self.db.query(Alert)
            .options(joinedload(Alert.unit).joinedload(AnimalUnit.farm))
            .filter(Alert.is_resolved == False)
            .order_by(desc(Alert.timestamp))
            .limit(limit)
            .all()
        )

    def get_critical(self, limit: int = 50) -> List[Alert]:
        return (
            self.db.query(Alert)
            .filter(Alert.severity == "critical", Alert.is_resolved == False)
            .order_by(desc(Alert.timestamp))
            .limit(limit)
            .all()
        )

    def resolve(self, alert_id: int, resolved_by: str = "system") -> Optional[Alert]:
        alert = self.get(alert_id)
        if alert:
            alert.is_resolved = True
            alert.resolved_at = datetime.now(timezone.utc)
            alert.resolved_by = resolved_by
            self.db.commit()
            self.db.refresh(alert)
        return alert

    def count_active(self) -> int:
        return self.db.query(func.count(Alert.id)).filter(Alert.is_resolved == False).scalar()

    def count_critical(self) -> int:
        return (
            self.db.query(func.count(Alert.id))
            .filter(Alert.is_resolved == False, Alert.severity == "critical")
            .scalar()
        )


class RecommendationRepository(BaseRepository[Recommendation]):
    def __init__(self, db: Session):
        super().__init__(Recommendation, db)

    def get_by_unit(self, unit_id: int, limit: int = 50) -> List[Recommendation]:
        return (
            self.db.query(Recommendation)
            .filter(Recommendation.unit_id == unit_id)
            .order_by(desc(Recommendation.timestamp))
            .limit(limit)
            .all()
        )

    def get_pending(self, limit: int = 100) -> List[Recommendation]:
        return (
            self.db.query(Recommendation)
            .options(joinedload(Recommendation.unit))
            .filter(Recommendation.is_actioned == False)
            .order_by(desc(Recommendation.timestamp))
            .limit(limit)
            .all()
        )

    def get_all(self, limit: int = 200) -> List[Recommendation]:
        return (
            self.db.query(Recommendation)
            .options(joinedload(Recommendation.unit))
            .order_by(desc(Recommendation.timestamp))
            .limit(limit)
            .all()
        )

    def mark_actioned(self, rec_id: int) -> Recommendation:
        rec = self.db.query(Recommendation).filter(Recommendation.id == rec_id).first()
        if rec:
            rec.is_actioned = True
            self.db.commit()
            self.db.refresh(rec)
        return rec


class ReportRepository(BaseRepository[Report]):
    def __init__(self, db: Session):
        super().__init__(Report, db)

    def get_by_farm(self, farm_id: int) -> List[Report]:
        return (
            self.db.query(Report)
            .filter(Report.farm_id == farm_id)
            .order_by(desc(Report.created_at))
            .all()
        )


class SettingsRepository(BaseRepository[Settings]):
    def __init__(self, db: Session):
        super().__init__(Settings, db)

    def get_by_farm(self, farm_id: int) -> List[Settings]:
        return self.db.query(Settings).filter(Settings.farm_id == farm_id).all()

    def get_by_key(self, key: str, farm_id: Optional[int] = None) -> Optional[Settings]:
        q = self.db.query(Settings).filter(Settings.key == key)
        if farm_id:
            q = q.filter(Settings.farm_id == farm_id)
        return q.first()

    def upsert(self, key: str, value: Any, farm_id: Optional[int] = None,
               animal_type_id: Optional[int] = None, description: str = "") -> Settings:
        existing = self.get_by_key(key, farm_id)
        if existing:
            existing.value = value
            existing.description = description
            self.db.commit()
            self.db.refresh(existing)
            return existing
        return self.create({
            "key": key, "value": value,
            "farm_id": farm_id, "animal_type_id": animal_type_id,
            "description": description,
        })
