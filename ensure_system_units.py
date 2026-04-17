import os
import sys

# Get absolute path to the backend directory
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(current_dir, 'backend')

if os.path.exists(backend_path):
    sys.path.append(backend_path)
else:
    sys.path.append(current_dir)

try:
    from app.core.database import SessionLocal
    from app.models.domain import AnimalUnit, AnimalType, Farm
except ImportError:
    sys.path.append(os.path.dirname(current_dir))
    from app.core.database import SessionLocal
    from app.models.domain import AnimalUnit, AnimalType, Farm

def ensure_units():
    db = SessionLocal()
    try:
        # 0. Ensure a dummy farm exists for system units
        farm = db.query(Farm).first()
        if not farm:
            farm = Farm(name="Smart Farm Headquarter", location="Remote Central")
            db.add(farm)
            db.flush()
            print("Created fallback Farm")
        
        # 1. Ensure AnimalTypes exist
        species_needed = ["environment", "plantation", "livestock", "bee"]
        type_ids = {}
        
        for s in species_needed:
            a_type = db.query(AnimalType).filter(AnimalType.species == s).first()
            if not a_type:
                a_type = AnimalType(
                    species=s,
                    display_name=f"Système {s.capitalize()}",
                    description=f"Monitoring automatique pour {s}"
                )
                db.add(a_type)
                db.flush()
                print(f"Created AnimalType: {s}")
            type_ids[s] = a_type.id
        
        # 2. Ensure System Units exist
        for s in species_needed:
            unit_name = f"System Monitor ({s.capitalize()})"
            unit = db.query(AnimalUnit).filter(AnimalUnit.name == unit_name).first()
            if not unit:
                unit = AnimalUnit(
                    name=unit_name,
                    farm_id=farm.id,
                    type_id=type_ids[s],
                    status="healthy",
                    health_score=100.0
                )
                db.add(unit)
                print(f"Created AnimalUnit: {unit_name}")
        
        db.commit()
        print("Success: Database is ready for CV persistence.")
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    ensure_units()
