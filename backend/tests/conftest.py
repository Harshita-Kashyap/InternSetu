"""Shared test setup: every test gets its own fresh SQLite database (no Postgres needed).

Fixtures
  client         empty database (tables only)
  admin          admin auth headers + a tiny seeded catalogue (use together with `client`)
  loaded_client  full taxonomy + 750 internships + 350 candidates (copied from a once-built template)
Helpers: API, GOOD, DATA_DIR, register(), auth_header(), make_admin()
"""
import os
import shutil
import tempfile
from pathlib import Path

_TMP = Path(tempfile.mkdtemp())
os.environ.update(DATABASE_URL=f"sqlite:///{_TMP / 'unused.db'}", SECRET_KEY="t" * 40)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402

from app.core.database import Base, get_db  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.main import app as fastapi_app  # noqa: E402
from app.models import (CandidateLink, CandidateProfile, Internship, InternshipSkill,  # noqa: E402
                        TaxonomyEntry, User)
from app.services import dataset_loader as loader  # noqa: E402
from app.services.recommendations import reset_engine  # noqa: E402

API = "/api/v1"
DATA_DIR = Path(__file__).resolve().parents[1] / "data"
GOOD = {"full_name": "Asha Verma", "email": "asha@example.com", "password": "Secret123", "consent": True}


def auth_header(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def register(client, **overrides):
    """POST /auth/register with GOOD plus overrides; a value of None removes that field."""
    body = {k: v for k, v in {**GOOD, **overrides}.items() if v is not None}
    if body.get("email") and "code" not in body:
        from app.core.config import settings
        from app.core.otp import make_code
        body["code"] = make_code(settings.secret_key, 0, body["email"].strip().lower(), "signup")
    return client.post(f"{API}/auth/register", json=body)


def make_admin(client, email="boss@example.com", password="AdminPass1") -> str:
    """Create an admin directly in the database and return its access token."""
    with client.db_factory() as db:
        db.add(User(full_name="Boss", email=email, password_hash=hash_password(password), role="admin"))
        db.commit()
    return client.post(f"{API}/auth/login", json={"identifier": email, "password": password}).json()["access_token"]


def _bind(db_path: Path):
    eng = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})
    return eng, sessionmaker(bind=eng, autoflush=False, autocommit=False)


def _client_for(db_path: Path):
    eng, factory = _bind(db_path)

    def _get_db():
        db = factory()
        try:
            yield db
        finally:
            db.close()

    fastapi_app.dependency_overrides[get_db] = _get_db
    reset_engine()
    from app.core import ratelimit  # forget failed-login counters between tests
    for v in vars(ratelimit).values():
        if isinstance(v, ratelimit.LoginLimiter):
            v._fails.clear()
    c = TestClient(fastapi_app)
    c.db_factory = factory
    return c, eng


@pytest.fixture
def client(tmp_path):
    path = tmp_path / "test.db"
    eng, _ = _bind(path)
    Base.metadata.create_all(eng)
    eng.dispose()
    c, eng = _client_for(path)
    yield c
    fastapi_app.dependency_overrides.clear()
    reset_engine()
    eng.dispose()


@pytest.fixture(scope="session")
def _template_db():
    path = _TMP / "template.db"
    eng, factory = _bind(path)
    Base.metadata.create_all(eng)
    with factory() as db:
        loader.load_taxonomy(db, DATA_DIR / "internsetu_taxonomy.json")
        loader.load_coordinates_csv(db, DATA_DIR / "locations_coordinates.csv")
        loader.load_internships(db, DATA_DIR / "internsetu_synthetic_internships_v1.json")
        loader.load_candidates(db, DATA_DIR / "internsetu_synthetic_candidates_v1.json")
    eng.dispose()
    return path


@pytest.fixture
def loaded_client(tmp_path, _template_db):
    path = tmp_path / "loaded.db"
    shutil.copy2(_template_db, path)
    c, eng = _client_for(path)
    yield c
    fastapi_app.dependency_overrides.clear()
    reset_engine()
    eng.dispose()


@pytest.fixture
def admin(client):
    """Tiny catalogue (2 cities, 3 skills, 1 internship, 1 synthetic candidate) + an admin login."""
    with client.db_factory() as db:
        add = lambda i, t, n, **k: db.add(TaxonomyEntry(id=i, type=t, name=n, **k))  # noqa: E731
        add("EDU1", "education_level", "Class 12", order_rank=1); add("EDU2", "education_level", "Undergraduate", order_rank=2)
        add("DEG1", "degree", "B.Tech"); add("FOS1", "field_of_study", "Computer Science")
        for i, n in [("SK1", "Python"), ("SK2", "SQL"), ("SK3", "Excel")]:
            add(i, "skill", n)
        add("SEC1", "sector", "IT"); add("SEC2", "sector", "Finance")
        add("ROL1", "role", "Developer"); add("ROL2", "role", "Analyst")
        add("C1", "city", "Indore"); add("C2", "city", "Pune")
        db.add(User(full_name="Admin", email="admin@test.com", password_hash=hash_password("Passw0rd!"), role="admin"))
        p = CandidateProfile(external_id="CAND1", is_synthetic=True, status="complete", education_level_id="EDU2", degree_id="DEG1",
                             field_of_study_id="FOS1", home_location_id="C1", willing_to_relocate=True, willing_to_travel=True)
        p.links = [CandidateLink(entry_id="SK1", kind="skill"), CandidateLink(entry_id="SK2", kind="skill"),
                   CandidateLink(entry_id="SEC1", kind="preferred_sector")]
        db.add(p)
        i = Internship(external_id="ISU-T1", company_name="Seed Corp", title="Seed Developer Intern", description="python backend",
                       sector_id="SEC1", role_id="ROL1", location_id="C1", min_education_id="EDU2", duration_label="8 weeks",
                       duration_weeks=8, stipend_inr_per_month=5000, facilities=[], is_active=True, is_synthetic=True)
        i.skills = [InternshipSkill(skill_id="SK1", kind="mandatory"), InternshipSkill(skill_id="SK2", kind="preferred")]
        db.add(i)
        db.commit()
    tok = client.post(f"{API}/auth/login", json={"identifier": "admin@test.com", "password": "Passw0rd!"}).json()["access_token"]
    return auth_header(tok)


@pytest.fixture(autouse=True)
def _fresh_otp_state():
    """Codes are single use and attempts are counted in memory; start every test with a clean slate."""
    from app.core.otp import otp_limiter, used_codes
    otp_limiter.clear()
    used_codes.clear()
    yield
