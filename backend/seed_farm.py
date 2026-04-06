from app.core.database import Base, engine, SessionLocal
from app.models.domain import Farm

Base.metadata.create_all(bind=engine)
db = SessionLocal()
farm = Farm(name='Oasis Apiary', location='Sousse, Tunisia', latitude=35.777, longitude=10.826, status='active', total_area_ha=1.5)
db.add(farm)
db.commit()
print('Created Farm! id=', farm.id)
