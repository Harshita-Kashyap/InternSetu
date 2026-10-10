from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.core.text import normalize_text
from app.models import FlaggedValue, TaxonomyEntry
from app.services.normalizer import Match, TaxonomyIndex


def _labels(e: TaxonomyEntry) -> list[str]:
    return [e.name] + [t.label for t in e.translations] + [s.synonym for s in e.synonyms]


def label_for(e: TaxonomyEntry, lang: str) -> str:
    if lang != "en":
        for t in e.translations:
            if t.lang == lang:
                return t.label
    return e.name  # fall back to English (REQ-4.10.4)


def list_entries(db: Session, entry_type: str, lang: str, q: str | None, parent: str | None, limit: int):
    stmt = (
        select(TaxonomyEntry)
        .where(TaxonomyEntry.type == entry_type, TaxonomyEntry.is_active.is_(True))
        .options(selectinload(TaxonomyEntry.translations), selectinload(TaxonomyEntry.synonyms))
        .order_by(TaxonomyEntry.order_rank, TaxonomyEntry.name)
    )
    if parent:
        stmt = stmt.where(TaxonomyEntry.parent_id == parent)
    entries = list(db.scalars(stmt))
    if q and normalize_text(q):
        nq = normalize_text(q)
        scored = []
        for e in entries:
            norms = [normalize_text(x) for x in _labels(e)]
            if any(n.startswith(nq) for n in norms):
                scored.append((0, e))
            elif any(nq in n for n in norms):
                scored.append((1, e))
        entries = [e for _, e in sorted(scored, key=lambda t: (t[0], t[1].name))]
    return entries[:limit]


def build_index(db: Session) -> TaxonomyIndex:
    idx = TaxonomyIndex()
    stmt = (
        select(TaxonomyEntry)
        .where(TaxonomyEntry.is_active.is_(True))
        .options(selectinload(TaxonomyEntry.translations), selectinload(TaxonomyEntry.synonyms))
    )
    for e in db.scalars(stmt):
        idx.add(e.id, e.type, _labels(e))
    return idx


def normalize_or_flag(db: Session, entry_type: str, text: str, user_id: int | None) -> tuple[Match, FlaggedValue | None]:
    match = build_index(db).match(text, entry_type)
    if match.is_mapped:
        return match, None
    norm = normalize_text(text)
    flagged = db.scalar(select(FlaggedValue).where(
        FlaggedValue.entry_type == entry_type, FlaggedValue.normalized == norm,
        FlaggedValue.user_id == user_id, FlaggedValue.status == "pending"))
    if flagged is None:
        flagged = FlaggedValue(user_id=user_id, entry_type=entry_type, raw_text=text, normalized=norm,
                               suggested_entry_id=match.entry_id)
        db.add(flagged)
        db.commit()
        db.refresh(flagged)
    return match, flagged
