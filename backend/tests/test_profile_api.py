from tests.conftest import API, auth_header, register


def _token(client, **kw):
    return register(client, **kw).json()["access_token"]


def _patch(client, token, body):
    return client.patch(f"{API}/me/profile", headers=auth_header(token), json=body)


def test_profile_requires_login(loaded_client):
    assert loaded_client.get(f"{API}/me/profile").status_code == 401


def test_new_profile_is_an_empty_draft(loaded_client):
    r = loaded_client.get(f"{API}/me/profile", headers=auth_header(_token(loaded_client))).json()
    assert r["status"] == "draft" and r["skill_ids"] == []
    assert set(r["missing_fields"]) == {"education_level_id", "home_location_id", "skill_ids"}


def test_save_step_by_step_then_confirm(loaded_client):
    t = _token(loaded_client)
    r = _patch(loaded_client, t, {"education_level_id": "EDU-UG", "field_of_study_id": "FOS-CSE"}).json()
    assert r["education_level_id"] == "EDU-UG" and "education_level_id" not in r["missing_fields"]
    r = _patch(loaded_client, t, {"skill_ids": ["SK-PROG-001", "SK-PROG-002"]}).json()
    assert r["skill_ids"] == ["SK-PROG-001", "SK-PROG-002"] and r["education_level_id"] == "EDU-UG"  # untouched
    assert loaded_client.post(f"{API}/me/profile/confirm", headers=auth_header(t)).status_code == 422
    r = _patch(loaded_client, t, {"home_location_id": "LOC-CITY-IND", "duration_preference": "2 months"}).json()
    assert r["missing_fields"] == [] and r["status"] == "draft"
    done = loaded_client.post(f"{API}/me/profile/confirm", headers=auth_header(t))
    assert done.status_code == 200 and done.json()["status"] == "complete"


def test_list_fields_are_replaced_not_appended(loaded_client):
    t = _token(loaded_client)
    _patch(loaded_client, t, {"skill_ids": ["SK-PROG-001", "SK-PROG-002"]})
    r = _patch(loaded_client, t, {"skill_ids": ["SK-PROG-002", "SK-PROG-003", "SK-PROG-003"]}).json()
    assert r["skill_ids"] == ["SK-PROG-002", "SK-PROG-003"] or set(r["skill_ids"]) == {"SK-PROG-002", "SK-PROG-003"}
    assert len(r["skill_ids"]) == 2


def test_null_clears_a_single_value(loaded_client):
    t = _token(loaded_client)
    _patch(loaded_client, t, {"degree_id": "DEG-BTECH"})
    assert _patch(loaded_client, t, {"degree_id": None}).json()["degree_id"] is None


def test_removing_required_data_sends_profile_back_to_draft(loaded_client):
    t = _token(loaded_client)
    _patch(loaded_client, t, {"education_level_id": "EDU-UG", "home_location_id": "LOC-CITY-IND", "skill_ids": ["SK-PROG-001"]})
    loaded_client.post(f"{API}/me/profile/confirm", headers=auth_header(t))
    r = _patch(loaded_client, t, {"skill_ids": []}).json()
    assert r["status"] == "draft" and "skill_ids" in r["missing_fields"]


def test_bad_ids_are_rejected_with_field_names(loaded_client):
    t = _token(loaded_client)
    r = _patch(loaded_client, t, {"skill_ids": ["SK-NOPE-999"], "education_level_id": "SK-PROG-001"})
    assert r.status_code == 422
    fields = {f["field"] for f in r.json()["error"]["fields"]}
    assert fields == {"skill_ids", "education_level_id"}


def test_unknown_field_and_bad_duration_rejected(loaded_client):
    t = _token(loaded_client)
    assert _patch(loaded_client, t, {"favourite_colour": "blue"}).status_code == 422
    assert _patch(loaded_client, t, {"duration_preference": "5 days"}).status_code == 422
    assert _patch(loaded_client, t, {"stipend_expectation": -5}).status_code == 422


def test_durations_list_is_public(loaded_client):
    d = loaded_client.get(f"{API}/taxonomy/durations").json()["durations"]
    assert "2 months" in d and "4 weeks" in d


def test_cannot_edit_profile_without_consent(loaded_client):
    t = _token(loaded_client)
    loaded_client.delete(f"{API}/me/consent", headers=auth_header(t))
    r = _patch(loaded_client, t, {"education_level_id": "EDU-UG"})
    assert r.status_code == 403 and r.json()["error"]["code"] == "consent_required"
    assert loaded_client.get(f"{API}/me/profile", headers=auth_header(t)).status_code == 200  # viewing is fine


def test_users_cannot_see_each_others_profiles(loaded_client):
    a = _token(loaded_client)
    b = _token(loaded_client, email="bob@example.com")
    _patch(loaded_client, a, {"education_level_id": "EDU-PG"})
    assert loaded_client.get(f"{API}/me/profile", headers=auth_header(b)).json()["education_level_id"] is None
