import json
from pathlib import Path

from app.services.dataset_parse import parse_candidates, parse_duration, parse_internships, parse_taxonomy

DATA = Path(__file__).resolve().parents[1] / "data"


def _load(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))


def test_duration():
    assert parse_duration("4 weeks") == ("4 weeks", 4)
    assert parse_duration("1 month")[1] == 4 and parse_duration("3 months")[1] == 13 and parse_duration("6 months")[1] == 26


def test_taxonomy_counts_and_education_order():
    p = parse_taxonomy(_load("internsetu_taxonomy.json"))
    by = {}
    for e in p["entries"]:
        by.setdefault(e["type"], []).append(e)
    assert len(by["skill"]) == 296 and len(by["city"]) == 70 and len(by["state"]) == 36 and len(by["role"]) == 59
    ranks = {e["id"]: e["order_rank"] for e in by["education_level"]}
    assert ranks["EDU-10"] < ranks["EDU-12"] < ranks["EDU-DIPLOMA"] < ranks["EDU-UG"] < ranks["EDU-PG"]
    assert {e["parent_id"] for e in by["city"]} <= {s["id"] for s in by["state"]}


def test_internships_all_references_exist():
    t = parse_taxonomy(_load("internsetu_taxonomy.json"))
    ids = {e["id"] for e in t["entries"]}
    rows = parse_internships(_load("internsetu_synthetic_internships_v1.json"))
    assert len(rows) == 750 and len({r["external_id"] for r in rows}) == 750
    for r in rows:
        refs = [r["sector_id"], r["role_id"], r["location_id"], r["min_education_id"], *r["mandatory"], *r["preferred"]]
        assert all(x in ids for x in refs)
        assert not set(r["mandatory"]) & set(r["preferred"]) and 1 <= len(r["mandatory"]) <= 4


def test_candidates_all_references_exist():
    t = parse_taxonomy(_load("internsetu_taxonomy.json"))
    ids = {e["id"] for e in t["entries"]}
    rows = parse_candidates(_load("internsetu_synthetic_candidates_v1.json"))
    assert len(rows) == 350
    for r in rows:
        assert r["education_level_id"] in ids and r["home_location_id"] in ids
        assert all(eid in ids for _, eid in r["links"])
        assert {k for k, _ in r["links"]} >= {"skill", "interest"}


def test_coordinates_file_covers_every_city():
    import csv
    t = parse_taxonomy(_load("internsetu_taxonomy.json"))
    cities = {e["id"] for e in t["entries"] if e["type"] == "city"}
    rows = list(csv.DictReader((DATA / "locations_coordinates.csv").open(encoding="utf-8")))
    assert {r["id"] for r in rows} == cities
    assert all(6 < float(r["lat"]) < 37 and 68 < float(r["lng"]) < 98 for r in rows)
