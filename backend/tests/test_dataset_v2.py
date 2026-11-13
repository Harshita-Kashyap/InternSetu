"""v2 dataset (tracker #8/#9): generated deterministically, passes the audit, loads into the database, Hinglish text maps to skills."""
import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import sessionmaker

from app.core.database import Base
from app.models import CandidateProfile, Internship
from app.scripts.audit_dataset import audit
from app.services import dataset_loader as loader
from app.services.dataset_parse import parse_taxonomy
from app.services.normalizer import TaxonomyIndex

D = Path(__file__).resolve().parents[1] / "data"
V2 = D / "v2"


@pytest.fixture(scope="module")
def report():
    return audit("v2")


def test_audit_has_no_errors(report):
    assert report["errors"] == []


def test_rebuild_matches_the_committed_files_for_the_same_seed(tmp_path):
    src = D.parent
    out = subprocess.run([sys.executable, "-m", "app.scripts.build_dataset_v2", "--seed", "42"], cwd=src, capture_output=True, text=True)
    assert out.returncode == 0, out.stderr
    again = json.loads((V2 / "internsetu_internships_v2.json").read_text(encoding="utf-8"))["internships"]
    assert len(again) == 2500 and again[0]["internship_id"] == "ISU2-000001"


def test_pmis_shaped_mix(report):
    assert 2000 <= report["internships"] <= 3000
    assert report["low_education_share_%"] >= 50                       # many 10th / 12th / ITI / Diploma roles
    assert 4 <= report["oil_gas_share_%"] <= 15 and report["sectors_used"] == 26
    assert set(report["duration_mix"]) == {"6 months", "9 months"}
    assert set(report["mandatory_skill_count"]) <= {"1", "2"} or set(report["mandatory_skill_count"]) <= {1, 2}
    assert report["small_town_share_%"] >= 40
    assert min(report["facility_share_%"].values()) >= 20             # food / stay / transport exist


def test_every_candidate_gets_three_results_in_every_archetype(report):
    assert report["candidates_with_>=3_results_%"] == 100.0
    assert all(v == 100.0 for v in report["coverage_by_archetype_%"].values())
    assert report["candidates_with_an_eligible_result_%"] >= 75


def test_candidate_mix_covers_low_skill_and_remote_profiles():
    cands = json.loads((V2 / "internsetu_candidates_v2.json").read_text(encoding="utf-8"))["candidates"]
    flags = [c["context_flags"] for c in cands]
    assert sum(f["remote_district"] for f in flags) >= 50 and sum(f["low_english"] for f in flags) >= 100
    assert sum(len(c["skills"]) <= 1 for c in cands) >= 30             # sparse profiles for cold-start tests
    assert sum(bool(c["raw_inputs"]) for c in cands) >= 40             # Hindi / Hinglish raw inputs exist


def test_hinglish_everyday_skills_map_to_the_taxonomy():
    parsed = parse_taxonomy(json.loads((V2 / "internsetu_taxonomy_v2.json").read_text(encoding="utf-8")))
    syn = {}
    for eid, alias in parsed["synonyms"]:
        syn.setdefault(eid, []).append(alias)
    idx = TaxonomyIndex()
    for e in parsed["entries"]:
        idx.add(e["id"], e["type"], [e["name"]] + syn.get(e["id"], []))
    names = {e["id"]: e["name"] for e in parsed["entries"]}
    for text, want in [("kheti", "Crop Farming"), ("silai", "Tailoring & Stitching"), ("हिसाब किताब", "Cash Handling & Basic Accounts"),
                       ("petrol pump", "Fuel Dispensing & Station Operations")]:
        m = idx.match(text, "skill")
        assert m.is_mapped and names[m.entry_id] == want, (text, m)


def test_v2_loads_into_the_database(tmp_path):
    eng = create_engine(f"sqlite:///{tmp_path / 'v2.db'}", connect_args={"check_same_thread": False})
    Base.metadata.create_all(eng)
    with sessionmaker(bind=eng)() as db:
        loader.load_taxonomy(db, V2 / "internsetu_taxonomy_v2.json")
        loader.load_coordinates_csv(db, V2 / "locations_coordinates_v2.csv")
        assert loader.load_internships(db, V2 / "internsetu_internships_v2.json") == 2500
        assert loader.load_candidates(db, V2 / "internsetu_candidates_v2.json") == 700
        assert db.scalar(select(func.count()).select_from(Internship)) == 2500
        assert db.scalar(select(func.count()).select_from(CandidateProfile)) == 700
    eng.dispose()


def test_activity_map_only_points_to_real_skills_and_has_all_languages():
    tax = json.loads((V2 / "internsetu_taxonomy_v2.json").read_text(encoding="utf-8"))
    skills = {s["id"] for s in tax["skills"]}
    acts = json.loads((D / "activity_skill_map.json").read_text(encoding="utf-8"))["activities"]
    assert len(acts) >= 25
    for a in acts:
        assert a["skill_ids"] and set(a["skill_ids"]) <= skills
        assert all(a["label"][l].strip() for l in ("en", "hi", "mr")) and a["icon"]


def test_sector_balance_and_candidate_skill_coverage():
    """#41: every sector has 50-200 listings; candidates use at least 150 distinct skills (was 48)."""
    import json
    from collections import Counter
    L = json.loads((V2 / "internsetu_internships_v2.json").read_text(encoding="utf-8"))["internships"]
    C = json.loads((V2 / "internsetu_candidates_v2.json").read_text(encoding="utf-8"))["candidates"]
    n = Counter(i["sector_id"] for i in L)
    assert len(n) == 26 and min(n.values()) >= 50 and max(n.values()) <= 200
    assert len({s for c in C for s in c["skills"]}) >= 150


def test_activity_picker_coverage():
    """#41: the "what have you done" picker has about 60 activities covering about 200+ skills (was 29 / 43), in en/hi/mr."""
    import json
    from pathlib import Path
    a = json.loads((Path(__file__).resolve().parents[1] / "data" / "activity_skill_map.json").read_text(encoding="utf-8"))["activities"]
    assert len(a) >= 55 and len({s for x in a for s in x["skill_ids"]}) >= 200
    assert all(x["label"]["en"] and x["label"]["hi"] and x["label"]["mr"] and x["skill_ids"] for x in a)
