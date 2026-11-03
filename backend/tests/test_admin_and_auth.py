W = dict(skills=40, education=20, location=15, interest_sector=15, role=5, preference=5)
CSV = ("company_name,title,description,sector,role,location,min_education,duration,mandatory_skills,preferred_skills,stipend_inr_per_month\n"
       "Acme,Dev Intern,backend,IT,Developer,Indore,Undergraduate,8 weeks,Python,SQL,5000\n"
       "Beta,Bad Row,x,Nowhere,Developer,Indore,Undergraduate,8 weeks,Python,,abc\n")


def test_admin_requires_login_and_role(client):
    assert client.get("/api/v1/admin/stats").status_code == 401
    r = client.post("/api/v1/auth/register", json={"full_name": "Cand", "email": "c@test.com", "password": "Passw0rd1", "consent": True})
    assert r.status_code in (200, 201)
    h = {"Authorization": f"Bearer {r.json()['access_token']}"}
    assert client.get("/api/v1/admin/stats", headers=h).status_code == 403


def test_weights_must_total_100(client, admin):
    bad = client.put("/api/v1/admin/weights", headers=admin, json={**W, "skills": 50})
    assert bad.status_code == 422
    ok = client.put("/api/v1/admin/weights", headers=admin, json=W)
    assert ok.status_code == 200 and ok.json()["weights"]["skills"] == 40
    assert client.post("/api/v1/admin/weights/reset", headers=admin).json()["weights"]["skills"] == 30


def test_csv_import_reports_bad_rows_and_labels_synthetic(client, admin):
    dry = client.post("/api/v1/admin/internships/import", headers=admin, json={"csv_text": CSV, "dry_run": True, "skip_invalid": True}).json()
    assert dry["rows_valid"] == 1 and dry["rows_invalid"] == 1
    blocked = client.post("/api/v1/admin/internships/import", headers=admin, json={"csv_text": CSV, "dry_run": False}).json()
    assert blocked["imported"] == 0
    done = client.post("/api/v1/admin/internships/import", headers=admin, json={"csv_text": CSV, "dry_run": False, "skip_invalid": True}).json()
    assert done["imported"] == 1
    items = client.get("/api/v1/admin/internships", headers=admin).json()["items"]
    assert items and items[0]["is_synthetic"] is True


def test_inactive_internship_is_never_recommended(client, admin):
    items = client.get("/api/v1/admin/internships", headers=admin).json()["items"]
    iid = items[0]["internship_id"]
    client.patch(f"/api/v1/admin/internships/{iid}", headers=admin, json={"is_active": False})
    ev = client.get("/api/v1/admin/evaluation?n=10&methods=baseline", headers=admin).json()
    assert ev["methods"]["baseline"]["avg_results"] == 0.0
    client.patch(f"/api/v1/admin/internships/{iid}", headers=admin, json={"is_active": True})


def test_taxonomy_synonyms_and_evaluation(client, admin):
    e = client.post("/api/v1/admin/taxonomy/skill", headers=admin, json={"name": "Machine Learning", "synonyms": ["ML", "मशीन लर्निंग"]})
    assert e.status_code == 201 and "ML" in e.json()["synonyms"]
    ev = client.get("/api/v1/admin/evaluation?n=10&methods=baseline,tfidf", headers=admin).json()
    assert ev["methods"]["baseline"]["avg_results"] >= 1 and ev["methods"]["tfidf"]["available"]
