from app.core.database import SessionLocal
from app.models.domain import AnimalType, AnimalUnit, Farm
from datetime import datetime

def seed_cv_units():
    db = SessionLocal()
    try:
        # 1. Get or Create a default Farm if none exists
        farm = db.query(Farm).first()
        if not farm:
            farm = Farm(name="Smart Farm Demo", location="Tunisia")
            db.add(farm)
            db.commit()
            db.refresh(farm)

        # 2. Define System Types & Units
        # species -> display_name
        system_types = {
            "environment": "Environment & Safety",
            "plantation":  "Plantation Zone",
            "livestock":   "General Livestock Monitor"
        }

        for species, display_name in system_types.items():
            # Check if type exists
            a_type = db.query(AnimalType).filter(AnimalType.species == species).first()
            if not a_type:
                a_type = AnimalType(
                    species=species,
                    display_name=display_name,
                    telemetry_schema={},
                    cv_classes=[]
                )
                db.add(a_type)
                db.commit()
                db.refresh(a_type)
            
            # Check if unit exists
            unit_name = f"System Monitor ({species.capitalize()})"
            unit = db.query(AnimalUnit).filter(AnimalUnit.name == unit_name).first()
            if not unit:
                unit = AnimalUnit(
                    farm_id=farm.id,
                    type_id=a_type.id,
                    name=unit_name,
                    status="healthy",
                    health_score=100.0
                )
                db.add(unit)
                db.commit()
                print(f"[OK] Seeded Unit: {unit_name}")

    except Exception as e:
        print(f"[ERROR] Seeding failed: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_cv_units()
