"""
Smart Farm AI - Farm & Animal Repositories
"""

from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from app.repositories.base import BaseRepository
from app.models.domain import Farm, AnimalUnit, AnimalType, Sensor


class FarmRepository(BaseRepository[Farm]):
    def __init__(self, db: Session):
        super().__init__(Farm, db)

    def get_by_owner(self, owner_id: int) -> List[Farm]:
        return self.db.query(Farm).filter(Farm.owner_id == owner_id).all()

    def get_with_stats(self, farm_id: int) -> Optional[dict]:
        """Return farm with computed stats."""
        from app.models.domain import Alert
        farm = self.db.query(Farm).filter(Farm.id == farm_id).first()
        if not farm:
            return None
        unit_count = self.db.query(func.count(AnimalUnit.id)).filter(
            AnimalUnit.farm_id == farm_id
        ).scalar()
        active_alerts = self.db.query(func.count(Alert.id)).join(
            AnimalUnit, Alert.unit_id == AnimalUnit.id
        ).filter(
            AnimalUnit.farm_id == farm_id,
            Alert.is_resolved == False
        ).scalar()
        avg_health = self.db.query(func.avg(AnimalUnit.health_score)).filter(
            AnimalUnit.farm_id == farm_id
        ).scalar()
        return {
            "farm": farm,
            "unit_count": unit_count or 0,
            "active_alerts": active_alerts or 0,
            "avg_health_score": round(avg_health, 1) if avg_health else None,
        }

    def get_all_with_stats(self) -> List[dict]:
        farms = self.get_all(limit=1000)
        return [self.get_with_stats(f.id) for f in farms]


class AnimalTypeRepository(BaseRepository[AnimalType]):
    def __init__(self, db: Session):
        super().__init__(AnimalType, db)

    def get_by_species(self, species: str) -> Optional[AnimalType]:
        return self.db.query(AnimalType).filter(AnimalType.species == species).first()


class AnimalUnitRepository(BaseRepository[AnimalUnit]):
    def __init__(self, db: Session):
        super().__init__(AnimalUnit, db)

    def get_by_farm(self, farm_id: int) -> List[AnimalUnit]:
        return (
            self.db.query(AnimalUnit)
            .options(joinedload(AnimalUnit.animal_type), joinedload(AnimalUnit.farm))
            .filter(AnimalUnit.farm_id == farm_id)
            .all()
        )

    def get_by_farm_and_species(self, farm_id: int, species: str) -> List[AnimalUnit]:
        return (
            self.db.query(AnimalUnit)
            .options(joinedload(AnimalUnit.animal_type), joinedload(AnimalUnit.farm))
            .join(AnimalType)
            .filter(AnimalUnit.farm_id == farm_id, AnimalType.species == species)
            .all()
        )

    def get_by_species(self, species: str) -> List[AnimalUnit]:
        return (
            self.db.query(AnimalUnit)
            .options(joinedload(AnimalUnit.animal_type), joinedload(AnimalUnit.farm))
            .join(AnimalType)
            .filter(AnimalType.species == species)
            .all()
        )

    def get_with_relations(self, unit_id: int) -> Optional[AnimalUnit]:
        return (
            self.db.query(AnimalUnit)
            .options(
                joinedload(AnimalUnit.animal_type),
                joinedload(AnimalUnit.farm),
                joinedload(AnimalUnit.sensors),
            )
            .filter(AnimalUnit.id == unit_id)
            .first()
        )

    def get_all_with_relations(self, skip: int = 0, limit: int = 100) -> List[AnimalUnit]:
        return (
            self.db.query(AnimalUnit)
            .options(joinedload(AnimalUnit.animal_type), joinedload(AnimalUnit.farm))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def update_health_score(self, unit_id: int, score: float) -> Optional[AnimalUnit]:
        unit = self.get(unit_id)
        if unit:
            unit.health_score = max(0.0, min(100.0, score))
            if score < 40:
                unit.status = "critical"
            elif score < 70:
                unit.status = "warning"
            else:
                unit.status = "healthy"
            self.db.commit()
            self.db.refresh(unit)
        return unit


class SensorRepository(BaseRepository[Sensor]):
    def __init__(self, db: Session):
        super().__init__(Sensor, db)

    def get_by_unit(self, unit_id: int) -> List[Sensor]:
        return self.db.query(Sensor).filter(Sensor.unit_id == unit_id).all()
