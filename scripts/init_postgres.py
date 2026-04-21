import sys
import os

# Add backend to sys.path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.database import engine, Base
from app.models import domain

def init_db():
    print("Dropping and re-creating tables in PostgreSQL...")
    try:
        # Enable UUID extension just in case (though we use python-side uuid4)
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"))
            # Drop all tables first for a clean state in this sprint
            Base.metadata.drop_all(bind=engine)
            conn.commit()
            
        Base.metadata.create_all(bind=engine)
        print("Successfully re-created all tables.")
    except Exception as e:
        print(f"Error initializing DB: {e}")

if __name__ == "__main__":
    init_db()
