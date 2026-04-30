"""
Seed a test worker account for PWA development.

Usage:
    cd backend
    python seed_worker.py

The worker can then log in at /worker-login using:
    Phone : +21699000001
    OTP   : check the browser console for  DEBUG_OTP: XXXXXX
            (or the terminal if you print it here)
"""

import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal
from app.models.domain import User, Farm, WorkerAssignment
from app.core.security import hash_password

WORKER_PHONE    = "+21699000001"
WORKER_USERNAME = "ouvrier_test"
WORKER_NAME     = "Ouvrier Test"

db = SessionLocal()

try:
    # ── 1. Worker user ────────────────────────────────────────────────────────
    worker = db.query(User).filter(User.phone_number == WORKER_PHONE).first()
    if not worker:
        worker = User(
            username=WORKER_USERNAME,
            full_name=WORKER_NAME,
            phone_number=WORKER_PHONE,
            password_hash=hash_password("unused"),
            role="worker",
            is_active=True,
        )
        db.add(worker)
        db.commit()
        db.refresh(worker)
        print(f"[+] Worker created  id={worker.id}  phone={WORKER_PHONE}")
    else:
        # Make sure role is set correctly in case DB had an old value
        if worker.role != "worker":
            worker.role = "worker"
            db.commit()
        print(f"[=] Worker already exists  id={worker.id}  phone={WORKER_PHONE}")

    # ── 2. Farm (first one, or create a default) ──────────────────────────────
    farm = db.query(Farm).first()
    if not farm:
        farm = Farm(
            name="Ferme Test",
            description="Ferme par defaut pour les tests PWA",
            status="active",
        )
        db.add(farm)
        db.commit()
        db.refresh(farm)
        print(f"[+] Farm created  id={farm.id}  name={farm.name}")
    else:
        print(f"[=] Using existing farm  id={farm.id}  name={farm.name}")

    # ── 3. WorkerAssignment ───────────────────────────────────────────────────
    assignment = db.query(WorkerAssignment).filter(
        WorkerAssignment.worker_id == worker.id,
        WorkerAssignment.farm_id  == farm.id,
    ).first()

    if not assignment:
        assignment = WorkerAssignment(
            worker_id=worker.id,
            farm_id=farm.id,
            pin_code=hash_password("000000"),
            is_active=True,
        )
        db.add(assignment)
        db.commit()
        print(f"[+] Assignment created  worker={worker.id} -> farm={farm.id}")
    else:
        print(f"[=] Assignment already exists")

    print()
    print("=" * 50)
    print("  TEST WORKER READY")
    print("=" * 50)
    print(f"  URL   : /worker-login")
    print(f"  Phone : {WORKER_PHONE}")
    print(f"  OTP   : check browser console  =>  DEBUG_OTP: XXXXXX")
    print("=" * 50)

except Exception as e:
    db.rollback()
    print(f"[!] Error: {e}")
    raise
finally:
    db.close()
