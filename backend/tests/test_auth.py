from app.core.security import create_access_token
from app.models import User
from tests.conftest import API, GOOD, auth_header, make_admin, register


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200 and r.json()["database"] == "ok"


def test_register_with_email(client):
    r = register(client)
    assert r.status_code == 201
    body = r.json()
    assert body["token_type"] == "bearer" and body["access_token"]
    assert body["user"]["email"] == "asha@example.com"
    assert body["user"]["role"] == "candidate"
    assert "password" not in str(body).lower().replace("password_hash", "")


def test_register_with_mobile_is_normalised(client):
    r = register(client, email=None, mobile="+91 98765 43210")
    assert r.status_code == 201
    assert r.json()["user"]["mobile"] == "9876543210"


def test_register_blank_email_with_mobile_ok(client):
    assert register(client, email="", mobile="9876543210").status_code == 201


def test_register_needs_email_or_mobile(client):
    r = register(client, email=None)
    assert r.status_code == 422 and r.json()["error"]["code"] == "validation_error"


def test_register_invalid_mobile(client):
    r = register(client, email=None, mobile="12345")
    assert r.status_code == 422


def test_register_requires_consent(client):
    r = register(client, consent=False)
    assert r.status_code == 422
    fields = [f["field"] for f in r.json()["error"]["fields"]]
    assert "consent" in fields


def test_register_weak_passwords(client):
    for pw in ["short1", "onlyletters", "12345678"]:
        assert register(client, password=pw).status_code == 422


def test_register_duplicate_email_case_insensitive(client):
    assert register(client).status_code == 201
    r = register(client, email="ASHA@example.com")
    assert r.status_code == 409 and r.json()["error"]["code"] == "account_exists"


def test_register_cannot_choose_admin_role(client):
    r = register(client, role="admin")
    assert r.status_code == 201 and r.json()["user"]["role"] == "candidate"


def test_password_is_stored_hashed(client):
    register(client)
    with client.db_factory() as db:
        user = db.query(User).one()
        assert user.password_hash != GOOD["password"] and user.password_hash.startswith("$2")


def test_login_by_email_and_mobile(client):
    register(client, mobile="9876543210")
    for ident in ["asha@example.com", "ASHA@example.com", "9876543210", "+91 9876543210"]:
        r = client.post(f"{API}/auth/login", json={"identifier": ident, "password": "Secret123"})
        assert r.status_code == 200, ident


def test_login_wrong_password_and_unknown_user_look_the_same(client):
    register(client)
    a = client.post(f"{API}/auth/login", json={"identifier": "asha@example.com", "password": "Wrong1234"})
    b = client.post(f"{API}/auth/login", json={"identifier": "nobody@example.com", "password": "Wrong1234"})
    assert a.status_code == b.status_code == 401
    assert a.json() == b.json()


def test_login_lockout_after_five_failures(client):
    register(client)
    bad = {"identifier": "asha@example.com", "password": "Wrong1234"}
    for _ in range(5):
        assert client.post(f"{API}/auth/login", json=bad).status_code == 401
    r = client.post(f"{API}/auth/login", json=bad)
    assert r.status_code == 429 and r.json()["error"]["code"] == "too_many_attempts"
    # even the right password is blocked while locked
    ok = client.post(f"{API}/auth/login", json={"identifier": "asha@example.com", "password": "Secret123"})
    assert ok.status_code == 429


def test_me_requires_valid_token(client):
    assert client.get(f"{API}/auth/me").status_code == 401
    assert client.get(f"{API}/auth/me", headers=auth_header("garbage")).status_code == 401
    expired = create_access_token(1, "candidate", expires_minutes=-1)
    r = client.get(f"{API}/auth/me", headers=auth_header(expired))
    assert r.status_code == 401 and r.json()["error"]["code"] == "token_expired"


def test_me_returns_user(client):
    token = register(client).json()["access_token"]
    r = client.get(f"{API}/auth/me", headers=auth_header(token))
    assert r.status_code == 200 and r.json()["email"] == "asha@example.com"


def test_admin_route_protected_by_role(client):
    cand = register(client).json()["access_token"]
    assert client.get(f"{API}/admin/ping").status_code == 401
    assert client.get(f"{API}/admin/ping", headers=auth_header(cand)).status_code == 403
    admin = make_admin(client)
    r = client.get(f"{API}/admin/ping", headers=auth_header(admin))
    assert r.status_code == 200


def test_change_password(client):
    token = register(client).json()["access_token"]
    h = auth_header(token)
    bad = client.post(f"{API}/auth/change-password", headers=h, json={"current_password": "nope1234", "new_password": "NewPass123"})
    assert bad.status_code == 400 and bad.json()["error"]["code"] == "wrong_password"
    ok = client.post(f"{API}/auth/change-password", headers=h, json={"current_password": "Secret123", "new_password": "NewPass123"})
    assert ok.status_code == 200
    assert client.post(f"{API}/auth/login", json={"identifier": "asha@example.com", "password": "Secret123"}).status_code == 401
    assert client.post(f"{API}/auth/login", json={"identifier": "asha@example.com", "password": "NewPass123"}).status_code == 200


def test_forgot_and_reset_are_stubbed(client):
    r = client.post(f"{API}/auth/forgot-password", json={"identifier": "x@example.com"})
    assert r.status_code == 202
    assert client.post(f"{API}/auth/reset-password").status_code == 501


def test_unknown_route_uses_error_format(client):
    r = client.get("/nope")
    assert r.status_code == 404 and r.json()["error"]["code"] == "http_404"
