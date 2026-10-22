"""Checks that the database-style adapter gives EXACTLY the same answers as the teammate's engine on the original files."""
from app.engine.taxonomy import Taxonomy
from app.services import engine_adapter as ea
from app.services.dataset_parse import parse_candidates, parse_taxonomy
from tests.helpers import adapter_engine, profile_obj, raw_candidates, raw_engine, taxonomy_json

_A, _R = adapter_engine(), raw_engine()


def test_taxonomy_built_from_rows_equals_original():
    a = Taxonomy(ea.build_taxonomy(parse_taxonomy(taxonomy_json())["entries"]))
    r = Taxonomy(taxonomy_json())
    for attr in ("edu_order", "edu_rank", "city_state", "city_name", "skill_name", "skill_category",
                 "role_name", "role_domain", "sector_name", "interest_name", "field_name", "degree_name"):
        assert getattr(a, attr) == getattr(r, attr), attr


def test_catalog_loaded_through_adapter():
    assert len(_A.internships) == 750
    one = _A.internships["ISU-000001"]
    assert one["stipend"]["amount_inr_per_month"] == 18000 and one["duration"] == "3 months"
    assert one["mandatory_skills"] == ["SK-ENV-004"]


def test_same_recommendations_as_teammate_engine_for_40_candidates():
    for cand in raw_candidates()[:40]:
        a, r = _A.recommend(cand, k=5, method="baseline"), _R.recommend(cand, k=5, method="baseline")
        assert [x["internship_id"] for x in a["recommendations"]] == [x["internship_id"] for x in r["recommendations"]]
        assert [x["match_percentage"] for x in a["recommendations"]] == [x["match_percentage"] for x in r["recommendations"]]
        assert a["eligible_internships_in_catalog"] == r["eligible_internships_in_catalog"]


def test_profile_object_maps_to_the_same_profile():
    rows = {r["external_id"]: r for r in parse_candidates({"candidates": raw_candidates()})}
    for cand in raw_candidates()[:30]:
        mapped = ea.profile_dict(profile_obj(rows[cand["candidate_id"]]))
        a = _A.recommend(mapped, k=5, method="baseline")
        r = _R.recommend(cand, k=5, method="baseline")
        assert [x["internship_id"] for x in a["recommendations"]] == [x["internship_id"] for x in r["recommendations"]]


def _zero_eligible_candidate():
    for c in raw_candidates():
        if _R.recommend(c, k=3, method="baseline")["count"] == 0:
            return c
    raise AssertionError("expected some candidates with no eligible internship")


def test_nearest_internships_for_zero_eligible_candidate():
    c = _zero_eligible_candidate()
    near = ea.nearest_internships(_A, c, k=3)
    assert len(near) == 3
    keys = [(n["education_gap_levels"], len(n["missing_mandatory_ids"])) for n in near]
    assert keys == sorted(keys)
    assert all(n["missing_mandatory_ids"] or n["education_gap_levels"] for n in near)
    assert all(len(n["missing_mandatory"]) == len(n["missing_mandatory_ids"]) for n in near)


def test_enriched_recommendation_has_what_the_apps_need():
    cand = next(c for c in raw_candidates() if _A.recommend(c, k=5, method="baseline")["count"] >= 3)
    res = _A.recommend(cand, k=5, method="baseline")
    from app.engine.profile import normalize_profile
    n = normalize_profile(cand, _A.tax)
    item = ea.enrich(res["recommendations"][0], _A, n, "https://portal.example/")
    assert item["apply_url"] == "https://portal.example/" and item["is_demo_data"] is True
    assert item["sector_name"] and item["role_name"] and item["location_name"]
    assert item["skill_gap"]["missing_mandatory_ids"] == []          # eligible => nothing mandatory missing
    assert len(item["skill_gap"]["missing_preferred_ids"]) == len(item["skill_gap"]["missing_preferred"])


def test_skill_gap_summary_counts():
    recs = [{"skill_gap": {"missing_preferred_ids": ["SK-PROG-001", "SK-PROG-002"], "missing_mandatory_ids": []}},
            {"skill_gap": {"missing_preferred_ids": ["SK-PROG-001"], "missing_mandatory_ids": []}}]
    s = ea.summarize_skill_gaps(recs, _A)
    assert s[0] == {"skill_id": "SK-PROG-001", "skill": "Python", "count": 2} and s[1]["count"] == 1


def test_tfidf_method_also_works_through_adapter():
    cand = next(c for c in raw_candidates() if _A.recommend(c, k=5, method="baseline")["count"] >= 3)
    res = _A.recommend(cand, k=5, method="tfidf")
    assert 3 <= res["count"] <= 5 and res["recommendations"][0]["match_percentage"] > 0
