import os

os.environ.setdefault("DATABASE_URL", "sqlite://")
os.environ.setdefault("SECRET_KEY", "test-secret-key-for-pytest-only-1234567890")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import models  # noqa: F401
from app.core.database import Base, get_db
from app.core.ratelimit import login_limiter
from app.core.security import hash_password
from app.main import app as fastapi_app
from app.models import User
from app.models.user import ROLE_ADMIN


@pytest.fixture()
def client():
    engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine, autoflush=False, autocommit=False)

    def override_get_db():
        db = Session()
        try:
            yield db
        finally:
            db.close()

    fastapi_app.dependency_overrides[get_db] = override_get_db
    login_limiter.clear()
    with TestClient(fastapi_app) as c:
        c.db_factory = Session
        yield c
    fastapi_app.dependency_overrides.clear()
    engine.dispose()


API = "/api/v1"
GOOD = {
    "full_name": "Asha Verma",
    "email": "asha@example.com",
    "password": "Secret123",
    "consent": True,
}


def register(client, **overrides):
    return client.post(f"{API}/auth/register", json={**GOOD, **overrides})


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def make_admin(client, email="admin@example.com", password="AdminPass1"):
    with client.db_factory() as db:
        db.add(User(full_name="Admin", email=email, password_hash=hash_password(password), role=ROLE_ADMIN))
        db.commit()
    r = client.post(f"{API}/auth/login", json={"identifier": email, "password": password})
    return r.json()["access_token"]


from pathlib import Path

DATA_DIR = Path(__file__).resolve().parents[1] / "data"


@pytest.fixture()
def loaded_client(client):
    """client + taxonomy, coordinates, internships, candidates loaded from ./data"""
    from app.services import dataset_loader as loader

    with client.db_factory() as db:
        loader.load_taxonomy(db, DATA_DIR / "internsetu_taxonomy.json")
        loader.load_coordinates_csv(db, DATA_DIR / "locations_coordinates.csv")
        loader.load_internships(db, DATA_DIR / "internsetu_synthetic_internships_v1.json")
        loader.load_candidates(db, DATA_DIR / "internsetu_synthetic_candidates_v1.json")
    return client
