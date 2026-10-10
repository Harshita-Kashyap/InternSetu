import json
from pathlib import Path

from app.core.text import normalize_text
from app.services.dataset_parse import parse_taxonomy
from app.services.normalizer import TaxonomyIndex

DATA = Path(__file__).resolve().parents[1] / "data"


def _index():
    parsed = parse_taxonomy(json.loads((DATA / "internsetu_taxonomy.json").read_text(encoding="utf-8")))
    syn = {}
    for eid, alias in parsed["synonyms"]:
        syn.setdefault(eid, []).append(alias)
    idx = TaxonomyIndex()
    for e in parsed["entries"]:
        idx.add(e["id"], e["type"], [e["name"]] + syn.get(e["id"], []))
    return idx


def test_normalize_text():
    assert normalize_text("  Node.JS ") == "node js"
    assert normalize_text("C++") == "c++" and normalize_text("C#") == "c#"
    assert normalize_text("Data & Analytics") == "data and analytics"
    assert normalize_text("पायथन  प्रोग्रामिंग") == "पायथन प्रोग्रामिंग"


def test_exact_by_name_and_alias_and_compact():
    idx = _index()
    assert idx.match("Python", "skill").entry_id == "SK-PROG-001"
    assert idx.match("python programming", "skill").entry_id == "SK-PROG-001"
    assert idx.match("PYTHON-PROGRAMMING", "skill").method == "exact"
    assert idx.match("10th", "education_level").entry_id == "EDU-10"


def test_type_is_respected():
    idx = _index()
    assert idx.match("Mumbai", "skill").method in ("none", "suggest")
    assert idx.match("Mumbai", "city").entry_id == "LOC-CITY-MUM"
    assert idx.match("Bombay", "city").entry_id == "LOC-CITY-MUM"


def test_fuzzy_accepts_typo_but_suggests_when_unsure():
    idx = _index()
    m = idx.match("Pythn", "skill")
    assert m.entry_id == "SK-PROG-001" and m.method == "fuzzy" and m.is_mapped
    m = idx.match("zzzz qqqq unknown", "skill")
    assert m.method == "none" and not m.is_mapped and m.entry_id is None


def test_empty_text():
    assert _index().match("   ", "skill").method == "none"


def test_no_label_collisions_in_taxonomy():
    assert _index().collisions == []
