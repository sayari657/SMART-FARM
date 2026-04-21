import sys, os
sys.path.insert(0, os.path.join(os.getcwd(), 'backend'))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.auth_service import AuthService
from app.schemas.domain import LoginRequest

def test_login():
    db = SessionLocal()
    auth = AuthService(db)
    try:
        print("Attempting login for 'admin'...")
        token = auth.login("admin", "admin123")
        print(f"Login Successful! Token: {token.access_token[:20]}...")
    except Exception as e:
        print(f"Login Failed with error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_login()
