import logging
import os
import sys

# Ensure backend directory is in path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.domain import Veterinary, Farm
from sqlalchemy import text

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_tunisia_data():
    db = SessionLocal()
    try:
        # 1. CURATED VETERINARIANS
        vets = [
            {"name": "Clinique Vétérinaire El Menzah (Tunis)", "specialty": "Advanced Diagnostics", "phone": "+216 71 234 567", "address": "El Menzah VI, Tunis", "lat": 36.839, "lon": 10.180},
            {"name": "Vet Pro Nord (Bousalem)", "specialty": "Bovine Health & Dairy", "phone": "+216 78 611 222", "address": "Route de Jendouba, Bousalem", "lat": 36.611, "lon": 8.974},
            {"name": "Clinique Vétérinaire du Sahel (Sousse)", "specialty": "Pet & Poultry Surgery", "phone": "+216 73 825 000", "address": "Boulevard 14 Janvier, Sousse", "lat": 35.825, "lon": 10.608},
            {"name": "Cabinet Dr. Amiri (Beja)", "specialty": "Livestock Management", "phone": "+216 78 456 123", "address": "Centre Ville, Beja", "lat": 36.725, "lon": 9.181},
            {"name": "Cabinet Vet Sfax Sud", "specialty": "Emergency Services", "phone": "+216 74 123 999", "address": "Route de Gabès, Sfax", "lat": 34.740, "lon": 10.760}
        ]

        # 2. CURATED SMART FARMS
        farms = [
            {"name": "Smart Bee Farm El Fejja", "location": "Manouba", "lat": 36.800, "lon": 9.950, "desc": "High-precision apiculture site."},
            {"name": "Poultry Alpha Mateur", "location": "Bizerte", "lat": 37.040, "lon": 9.665, "desc": "Automated poultry monitoring."},
            {"name": "AgroSovereign Test Farm", "location": "Ben Arous", "lat": 36.755, "lon": 10.220, "desc": "GIS R&D Hub."}
        ]

        # Clear existing to avoid duplicates in demo
        db.query(Veterinary).delete()
        db.query(Farm).delete()
        db.commit()

        # Seed Vets
        for v_data in vets:
            vet = Veterinary(
                name=v_data["name"],
                specialty=v_data["specialty"],
                phone=v_data["phone"],
                address=v_data["address"],
                latitude=v_data["lat"],
                longitude=v_data["lon"],
                geom=f"SRID=4326;POINT({v_data['lon']} {v_data['lat']})"
            )
            db.add(vet)
        
        # Seed Farms
        for f_data in farms:
            farm = Farm(
                name=f_data["name"],
                location=f_data["location"],
                description=f_data["desc"],
                latitude=f_data["lat"],
                longitude=f_data["lon"],
                geom=f"SRID=4326;POINT({f_data['lon']} {f_data['lat']})",
                status="active"
            )
            db.add(farm)

        db.commit()
        logger.info(f"Successfully seeded {len(vets)} veterinarians and {len(farms)} farms into Tunisia GIS.")

    except Exception as e:
        db.rollback()
        logger.error(f"Seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_tunisia_data()
