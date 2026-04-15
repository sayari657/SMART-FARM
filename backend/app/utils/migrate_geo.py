import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.domain import Farm, Veterinary
from geoalchemy2.elements import WKTElement

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def migrate_coordinates_to_geom():
    db = SessionLocal()
    try:
        # Migrate Farms
        farms = db.query(Farm).all()
        for f in farms:
            if f.latitude is not None and f.longitude is not None:
                # WKT: POINT(longitude latitude)
                f.geom = f"SRID=4326;POINT({f.longitude} {f.latitude})"
        
        # Migrate Vets (if any existed before adding the geom column)
        vets = db.query(Veterinary).all()
        for v in vets:
            if v.latitude is not None and v.longitude is not None:
                v.geom = f"SRID=4326;POINT({v.longitude} {v.latitude})"
                
        db.commit()
        logger.info(f"Successfully migrated {len(farms)} farms and {len(vets)} veterinarians.")
    except Exception as e:
        db.rollback()
        logger.error(f"Migration failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    migrate_coordinates_to_geom()
