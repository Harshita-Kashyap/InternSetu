from typing import Annotated, Literal

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.core.config import settings
from app.core.deps import ConsentedUser, CurrentUser, DbSession
from app.core.errors import ApiError
from app.core.languages import LANG_PATTERN
from app.models import CandidateProfile, Internship, SavedInternship
from app.schemas.recommendation import BrowseResponse, InternshipDetail, RecommendationsResponse, SavedItem
from app.services.localize import localize
from app.services import engine_adapter as ea
from app.services import profile as profile_service
from app.services import recommendations as rec

router = APIRouter(prefix="/me", tags=["Recommendations"])
Method = Literal["baseline", "tfidf", "hybrid", "semantic"]


def _complete_profile(db, user) -> CandidateProfile:
    p = profile_service.get_or_create(db, user)
    missing = profile_service.missing_fields(p)
    if p.status != "complete" or missing:
        fields = [{"field": f, "message": "This is required."} for f in missing]
        raise ApiError(409, "profile_incomplete", "Please complete and confirm your profile first.", fields)
    return p


@router.get("/recommendations", response_model=RecommendationsResponse)
def get_recommendations(
    user: ConsentedUser, db: DbSession,
    k: Annotated[int | None, Query(ge=3, le=5, description="How many (3 to 5)")] = None,
    method: Method | None = None,
    lang: Annotated[str | None, Query(pattern=LANG_PATTERN, description="Language of explanations; defaults to the user's preferred language")] = None,
    close_matches: Annotated[bool, Query(description="Fill the list with close matches (1-2 mandatory skills missing) when fewer than k are eligible; also guarantees a slot per preferred sector")] = True,
    only_my_sectors: Annotated[bool, Query(description="Only show internships in the sectors chosen in the profile")] = False,
):
    """Top 3 to 5 internships. If nothing is eligible, `recommendations` is empty and `nearest` explains what is missing."""
    res = rec.recommend_for_profile(db, _complete_profile(db, user), k or settings.default_k,
                                    method or settings.matching_method, close_matches, only_my_sectors)
    return localize(res, lang or user.preferred_language)


def _ids(csv: str | None) -> set[str]:
    return {x.strip() for x in (csv or "").split(",") if x.strip()}


@router.get("/internships", response_model=BrowseResponse)
def browse_internships(
    user: CurrentUser, db: DbSession,
    scope: Annotated[Literal["all", "suitable"], Query(description="all = whole catalogue; suitable = eligible only (needs a complete profile)")] = "all",
    q: Annotated[str | None, Query(max_length=80)] = None,
    sector: Annotated[str | None, Query(max_length=30, description="sector id")] = None,
    city: Annotated[str | None, Query(max_length=30, description="city id")] = None,
    sectors: Annotated[str | None, Query(max_length=600, description="comma-separated sector ids; matches ANY")] = None,
    skills: Annotated[str | None, Query(max_length=1500, description="comma-separated skill ids; internship must list AT LEAST ONE")] = None,
    facilities: Annotated[str | None, Query(max_length=120, description="comma-separated: food, stay, transport, travel_allowance; must offer ALL")] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 12,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    """Discovery list. Inactive internships never appear; with a complete profile each item shows eligibility and match %."""
    profile = _complete_profile(db, user) if scope == "suitable" else db.scalar(
        select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    saved = set(db.scalars(select(Internship.external_id).join(SavedInternship, SavedInternship.internship_id == Internship.id)
                           .where(SavedInternship.user_id == user.id)))
    return rec.browse(db, profile, scope=scope, q=q, sector_id=sector, location_id=city,
                      sector_ids=_ids(sectors), skill_ids=_ids(skills), facility_keys=_ids(facilities), limit=limit, offset=offset, saved_ids=saved)


@router.get("/recommendations/{internship_id}", response_model=InternshipDetail)
def get_internship_detail(internship_id: str, user: ConsentedUser, db: DbSession,
                          lang: Annotated[str | None, Query(pattern=LANG_PATTERN)] = None):
    """Full details of one internship, and how it fits you (works for eligible and non-eligible ones)."""
    return localize(rec.internship_detail(db, _complete_profile(db, user), internship_id), lang or user.preferred_language)


@router.get("/skill-gap")
def get_skill_gap(user: ConsentedUser, db: DbSession):
    """Skills that would help most across your recommendations."""
    r = rec.recommend_for_profile(db, _complete_profile(db, user), settings.default_k, settings.matching_method)
    return {"skills": r["skill_gap_summary"]}


# ------------------------------------------------------------------ saved internships
def _find(db, internship_id: str) -> Internship:
    item = db.scalar(select(Internship).where(Internship.external_id == internship_id, Internship.is_active.is_(True)))
    if item is None:
        raise ApiError(404, "not_found", "This internship was not found.")
    return item


@router.get("/saved", response_model=list[SavedItem])
def list_saved(user: CurrentUser, db: DbSession):
    rows = db.execute(
        select(SavedInternship, Internship).join(Internship, Internship.id == SavedInternship.internship_id)
        .where(SavedInternship.user_id == user.id, Internship.is_active.is_(True))
        .order_by(SavedInternship.created_at.desc(), SavedInternship.id.desc())
    ).all()
    if not rows:
        return []
    eng = rec.get_engine(db)
    profile = db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == user.id))
    fit = rec.quick_fit(db, profile, [i.external_id for _, i in rows])
    out = []
    for saved, i in rows:
        facts = ea.internship_facts(eng, eng.internships[i.external_id], settings.pmis_portal_url) \
            if i.external_id in eng.internships else None
        if facts is None:
            continue
        f = fit.get(i.external_id, {})
        out.append(SavedItem(
            internship_id=i.external_id, title=i.title, company_name=i.company_name,
            location_name=facts["location_name"], duration=facts["duration"],
            stipend_inr_per_month=facts["stipend_inr_per_month"], is_demo_data=facts["is_demo_data"],
            saved_at=saved.created_at.isoformat(), eligible=f.get("eligible"), match_percentage=f.get("match_percentage"),
        ))
    return out


@router.put("/saved/{internship_id}")
def save_internship(internship_id: str, user: CurrentUser, db: DbSession):
    item = _find(db, internship_id)
    exists = db.scalar(select(SavedInternship.id).where(SavedInternship.user_id == user.id,
                                                        SavedInternship.internship_id == item.id))
    if exists is None:
        db.add(SavedInternship(user_id=user.id, internship_id=item.id))
        db.commit()
    return {"internship_id": internship_id, "saved": True}


@router.delete("/saved/{internship_id}")
def unsave_internship(internship_id: str, user: CurrentUser, db: DbSession):
    item = _find(db, internship_id)
    row = db.scalar(select(SavedInternship).where(SavedInternship.user_id == user.id,
                                                  SavedInternship.internship_id == item.id))
    if row is not None:
        db.delete(row)
        db.commit()
    return {"internship_id": internship_id, "saved": False}
