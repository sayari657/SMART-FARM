"""
Shared pytest fixtures — in-memory SQLite database, fresh for every test.
"""
import pytest
import warnings
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Suppress httpx and jose deprecation noise during tests
warnings.filterwarnings("ignore", category=DeprecationWarning, module="httpx")
warnings.filterwarnings("ignore", category=DeprecationWarning, module="jose")

from app.core.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "sqlite:///./test_bee.db"

engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="session", autouse=True)
def create_tables():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def db():
    connection = engine.connect()
    transaction = connection.begin()
    session = TestingSessionLocal(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db):
    from app.api.v1.endpoints.auth_routes import limiter as auth_limiter
    s = auth_limiter._storage
    s.storage.clear()
    s.expirations.clear()
    s.events.clear()

    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture()
def auth_headers(client):
    """Create admin user and return Bearer token headers."""
    resp = client.post("/api/v1/auth/register", json={
        "username": "test_admin",
        "password": "Test1234!",
        "email": "test@farm.ai",
        "full_name": "Test Admin",
        "role": "admin",
    })
    # 400/409 means user already exists — that's fine
    assert resp.status_code in (200, 201, 400, 409)

    resp = client.post("/api/v1/auth/login", json={
        "username": "test_admin",
        "password": "Test1234!",
    })
    assert resp.status_code == 200, f"Login failed: {resp.text}"
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}
