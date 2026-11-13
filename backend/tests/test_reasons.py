"""Reason codes + plain-language explanations (tracker #12, #16, #29). Pure Python, no database."""
import json
import re
from pathlib import Path

from app.engine.explanation.explain import explain
from app.engine.explanation.reasons import LANGS, REASONS, make, render, render_all
from app.engine.pipeline import Recommender
from app.engine.semantic.scorers import StructuredScorer
from app.engine.taxonomy import Taxonomy
from app.services.localize import localize

D = Path(__file__).resolve().parents[1] / "data"
TAX = Taxonomy(json.loads((D / "internsetu_taxonomy.json").read_text(encoding="utf-8")))
INTERNSHIPS = {i["internship_id"]: i for i in json.loads(
    (D / "internsetu_synthetic_internships_v1.json").read_text(encoding="utf-8"))["internships"]}
CANDS = json.loads((D / "internsetu_synthetic_candidates_v1.json").read_text(encoding="utf-8"))["candidates"]
REC = Recommender(INTERNSHIPS, TAX, StructuredScorer(TAX), 5)
_PH = re.compile(r"\{(\w+)")
JARGON = ("mandatory", "taxonomy", "criteria", "eligibility", "relocate", "suitability")


def _sample():
    out = []
    for c in CANDS[:60]:
        for r in REC.recommend(c, include_near=True):
            out.append((c, r))
    return out


def test_every_code_has_every_language_with_the_same_placeholders():
    for code, t in REASONS.items():
        assert set(t) == set(LANGS), code
        assert len({frozenset(_PH.findall(t[lg])) for lg in LANGS}) == 1, f"placeholders differ in {code}"


def test_english_wording_avoids_jargon():
    for code, t in REASONS.items():
        assert not any(w in t["en"].lower() for w in JARGON), (code, t["en"])


def test_render_fills_parameters_and_falls_back_to_english():
    r = make("SKILLS_MATCH", n=2, total=5, names="Excel, Tally")
    assert render(r) == "You have 2 of the 5 skills they want (Excel, Tally)"
    assert "Excel, Tally" in render(r, "hi") and "Excel, Tally" in render(r, "mr")
    assert render(r, "fr") == render(r, "en")                                   # unknown language -> English
    assert render({"code": "SKILLS_MATCH", "params": {}}, "hi") == REASONS["SKILLS_MATCH"]["en"]  # bad params never crash
    assert render({"code": "NOT_A_CODE"}) == "NOT_A_CODE"


def test_unknown_code_cannot_be_created():
    try:
        make("NOPE")
    except KeyError:
        return
    raise AssertionError("make() accepted an unknown code")


def test_explain_codes_match_the_english_text_and_respect_the_caps():
    seen = 0
    for c, r in _sample():
        assert r["why_recommended"] == render_all(r["why_codes"])
        assert r["considerations"] == render_all(r["consider_codes"])
        assert len(r["why_codes"]) <= 3 and len(r["consider_codes"]) <= 1
        seen += 1
    assert seen > 100


def test_every_real_explanation_renders_in_all_languages_without_leftover_braces():
    for _c, r in _sample()[:150]:
        for lg in LANGS:
            for s in render_all(r["why_codes"] + r["consider_codes"], lg):
                assert "{" not in s and "}" not in s and s.strip(), (lg, s)


def test_close_match_tip_comes_first_and_lists_missing_skills():
    near = [r for _c, r in _sample() if r["tier"] == "near"]
    assert near
    for r in near:
        first = r["consider_codes"][0]
        assert first["code"] == "CLOSE_MATCH" and 1 <= first["params"]["n"] <= 2 and first["params"]["names"]


def test_not_eligible_detail_lists_what_is_missing_in_plain_words():
    c = CANDS[0]
    checked = 0
    for i in INTERNSHIPS.values():
        e = explain(c, i, TAX)
        if not e["eligible"]:
            assert e["why_codes"] == [] and e["consider_codes"]
            assert all(x["code"] in ("NEED_SKILLS", "EDU_TOO_LOW") for x in e["consider_codes"])
            assert all("mandatory" not in s.lower() for s in e["considerations"])
            checked += 1
    assert checked > 10


def test_localize_rebuilds_sentences_from_codes():
    item = {"why_codes": [make("LOC_HOME")], "why_recommended": ["It is in your home place"],
            "consider_codes": [make("SECTOR_OTHER")], "considerations": ["It is not in an industry you chose"]}
    hi = localize({"recommendations": [item]}, "hi")["recommendations"][0]
    assert hi["why_recommended"] == [REASONS["LOC_HOME"]["hi"]] and hi["considerations"] == [REASONS["SECTOR_OTHER"]["hi"]]
    assert hi["why_codes"] == item["why_codes"]                                  # codes themselves are never changed
    assert localize(item, "en") == item


def test_nearest_reason_uses_plain_words_and_translates_from_codes():
    from app.services import engine_adapter as ea
    from app.engine.engine import RecommendationEngine
    c = CANDS[0]
    eng = RecommendationEngine(added_file=None, taxonomy_data=json.loads((D / "internsetu_taxonomy.json").read_text(encoding="utf-8")),
                               internships=INTERNSHIPS)
    rows = ea.nearest_internships(eng, c)
    assert rows and all(r["reason_codes"] and "mandatory" not in r["reason"].lower() for r in rows)
    hi = localize({"nearest": rows}, "hi")["nearest"][0]
    assert hi["reason"] != rows[0]["reason"] and hi["reason_codes"] == rows[0]["reason_codes"]


def test_server_messages_are_plain_and_translate():
    from app.engine.engine import CLOSE_MESSAGE
    from app.services.localize import tr_text
    msgs = [CLOSE_MESSAGE, "No internship fits this profile yet. To qualify you need all the must-have skills and at least the education level they ask for.",
            "Only 2 internship(s) fit you fully, so fewer than 3 are shown.",
            "No internship matches your current skills and education yet. Here are the closest ones and what you would need."]
    for m in msgs:
        assert "mandatory" not in m.lower()
        assert all(tr_text(m, lg) != m for lg in ("hi", "mr")), m


def test_cold_start_picks_are_labelled_starter_and_close_matches_are_not():
    from app.services import engine_adapter as ea
    from app.engine.engine import STARTER_MESSAGE
    from app.services.localize import tr_text
    empty = dict(CANDS[0], skills=[])                      # no skills at all
    hard = {k: v for k, v in INTERNSHIPS.items() if len(v["mandatory_skills"]) >= 3}   # forces the cold-start path
    recs = Recommender(hard, TAX, StructuredScorer(TAX), 5).recommend(empty, include_near=True)
    assert len(recs) >= 3
    starters = [r for r in recs if r["starter"]]
    assert starters and all(r["tier"] == "near" and r["eligible"] is False for r in starters)
    assert all(r["consider_codes"][0]["code"] == "STARTER" and r["consider_codes"][0]["params"]["n"] > 2 for r in starters)
    assert all(ea.enrich(r, _FakeEng(), empty, "u")["tier_label"] == "Starter" for r in starters[:1])
    for lg in ("hi", "mr"):
        assert tr_text(STARTER_MESSAGE, lg) != STARTER_MESSAGE and tr_text("Starter", lg) != "Starter"
    # real close matches (1-2 skills) never get the starter label
    assert all(not r["starter"] for c in CANDS[:60] for r in REC.recommend(c, include_near=True)
               if r["consider_codes"] and r["consider_codes"][0]["code"] == "CLOSE_MATCH")


class _FakeEng:
    internships = INTERNSHIPS
    tax = TAX
