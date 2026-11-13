"""Close-match tiers, sector guarantee, skill unlocks and the PMIS pre-check (pure Python, no database)."""
import json
from pathlib import Path

from app.engine.pipeline import Recommender
from app.engine.semantic.scorers import StructuredScorer
from app.engine.taxonomy import Taxonomy
from app.engine.tiers import classify, select_tiered
from app.services import engine_adapter as ea
from app.services.pmis_rules import precheck

D = Path(__file__).resolve().parents[1] / "data"
TAX = Taxonomy(json.loads((D / "internsetu_taxonomy.json").read_text(encoding="utf-8")))
INTERNSHIPS = {i["internship_id"]: i for i in json.loads(
    (D / "internsetu_synthetic_internships_v1.json").read_text(encoding="utf-8"))["internships"]}
CANDS = json.loads((D / "internsetu_synthetic_candidates_v1.json").read_text(encoding="utf-8"))["candidates"]
SCORER = StructuredScorer(TAX)


def _pick(c, k=5):
    return select_tiered(c, INTERNSHIPS, TAX, SCORER, k, c["preferences"]["preferred_sectors"])


def test_every_candidate_gets_at_least_three_results():
    assert all(len(_pick(c)) >= 3 for c in CANDS)


def test_eligible_come_before_close_matches_and_close_never_fail_education():
    for c in CANDS[:80]:
        picks = _pick(c)
        tiers = [t for _i, _s, t, _n in picks]
        assert tiers == sorted(tiers, key=lambda t: t != "eligible")
        for iid, _s, tier, n in picks:
            if tier == "near":
                assert 1 <= n <= 2
                req = INTERNSHIPS[iid]["education_requirements"].get("education_level")
                assert req is None or TAX.rank(c["education"]["education_level"]) >= TAX.rank(req)


def test_preferred_sector_gets_a_slot_when_something_exists_in_it():
    for c in CANDS[:120]:
        picks = _pick(c)
        for sid in c["preferences"]["preferred_sectors"][:3]:
            if any(classify(c, i, TAX) for i in INTERNSHIPS.values() if i["sector_id"] == sid):
                assert any(INTERNSHIPS[x[0]]["sector_id"] == sid for x in picks), (c["candidate_id"], sid)


def test_recommender_labels_close_matches_with_plain_advice():
    zero = next(c for c in CANDS if not any(classify(c, i, TAX) and classify(c, i, TAX)[0] == "eligible"
                                            for i in INTERNSHIPS.values()))
    recs = Recommender(INTERNSHIPS, TAX, SCORER, 5).recommend(zero, include_near=True)
    assert len(recs) >= 3
    assert all(r["tier"] == "near" and r["eligible"] is False for r in recs)
    assert all(r["considerations"][0].startswith("Close match: you need") for r in recs)
    assert all("Stipend" not in c and "Duration" not in c for r in recs for c in r["considerations"])


def test_strict_mode_is_unchanged():
    c = CANDS[0]
    strict = Recommender(INTERNSHIPS, TAX, SCORER, 5).recommend(c)
    assert all(r["tier"] == "eligible" for r in strict)


def test_default_weights_ignore_stipend_and_duration_and_total_one():
    from app.engine.matching.components import WEIGHTS
    assert abs(sum(WEIGHTS.values()) - 1.0) < 1e-9 and WEIGHTS["preference"] == 0.0


class _E:                                    # minimal engine for skill_unlocks
    tax, internships = TAX, INTERNSHIPS


def test_skill_unlocks_count_single_missing_skill_internships():
    c = CANDS[0]
    out = ea.skill_unlocks(_E, c)
    assert out == sorted(out, key=lambda u: (-u["unlocks"], u["skill"]))
    assert all(u["unlocks"] >= 1 for u in out) and len(out) <= 8


FULL = dict(age=22, family_income_lakh=4, family_govt_job=False, excluded_qualification=False,
            govt_apprenticeship=False, employed_full_time=False)


def test_precheck_likely_eligible_and_reasons_in_three_languages():
    assert precheck(FULL)["status"] == "likely_eligible"
    bad = precheck({**FULL, "family_income_lakh": 20, "family_govt_job": True})
    assert bad["status"] == "likely_not_eligible" and {b["code"] for b in bad["blockers"]} == {"income", "govt_family"}
    assert all({"en", "hi", "mr"} <= set(b["text"]) for b in bad["blockers"])


def test_precheck_unanswered_is_not_a_rejection():
    r = precheck({"age": 22})
    assert r["status"] == "check_details" and r["blockers"] == [] and "family_income_lakh" in r["unanswered"]
    assert precheck({**FULL, "age": 40})["status"] == "likely_not_eligible"


def test_only_sectors_keeps_every_result_inside_the_chosen_sectors_and_may_return_nothing():
    rec = Recommender(INTERNSHIPS, TAX, SCORER, 5)
    for c in CANDS[:60]:
        chosen = set(c["preferences"]["preferred_sectors"])
        recs = rec.recommend(c, include_near=True, only_sectors=True)
        assert all(INTERNSHIPS[r["internship_id"]]["sector_id"] in chosen for r in recs)
    c = dict(CANDS[0], preferences={**CANDS[0]["preferences"], "preferred_sectors": ["SEC-NOPE"]})
    assert rec.recommend(c, include_near=True, only_sectors=True) == []          # "nothing fits" case
    assert len(rec.recommend(c, include_near=True)) >= 3                           # toggle off: still gets results


def test_explanations_are_capped_at_three_reasons_and_one_improvement_tip():
    from app.engine.explanation.explain import explain
    rec = Recommender(INTERNSHIPS, TAX, SCORER, 5)
    shown = 0
    for c in CANDS[:80]:
        for r in rec.recommend(c, include_near=True):
            e = explain(c, INTERNSHIPS[r["internship_id"]], TAX, near=r["tier"] == "near")
            assert len(e["why_recommended"]) <= 3 and len(e["considerations"]) <= 1
            shown += 1
    assert shown > 100


def test_skill_unlocks_carry_free_course_search_links():
    from app.services.courses import course_links
    links = course_links("C++ & Python")
    assert {l["provider"] for l in links} == {"SWAYAM", "YouTube"}
    assert all(l["url"].startswith("https://") and " " not in l["url"] and "&Python" not in l["url"] for l in links)


def test_pmis_handoff_lists_documents_in_three_languages_and_never_collects_aadhaar():
    from app.api.routes.pmis import handoff
    h = handoff()
    assert h["official_url"].startswith("https://") and len(h["documents"]) >= 4
    assert all(d["label"][l].strip() for d in h["documents"] for l in ("en", "hi", "mr"))
    assert "never" in next(d for d in h["documents"] if d["id"] == "aadhaar")["label"]["en"]


def test_cold_start_profile_with_no_skills_still_gets_three_options_and_education_is_never_relaxed():
    hard = {k: v for k, v in INTERNSHIPS.items() if len(v["mandatory_skills"]) >= 3}
    assert len(hard) > 50
    cand = dict(CANDS[0], skills=[])
    picks = select_tiered(cand, hard, TAX, SCORER, 5, cand["preferences"]["preferred_sectors"])
    assert len(picks) >= 3 and all(t == "near" and n >= 1 for _i, _s, t, n in picks)
    rank = TAX.rank(cand["education"]["education_level"])
    for iid, *_ in picks:
        req = hard[iid]["education_requirements"].get("education_level")
        assert req is None or TAX.rank(req) <= rank


def test_cold_start_picks_prefer_the_home_state():
    """Tracker #21: when only far-off options exist (3+ skills missing), own-state listings come first."""
    hard = {k: v for k, v in INTERNSHIPS.items() if len(v["mandatory_skills"]) >= 3}
    checked = 0
    for c in CANDS[:60]:
        cand = dict(c, skills=[])
        home = TAX.city_state.get(cand["location_preferences"]["home_location"])
        pool = [i for i, v in hard.items() if TAX.city_state.get(v["location"]) == home]
        if not home or len(pool) < 3:
            continue
        picks = select_tiered(cand, hard, TAX, SCORER, 5, [])
        near = [i for i, _s, t, _n in picks if t == "near"]
        states = [TAX.city_state.get(hard[i]["location"]) == home for i in near]
        # once a listing from another state appears, no own-state listing may follow it
        assert states == sorted(states, reverse=True)
        checked += 1
    assert checked >= 5
