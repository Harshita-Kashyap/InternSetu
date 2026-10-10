from sqlalchemy import select

from app.models import FlaggedValue, TaxonomyEntry, TaxonomyTranslation
from tests.conftest import API, auth_header, register


def test_list_skills_is_public_and_complete(loaded_client):
    r = loaded_client.get(f"{API}/taxonomy/skill?limit=500")
    assert r.status_code == 200 and len(r.json()) == 296


def test_education_levels_are_ordered(loaded_client):
    ids = [x["id"] for x in loaded_client.get(f"{API}/taxonomy/education_level").json()]
    assert ids == ["EDU-10", "EDU-12", "EDU-ITI", "EDU-DIPLOMA", "EDU-UG", "EDU-PG", "EDU-DOCTORATE"]


def test_search_prefix_and_alias(loaded_client):
    names = [x["name"] for x in loaded_client.get(f"{API}/taxonomy/skill?q=pyth").json()]
    assert "Python" in names
    assert any(x["id"] == "SK-PROG-001" for x in loaded_client.get(f"{API}/taxonomy/skill?q=python programming").json())


def test_filter_by_parent(loaded_client):
    items = loaded_client.get(f"{API}/taxonomy/city?parent=LOC-STATE-MP").json()
    assert {"Indore", "Bhopal"} <= {x["name"] for x in items}


def test_language_with_fallback(loaded_client):
    with loaded_client.db_factory() as db:
        db.add(TaxonomyTranslation(entry_id="SK-PROG-001", lang="hi", label="पायथन"))
        db.commit()
    hi = {x["id"]: x["name"] for x in loaded_client.get(f"{API}/taxonomy/skill?lang=hi&limit=500").json()}
    assert hi["SK-PROG-001"] == "पायथन"
    assert hi["SK-PROG-002"] == next(x["name"] for x in loaded_client.get(f"{API}/taxonomy/skill?limit=500").json() if x["id"] == "SK-PROG-002")
    # translated label is searchable too
    assert any(x["id"] == "SK-PROG-001" for x in loaded_client.get(f"{API}/taxonomy/skill?lang=hi&q=पायथन").json())


def test_invalid_type_and_lang_rejected(loaded_client):
    assert loaded_client.get(f"{API}/taxonomy/banana").status_code == 422
    assert loaded_client.get(f"{API}/taxonomy/skill?lang=fr").status_code == 422


def test_city_has_coordinates(loaded_client):
    items = loaded_client.get(f"{API}/taxonomy/city?q=indore").json()
    assert items[0]["latitude"] and items[0]["longitude"]


def _norm(client, token, text, entry_type="skill"):
    return client.post(f"{API}/taxonomy/normalize", headers=auth_header(token), json={"entry_type": entry_type, "text": text})


def test_normalize_requires_login(loaded_client):
    assert loaded_client.post(f"{API}/taxonomy/normalize", json={"entry_type": "skill", "text": "x"}).status_code == 401


def test_normalize_exact_fuzzy_and_flagged(loaded_client):
    token = register(loaded_client).json()["access_token"]
    r = _norm(loaded_client, token, "python programming").json()
    assert r["mapped"] and r["method"] == "exact" and r["entry"]["id"] == "SK-PROG-001" and not r["flagged"]
    r = _norm(loaded_client, token, "Pythn").json()
    assert r["mapped"] and r["method"] == "fuzzy"
    r = _norm(loaded_client, token, "underwater basket weaving").json()
    assert not r["mapped"] and r["flagged"] and r["entry"] is None
    with loaded_client.db_factory() as db:
        rows = list(db.scalars(select(FlaggedValue)))
        assert len(rows) == 1 and rows[0].status == "pending"
    _norm(loaded_client, token, "Underwater  Basket Weaving")  # same text again -> not duplicated
    with loaded_client.db_factory() as db:
        assert len(list(db.scalars(select(FlaggedValue)))) == 1


def test_normalize_rejects_html(loaded_client):
    token = register(loaded_client).json()["access_token"]
    assert _norm(loaded_client, token, "<script>alert(1)</script>").status_code == 422


def test_deleting_account_removes_profile(loaded_client):
    from app.models import CandidateProfile
    token = register(loaded_client).json()["access_token"]
    with loaded_client.db_factory() as db:
        from app.models import User
        uid = db.scalar(select(User.id).where(User.email == "asha@example.com"))
        db.add(CandidateProfile(user_id=uid)); db.commit()
    r = loaded_client.request("DELETE", f"{API}/me", headers=auth_header(token), json={"password": "Secret123"})
    assert r.status_code == 200
    with loaded_client.db_factory() as db:
        assert db.scalar(select(CandidateProfile).where(CandidateProfile.user_id == uid)) is None
