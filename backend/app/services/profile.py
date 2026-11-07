from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ApiError
from app.engine.matching.components import DURATION_WEEKS
from app.models import CandidateLink, CandidateProfile, TaxonomyEntry, User
from app.schemas.profile import ProfileResponse, ProfileUpdate

SCALAR_TYPES = {  # field -> taxonomy type it must point to
    "education_level_id": "education_level", "degree_id": "degree", "field_of_study_id": "field_of_study",
    "home_location_id": "city",
}
LIST_FIELDS = {  # field -> (taxonomy type, link kind)
    "skill_ids": ("skill", "skill"), "interest_ids": ("interest", "interest"),
    "preferred_role_ids": ("role", "preferred_role"), "preferred_sector_ids": ("sector", "preferred_sector"),
    "preferred_location_ids": ("city", "preferred_location"),
}
OTHER_PAIRS = {"degree_id": "degree_other", "field_of_study_id": "field_of_study_other",
               "home_location_id": "home_location_other"}  # id column -> free-text column (mutually exclusive)
PLAIN_FIELDS = ("year_of_completion", "willing_to_relocate", "willing_to_travel", "stipend_expectation")


def get_or_create(db: Session, user: User) -> CandidateProfile:
    p = db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == user.id)
                  .options(selectinload(CandidateProfile.links)))
    if p is None:
        p = CandidateProfile(user_id=user.id, status="draft")
        db.add(p)
        db.commit()
        db.refresh(p)
    return p


def missing_fields(p: CandidateProfile) -> list[str]:
    missing = []
    if not p.education_level_id:
        missing.append("education_level_id")
    if not (p.home_location_id or p.home_location_other):
        missing.append("home_location_id")
    if not any(l.kind == "skill" for l in p.links):
        missing.append("skill_ids")
    return missing


def _validate_ids(db: Session, data: ProfileUpdate) -> None:
    wanted: dict[str, tuple[str, str]] = {}  # id -> (field, expected type)
    for f, t in SCALAR_TYPES.items():
        v = getattr(data, f)
        if f in data.model_fields_set and v is not None:
            wanted[v] = (f, t)
    for f, (t, _) in LIST_FIELDS.items():
        for v in getattr(data, f) or []:
            wanted[v] = (f, t)
    if not wanted:
        return
    found = {e.id: e.type for e in db.execute(
        select(TaxonomyEntry.id, TaxonomyEntry.type).where(TaxonomyEntry.id.in_(list(wanted)),
                                                           TaxonomyEntry.is_active.is_(True)))}
    errors = [{"field": f, "message": f"'{i}' is not a valid {t.replace('_', ' ')} id."}
              for i, (f, t) in wanted.items() if found.get(i) != t]
    if errors:
        raise ApiError(422, "validation_error", "Please check the highlighted fields.", errors)


def apply_update(db: Session, p: CandidateProfile, data: ProfileUpdate) -> CandidateProfile:
    _validate_ids(db, data)
    sent = data.model_fields_set
    for f in list(SCALAR_TYPES) + list(PLAIN_FIELDS):
        if f in sent:
            v = getattr(data, f)
            if v is None and f in ("willing_to_relocate", "willing_to_travel"):
                v = False
            setattr(p, f, v)
    for id_f, other_f in OTHER_PAIRS.items():
        if other_f in sent:
            setattr(p, other_f, getattr(data, other_f))
            if getattr(data, other_f):
                setattr(p, id_f, None)       # typed text replaces a chosen id...
        if id_f in sent and getattr(data, id_f) and other_f not in sent:
            setattr(p, other_f, None)        # ...and a chosen id replaces typed text
    if "duration_preference" in sent:
        p.duration_label = data.duration_preference
        p.duration_weeks = DURATION_WEEKS.get(data.duration_preference) if data.duration_preference else None

    for f, (_, kind) in LIST_FIELDS.items():
        new = getattr(data, f)
        if new is None:
            continue
        current = {l.entry_id: l for l in p.links if l.kind == kind}
        for entry_id, link in current.items():
            if entry_id not in new:
                p.links.remove(link)  # delete-orphan removes the row
        for entry_id in new:
            if entry_id not in current:
                p.links.append(CandidateLink(entry_id=entry_id, kind=kind))
    db.flush()
    if missing_fields(p):
        p.status = "draft"
    db.commit()
    db.refresh(p)
    return p


def to_response(p: CandidateProfile) -> ProfileResponse:
    def ids(kind):
        return [l.entry_id for l in p.links if l.kind == kind]

    return ProfileResponse(
        status=p.status, missing_fields=missing_fields(p),
        education_level_id=p.education_level_id, degree_id=p.degree_id, field_of_study_id=p.field_of_study_id,
        year_of_completion=p.year_of_completion, skill_ids=ids("skill"), interest_ids=ids("interest"),
        preferred_role_ids=ids("preferred_role"), preferred_sector_ids=ids("preferred_sector"),
        home_location_id=p.home_location_id, preferred_location_ids=ids("preferred_location"),
        degree_other=p.degree_other, field_of_study_other=p.field_of_study_other,
        home_location_other=p.home_location_other,
        willing_to_relocate=p.willing_to_relocate, willing_to_travel=p.willing_to_travel,
        duration_preference=p.duration_label, stipend_expectation=p.stipend_expectation,
        updated_at=p.updated_at,
    )


def confirm(db: Session, p: CandidateProfile) -> CandidateProfile:
    missing = missing_fields(p)
    if missing:
        raise ApiError(422, "profile_incomplete", "Please complete the required details first.",
                       [{"field": f, "message": "This is required."} for f in missing])
    p.status = "complete"
    db.commit()
    db.refresh(p)
    return p
