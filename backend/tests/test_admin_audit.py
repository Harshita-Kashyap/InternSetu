from tests.conftest import API, auth_header, make_admin, register

W = {"skills": 40, "education": 20, "location": 20, "interest_sector": 20, "role": 0, "preference": 0}


def test_admin_changes_are_logged_and_only_admins_can_read(client):
    admin = auth_header(make_admin(client))
    assert client.put(f"{API}/admin/weights", headers=admin, json=W).status_code == 200
    assert client.post(f"{API}/admin/weights/reset", headers=admin).status_code == 200
    log = client.get(f"{API}/admin/audit", headers=admin).json()["items"]
    assert [x["action"] for x in log][:2] == ["weights.reset", "weights.update"]      # newest first
    upd = log[1]
    assert upd["admin_email"] == "boss@example.com" and upd["details"]["new"]["skills"] == 40 and upd["details"]["old"]["skills"] == 35
    only = client.get(f"{API}/admin/audit?action=weights.update", headers=admin).json()["items"]
    assert len(only) == 1
    cand = auth_header(register(client).json()["access_token"])
    assert client.get(f"{API}/admin/audit", headers=cand).status_code == 403


def test_failed_or_dry_run_changes_are_not_logged(client):
    admin = auth_header(make_admin(client))
    assert client.put(f"{API}/admin/weights", headers=admin, json={**W, "skills": 50}).status_code == 422     # total is not 100
    csv = "company_name,title\nX,Y\n"
    client.post(f"{API}/admin/internships/import", headers=admin, json={"csv_text": csv, "dry_run": True, "skip_invalid": True})
    assert client.get(f"{API}/admin/audit", headers=admin).json()["items"] == []
