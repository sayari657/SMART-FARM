import logging
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.models.domain import Veterinary

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def seed_veterinarians():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(Veterinary).count() > 0:
            logger.info("Veterinarians already seeded.")
            return

        vets = [
            {
                "name": "Clinique Vétérinaire du Nord (Bousalem)",
                "specialty": "Large Animals & Bovine Health",
                "phone": "+216 78 600 001",
                "email": "contact@vet-bousalem.tn",
                "address": "Route de Jendouba, Bousalem",
                "latitude": 36.6111,
                "longitude": 8.9744
            },
            {
                "name": "Dr. Amel Vet (Tunis Centre)",
                "specialty": "Small Animals & Surgery",
                "phone": "+216 71 800 123",
                "email": "amel@vet-tunis.tn",
                "address": "Avenue Habib Bourguiba, Tunis",
                "latitude": 36.8065,
                "longitude": 10.1815
            },
            {
                "name": "Urgence Vétérinaire Sahel (Sousse)",
                "specialty": "Emergency Care",
                "phone": "+216 73 400 555",
                "email": "sousse@urgences-vet.tn",
                "address": "Boulevard du 14 Janvier, Sousse",
                "latitude": 35.8256,
                "longitude": 10.6084
            },
            {
                "name": "Dr. Sahbi Arfaoui (Beja)",
                "specialty": "Cattle & Poultry",
                "phone": "+216 78 456 789",
                "email": "sahbi@vet-beja.com",
                "address": "Centre-ville Beja",
                "latitude": 36.7256,
                "longitude": 9.1817
            }
        ]

        for v_data in vets:
            vet = Veterinary(
                name=v_data["name"],
                specialty=v_data["specialty"],
                phone=v_data["phone"],
                email=v_data["email"],
                address=v_data["address"],
                latitude=v_data["latitude"],
                longitude=v_data["longitude"],
                geom=f"SRID=4326;POINT({v_data['longitude']} {v_data['latitude']})"
            )
            db.add(vet)
        
        db.commit()
        logger.info(f"Successfully seeded {len(vets)} veterinarians.")
    except Exception as e:
        db.rollback()
        logger.error(f"Seeding failed: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_veterinarians()
