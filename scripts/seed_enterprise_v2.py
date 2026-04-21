"""
Smart Farm AI - Enterprise Seed Script v2.0 (UUID & Multi-Tenant)
Run: python scripts/seed_enterprise_v2.py
"""

import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from datetime import datetime, timedelta
import random
import uuid
from sqlalchemy.orm import Session
from app.core.database import engine, Base, SessionLocal
from app.models.domain import (
    Tenant, User, Farm, AnimalType, AnimalUnit, Sensor, TelemetryRecord,
    CVEvent, Anomaly, Alert, Recommendation, Report, Settings,
    Veterinary, Market
)
from app.core.config import settings as cfg
from app.core.security import hash_password as _hash

def seed_enterprise_v2():
    print("=" * 60)
    print("  Smart Farm AI — Enterprise Seed v2.0")
    print("=" * 60)

    db: Session = SessionLocal()
    try:
        # 1. Create Tenant
        tenant = Tenant(
            name="Exploitation Agricole Souveraine",
            plan="enterprise"
        )
        db.add(tenant)
        db.flush()
        print(f"[TENANT] Created: {tenant.name} ({tenant.id})")

        # 2. Seed Animal Types (Global species)
        atypes = {
            "bee": AnimalType(species="bee", display_name="Abeilles", telemetry_schema={"temperature": "°C", "weight": "kg"}),
            "cow": AnimalType(species="cow", display_name="Bovins", telemetry_schema={"milk_yield": "L/day"}),
            "poultry": AnimalType(species="poultry", display_name="Volailles", telemetry_schema={"temperature": "°C"}),
            "sheep": AnimalType(species="sheep", display_name="Ovins", telemetry_schema={"weight": "kg"}),
            "goat": AnimalType(species="goat", display_name="Caprins", telemetry_schema={"milk_yield": "L/day"}),
        }
        db.add_all(atypes.values())
        db.flush()
        print(f"[ANIMAL_TYPES] Seeded {len(atypes)} species.")

        # 3. Seed Users
        admin_user = User(
            tenant_id=tenant.id,
            username="admin",
            email="admin@smartfarm.tn",
            full_name="Directeur Technique",
            password_hash=_hash("admin123"),
            role="admin"
        )
        db.add(admin_user)
        db.flush()
        print(f"[USERS] Seeded admin user linked to tenant.")

        # 4. Seed Farms
        farm = Farm(
            tenant_id=tenant.id,
            owner_id=admin_user.id,
            name="Ferme Apicole Atlas (Béja)",
            location="Beja, Tunisie",
            latitude=36.7256,
            longitude=9.1817,
            status="active"
        )
        db.add(farm)
        db.flush()
        print(f"[FARMS] Seeded farm: {farm.name}")

        # 5. Seed Animal Units (Hives)
        units = []
        for i in range(1, 11):
            u = AnimalUnit(
                tenant_id=tenant.id,
                farm_id=farm.id,
                type_id=atypes["bee"].id,
                name=f"RUCHE_{i:02d}",
                identifier=f"BEE-BEJA-{i:03d}",
                status="healthy",
                health_score=round(random.uniform(85, 98), 1)
            )
            units.append(u)
        db.add_all(units)
        db.flush()
        print(f"[UNITS] Seeded {len(units)} hives.")

        # 6. Seed Telemetry (last 24 hours)
        records = []
        now = datetime.utcnow()
        for u in units:
            for h in range(24):
                ts = now - timedelta(hours=h)
                records.append(TelemetryRecord(
                    tenant_id=tenant.id,
                    unit_id=u.id,
                    timestamp=ts,
                    metrics={"temperature": round(34.5 + random.uniform(-1, 1), 2), "weight": round(42 + random.uniform(-2, 2), 1)},
                    source="simulator"
                ))
        db.add_all(records)
        print(f"[TELEMETRY] Seeded {len(records)} records.")

        db.commit()
        print("=" * 60)
        print("  ✓ Sprint 1 Seeding Complete!")
        print(f"  Tenant ID: {tenant.id}")
        print(f"  Login: admin / admin123")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Seed failed: {e}")
        import traceback; traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    seed_enterprise_v2()
