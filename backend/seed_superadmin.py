"""
Create the first superadmin account.
Run once from backend/ directory:
    python seed_superadmin.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app.core.database import SessionLocal
from app.core.security import hash_password
from app.models.domain import User

db = SessionLocal()
try:
    existing = db.query(User).filter(User.role == "superadmin").first()
    if existing:
        print(f"SuperAdmin already exists: {existing.username}")
    else:
        admin = User(
            username="superadmin",
            email="admin@smartfarm.ai",
            full_name="InTech SuperAdmin",
            password_hash=hash_password("SuperAdmin2026!"),
            role="superadmin",
            plan="enterprise",
            is_active=True,
        )
        db.add(admin)
        db.commit()
        print("SuperAdmin created:")
        print("  username : superadmin")
        print("  password : SuperAdmin2026!")
        print("  Login    : http://localhost:5173/login")
finally:
    db.close()
