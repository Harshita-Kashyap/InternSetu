from app.models import Consent
from tests.conftest import API, auth_header, make_admin, register


def _token(client):
    return register(client).json()["access_token"]


def test_registration_records_consent(client):
    h = auth_header(_token(client))
    r = client.get(f"{API}/me/consent", headers=h).json()
    assert r["has_active_consent"] is True and len(r["records"]) == 1
    assert r["records"][0]["version"] == "1.0"


def test_withdraw_and_give_again_keeps_history(client):
    h = auth_header(_token(client))
    r = client.delete(f"{API}/me/consent", headers=h).json()
    assert r["has_active_consent"] is False
    assert r["records"][0]["withdrawn_at"] is not None
    r = client.post(f"{API}/me/consent", headers=h).json()
    assert r["has_active_consent"] is True and len(r["records"]) == 2


def test_giving_consent_twice_does_not_duplicate(client):
    h = auth_header(_token(client))
    client.post(f"{API}/me/consent", headers=h)
    assert len(client.get(f"{API}/me/consent", headers=h).json()["records"]) == 1


def test_consent_requires_login(client):
    assert client.get(f"{API}/me/consent").status_code == 401


def test_export_has_no_password_hash(client):
    h = auth_header(_token(client))
    r = client.get(f"{API}/me/export", headers=h)
    assert r.status_code == 200
    assert "password" not in r.text.lower()
    assert r.json()["user"]["email"] == "asha@example.com"


def test_delete_account(client):
    h = auth_header(_token(client))
    wrong = client.request("DELETE", f"{API}/me", headers=h, json={"password": "Wrong1234"})
    assert wrong.status_code == 400
    ok = client.request("DELETE", f"{API}/me", headers=h, json={"password": "Secret123"})
    assert ok.status_code == 200
    assert client.get(f"{API}/auth/me", headers=h).status_code == 401
    assert client.post(f"{API}/auth/login", json={"identifier": "asha@example.com", "password": "Secret123"}).status_code == 401
    with client.db_factory() as db:
        assert db.query(Consent).count() == 0


def test_admin_cannot_delete_own_account(client):
    h = auth_header(make_admin(client))
    r = client.request("DELETE", f"{API}/me", headers=h, json={"password": "AdminPass1"})
    assert r.status_code == 403
