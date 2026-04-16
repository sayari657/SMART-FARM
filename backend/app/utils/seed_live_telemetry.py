import sys
import os
import random
from datetime import datetime

# Path setup
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal, engine, Base
from app.models.domain import Farm, AnimalType, AnimalUnit, TelemetryRecord

def bootstrap_live_telemetry():
    db = SessionLocal()
    try:
        # 0. Ensure Tables Exist
        Base.metadata.create_all(bind=engine)
        print("Confirmed: Database tables initialized.")

        # 1. Ensure 'bee' type exists
        bee_type = db.query(AnimalType).filter(AnimalType.species == "bee").first()
        if not bee_type:
            bee_type = AnimalType(
                species="bee",
                display_name="Apiculture",
                description="Hives with weight, temp, and humidity sensors.",
                telemetry_schema={"weight": "float", "temperature": "float", "humidity": "float"}
            )
            db.add(bee_type)
            db.commit()
            db.refresh(bee_type)
            print("Added 'bee' animal type.")

        # 2. Ensure a Main Farm exists for anchor
        farm = db.query(Farm).first()
        if not farm:
            farm = Farm(
                name="Sovereign Smart Farm Manouba",
                location="Manouba, Tunisia",
                latitude=36.8065,
                longitude=10.1815,
                status="active"
            )
            db.add(farm)
            db.commit()
            db.refresh(farm)
            print(f"Added anchor farm: {farm.name}")

        # 3. Create 3 Hives
        hives_data = [
            {"name": "Ruche Smart #01 (Manouba)", "id_str": "HIVE_M_01"},
            {"name": "Ruche Smart #02 (Tunis)", "id_str": "HIVE_T_02"},
            {"name": "Ruche Alpha #03 (Bizerte)", "id_str": "HIVE_B_03"}
        ]

        # Use 10.18, 36.8 as center
        # Hives already existed in localStorage, but we move them to DB for sensors
        for i, hd in enumerate(hives_data):
            hive_unit = db.query(AnimalUnit).filter(AnimalUnit.name == hd["name"]).first()
            if not hive_unit:
                hive_unit = AnimalUnit(
                    farm_id=farm.id,
                    type_id=bee_type.id,
                    name=hd["name"],
                    identifier=hd["id_str"],
                    status="healthy",
                    health_score=95.5 + i
                )
                db.add(hive_unit)
                db.commit()
                db.refresh(hive_unit)
                print(f"Created hive: {hd['name']}")

            # 4. Add LIVE telemetery
            # We add a record for NOW
            metrics = {
                "weight": round(70.0 + (random.random() * 30), 2),
                "temperature": round(32.0 + (random.random() * 4), 1),
                "humidity": round(55.0 + (random.random() * 15), 0)
            }
            
            telemetry = TelemetryRecord(
                unit_id=hive_unit.id,
                metrics=metrics,
                timestamp=datetime.utcnow(),
                source="simulator"
            )
            db.add(telemetry)
            print(f"  -> Added live metrics for {hd['name']}: {metrics}")

        db.commit()
        print("Success: Live Telemetry Seeding Complete.")

    except Exception as e:
        db.rollback()
        print(f"Seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    bootstrap_live_telemetry()
