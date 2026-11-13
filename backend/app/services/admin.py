"""Admin services: scoring weights, taxonomy management, CSV import, statistics, method evaluation."""
import csv
import io
import time

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from app.core.errors import ApiError
from app.core.text import normalize_text
from app.engine.engine import METHODS, EngineUnavailable
from app.engine.matching.components import WEIGHTS
from app.engine.profile import InputError
from app.models import (CandidateProfile, Consent, FlaggedValue, Internship, InternshipSkill, SavedInternship,
                        TaxonomyEntry, TaxonomySynonym, User)
from app.models.setting import AppSetting
from app.models.taxonomy import ENTRY_TYPES
from app.services import engine_adapter as ea
from app.services.dataset_parse import parse_duration
from app.services.recommendations import get_engine, reset_engine

DEFAULT_WEIGHTS = {"skills": 35.0, "education": 20.0, "location": 20.0, "interest_sector": 25.0, "role": 0.0, "preference": 0.0}
_KEY = "scoring_weights"


def _ensure_table(db: Session):
    AppSetting.__table__.create(bind=db.get_bind(), checkfirst=True)


# ------------------------------------------------------------------------------------------ weights
def current_weights() -> dict:
    return {k: round(v * 100, 2) for k, v in WEIGHTS.items()}


def apply_saved_weights(db: Session) -> None:
    """Load admin-edited weights from the database into the engine (called when the engine is built)."""
    _ensure_table(db)
    row = db.get(AppSetting, _KEY)
    w = row.value if row else DEFAULT_WEIGHTS
    for k in DEFAULT_WEIGHTS:
        WEIGHTS[k] = float(w.get(k, DEFAULT_WEIGHTS[k])) / 100.0


def set_weights(db: Session, weights: dict) -> dict:
    if set(weights) != set(DEFAULT_WEIGHTS):
        raise ApiError(422, "invalid_weights", "Provide exactly these weights: " + ", ".join(DEFAULT_WEIGHTS))
    if any((not isinstance(v, (int, float))) or isinstance(v, bool) or v < 0 for v in weights.values()):
        raise ApiError(422, "invalid_weights", "Each weight must be a number of 0 or more.")
    total = sum(weights.values())
    if abs(total - 100.0) > 0.01:
        raise ApiError(422, "invalid_weights", f"Weights must total 100% (they total {round(total, 2)}%).")
    _ensure_table(db)
    row = db.get(AppSetting, _KEY)
    if row:
        row.value = {k: float(v) for k, v in weights.items()}
    else:
        db.add(AppSetting(key=_KEY, value={k: float(v) for k, v in weights.items()}))
    db.commit()
    reset_engine()
    apply_saved_weights(db)
    return current_weights()


def reset_weights(db: Session) -> dict:
    return set_weights(db, DEFAULT_WEIGHTS)


# ------------------------------------------------------------------------------------------ taxonomy
def _entry_out(e: TaxonomyEntry) -> dict:
    return {"id": e.id, "type": e.type, "name": e.name, "parent_id": e.parent_id, "is_active": e.is_active,
            "synonyms": sorted(s.synonym for s in e.synonyms)}


def list_taxonomy(db: Session, entry_type: str, q: str | None, include_inactive: bool, limit: int, offset: int) -> list[dict]:
    _check_type(entry_type)
    stmt = select(TaxonomyEntry).where(TaxonomyEntry.type == entry_type).options(selectinload(TaxonomyEntry.synonyms))
    if not include_inactive:
        stmt = stmt.where(TaxonomyEntry.is_active.is_(True))
    if q:
        stmt = stmt.where(TaxonomyEntry.name.ilike(f"%{q.strip()}%"))
    return [_entry_out(e) for e in db.scalars(stmt.order_by(TaxonomyEntry.name).limit(limit).offset(offset))]


def _check_type(t: str):
    if t not in ENTRY_TYPES:
        raise ApiError(404, "unknown_type", f"Unknown taxonomy type. Use one of: {', '.join(ENTRY_TYPES)}")


def _add_synonyms(db: Session, entry: TaxonomyEntry, names: list[str]):
    have = {s.normalized for s in entry.synonyms} | {normalize_text(entry.name)}
    for raw in names:
        n = normalize_text(raw)
        if n and n not in have:
            have.add(n)
            db.add(TaxonomySynonym(entry_id=entry.id, synonym=raw.strip(), normalized=n))


def create_taxonomy(db: Session, entry_type: str, name: str, parent_id: str | None, synonyms: list[str]) -> dict:
    _check_type(entry_type)
    name = name.strip()
    if not name:
        raise ApiError(422, "invalid_name", "Name is required.")
    if db.scalar(select(TaxonomyEntry).where(TaxonomyEntry.type == entry_type, func.lower(TaxonomyEntry.name) == name.lower())):
        raise ApiError(409, "duplicate", "An entry with this name already exists.")
    if parent_id and not db.get(TaxonomyEntry, parent_id):
        raise ApiError(422, "invalid_parent", "Parent entry not found.")
    n = db.scalar(select(func.count()).select_from(TaxonomyEntry).where(TaxonomyEntry.type == entry_type)) + 1
    eid = f"ADM-{entry_type[:10].upper()}-{n:04d}"
    while db.get(TaxonomyEntry, eid):
        n += 1
        eid = f"ADM-{entry_type[:10].upper()}-{n:04d}"
    entry = TaxonomyEntry(id=eid, type=entry_type, name=name, parent_id=parent_id, is_active=True)
    db.add(entry)
    db.flush()
    _add_synonyms(db, entry, synonyms)
    db.commit()
    db.refresh(entry)
    reset_engine()
    return _entry_out(entry)


def update_taxonomy(db: Session, entry_id: str, data: dict) -> dict:
    e = db.scalar(select(TaxonomyEntry).where(TaxonomyEntry.id == entry_id).options(selectinload(TaxonomyEntry.synonyms)))
    if not e:
        raise ApiError(404, "not_found", "Taxonomy entry not found.")
    if data.get("name"):
        e.name = data["name"].strip()
    if data.get("is_active") is not None:
        e.is_active = data["is_active"]
    _add_synonyms(db, e, data.get("add_synonyms") or [])
    drop = {normalize_text(s) for s in (data.get("remove_synonyms") or [])}
    for s in list(e.synonyms):
        if s.normalized in drop:
            db.delete(s)
    db.commit()
    db.refresh(e)
    reset_engine()
    return _entry_out(e)


def list_flagged(db: Session, status: str) -> list[dict]:
    rows = db.scalars(select(FlaggedValue).where(FlaggedValue.status == status).order_by(FlaggedValue.created_at.desc()).limit(200))
    return [{"id": r.id, "entry_type": r.entry_type, "raw_text": r.raw_text, "suggested_entry_id": r.suggested_entry_id,
             "status": r.status, "created_at": r.created_at.isoformat()} for r in rows]


def resolve_flagged(db: Session, flag_id: int, entry_id: str | None) -> dict:
    from app.core.utils import utcnow
    f = db.get(FlaggedValue, flag_id)
    if not f:
        raise ApiError(404, "not_found", "Flagged value not found.")
    if entry_id:
        e = db.scalar(select(TaxonomyEntry).where(TaxonomyEntry.id == entry_id).options(selectinload(TaxonomyEntry.synonyms)))
        if not e or e.type != f.entry_type:
            raise ApiError(422, "invalid_entry", "Choose an entry of the same type.")
        _add_synonyms(db, e, [f.raw_text])
        f.status = "resolved"
        reset_engine()
    else:
        f.status = "rejected"
    f.resolved_at = utcnow()
    db.commit()
    return {"id": f.id, "status": f.status}


# ------------------------------------------------------------------------------------------ CSV import
CSV_COLUMNS = ["external_id", "company_name", "title", "description", "sector", "role", "location", "min_education",
               "degree", "field_of_study", "duration", "stipend_inr_per_month", "mandatory_skills", "preferred_skills",
               "application_url", "facilities"]


def _name_maps(db: Session) -> dict[str, dict[str, str]]:
    maps: dict[str, dict[str, str]] = {t: {} for t in ENTRY_TYPES}
    for e in db.scalars(select(TaxonomyEntry).where(TaxonomyEntry.is_active.is_(True))):
        maps[e.type][normalize_text(e.name)] = e.id
    for s, t in db.execute(select(TaxonomySynonym, TaxonomyEntry.type).join(TaxonomyEntry, TaxonomyEntry.id == TaxonomySynonym.entry_id)):
        maps[t].setdefault(s.normalized, s.entry_id)
    return maps


MAX_IMPORT_ROWS = 5000
MAX_IMPORT_BYTES = 5_000_000
MAX_MANDATORY_SKILLS = 2        # tracker #4: only 1-2 hard-mandatory skills per listing
MAX_TEXT = 200


def import_internships_csv(db: Session, text: str, dry_run: bool, skip_invalid: bool, is_synthetic: bool) -> dict:
    if len(text.encode("utf-8")) > MAX_IMPORT_BYTES:
        raise ApiError(413, "csv_too_large", f"CSV is larger than {MAX_IMPORT_BYTES // 1_000_000} MB. Split it into smaller files.")
    reader = csv.DictReader(io.StringIO(text.lstrip("\ufeff")))
    cols = {(c or "").strip().lower() for c in (reader.fieldnames or [])}
    required = {"company_name", "title", "sector", "role", "location", "min_education", "duration", "mandatory_skills"}
    if not required <= cols:
        raise ApiError(422, "invalid_csv", "CSV is missing columns: " + ", ".join(sorted(required - cols)))
    maps = _name_maps(db)
    nxt = (db.scalar(select(func.count()).select_from(Internship)) or 0) + 1
    good, errors = [], []
    seen_ext, seen_key = set(), set()
    existing_key = {(c, t, l) for c, t, l in db.execute(select(Internship.company_name, Internship.title, Internship.location_id))}

    def ref(kind: str, value: str, row_no: int, errs: list, required_=True):
        v = (value or "").strip()
        if not v:
            if required_:
                errs.append(f"{kind} is required")
            return None
        i = maps[kind].get(normalize_text(v))
        if not i:
            errs.append(f"unknown {kind}: '{v}'")
        return i

    for row_no, raw in enumerate(reader, start=2):
        if row_no - 1 > MAX_IMPORT_ROWS:
            raise ApiError(422, "csv_too_many_rows", f"CSV has more than {MAX_IMPORT_ROWS} rows. Split it into smaller files.")
        r = {(k or "").strip().lower(): (v or "").strip() for k, v in raw.items()}
        errs: list[str] = []
        for c in ("company_name", "title"):
            if not r.get(c):
                errs.append(f"{c} is required")
            elif len(r[c]) > MAX_TEXT:
                errs.append(f"{c} is longer than {MAX_TEXT} characters")
        sector, role = ref("sector", r.get("sector"), row_no, errs), ref("role", r.get("role"), row_no, errs)
        loc, edu = ref("city", r.get("location"), row_no, errs), ref("education_level", r.get("min_education"), row_no, errs)
        deg = ref("degree", r.get("degree"), row_no, errs, False)
        fos = ref("field_of_study", r.get("field_of_study"), row_no, errs, False)
        try:
            label, weeks = parse_duration(r.get("duration", ""))
        except ValueError:
            errs.append(f"invalid duration '{r.get('duration', '')}' (use e.g. '8 weeks' or '3 months')")
            label, weeks = "", 0
        skills = {}
        for kind in ("mandatory", "preferred"):
            ids = []
            for name in [x for x in r.get(f"{kind}_skills", "").split(";") if x.strip()]:
                sid = ref("skill", name, row_no, errs)
                if sid:
                    ids.append(sid)
            skills[kind] = ids
        if not skills["mandatory"] and not any("skill" in e for e in errs):
            errs.append("at least one mandatory skill is required")
        if len(skills["mandatory"]) > MAX_MANDATORY_SKILLS:
            errs.append(f"too many mandatory skills ({len(skills['mandatory'])}): keep at most {MAX_MANDATORY_SKILLS} and move the rest to preferred_skills")
        if weeks and weeks > 52:
            errs.append("duration is longer than 12 months")
        if r.get("application_url") and not r["application_url"].lower().startswith(("http://", "https://")):
            errs.append("application_url must start with http:// or https://")
        if r.get("external_id"):
            if r["external_id"] in seen_ext:
                errs.append(f"external_id '{r['external_id']}' appears more than once in this file")
            seen_ext.add(r["external_id"])
        key = (r.get("company_name"), r.get("title"), loc)
        if loc and key[0] and key[1]:
            if key in seen_key:
                errs.append("duplicate of another row in this file (same company, title and location)")
            elif key in existing_key and not r.get("external_id"):
                errs.append("this company, title and location already exist: add its external_id to update it")
            seen_key.add(key)
        stipend = None
        if r.get("stipend_inr_per_month"):
            if r["stipend_inr_per_month"].isdigit():
                stipend = int(r["stipend_inr_per_month"])
            else:
                errs.append("stipend_inr_per_month must be a whole number")
            if stipend is not None and stipend > 100000:
                errs.append("stipend_inr_per_month looks too high (max 100000)")
        if errs:
            errors.append({"row": row_no, "errors": errs})
            continue
        ext = r.get("external_id") or f"ISU-A{nxt:05d}"
        nxt += 1
        good.append(dict(external_id=ext, company_name=r["company_name"], title=r["title"], description=r.get("description", ""),
                         sector_id=sector, role_id=role, location_id=loc, min_education_id=edu, degree_id=deg, field_of_study_id=fos,
                         duration_label=label, duration_weeks=weeks, stipend_inr_per_month=stipend,
                         facilities=[x.strip() for x in r.get("facilities", "").split(";") if x.strip()],
                         application_url=r.get("application_url") or None, dataset_version="admin-import",
                         _m=skills["mandatory"], _p=skills["preferred"]))
    result = {"rows_valid": len(good), "rows_invalid": len(errors), "errors": errors[:50], "imported": 0, "updated": 0, "dry_run": dry_run}
    if dry_run or not good or (errors and not skip_invalid):
        if errors and not skip_invalid and not dry_run:
            result["message"] = "Nothing imported: fix the listed rows or resend with skip_invalid=true."
        return result
    for r in good:
        m, p = r.pop("_m"), r.pop("_p")
        old = db.scalar(select(Internship).where(Internship.external_id == r["external_id"]))
        if old:
            db.delete(old)
            db.flush()
            result["updated"] += 1
        else:
            result["imported"] += 1
        item = Internship(**r, is_synthetic=is_synthetic, is_active=True)
        item.skills = [InternshipSkill(skill_id=s, kind="mandatory") for s in m] + [
            InternshipSkill(skill_id=s, kind="preferred") for s in p if s not in m]
        db.add(item)
    db.commit()
    reset_engine()
    return result


def list_internships(db: Session, q: str | None, active: bool | None, limit: int, offset: int) -> dict:
    stmt = select(Internship)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(or_(Internship.title.ilike(like), Internship.company_name.ilike(like), Internship.external_id.ilike(like)))
    if active is not None:
        stmt = stmt.where(Internship.is_active.is_(active))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Internship.id.desc()).limit(limit).offset(offset))
    return {"total": total, "items": [{"internship_id": i.external_id, "title": i.title, "company_name": i.company_name,
            "is_active": i.is_active, "is_synthetic": i.is_synthetic, "duration": i.duration_label,
            "stipend_inr_per_month": i.stipend_inr_per_month} for i in rows]}


def set_internship_active(db: Session, external_id: str, active: bool) -> dict:
    i = db.scalar(select(Internship).where(Internship.external_id == external_id))
    if not i:
        raise ApiError(404, "not_found", "Internship not found.")
    i.is_active = active
    db.commit()
    reset_engine()
    return {"internship_id": i.external_id, "is_active": i.is_active}


# ------------------------------------------------------------------------------------------ stats / evaluation
def stats(db: Session) -> dict:
    cnt = lambda stmt: db.scalar(select(func.count()).select_from(stmt.subquery())) or 0  # noqa: E731
    by_type = dict(db.execute(select(TaxonomyEntry.type, func.count()).where(TaxonomyEntry.is_active.is_(True)).group_by(TaxonomyEntry.type)).all())
    return {
        "users": {"candidates": cnt(select(User).where(User.role == "candidate")), "admins": cnt(select(User).where(User.role == "admin"))},
        "profiles": {"real_complete": cnt(select(CandidateProfile).where(CandidateProfile.is_synthetic.is_(False), CandidateProfile.status == "complete")),
                     "real_draft": cnt(select(CandidateProfile).where(CandidateProfile.is_synthetic.is_(False), CandidateProfile.status != "complete")),
                     "synthetic": cnt(select(CandidateProfile).where(CandidateProfile.is_synthetic.is_(True)))},
        "internships": {"active": cnt(select(Internship).where(Internship.is_active.is_(True))),
                        "inactive": cnt(select(Internship).where(Internship.is_active.is_(False))),
                        "synthetic": cnt(select(Internship).where(Internship.is_synthetic.is_(True)))},
        "taxonomy": by_type, "flagged_pending": cnt(select(FlaggedValue).where(FlaggedValue.status == "pending")),
        "saved_internships": cnt(select(SavedInternship)), "weights": current_weights(),
    }


def evaluate_methods(db: Session, n: int, methods: list[str]) -> dict:
    """Compare matching methods on synthetic candidates. There are no ground-truth labels, so we report
    label-free indicators: coverage, speed, preferred-skill overlap, sector/location fit and agreement with baseline."""
    for m in methods:
        if m not in METHODS:
            raise ApiError(422, "invalid_method", f"Methods must be from: {', '.join(METHODS)}")
    eng = get_engine(db)
    profiles = db.scalars(select(CandidateProfile).where(CandidateProfile.is_synthetic.is_(True)).options(selectinload(CandidateProfile.links)).order_by(CandidateProfile.id).limit(n)).all()
    if not profiles:
        raise ApiError(409, "no_synthetic_candidates", "No synthetic candidates loaded. Run: python -m app.scripts.load_datasets --all")
    pds = [ea.profile_dict(p) for p in profiles]
    order = ["baseline"] + [m for m in methods if m != "baseline"]
    results, base_sets = {}, {}
    for m in order:
        lat, cnts, ovl, sec, loc, jac, evald = [], [], [], [], [], [], 0
        try:
            for pd in pds:
                t0 = time.perf_counter()
                try:
                    out = eng.recommend(pd, k=5, method=m)
                except InputError:
                    continue
                lat.append((time.perf_counter() - t0) * 1000)
                ids = [r["internship_id"] for r in out["recommendations"]]
                evald += 1
                cnts.append(len(ids))
                if m == "baseline":
                    base_sets[pd["candidate_id"]] = set(ids)
                elif base_sets.get(pd["candidate_id"]) or ids:
                    b = base_sets.get(pd["candidate_id"], set())
                    jac.append(len(b & set(ids)) / len(b | set(ids)) if (b | set(ids)) else 1.0)
                skills, secs = set(pd["skills"]), set(pd["preferences"]["preferred_sectors"])
                locs = set(pd["location_preferences"]["preferred_locations"]) | {pd["location_preferences"]["home_location"]}
                for iid in ids:
                    rec = eng.internships[iid]
                    pref = rec["preferred_skills"]
                    ovl.append(len(skills & set(pref)) / len(pref) if pref else 1.0)
                    sec.append(1.0 if rec["sector_id"] in secs else 0.0)
                    loc.append(1.0 if rec["location"] in locs else 0.0)
        except EngineUnavailable as e:
            results[m] = {"available": False, "reason": str(e)}
            continue
        avg = lambda xs: round(sum(xs) / len(xs), 4) if xs else None  # noqa: E731
        results[m] = {"available": True, "candidates_evaluated": evald,
                      "coverage_at_least_1": avg([1.0 if c >= 1 else 0.0 for c in cnts]),
                      "coverage_at_least_3": avg([1.0 if c >= 3 else 0.0 for c in cnts]),
                      "avg_results": avg(cnts), "avg_latency_ms": avg(lat),
                      "avg_preferred_skill_overlap": avg(ovl), "sector_match_rate": avg(sec), "location_match_rate": avg(loc),
                      "agreement_with_baseline_jaccard": None if m == "baseline" else avg(jac)}
    return {"candidates_sampled": len(pds), "k": 5, "methods": results, "weights": current_weights(),
            "note": "Computed on synthetic data without ground-truth labels. These are proxy indicators, not proof of real-world accuracy."}
