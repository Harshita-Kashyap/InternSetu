import logging
import time

from app.core.security import create_access_token, decode_token
from tests.conftest import API, GOOD, auth_header, register


def _login_token(client):
    return register(client).json()["access_token"]


def test_refresh_gives_a_new_token_and_keeps_the_session_start(client):
    old = _login_token(client)
    old_claims = decode_token(old)
    time.sleep(1.1)
    r = client.post(f"{API}/auth/refresh", headers=auth_header(old))
    assert r.status_code == 200
    new = r.json()["access_token"]
    new_claims = decode_token(new)
    assert new != old and new_claims["exp"] > old_claims["exp"]
    assert new_claims["ss"] == old_claims["ss"]                       # renewing never moves the start of the session
    assert client.get(f"{API}/auth/me", headers=auth_header(new)).status_code == 200


def test_refresh_needs_a_valid_token(client):
    assert client.post(f"{API}/auth/refresh").status_code == 401
    assert client.post(f"{API}/auth/refresh", headers={"Authorization": "Bearer nonsense"}).status_code == 401
    uid = register(client).json()["user"]["id"]
    expired = create_access_token(uid, "candidate", expires_minutes=-1)
    assert client.post(f"{API}/auth/refresh", headers=auth_header(expired)).status_code == 401


def test_a_session_older_than_the_limit_cannot_be_renewed(client):
    uid = register(client).json()["user"]["id"]
    long_ago = int(time.time()) - 15 * 86400                          # limit is 14 days
    old_session = create_access_token(uid, "candidate", session_start=long_ago)
    r = client.post(f"{API}/auth/refresh", headers=auth_header(old_session))
    assert r.status_code == 401 and r.json()["error"]["code"] == "session_too_old"
    recent = create_access_token(uid, "candidate", session_start=int(time.time()) - 13 * 86400)
    assert client.post(f"{API}/auth/refresh", headers=auth_header(recent)).status_code == 200


def test_every_response_has_a_request_id_and_a_good_incoming_one_is_kept(client):
    r = client.get("/health")
    assert len(r.headers["X-Request-ID"]) >= 6
    assert client.get("/health", headers={"X-Request-ID": "abc-123_XYZ"}).headers["X-Request-ID"] == "abc-123_XYZ"
    bad = client.get("/health", headers={"X-Request-ID": "x y<script>"}).headers["X-Request-ID"]
    assert "<" not in bad and " " not in bad


def test_logs_have_the_request_but_no_secrets_and_a_crash_gives_a_clean_500(client, caplog):
    from app.main import app

    def boom():
        raise RuntimeError("kaboom")

    app.add_api_route("/_boom", boom, methods=["GET"])
    try:
        with caplog.at_level(logging.INFO, logger="internsetu"):
            client.post(f"{API}/auth/login", json={"identifier": GOOD["email"], "password": "Secret-Password-1"})
            r = client.get("/_boom?token=SECRETQUERY", headers={"X-Request-ID": "req-test-1"})
    finally:
        app.router.routes = [x for x in app.router.routes if getattr(x, "path", "") != "/_boom"]
    assert r.status_code == 500 and r.json()["error"]["code"] == "server_error" and "req-test-1" in r.json()["error"]["message"]
    assert r.headers["X-Request-ID"] == "req-test-1"
    # only our own log lines (the test client logs its own requests, with query strings, under a different name)
    text = "\n".join(r.getMessage() + (r.exc_text or "") for r in caplog.records if r.name.startswith("internsetu"))
    text += "\n".join("".join(__import__("traceback").format_exception(*r.exc_info)) for r in caplog.records if r.name.startswith("internsetu") and r.exc_info)
    assert "/api/v1/auth/login" in text and "req-test-1" in text and "kaboom" in text
    assert "Secret-Password-1" not in text and "SECRETQUERY" not in text and GOOD["email"] not in text   # no passwords, queries or emails in logs
