from sqlalchemy import func, select

from app.models import CandidateLink, CandidateProfile, Internship, InternshipSkill, TaxonomyEntry, TaxonomySynonym
from app.services import dataset_loader as loader
from tests.conftest import DATA_DIR


def test_counts_after_load(loaded_client):
    with loaded_client.db_factory() as db:
        assert db.scalar(select(func.count()).select_from(Internship)) == 750
        assert db.scalar(select(func.count()).select_from(CandidateProfile)) == 350
        assert db.scalar(select(func.count()).select_from(TaxonomyEntry).where(TaxonomyEntry.type == "skill")) == 296
        assert db.scalar(select(func.count()).select_from(TaxonomyEntry).where(TaxonomyEntry.latitude.is_not(None))) == 70


def test_internship_details(loaded_client):
    with loaded_client.db_factory() as db:
        i = db.scalar(select(Internship).where(Internship.external_id == "ISU-000001"))
        assert i.is_synthetic and i.is_active and i.application_url is None
        assert i.duration_weeks == 13 and i.stipend_inr_per_month == 18000
        assert [s.skill_id for s in i.skills if s.kind == "mandatory"] == ["SK-ENV-004"]
        assert sum(1 for s in i.skills if s.kind == "preferred") == 6


def test_loading_twice_does_not_duplicate(loaded_client):
    with loaded_client.db_factory() as db:
        loader.load_taxonomy(db, DATA_DIR / "internsetu_taxonomy.json")
        loader.load_internships(db, DATA_DIR / "internsetu_synthetic_internships_v1.json")
        loader.load_candidates(db, DATA_DIR / "internsetu_synthetic_candidates_v1.json")
        assert db.scalar(select(func.count()).select_from(Internship)) == 750
        assert db.scalar(select(func.count()).select_from(CandidateProfile)) == 350
        assert db.scalar(select(func.count()).select_from(InternshipSkill)) == db.scalar(
            select(func.count()).select_from(InternshipSkill))
        # coordinates survive a taxonomy reload
        assert db.get(TaxonomyEntry, "LOC-CITY-IND").latitude is not None


def test_candidate_links(loaded_client):
    with loaded_client.db_factory() as db:
        p = db.scalar(select(CandidateProfile).where(CandidateProfile.external_id == "CAND-000001"))
        kinds = {l.kind for l in p.links}
        assert {"skill", "interest", "preferred_role", "preferred_sector", "preferred_location", "language"} <= kinds
        assert p.education_level_id == "EDU-PG" and p.is_synthetic
