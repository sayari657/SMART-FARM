"""
Smart Farm AI - Database Session Management
"""

from pathlib import Path
from sqlalchemy import create_engine, event
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Resolve the effective DB URL: SQLite when USE_SQLITE=True or PostgreSQL unavailable
if settings.USE_SQLITE or settings.DATABASE_URL.startswith("sqlite"):
    _db_file = Path(__file__).parent.parent.parent / "smart_farm.db"
    _effective_url = f"sqlite:///{_db_file}"
    connect_args = {"check_same_thread": False, "timeout": 15}
    _extra_kwargs = {}
else:
    _effective_url = settings.DATABASE_URL.strip()
    connect_args = {}
    _extra_kwargs = {"pool_size": 10, "max_overflow": 20}

engine = create_engine(
    _effective_url,
    connect_args=connect_args,
    pool_pre_ping=True,
    **_extra_kwargs
)

if _effective_url.startswith("sqlite"):
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.close()

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency: yields a database session and ensures it is closed."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
