from typing import Annotated, get_args

from fastapi import APIRouter, Query

from app.core.deps import CurrentUser, DbSession
from app.models import TaxonomyEntry
from app.schemas.taxonomy import EntryType, Lang, NormalizeRequest, NormalizeResponse, TaxonomyItem
from app.services import taxonomy as svc

router = APIRouter(prefix="/taxonomy", tags=["Taxonomy"])


def _item(e: TaxonomyEntry, lang: str) -> TaxonomyItem:
    return TaxonomyItem(id=e.id, name=svc.label_for(e, lang), name_en=e.name, parent_id=e.parent_id,
                        order_rank=e.order_rank, latitude=e.latitude, longitude=e.longitude)


@router.get("/types")
def list_types():
    return {"types": list(get_args(EntryType))}


@router.get("/{entry_type}", response_model=list[TaxonomyItem])
def list_taxonomy(
    entry_type: EntryType,
    db: DbSession,
    lang: Lang = "en",
    q: Annotated[str | None, Query(max_length=100)] = None,
    parent: Annotated[str | None, Query(max_length=40)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
):
    """Public. Options for dropdowns / chips / search-as-you-type, in the user's language."""
    return [_item(e, lang) for e in svc.list_entries(db, entry_type, lang, q, parent, limit)]


@router.post("/normalize", response_model=NormalizeResponse)
def normalize(payload: NormalizeRequest, user: CurrentUser, db: DbSession):
    """For 'other skill' style free text: map to the taxonomy, or flag for admin review."""
    match, flagged = svc.normalize_or_flag(db, payload.entry_type, payload.text, user.id)
    entry = db.get(TaxonomyEntry, match.entry_id) if match.entry_id else None
    item = _item(entry, payload.lang) if entry else None
    return NormalizeResponse(
        mapped=match.is_mapped, method=match.method,
        entry=item if match.is_mapped else None,
        suggestion=item if (entry and not match.is_mapped) else None,
        flagged=flagged is not None,
    )
