"""Shared helpers: build the engine from the JSON files in ./data through the same adapter the backend uses."""
import json
from pathlib import Path
from types import SimpleNamespace

from app.engine.engine import RecommendationEngine
from app.services import engine_adapter as ea
from app.services.dataset_parse import parse_candidates, parse_internships, parse_taxonomy

DATA = Path(__file__).resolve().parents[1] / "data"


def load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def taxonomy_json():
    return load("internsetu_taxonomy.json")


def adapter_engine():
    tax = ea.build_taxonomy(parse_taxonomy(taxonomy_json())["entries"])
    recs = {r["external_id"]: ea.internship_record(r) for r in parse_internships(load("internsetu_synthetic_internships_v1.json"))}
    return RecommendationEngine(added_file=None, taxonomy_data=tax, internships=recs)


def raw_engine():
    """The teammate's engine fed directly with the original JSON records (reference result)."""
    items = {i["internship_id"]: i for i in load("internsetu_synthetic_internships_v1.json")["internships"]}
    return RecommendationEngine(added_file=None, taxonomy_data=taxonomy_json(), internships=items)


def raw_candidates():
    return load("internsetu_synthetic_candidates_v1.json")["candidates"]


def profile_obj(row: dict):
    """A parse_candidates row -> object that looks like a CandidateProfile."""
    links = [SimpleNamespace(kind=k, entry_id=e) for k, e in row["links"]]
    return SimpleNamespace(links=links, id=None, **{k: v for k, v in row.items() if k != "links"})


def patch_payload(row: dict) -> dict:
    """A parse_candidates row -> JSON body for PATCH /me/profile."""
    by = lambda kind: [e for k, e in row["links"] if k == kind]
    return {
        "education_level_id": row["education_level_id"], "degree_id": row["degree_id"],
        "field_of_study_id": row["field_of_study_id"], "skill_ids": by("skill"), "interest_ids": by("interest"),
        "preferred_role_ids": by("preferred_role"), "preferred_sector_ids": by("preferred_sector"),
        "home_location_id": row["home_location_id"], "preferred_location_ids": by("preferred_location"),
        "willing_to_relocate": row["willing_to_relocate"], "willing_to_travel": row["willing_to_travel"],
        "duration_preference": row["duration_label"], "stipend_expectation": row["stipend_expectation"] or 0,
    }
