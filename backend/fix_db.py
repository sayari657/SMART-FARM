from app.core.database import SessionLocal
from app.models.domain import Farm

db = SessionLocal()
farm = db.query(Farm).first()
if farm:
    farm.latitude = 35.777
    farm.longitude = 10.826
    db.commit()
    print("Fixed Farm Coordinates!")
else:
    print("No farm found.")
