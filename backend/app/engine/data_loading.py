"""Load the InternSetu datasets (read-only) and validate their schemas."""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"

PATHS = {
    "taxonomy": DATA / "taxonomy" / "internsetu_taxonomy.json",
    "candidates": DATA / "candidates" / "internsetu_synthetic_candidates_v1.json",
    "internships": DATA / "internships" / "internsetu_synthetic_internships_v1.json",
    "pairs": DATA / "pairs" / "internsetu_pairs_v2.json",
    "ground_truth": DATA / "ground_truth" / "internsetu_ground_truth_v1.json",
}

EXPECTED_COUNTS = {"candidates": 350, "internships": 750, "pairs": 7000, "ground_truth": 7000}

CANDIDATE_KEYS = {"candidate_id", "education", "skills", "interests", "preferred_roles",
                  "location_preferences", "preferences"}
INTERNSHIP_KEYS = {"internship_id", "sector_id", "role_id", "education_requirements",
                   "mandatory_skills", "preferred_skills", "location", "duration", "stipend"}


def _read(name):
    with open(PATHS[name], encoding="utf-8") as f:
        return json.load(f)


def load_taxonomy():
    return _read("taxonomy")


def load_candidates():
    """Return {candidate_id: candidate}."""
    return {c["candidate_id"]: c for c in _read("candidates")["candidates"]}


def load_internships():
    """Return {internship_id: internship}."""
    return {i["internship_id"]: i for i in _read("internships")["internships"]}


def load_pairs():
    return _read("pairs")["pairs"]


def load_ground_truth():
    """Return {pair_id: ground-truth record}. Validation/evaluation use only, never model input."""
    return {g["pair_id"]: g for g in _read("ground_truth")["ground_truth"]}


def validate_schemas(candidates, internships):
    """Return a list of schema problems (empty if clean)."""
    problems = []
    for cid, c in candidates.items():
        miss = CANDIDATE_KEYS - c.keys()
        if miss:
            problems.append(f"{cid}: missing {sorted(miss)}")
    for iid, i in internships.items():
        miss = INTERNSHIP_KEYS - i.keys()
        if miss:
            problems.append(f"{iid}: missing {sorted(miss)}")
    return problems
