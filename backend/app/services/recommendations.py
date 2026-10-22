"""Database-aware wrapper around the recommendation engine (app/engine)."""
import threading

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.errors import ApiError
from app.engine.engine import EngineUnavailable, RecommendationEngine
from app.engine.explanation.explain import explain
from app.engine.profile import InputError, normalize_profile
from app.models import CandidateProfile, Internship, TaxonomyEntry
from app.services import engine_adapter as ea

_engine: RecommendationEngine | None = None
_lock = threading.Lock()


def _build_engine(db: Session) -> RecommendationEngine:
    entries = [
        {"id": e.id, "type": e.type, "name": e.name, "parent_id": e.parent_id, "order_rank": e.order_rank}
        for e in db.scalars(select(TaxonomyEntry).where(TaxonomyEntry.is_active.is_(True)))
    ]
    records = {}
    for i in db.scalars(select(Internship).where(Internship.is_active.is_(True)).options(selectinload(Internship.skills))):
        row = {
            "external_id": i.external_id, "company_name": i.company_name, "title": i.title,
            "description": i.description, "sector_id": i.sector_id, "role_id": i.role_id,
            "location_id": i.location_id, "min_education_id": i.min_education_id, "degree_id": i.degree_id,
            "field_of_study_id": i.field_of_study_id, "duration_label": i.duration_label,
            "stipend_inr_per_month": i.stipend_inr_per_month, "facilities": i.facilities,
            "application_url": i.application_url, "is_synthetic": i.is_synthetic,
            "mandatory": [s.skill_id for s in i.skills if s.kind == "mandatory"],
            "preferred": [s.skill_id for s in i.skills if s.kind == "preferred"],
        }
        records[i.external_id] = ea.internship_record(row)
    return RecommendationEngine(added_file=None, taxonomy_data=ea.build_taxonomy(entries), internships=records)


def get_engine(db: Session) -> RecommendationEngine:
    global _engine
    with _lock:
        if _engine is None:
            _engine = _build_engine(db)
        if not _engine.tax.skill_name:
            _engine = None
            raise ApiError(503, "data_not_loaded", "The taxonomy is empty. Run: python -m app.scripts.load_datasets --all")
        return _engine


def reset_engine() -> None:
    """Call after internships or the taxonomy change so the engine is rebuilt on the next request."""
    global _engine
    with _lock:
        _engine = None


def _engine_errors(fn):
    try:
        return fn()
    except InputError as e:
        raise ApiError(422, "invalid_profile", "Your profile has a problem.", [{"field": "", "message": m} for m in e.problems])
    except EngineUnavailable as e:
        raise ApiError(503, "engine_unavailable", str(e))


def recommend_for_profile(db: Session, profile: CandidateProfile, k: int, method: str) -> dict:
    eng = get_engine(db)
    pd = ea.profile_dict(profile)

    def run():
        res = eng.recommend(pd, k=k, method=method)
        cand = normalize_profile(pd, eng.tax)
        recs = [ea.enrich(r, eng, cand, settings.pmis_portal_url) for r in res["recommendations"]]
        nearest = ea.nearest_internships(eng, pd) if not recs else []
        return res, recs, nearest

    res, recs, nearest = _engine_errors(run)
    demo = any(i.get("data_source") != "real" for i in eng.internships.values())
    message = res["message"]
    if not recs:
        message = ("No internship matches your current skills and education yet. "
                   "Here are the closest ones and what you would need.")
    return {
        "method": res["method"], "k": res["k"], "count": len(recs),
        "eligible_count": res["eligible_internships_in_catalog"], "total_internships": len(eng.internships),
        "message": message, "is_demo_data": demo, "demo_notice": ea.DEMO_NOTICE if demo else None,
        "disclaimer": ea.DISCLAIMER, "recommendations": recs,
        "skill_gap_summary": ea.summarize_skill_gaps(recs, eng), "nearest": nearest,
    }


def internship_detail(db: Session, profile: CandidateProfile, external_id: str) -> dict:
    eng = get_engine(db)
    intern = eng.internships.get(external_id)
    if intern is None:
        raise ApiError(404, "not_found", "This internship was not found.")

    def run():
        cand = normalize_profile(ea.profile_dict(profile), eng.tax)
        return cand, explain(cand, intern, eng.tax)

    cand, ev = _engine_errors(run)
    tax = eng.tax
    req = intern["education_requirements"].get("education_level")
    return {
        "internship_id": external_id, "title": intern["title"], "description": intern.get("description", ""),
        **ea.internship_facts(eng, intern, settings.pmis_portal_url),
        "facilities": intern.get("facilities", []),
        "education_required": tax.edu_name.get(req, req) if req else None,
        "mandatory_skills": [{"id": s, "name": tax.skill_name.get(s, s)} for s in intern["mandatory_skills"]],
        "preferred_skills": [{"id": s, "name": tax.skill_name.get(s, s)} for s in intern["preferred_skills"]],
        "eligible": ev["eligible"], "match_percentage": ev["match_percentage"], "low_match": ev["low_match"],
        "match_tag": ev["match_tag"], "why_recommended": ev["why_recommended"],
        "considerations": ev["considerations"], "skill_gap": {**ev["skill_gap"], **ea.skill_gap_ids(cand, intern)},
        "disclaimer": ea.DISCLAIMER,
    }


def quick_fit(db: Session, profile: CandidateProfile | None, external_ids: list[str]) -> dict[str, dict]:
    """eligible + match % for several internships (used by the saved list). {} if profile is not complete."""
    if profile is None or profile.status != "complete":
        return {}
    eng = get_engine(db)
    cand = _engine_errors(lambda: normalize_profile(ea.profile_dict(profile), eng.tax))
    out = {}
    for iid in external_ids:
        intern = eng.internships.get(iid)
        if intern:
            ev = explain(cand, intern, eng.tax)
            out[iid] = {"eligible": ev["eligible"], "match_percentage": ev["match_percentage"]}
    return out
