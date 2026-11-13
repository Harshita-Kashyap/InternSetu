import json
from functools import lru_cache
from pathlib import Path
from typing import Annotated, get_args

from fastapi import APIRouter, Query
from sqlalchemy import select

from app.core.deps import CurrentUser, DbSession
from app.engine.profile import KNOWN_DURATIONS
from app.models import TaxonomyEntry
from app.schemas.taxonomy import EntryType, NormalizeRequest, NormalizeResponse, TaxonomyItem
from app.services import taxonomy as svc

router = APIRouter(prefix="/taxonomy", tags=["Taxonomy"])


def _item(e: TaxonomyEntry) -> TaxonomyItem:
    return TaxonomyItem(id=e.id, name=e.name, parent_id=e.parent_id,
                        order_rank=e.order_rank, latitude=e.latitude, longitude=e.longitude)


@router.get("/types")
def list_types():
    return {"types": list(get_args(EntryType))}


@router.get("/durations")
def list_durations():
    """Allowed values for the 'preferred duration' dropdown (profile field duration_preference)."""
    return {"durations": list(KNOWN_DURATIONS)}


@lru_cache(maxsize=1)
def _activity_map() -> list[dict]:
    path = Path(__file__).resolve().parents[3] / "data" / "activity_skill_map.json"
    return json.loads(path.read_text(encoding="utf-8"))["activities"]


@router.get("/activities")
def list_activities(db: DbSession):
    """Public. "What have you done?" tiles for the skills picker: icon, en/hi/mr label and the skill ids each one adds.
    Skills that are not in the loaded taxonomy are dropped, and an activity with no skills left is hidden."""
    known = set(db.scalars(select(TaxonomyEntry.id).where(TaxonomyEntry.type == "skill", TaxonomyEntry.is_active.is_(True))))
    out = []
    for a in _activity_map():
        ids = [i for i in a["skill_ids"] if i in known]
        if ids:
            out.append({**a, "skill_ids": ids})
    return {"activities": out}


@router.get("/{entry_type}", response_model=list[TaxonomyItem])
def list_taxonomy(
    entry_type: EntryType,
    db: DbSession,
    q: Annotated[str | None, Query(max_length=100)] = None,
    parent: Annotated[str | None, Query(max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
):
    """Public. Options for dropdowns / chips / search-as-you-type (English names + stable ids)."""
    return [_item(e) for e in svc.list_entries(db, entry_type, q, parent, limit)]


@router.post("/normalize", response_model=NormalizeResponse)
def normalize(payload: NormalizeRequest, user: CurrentUser, db: DbSession):
    """For 'other skill' style free text: map to the taxonomy, or flag for admin review."""
    match, flagged = svc.normalize_or_flag(db, payload.entry_type, payload.text, user.id)
    entry = db.get(TaxonomyEntry, match.entry_id) if match.entry_id else None
    item = _item(entry) if entry else None
    return NormalizeResponse(
        mapped=match.is_mapped, method=match.method,
        entry=item if match.is_mapped else None,
        suggestion=item if (entry and not match.is_mapped) else None,
        flagged=flagged is not None,
    )
