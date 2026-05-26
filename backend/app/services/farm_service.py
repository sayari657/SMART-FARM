"""
Smart Farm AI - Farm & Animal Service
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.repositories.farm_repo import FarmRepository, AnimalUnitRepository, AnimalTypeRepository
from app.schemas.domain import FarmCreate, FarmUpdate, AnimalUnitCreate, AnimalUnitUpdate


class FarmService:
    def __init__(self, db: Session):
        self.repo = FarmRepository(db)

    def list_farms(self) -> List[dict]:
        return self.repo.get_all_with_stats()

    def get_farm(self, farm_id: int) -> dict:
        result = self.repo.get_with_stats(farm_id)
        if not result:
            raise HTTPException(status_code=404, detail="Farm not found")
        return result

    def create_farm(self, data: FarmCreate, owner_id: int):
        return self.repo.create({**data.model_dump(), "owner_id": owner_id})

    def update_farm(self, farm_id: int, data: FarmUpdate):
        farm = self.repo.get(farm_id)
        if not farm:
            raise HTTPException(status_code=404, detail="Farm not found")
        return self.repo.update(farm, data.model_dump(exclude_none=True))

    def delete_farm(self, farm_id: int) -> bool:
        if not self.repo.get(farm_id):
            raise HTTPException(status_code=404, detail="Farm not found")
        return self.repo.delete(farm_id)


class AnimalService:
    def __init__(self, db: Session):
        self.repo = AnimalUnitRepository(db)
        self.type_repo = AnimalTypeRepository(db)

    def list_animals(self, farm_id: Optional[int] = None, species: Optional[str] = None):
        if farm_id and species:
            units = self.repo.get_by_farm_and_species(farm_id, species)
        elif farm_id:
            units = self.repo.get_by_farm(farm_id)
        elif species:
            units = self.repo.get_by_species(species)
        else:
            units = self.repo.get_all_with_relations()
        return units

    def get_animal(self, unit_id: int):
        unit = self.repo.get_with_relations(unit_id)
        if not unit:
            raise HTTPException(status_code=404, detail="Animal unit not found")
        return unit

    def create_animal(self, data: AnimalUnitCreate):
        # Verify the farm and animal type exist
        # type check only; farm_repo would raise if not found
        return self.repo.create(data.model_dump())

    def update_animal(self, unit_id: int, data: AnimalUnitUpdate):
        unit = self.repo.get(unit_id)
        if not unit:
            raise HTTPException(status_code=404, detail="Animal unit not found")
        return self.repo.update(unit, data.model_dump(exclude_none=True))

    def delete_animal(self, unit_id: int) -> bool:
        if not self.repo.get(unit_id):
            raise HTTPException(status_code=404, detail="Animal unit not found")
        return self.repo.delete(unit_id)

    def list_types(self):
        return self.type_repo.get_all()

    def create_type(self, data):
        return self.type_repo.create(data.model_dump())
