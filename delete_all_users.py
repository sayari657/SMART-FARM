import os
import sys

# Get absolute path to the backend directory
current_dir = os.path.dirname(os.path.abspath(__file__))
backend_path = os.path.join(current_dir, 'backend')

if os.path.exists(backend_path):
    sys.path.append(backend_path)
else:
    sys.path.append(current_dir)

try:
    from app.core.database import SessionLocal
    from app.models.domain import User
except ImportError:
    # Try one level up if current_dir is inside backend
    sys.path.append(os.path.dirname(current_dir))
    from app.core.database import SessionLocal
    from app.models.domain import User

def delete_users():
    db = SessionLocal()
    try:
        count = db.query(User).delete()
        db.commit()
        print(f"Successfully deleted {count} users.")
    except Exception as e:
        db.rollback()
        print(f"Error during deletion: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    delete_users()
