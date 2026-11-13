"""Location helpers (tracker #20): distance, 'few nearby' note, facilities filter. Pure Python, no database."""
import csv
import json
from pathlib import Path

from app.engine.geo import haversine_km
from app.engine.pipeline import Recommender
from app.engine.semantic.scorers import StructuredScorer
from app.engine.taxonomy import Taxonomy
from app.services import engine_adapter as ea
from app.services.localize import tr_text

V2 = Path(__file__).resolve().parents[1] / "data" / "v2"


def _load():
    tax = json.loads((V2 / "internsetu_taxonomy_v2.json").read_text(encoding="utf-8"))
    with open(V2 / "locations_coordinates_v2.csv", encoding="utf-8-sig", newline="") as f:
        xy = {r["id"]: (float(r["lat"]), float(r["lng"])) for r in csv.DictReader(f)}
    for c in tax["indian_locations"]["districts_cities"]:   # same thing the backend does from the database
        if c["id"] in xy:
            c["lat"], c["lng"] = xy[c["id"]]
    internships = {i["internship_id"]: i for i in json.loads(
        (V2 / "internsetu_internships_v2.json").read_text(encoding="utf-8"))["internships"]}
    cands = json.loads((V2 / "internsetu_candidates_v2.json").read_text(encoding="utf-8"))["candidates"]
    return Taxonomy(tax), internships, cands


TAX, INTERNSHIPS, CANDS = _load()


class _Eng:                      # just what nearby_summary needs
    tax, internships = TAX, INTERNSHIPS


def test_haversine_known_distance_and_missing_coordinates():
    d = haversine_km((19.076, 72.878), (18.520, 73.857))          # Mumbai - Pune, about 120 km in a straight line
    assert 110 < d < 130
    assert haversine_km(None, (1, 2)) is None and haversine_km((1, 2), None) is None


def test_distance_km_same_place_is_zero_and_unknown_is_none():
    ids = list(TAX.city_coords)[:2]
    assert ea.distance_km(TAX, ids[0], ids[0]) == 0
    assert ea.distance_km(TAX, ids[0], ids[1]) > 0
    assert ea.distance_km(TAX, ids[0], "NO-SUCH-CITY") is None and ea.distance_km(TAX, None, ids[0]) is None


def test_every_v2_city_has_coordinates():
    assert all(c in TAX.city_coords for c in TAX.city_name)


def test_facility_filter_needs_every_requested_facility_and_ignores_unknown_keys():
    both = next(i for i in INTERNSHIPS.values() if {ea.FACILITY_GROUPS["food"], ea.FACILITY_GROUPS["stay"]} <= set(i["facilities"]))
    one = next(i for i in INTERNSHIPS.values() if ea.FACILITY_GROUPS["food"] in i["facilities"] and ea.FACILITY_GROUPS["stay"] not in i["facilities"])
    assert ea.has_facilities(both, {"food", "stay"}) and ea.has_facilities(one, {"food"})
    assert not ea.has_facilities(one, {"food", "stay"})
    assert ea.has_facilities(one, {"made_up"}) and ea.has_facilities(one, set())
    assert sum(ea.has_facilities(i, {"food", "stay", "transport"}) for i in INTERNSHIPS.values()) > 0


def test_nearby_summary_is_consistent_and_never_flags_people_willing_to_relocate():
    few = 0
    for c in CANDS:
        s = ea.nearby_summary(_Eng, c)
        assert s["nearby_count"] >= 0
        if c["location_preferences"].get("willing_to_relocate"):
            assert s["few_nearby"] is False
        few += s["few_nearby"]
    assert few > 0                       # remote-district candidates who prefer to stay near really do have few options


def test_people_who_prefer_to_stay_near_home_still_get_at_least_three_results():
    """No hard zero: preferring to stay nearby never empties the list."""
    stay = [c for c in CANDS if not c["location_preferences"].get("willing_to_relocate")
            and not c["location_preferences"].get("willing_to_travel")][:80]
    assert len(stay) == 80
    rec = Recommender(INTERNSHIPS, TAX, StructuredScorer(TAX), 5)
    assert all(len(rec.recommend(c, include_near=True)) >= 3 for c in stay)


def test_few_nearby_message_translates():
    m = "Only 1 internship(s) near your home (within 100 km) match you. We also show some further away so you have more choices."
    assert "100" in tr_text(m, "hi") and tr_text(m, "hi") != m and tr_text(m, "mr") != m
