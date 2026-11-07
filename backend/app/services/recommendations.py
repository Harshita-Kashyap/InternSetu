"""Database-aware wrapper around the recommendation engine (app/engine)."""
import threading

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.config import settings
from app.core.errors import ApiError
from app.engine.engine import EngineUnavailable, RecommendationEngine
from app.engine.eligibility.eligibility import check_eligibility
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
            from app.services.admin import apply_saved_weights
            apply_saved_weights(db)  # admin-edited scoring weights (REQ: weights must total 100%)
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


def browse(db: Session, profile: CandidateProfile | None, *, scope: str, q: str | None, sector_id: str | None,
           location_id: str | None, limit: int, offset: int, saved_ids: set[str],
           sector_ids: set[str] | None = None, skill_ids: set[str] | None = None) -> dict:
    """Search the active catalogue. With a complete profile every item says eligible / not eligible
    (hard rules) and eligible ones carry a match %. scope="suitable" keeps eligible items only.
    sector_ids / skill_ids are preference filters (match ANY); they never change eligibility or scores."""
    eng = get_engine(db)
    tax = eng.tax
    complete = profile is not None and profile.status == "complete"
    cand = _engine_errors(lambda: normalize_profile(ea.profile_dict(profile), tax)) if complete else None
    needle = (q or "").strip().lower()
    rows = []
    for iid in sorted(eng.internships):
        it = eng.internships[iid]
        if sector_id and it["sector_id"] != sector_id:
            continue
        if sector_ids and it["sector_id"] not in sector_ids:
            continue
        if skill_ids and not skill_ids & {*(it.get("mandatory_skills") or []), *(it.get("preferred_skills") or [])}:
            continue
        if location_id and it["location"] != location_id:
            continue
        if needle and needle not in f"{it['title']} {it['company_name']} {it.get('description', '')}".lower():
            continue
        row = {"internship_id": iid, "title": it["title"], **ea.internship_facts(eng, it, settings.pmis_portal_url),
               "saved": iid in saved_ids, "eligible": None, "match_percentage": None, "low_match": None,
               "missing_mandatory": [], "education_ok": None}
        if cand is not None:
            ok, _reason, missing = check_eligibility(cand, it, tax)
            row["eligible"] = ok
            row["missing_mandatory"] = [tax.skill_name.get(s, s) for s in missing]
            row["education_ok"] = "Education level below" not in _reason
            if ok:
                ev = explain(cand, it, tax)
                row["match_percentage"], row["low_match"] = ev["match_percentage"], ev["low_match"]
            elif scope == "suitable":
                continue
        rows.append(row)
    if cand is not None:  # eligible first, best match first
        rows.sort(key=lambda r: (not r["eligible"], -(r["match_percentage"] or 0), r["internship_id"]))
    return {"total": len(rows), "limit": limit, "offset": offset, "profile_complete": complete,
            "items": rows[offset: offset + limit]}
