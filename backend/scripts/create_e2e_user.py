"""Crée (ou réinitialise) le compte de test E2E Playwright.

- Utilisateur : e2e_owner / E2eOwner2026!  (role owner, plan pro)
- Ferme dédiée : « E2E Test Farm » (additive — ne touche aucune ferme existante)

Usage : python scripts/create_e2e_user.py
Puis  : $env:E2E_OWNER_USER='e2e_owner'; $env:E2E_OWNER_PASS='E2eOwner2026!'; npx playwright test
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.domain import Farm, User  # noqa: E402

USERNAME, PASSWORD = "e2e_owner", "E2eOwner2026!"


def main():
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.username == USERNAME).first()
        if user is None:
            user = User(
                username=USERNAME, email="e2e@smartfarm.test",
                full_name="E2E Test Owner", role="owner", plan="pro",
                password_hash=hash_password(PASSWORD), is_active=True,
            )
            db.add(user)
            db.flush()
            print(f"Utilisateur {USERNAME} créé (id={user.id})")
        else:
            user.password_hash = hash_password(PASSWORD)
            user.is_active = True
            print(f"Utilisateur {USERNAME} existant — mot de passe réinitialisé (id={user.id})")

        farm = db.query(Farm).filter(Farm.owner_id == user.id).first()
        if farm is None:
            farm = Farm(owner_id=user.id, name="E2E Test Farm",
                        location="Tunis (test)", latitude=36.8, longitude=10.1,
                        status="active")
            db.add(farm)
            print("Ferme 'E2E Test Farm' créée")
        db.commit()
        print("OK — identifiants :", USERNAME, "/", PASSWORD)
    finally:
        db.close()


if __name__ == "__main__":
    main()
