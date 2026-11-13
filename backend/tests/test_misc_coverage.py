import pytest

from app.core.validators import clean_free_text, clean_name, normalize_mobile, validate_password
from tests.conftest import API, auth_header, make_admin, register


def test_root_and_health(client):
    assert client.get("/").json()["status"] == "running"
    assert client.get("/health").status_code == 200


@pytest.mark.parametrize("raw", ["9876543210", "+91 98765 43210", "09876543210", "919876543210", "(98765)-43210"])
def test_mobile_formats_normalise(raw):
    assert normalize_mobile(raw) == "9876543210"


@pytest.mark.parametrize("raw", ["12345", "5876543210", "98765432101234", "abcdefghij"])
def test_bad_mobiles_are_refused(raw):
    with pytest.raises(ValueError):
        normalize_mobile(raw)


def test_password_rules():
    assert validate_password("Secret123") == "Secret123"
    for bad in ["short1", "allletters", "12345678", "é" * 40 + "a1"]:
        with pytest.raises(ValueError):
            validate_password(bad)


def test_name_and_free_text_cleaning():
    assert clean_name("  Asha   Verma ") == "Asha Verma"
    for bad in ["A", "<b>x</b>"]:
        with pytest.raises(ValueError):
            clean_name(bad)
    assert clean_free_text("  Spoken   Hindi ") == "Spoken Hindi"
    for bad in ["", "   ", "x" * 101, "a{b}", "a\\b"]:
        with pytest.raises(ValueError):
            clean_free_text(bad)


def test_admin_ping_stats_lists_and_roles(client, admin):
    h = admin if isinstance(admin, dict) else auth_header(make_admin(client))
    assert client.get(f"{API}/admin/ping", headers=h).json()["status"] == "ok"
    assert isinstance(client.get(f"{API}/admin/stats", headers=h).json(), dict)
    assert client.get(f"{API}/admin/flagged", headers=h).status_code == 200
    assert client.get(f"{API}/admin/flagged?status=bogus", headers=h).status_code == 422
    lst = client.get(f"{API}/admin/internships?limit=5", headers=h)
    assert lst.status_code == 200
    cand = auth_header(register(client, email="cand@example.com").json()["access_token"])
    for path in ("ping", "stats", "flagged", "internships", "audit"):
        assert client.get(f"{API}/admin/{path}", headers=cand).status_code == 403
