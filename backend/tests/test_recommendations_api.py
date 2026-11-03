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
    expected = _E.recommend(ea.profile_dict(profile_obj(GOOD)), k=5, method="baseline")
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
    body = loaded_client.get(f"{API}/me/recommendations", headers=h).json()
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
