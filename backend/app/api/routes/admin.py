from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from app.core.deps import AdminUser, DbSession
from app.services import admin as svc

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get("/ping")
def admin_ping(admin: AdminUser):
    """Lets the web app confirm the logged-in user really is an admin."""
    return {"status": "ok", "admin": admin.full_name}


@router.get("/stats")
def stats(admin: AdminUser, db: DbSession):
    return svc.stats(db)


# --- scoring weights (percent; must total 100) ---
class WeightsBody(BaseModel):
    skills: float
    education: float
    location: float
    interest_sector: float
    role: float
    preference: float


@router.get("/weights")
def get_weights(admin: AdminUser, db: DbSession):
    svc.apply_saved_weights(db)
    return {"weights": svc.current_weights(), "defaults": svc.DEFAULT_WEIGHTS}


@router.put("/weights")
def put_weights(body: WeightsBody, admin: AdminUser, db: DbSession):
    return {"weights": svc.set_weights(db, body.model_dump())}


@router.post("/weights/reset")
def reset_weights(admin: AdminUser, db: DbSession):
    return {"weights": svc.reset_weights(db)}


# --- taxonomy (names, synonyms / translations) ---
class TaxCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    parent_id: str | None = None
    synonyms: list[str] = []


class TaxUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    is_active: bool | None = None
    add_synonyms: list[str] = []
    remove_synonyms: list[str] = []


@router.get("/taxonomy/{entry_type}")
def taxonomy_list(entry_type: str, admin: AdminUser, db: DbSession, q: str | None = None, include_inactive: bool = True,
                  limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0)):
    return svc.list_taxonomy(db, entry_type, q, include_inactive, limit, offset)


@router.post("/taxonomy/{entry_type}", status_code=201)
def taxonomy_create(entry_type: str, body: TaxCreate, admin: AdminUser, db: DbSession):
    return svc.create_taxonomy(db, entry_type, body.name, body.parent_id, body.synonyms)


@router.patch("/taxonomy/entries/{entry_id}")
def taxonomy_update(entry_id: str, body: TaxUpdate, admin: AdminUser, db: DbSession):
    return svc.update_taxonomy(db, entry_id, body.model_dump())


class ResolveBody(BaseModel):
    entry_id: str | None = None  # map to this entry (adds the text as a synonym); omit to reject


@router.get("/flagged")
def flagged(admin: AdminUser, db: DbSession, status: str = Query("pending", pattern="^(pending|resolved|rejected)$")):
    return svc.list_flagged(db, status)


@router.post("/flagged/{flag_id}/resolve")
def flagged_resolve(flag_id: int, body: ResolveBody, admin: AdminUser, db: DbSession):
    return svc.resolve_flagged(db, flag_id, body.entry_id)


# --- internships ---
class ImportBody(BaseModel):
    csv_text: str = Field(min_length=1, max_length=5_000_000)
    dry_run: bool = True
    skip_invalid: bool = False
    is_synthetic: bool = True  # synthetic records must stay labelled as synthetic


@router.get("/internships")
def internships(admin: AdminUser, db: DbSession, q: str | None = None, active: bool | None = None,
                limit: int = Query(50, ge=1, le=200), offset: int = Query(0, ge=0)):
    return svc.list_internships(db, q, active, limit, offset)


@router.post("/internships/import")
def internships_import(body: ImportBody, admin: AdminUser, db: DbSession):
    """CSV columns: external_id(optional), company_name, title, description, sector, role, location, min_education,
    degree, field_of_study, duration, stipend_inr_per_month, mandatory_skills, preferred_skills (use ; between skills),
    application_url, facilities. Names are matched to the taxonomy (names or synonyms)."""
    return svc.import_internships_csv(db, body.csv_text, body.dry_run, body.skip_invalid, body.is_synthetic)


class ActiveBody(BaseModel):
    is_active: bool


@router.patch("/internships/{external_id}")
def internship_active(external_id: str, body: ActiveBody, admin: AdminUser, db: DbSession):
    return svc.set_internship_active(db, external_id, body.is_active)


# --- evaluation of skill-matching methods ---
@router.get("/evaluation")
def evaluation(admin: AdminUser, db: DbSession, n: int = Query(100, ge=10, le=750),
               methods: str = Query("baseline,tfidf,semantic,hybrid")):
    return svc.evaluate_methods(db, n, [m.strip() for m in methods.split(",") if m.strip()])
