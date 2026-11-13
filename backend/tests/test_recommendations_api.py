from app.engine.eligibility.eligibility import check_eligibility
from app.engine.profile import normalize_profile
from app.core.config import settings
from app.services import engine_adapter as ea
from app.services.dataset_parse import parse_candidates
from tests.conftest import API, auth_header, register
from tests.helpers import adapter_engine, patch_payload, profile_obj, raw_candidates

_E = adapter_engine()
_ROWS = parse_candidates({"candidates": raw_candidates()})


def _count(row):
    return _E.recommend(ea.profile_dict(profile_obj(row)), k=5, method="baseline")["count"]


GOOD = next(r for r in _ROWS if _count(r) >= 5)
ZERO = next(r for r in _ROWS if _count(r) == 0)


def onboard(client, row, email="asha@example.com"):
    token = register(client, email=email).json()["access_token"]
    h = auth_header(token)
    assert client.patch(f"{API}/me/profile", headers=h, json=patch_payload(row)).status_code == 200
    assert client.post(f"{API}/me/profile/confirm", headers=h).status_code == 200
    return h


def test_recommendations_need_a_complete_profile(loaded_client):
    h = auth_header(register(loaded_client).json()["access_token"])
    r = loaded_client.get(f"{API}/me/recommendations", headers=h)
    assert r.status_code == 409 and r.json()["error"]["code"] == "profile_incomplete"
    assert loaded_client.get(f"{API}/me/recommendations").status_code == 401


def test_end_to_end_recommendations_match_the_engine(loaded_client):
    h = onboard(loaded_client, GOOD)
    r = loaded_client.get(f"{API}/me/recommendations", headers=h)
    assert r.status_code == 200
    body = r.json()
    expected = _E.recommend(ea.profile_dict(profile_obj(GOOD)), k=5, method="baseline", include_near=True)
    assert [x["internship_id"] for x in body["recommendations"]] == [x["internship_id"] for x in expected["recommendations"]]
    assert 3 <= body["count"] <= 5 and body["method"] == "baseline"
    assert [x["rank"] for x in body["recommendations"]] == list(range(1, body["count"] + 1))
    assert body["is_demo_data"] and body["demo_notice"] and body["disclaimer"] and body["nearest"] == []
    top = body["recommendations"][0]
    assert top["apply_url"] == settings.pmis_portal_url and top["skill_gap"]["missing_mandatory"] == []
    assert top["why_recommended"] and 0 <= top["match_percentage"] <= 100


def test_k_and_method_parameters(loaded_client):
    h = onboard(loaded_client, GOOD)
    assert loaded_client.get(f"{API}/me/recommendations?k=3", headers=h).json()["count"] == 3
    assert loaded_client.get(f"{API}/me/recommendations?method=tfidf", headers=h).status_code == 200
    assert loaded_client.get(f"{API}/me/recommendations?k=9", headers=h).status_code == 422
    assert loaded_client.get(f"{API}/me/recommendations?method=bogus", headers=h).status_code == 422


def test_nothing_eligible_returns_nearest_internships(loaded_client):
    h = onboard(loaded_client, ZERO)
    body = loaded_client.get(f"{API}/me/recommendations?close_matches=false", headers=h).json()
    assert body["count"] == 0 and body["recommendations"] == [] and body["message"]
    assert len(body["nearest"]) == 3
    assert all(n["missing_mandatory_ids"] or n["education_gap_levels"] for n in body["nearest"])


def test_internship_detail_for_eligible_and_ineligible(loaded_client):
    h = onboard(loaded_client, GOOD)
    top = loaded_client.get(f"{API}/me/recommendations", headers=h).json()["recommendations"][0]
    d = loaded_client.get(f"{API}/me/recommendations/{top['internship_id']}", headers=h).json()
    assert d["eligible"] and d["match_percentage"] == top["match_percentage"] and d["mandatory_skills"]
    cand = normalize_profile(ea.profile_dict(profile_obj(GOOD)), _E.tax)
    bad_id = next(i for i, rec in _E.internships.items() if not check_eligibility(cand, rec, _E.tax)[0])
    d = loaded_client.get(f"{API}/me/recommendations/{bad_id}", headers=h).json()
    assert d["eligible"] is False and d["match_percentage"] == 0 and d["considerations"]
    assert loaded_client.get(f"{API}/me/recommendations/ISU-999999", headers=h).status_code == 404


def test_skill_gap_endpoint(loaded_client):
    h = onboard(loaded_client, GOOD)
    skills = loaded_client.get(f"{API}/me/skill-gap", headers=h).json()["skills"]
    assert all({"skill_id", "skill", "count"} <= set(s) for s in skills)


def test_recommendations_blocked_after_consent_withdrawn(loaded_client):
    h = onboard(loaded_client, GOOD)
    loaded_client.delete(f"{API}/me/consent", headers=h)
    r = loaded_client.get(f"{API}/me/recommendations", headers=h)
    assert r.status_code == 403 and r.json()["error"]["code"] == "consent_required"


def test_saved_internships_flow(loaded_client):
    h = onboard(loaded_client, GOOD)
    assert loaded_client.get(f"{API}/me/saved", headers=h).json() == []
    top = loaded_client.get(f"{API}/me/recommendations", headers=h).json()["recommendations"][0]["internship_id"]
    assert loaded_client.put(f"{API}/me/saved/{top}", headers=h).json()["saved"] is True
    assert loaded_client.put(f"{API}/me/saved/{top}", headers=h).status_code == 200  # saving twice is fine
    items = loaded_client.get(f"{API}/me/saved", headers=h).json()
    assert len(items) == 1 and items[0]["internship_id"] == top and items[0]["eligible"] is True
    assert items[0]["match_percentage"] > 0
    other = auth_header(register(loaded_client, email="bob@example.com").json()["access_token"])
    assert loaded_client.get(f"{API}/me/saved", headers=other).json() == []
    assert loaded_client.delete(f"{API}/me/saved/{top}", headers=h).json()["saved"] is False
    assert loaded_client.get(f"{API}/me/saved", headers=h).json() == []
    assert loaded_client.put(f"{API}/me/saved/ISU-999999", headers=h).status_code == 404


def test_export_contains_profile_and_saved(loaded_client):
    h = onboard(loaded_client, GOOD)
    top = loaded_client.get(f"{API}/me/recommendations", headers=h).json()["recommendations"][0]["internship_id"]
    loaded_client.put(f"{API}/me/saved/{top}", headers=h)
    data = loaded_client.get(f"{API}/me/export", headers=h).json()
    assert data["profile"]["education_level_id"] == GOOD["education_level_id"] and data["saved_internships"] == [top]


def test_deleting_account_removes_profile_and_saved(loaded_client):
    from sqlalchemy import func, select
    from app.models import CandidateLink, SavedInternship
    h = onboard(loaded_client, GOOD)
    top = loaded_client.get(f"{API}/me/recommendations", headers=h).json()["recommendations"][0]["internship_id"]
    loaded_client.put(f"{API}/me/saved/{top}", headers=h)
    r = loaded_client.request("DELETE", f"{API}/me", headers=h, json={"password": "Secret123"})
    assert r.status_code == 200
    with loaded_client.db_factory() as db:
        assert db.scalar(select(func.count()).select_from(SavedInternship)) == 0
        # only the 350 synthetic profiles' links remain
        from app.models import CandidateProfile
        assert db.scalar(select(func.count()).select_from(CandidateProfile).where(CandidateProfile.is_synthetic.is_(False))) == 0


def test_browse_lists_catalogue_with_eligibility_and_filters(loaded_client):
    h = onboard(loaded_client, GOOD)
    r = loaded_client.get(f"{API}/me/internships?limit=50", headers=h).json()
    assert r["profile_complete"] and r["total"] > 50 and len(r["items"]) == 50
    flags = [i["eligible"] for i in r["items"]]
    assert flags == sorted(flags, reverse=True)                       # eligible first
    bad = next(i for i in r["items"] if i["eligible"] is False)         # eligibility failure != low match
    assert bad["match_percentage"] is None
    suitable = loaded_client.get(f"{API}/me/internships?scope=suitable&limit=50", headers=h).json()
    assert suitable["total"] > 0 and all(i["eligible"] and i["match_percentage"] is not None for i in suitable["items"])
    top = suitable["items"][0]
    hit = loaded_client.get(f"{API}/me/internships?q={top['title'][:12]}&city={top['location']}", headers=h).json()
    assert top["internship_id"] in [i["internship_id"] for i in hit["items"]]


def test_browse_without_profile_and_suitable_needs_profile(loaded_client):
    h = auth_header(register(loaded_client).json()["access_token"])
    r = loaded_client.get(f"{API}/me/internships", headers=h).json()
    assert not r["profile_complete"] and r["items"] and r["items"][0]["eligible"] is None
    s = loaded_client.get(f"{API}/me/internships?scope=suitable", headers=h)
    assert s.status_code == 409 and s.json()["error"]["code"] == "profile_incomplete"
    assert loaded_client.get(f"{API}/me/internships").status_code == 401


def test_browse_multi_sector_and_skill_filters_match_any_and_keep_eligibility(loaded_client):
    h = onboard(loaded_client, GOOD)
    base = loaded_client.get(f"{API}/me/internships?limit=50", headers=h).json()
    by_id = {i["internship_id"]: i for i in base["items"]}
    sectors = sorted({_E.internships[i]["sector_id"] for i in by_id})[:2]
    r = loaded_client.get(f"{API}/me/internships?limit=50&sectors={','.join(sectors)}", headers=h).json()
    assert r["total"] > 0 and all(_E.internships[i["internship_id"]]["sector_id"] in sectors for i in r["items"])
    one = loaded_client.get(f"{API}/me/internships?limit=50&sectors={sectors[0]}", headers=h).json()
    assert one["total"] < r["total"] or len(sectors) == 1                       # ANY: more sectors, more results
    sk = sorted(set(_E.internships[next(iter(by_id))]["mandatory_skills"]))[:1] + ["SK-UNKNOWN"]
    s = loaded_client.get(f"{API}/me/internships?limit=50&skills={','.join(sk)}", headers=h).json()
    assert s["total"] > 0
    # filters are preferences only: eligibility/match of a shared item is identical with and without them
    for i in s["items"]:
        b = by_id.get(i["internship_id"])
        if b:
            assert (i["eligible"], i["match_percentage"]) == (b["eligible"], b["match_percentage"])


def _profile(client, h):
    return client.get(f"{API}/me/profile", headers=h).json()


def test_other_text_is_saved_cleaned_and_swaps_with_ids(loaded_client):
    h = auth_header(register(loaded_client).json()["access_token"])
    p = loaded_client.patch(f"{API}/me/profile", headers=h,
                            json={"degree_other": "  B.Voc   Animation ", "home_location_other": "Saugor"}).json()
    assert p["degree_other"] == "B.Voc Animation" and p["home_location_other"] == "Saugor"   # trimmed, spaces collapsed
    assert "home_location_id" not in p["missing_fields"]                                    # typed city counts as answered
    bad = loaded_client.patch(f"{API}/me/profile", headers=h, json={"degree_other": "<script>"})
    assert bad.status_code == 422
    # choosing a real city clears the typed one (and vice versa)
    city = loaded_client.get(f"{API}/taxonomy/city").json()[0]["id"]
    p = loaded_client.patch(f"{API}/me/profile", headers=h, json={"home_location_id": city}).json()
    assert p["home_location_id"] == city and p["home_location_other"] is None
    p = loaded_client.patch(f"{API}/me/profile", headers=h, json={"home_location_other": "Saugor"}).json()
    assert p["home_location_id"] is None and p["home_location_other"] == "Saugor"
    assert loaded_client.patch(f"{API}/me/profile", headers=h, json={"home_location_other": ""}).json()["home_location_other"] is None


def test_profile_with_unlisted_city_still_gets_recommendations(loaded_client):
    h = onboard(loaded_client, GOOD)
    assert loaded_client.patch(f"{API}/me/profile", headers=h, json={"home_location_other": "Saugor"}).status_code == 200
    assert loaded_client.post(f"{API}/me/profile/confirm", headers=h).status_code == 200
    r = loaded_client.get(f"{API}/me/internships?limit=5", headers=h)
    assert r.status_code == 200 and r.json()["total"] > 0          # no 500 / validation error: location is never a gate


def test_close_matches_fill_the_list_for_a_zero_eligible_candidate(loaded_client):
    h = onboard(loaded_client, ZERO)
    body = loaded_client.get(f"{API}/me/recommendations", headers=h).json()
    assert body["count"] >= 3 and body["nearest"] == []
    assert all(r["tier"] == "near" and r["eligible"] is False and r["tier_label"] == "Close match" for r in body["recommendations"])
    assert all(1 <= len(r["skill_gap"]["missing_mandatory_ids"]) <= 2 for r in body["recommendations"])
    assert body["close_count"] == body["count"] and body["message"]
    assert all({"skill_id", "skill", "unlocks"} <= set(u) for u in body["skill_unlocks"])


def test_only_my_sectors_flag_is_accepted_and_reported(loaded_client):
    h = onboard(loaded_client, GOOD)
    on = loaded_client.get(f"{API}/me/recommendations?only_my_sectors=true", headers=h).json()
    off = loaded_client.get(f"{API}/me/recommendations", headers=h).json()
    assert on["only_my_sectors"] is True and off["only_my_sectors"] is False
    assert len(off["recommendations"]) >= 3


def test_interests_are_retired_old_apps_may_still_send_them(loaded_client):
    h = auth_header(register(loaded_client, email="old@example.com").json()["access_token"])
    r = loaded_client.patch(f"{API}/me/profile", headers=h, json={**patch_payload(GOOD), "interest_ids": ["INT-001"]})
    assert r.status_code == 200                      # accepted, not a 422
    assert "interest_ids" not in loaded_client.get(f"{API}/me/profile", headers=h).json()   # never stored or returned


def test_activities_endpoint_returns_only_loaded_skills(loaded_client):
    body = loaded_client.get(f"{API}/taxonomy/activities").json()["activities"]
    known = {s["id"] for s in loaded_client.get(f"{API}/taxonomy/skill?limit=500").json()}
    assert body and all(set(a["skill_ids"]) <= known for a in body)     # v1 test data has no everyday skills, so those tiles are hidden


def test_recommendations_carry_reason_codes_and_translate_from_them(loaded_client):
    h = onboard(loaded_client, GOOD)
    en = loaded_client.get(f"{API}/me/recommendations?lang=en", headers=h).json()["recommendations"][0]
    hi = loaded_client.get(f"{API}/me/recommendations?lang=hi", headers=h).json()["recommendations"][0]
    assert en["why_codes"] and all({"code", "params"} <= set(c) for c in en["why_codes"])
    assert [c["code"] for c in hi["why_codes"]] == [c["code"] for c in en["why_codes"]]   # same reasons, any language
    assert len(hi["why_recommended"]) == len(en["why_recommended"]) and hi["why_recommended"] != en["why_recommended"]
    d = loaded_client.get(f"{API}/me/recommendations/{en['internship_id']}", headers=h).json()
    assert d["why_codes"] == en["why_codes"]


def test_location_fields_and_facilities_filter(loaded_client):
    h = onboard(loaded_client, GOOD)
    body = loaded_client.get(f"{API}/me/recommendations", headers=h).json()
    assert "nearby_count" in body and "location_message" in body
    assert all("distance_km" in r for r in body["recommendations"])
    r = loaded_client.get(f"{API}/me/internships?facilities=food,stay", headers=h)
    assert r.status_code == 200 and "items" in r.json()


def test_delete_account_removes_profile_and_saved(loaded_client):
    """#39: deleting an account must remove the profile and saved internships, so a new account with the same email starts empty."""
    h = onboard(loaded_client, GOOD)
    first = loaded_client.get(f"{API}/me/recommendations", headers=h).json()["recommendations"][0]["internship_id"]
    assert loaded_client.put(f"{API}/me/saved/{first}", headers=h).status_code in (200, 204)
    assert len(loaded_client.get(f"{API}/me/saved", headers=h).json()) == 1
    assert loaded_client.get(f"{API}/me/export", headers=h).status_code == 200
    d = loaded_client.request("DELETE", f"{API}/me", headers=h, json={"password": "Secret123"})
    assert d.status_code == 200
    assert loaded_client.get(f"{API}/auth/me", headers=h).status_code == 401
    from app.core.otp import used_codes
    used_codes.clear()   # a real person would get a new emailed code; the test code is the same within 5 minutes
    h2 = auth_header(register(loaded_client, email="asha@example.com").json()["access_token"])
    assert loaded_client.get(f"{API}/me/saved", headers=h2).json() == []
    assert not loaded_client.get(f"{API}/me/profile", headers=h2).json().get("education_level")


def test_untranslated_language_falls_back_to_english(loaded_client):
    h = onboard(loaded_client, GOOD)
    en = loaded_client.get(f"{API}/me/recommendations?lang=en", headers=h).json()["recommendations"][0]
    te = loaded_client.get(f"{API}/me/recommendations?lang=te", headers=h)
    assert te.status_code == 200 and te.json()["recommendations"][0]["why_recommended"] == en["why_recommended"]
    bn = loaded_client.get(f"{API}/me/recommendations?lang=bn", headers=h).json()["recommendations"][0]
    assert bn["why_recommended"] != en["why_recommended"]  # Bengali sentences exist (session 10)
    assert loaded_client.get(f"{API}/me/recommendations?lang=fr", headers=h).status_code == 422
