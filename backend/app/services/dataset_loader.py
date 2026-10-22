"""Writes parsed dataset rows into the database. Safe to run again (it replaces, never duplicates)."""
import csv
import json
from pathlib import Path

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.text import normalize_text
from app.models import (
    CandidateLink, CandidateProfile, Internship, InternshipSkill,
    TaxonomyEntry, TaxonomySynonym,
)
from app.models.internship import MANDATORY, PREFERRED
from app.services import dataset_parse as parse


def _read_json(path) -> dict:
    return json.loads(Path(path).read_text(encoding="utf-8"))


def load_taxonomy(db: Session, path) -> dict:
    parsed = parse.parse_taxonomy(_read_json(path))
    for e in parsed["entries"]:
        existing = db.get(TaxonomyEntry, e["id"])
        if existing:  # keep coordinates already loaded
            for k in ("type", "name", "parent_id", "order_rank"):
                setattr(existing, k, e[k])
        else:
            db.add(TaxonomyEntry(**e))
    db.flush()
    ids = [e["id"] for e in parsed["entries"]]
    for i in range(0, len(ids), 500):
        db.execute(delete(TaxonomySynonym).where(TaxonomySynonym.entry_id.in_(ids[i:i + 500])))
    seen = set()
    for entry_id, alias in parsed["synonyms"]:
        norm = normalize_text(alias)
        if norm and (entry_id, norm) not in seen:
            seen.add((entry_id, norm))
            db.add(TaxonomySynonym(entry_id=entry_id, synonym=alias, normalized=norm))
    db.commit()
    return {"entries": len(parsed["entries"]), "synonyms": len(seen)}


def load_internships(db: Session, path) -> int:
    rows = parse.parse_internships(_read_json(path))
    for r in rows:
        old = db.scalar(select(Internship).where(Internship.external_id == r["external_id"]))
        if old:
            db.delete(old)
    db.flush()
    for r in rows:
        mandatory, preferred = r.pop("mandatory"), r.pop("preferred")
        item = Internship(**r, is_synthetic=True, is_active=True)
        item.skills = [InternshipSkill(skill_id=s, kind=MANDATORY) for s in mandatory] + [
            InternshipSkill(skill_id=s, kind=PREFERRED) for s in preferred if s not in mandatory
        ]
        db.add(item)
    db.commit()
    return len(rows)


def load_candidates(db: Session, path) -> int:
    rows = parse.parse_candidates(_read_json(path))
    for r in rows:
        old = db.scalar(select(CandidateProfile).where(CandidateProfile.external_id == r["external_id"]))
        if old:
            db.delete(old)
    db.flush()
    for r in rows:
        links = r.pop("links")
        p = CandidateProfile(**r, is_synthetic=True, status="complete")
        p.links = [CandidateLink(entry_id=eid, kind=kind) for kind, eid in links]
        db.add(p)
    db.commit()
    return len(rows)


def load_coordinates_csv(db: Session, path) -> int:
    n = 0
    with open(path, encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            e = db.get(TaxonomyEntry, row["id"])
            if e and row.get("lat") and row.get("lng"):
                e.latitude, e.longitude = float(row["lat"]), float(row["lng"])
                n += 1
    db.commit()
    return n

