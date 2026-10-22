"""End-to-end check of a RUNNING backend (standard library only).

1) start the server:   uvicorn app.main:app --reload
2) run:                python -m app.scripts.smoke_test            (or add  --url http://192.168.1.5:8000)
It registers a throw-away user, fills the profile, asks for recommendations and prints what happened.
"""
import argparse
import json
import time
import urllib.error
import urllib.request

PROFILE = {
    "education_level_id": "EDU-12",
    "degree_id": None,
    "field_of_study_id": None,
    "skill_ids": [
        "SK-HOSP-001",
        "SK-HOSP-005",
        "SK-HOSP-004",
        "SK-PM-003",
        "SK-LANG-007",
        "SK-HOSP-003",
        "SK-HOSP-002",
        "SK-COMM-003",
        "SK-HOSP-006"
    ],
    "interest_ids": [
        "INT-022",
        "INT-006"
    ],
    "preferred_role_ids": [
        "ROLE-054"
    ],
    "preferred_sector_ids": [
        "SEC-012"
    ],
    "home_location_id": "LOC-CITY-ASR",
    "preferred_location_ids": [
        "LOC-CITY-ASR",
        "LOC-CITY-KOH",
        "LOC-CITY-PAT"
    ],
    "willing_to_relocate": True,
    "willing_to_travel": True,
    "duration_preference": "10 weeks",
    "stipend_expectation": 3000
}


def call(base, method, path, body=None, token=None):
    req = urllib.request.Request(base + "/api/v1" + path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None)
    req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return r.status, json.loads(r.read() or b"{}")
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read() or b"{}")


def step(name, ok, detail=""):
    print(("PASS  " if ok else "FAIL  ") + name + (f"  ({detail})" if detail else ""))
    if not ok:
        raise SystemExit(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default="http://localhost:8000")
    base = ap.parse_args().url.rstrip("/")
    email = f"smoke{int(time.time())}@example.com"

    try:
        with urllib.request.urlopen(base + "/health", timeout=10) as r:
            health = json.loads(r.read())
    except Exception as e:
        raise SystemExit(f"FAIL  server not reachable at {base}: {e}")
    step("health", health.get("database") == "ok", f"database={health.get('database')}")

    code, r = call(base, "POST", "/auth/register",
                   {"full_name": "Smoke Test", "email": email, "password": "Secret123", "consent": True})
    step("register", code == 201 and r.get("access_token"), email)
    token = r["access_token"]

    code, r = call(base, "GET", "/taxonomy/skill?q=python")
    step("taxonomy search", code == 200 and any(x["name"] == "Python" for x in r), f"{len(r)} result(s)")

    code, r = call(base, "PATCH", "/me/profile", PROFILE, token)
    step("save profile", code == 200 and r["status"] == "draft" and not r["missing_fields"], r.get("error", {}).get("message", ""))

    code, r = call(base, "POST", "/me/profile/confirm", None, token)
    step("confirm profile", code == 200 and r["status"] == "complete")

    code, r = call(base, "GET", "/me/recommendations", None, token)
    step("recommendations", code == 200 and 3 <= r["count"] <= 5, f"{r.get('count')} results, method={r.get('method')}")
    for x in r["recommendations"]:
        print(f"        #{x['rank']} {x['match_percentage']:5.1f}%  {x['title']} - {x['company_name']} ({x['location_name']})")
    top = r["recommendations"][0]["internship_id"]

    code, d = call(base, "GET", f"/me/recommendations/{top}", None, token)
    step("internship detail", code == 200 and d["eligible"], d.get("title", ""))

    code, r = call(base, "PUT", f"/me/saved/{top}", None, token)
    step("save internship", code == 200 and r["saved"])
    code, r = call(base, "GET", "/me/saved", None, token)
    step("saved list", code == 200 and len(r) == 1)

    code, r = call(base, "DELETE", "/me", {"password": "Secret123"}, token)
    step("delete test account", code == 200)
    print("\nAll checks passed.")


if __name__ == "__main__":
    main()
