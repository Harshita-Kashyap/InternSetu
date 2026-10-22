"""Glue between the backend (database rows) and the recommendation engine in app/engine/.

Pure Python: no database and no web framework, so it is easy to test.
The engine works on plain dicts that use taxonomy IDs; these functions build those dicts.
"""
from collections import Counter, defaultdict

from app.engine.eligibility.eligibility import check_eligibility
from app.engine.profile import normalize_profile

DISCLAIMER = (
    "InternSetu only suggests internships. PMIS and the companies make the final selection. "
    "The match percentage shows how well your profile fits an internship; it is not your chance of selection."
)
DEMO_NOTICE = "Demo data: these are synthetic internships for research, not real PMIS listings."


# ----------------------------------------------------------------------------- taxonomy
def build_taxonomy(entries: list[dict]) -> dict:
    """entries: dicts with id, type, name, parent_id, order_rank  ->  the dict shape the engine's Taxonomy expects."""
    by: dict[str, list[dict]] = defaultdict(list)
    for e in entries:
        by[e["type"]].append(e)

    def plain(t):
        return [{"id": e["id"], "name": e["name"]} for e in sorted(by[t], key=lambda e: e["id"])]

    return {
        "education_levels": [{"id": e["id"], "name": e["name"]}
                             for e in sorted(by["education_level"], key=lambda e: e["order_rank"] or 0)],
        "degrees": plain("degree"),
        "fields_of_study": plain("field_of_study"),
        "skills": [{"id": e["id"], "name": e["name"], "category": e["parent_id"]} for e in by["skill"]],
        "roles": [{"id": e["id"], "name": e["name"], "domain": e["parent_id"]} for e in by["role"]],
        "sectors": plain("sector"),
        "interests": plain("interest"),
        "indian_locations": {"districts_cities": [
            {"id": e["id"], "name": e["name"], "state": e["parent_id"]} for e in by["city"]]},
    }


# ----------------------------------------------------------------------------- internships
def internship_record(row: dict) -> dict:
    """row: flat dict (same keys as dataset_parse.parse_internships) -> engine internship record."""
    return {
        "internship_id": row["external_id"],
        "company_name": row["company_name"],
        "title": row["title"],
        "description": row.get("description") or "",
        "sector_id": row["sector_id"],
        "role_id": row["role_id"],
        "location": row["location_id"],
        "duration": row["duration_label"],
        "education_requirements": {
            "education_level": row["min_education_id"],
            "degree": row.get("degree_id"),
            "field_of_study": row.get("field_of_study_id"),
        },
        "mandatory_skills": list(row["mandatory"]),
        "preferred_skills": list(row["preferred"]),
        "stipend": {"amount_inr_per_month": row.get("stipend_inr_per_month") or 0},
        "facilities": list(row.get("facilities") or []),
        "application_url": row.get("application_url"),
        "data_source": "synthetic" if row.get("is_synthetic", True) else "real",
    }


# ----------------------------------------------------------------------------- candidate profile
def profile_dict(p) -> dict:
    """p: a CandidateProfile (or any object with the same attributes) -> engine profile dict."""
    def ids(kind):
        return [l.entry_id for l in p.links if l.kind == kind]

    return {
        "candidate_id": str(getattr(p, "external_id", None) or getattr(p, "id", None) or "PROFILE"),
        "education": {"education_level": p.education_level_id, "degree": p.degree_id,
                      "field_of_study": p.field_of_study_id},
        "skills": ids("skill"),
        "interests": ids("interest"),
        "preferred_roles": ids("preferred_role"),
        "location_preferences": {
            "home_location": p.home_location_id,
            "willing_to_travel": bool(p.willing_to_travel),
            "willing_to_relocate": bool(p.willing_to_relocate),
            "preferred_locations": ids("preferred_location"),
        },
        "preferences": {
            "preferred_sectors": ids("preferred_sector"),
            "duration_preference": p.duration_label,
            "stipend_expectation": {"amount_inr_per_month": p.stipend_expectation or 0},
        },
    }


# ----------------------------------------------------------------------------- result shaping
def skill_gap_ids(cand: dict, intern: dict) -> dict:
    have = set(cand["skills"])
    return {
        "missing_mandatory_ids": [s for s in intern["mandatory_skills"] if s not in have],
        "missing_preferred_ids": [s for s in intern["preferred_skills"] if s not in have],
    }


def internship_facts(engine, intern: dict, portal_url: str) -> dict:
    tax = engine.tax
    return {
        "company_name": intern["company_name"],
        "location": intern["location"],
        "location_name": tax.city_name.get(intern["location"], intern["location"]),
        "sector_name": tax.sector_name.get(intern["sector_id"], intern["sector_id"]),
        "role_name": tax.role_name.get(intern["role_id"], intern["role_id"]),
        "duration": intern.get("duration"),
        "stipend_inr_per_month": (intern.get("stipend") or {}).get("amount_inr_per_month"),
        "apply_url": intern.get("application_url") or portal_url,
        "is_demo_data": intern.get("data_source") != "real",
    }


def enrich(rec: dict, engine, cand: dict, portal_url: str) -> dict:
    """Add the extra fields the apps need to one engine recommendation."""
    intern = engine.internships[rec["internship_id"]]
    out = dict(rec)
    out.update(internship_facts(engine, intern, portal_url))
    out["skill_gap"] = {**rec["skill_gap"], **skill_gap_ids(cand, intern)}
    return out


def summarize_skill_gaps(recs: list[dict], engine, limit: int = 8) -> list[dict]:
    """Skills missing most often across the recommended internships (REQ-4.9.4)."""
    counts: Counter = Counter()
    for r in recs:
        counts.update(r["skill_gap"]["missing_preferred_ids"])
        counts.update(r["skill_gap"]["missing_mandatory_ids"])
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], engine.tax.skill_name.get(kv[0], kv[0])))
    return [{"skill_id": s, "skill": engine.tax.skill_name.get(s, s), "count": n} for s, n in ranked[:limit]]


def nearest_internships(engine, profile: dict, k: int = 3) -> list[dict]:
    """When nothing is eligible (REQ-4.9.5): the k internships closest to eligibility, with what is missing.
    Closest = smallest education gap, then fewest missing mandatory skills."""
    cand = normalize_profile(profile, engine.tax)
    tax = engine.tax
    mine = tax.rank(cand["education"]["education_level"])
    rows = []
    for iid, i in engine.internships.items():
        eligible, reason, missing = check_eligibility(cand, i, tax)
        if eligible:
            continue
        req = i["education_requirements"].get("education_level")
        gap = max(0, tax.rank(req) - mine) if req else 0
        rows.append((gap, len(missing), iid, reason, missing))
    rows.sort(key=lambda r: (r[0], r[1], r[2]))
    return [
        {
            "internship_id": iid, "title": engine.internships[iid]["title"],
            "company_name": engine.internships[iid]["company_name"],
            "location_name": tax.city_name.get(engine.internships[iid]["location"], engine.internships[iid]["location"]),
            "missing_mandatory_ids": missing,
            "missing_mandatory": [tax.skill_name.get(s, s) for s in missing],
            "education_gap_levels": gap, "reason": reason,
        }
        for gap, _, iid, reason, missing in rows[:k]
    ]
