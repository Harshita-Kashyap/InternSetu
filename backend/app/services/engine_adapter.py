"""Glue between the backend (database rows) and the recommendation engine in app/engine/.

Pure Python: no database and no web framework, so it is easy to test.
The engine works on plain dicts that use taxonomy IDs; these functions build those dicts.
"""
from collections import Counter, defaultdict
from app.services.courses import course_links

from app.engine.eligibility.eligibility import check_eligibility, eligibility_reasons
from app.engine.explanation.reasons import render_all
from app.engine.geo import haversine_km
from app.engine.profile import normalize_profile
from app.engine.tiers import classify

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
            {"id": e["id"], "name": e["name"], "state": e["parent_id"],
             **({"lat": e["lat"], "lng": e["lng"]} if e.get("lat") is not None and e.get("lng") is not None else {})}
            for e in by["city"]]},
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
        "preferred_roles": ids("preferred_role"),
        "location_preferences": {
            "home_location": p.home_location_id,
            # a typed city that is not in the taxonomy: no location credit for "home", never a gate
            "home_location_unlisted": bool(not p.home_location_id and getattr(p, "home_location_other", None)),
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
    out["tier_label"] = "Starter" if rec.get("starter") else "Close match" if rec.get("tier") == "near" else "Eligible"
    out.update(internship_facts(engine, intern, portal_url))
    out["distance_km"] = distance_km(engine.tax, cand["location_preferences"].get("home_location"), intern["location"])
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
        rows.append((gap, len(missing), iid, eligibility_reasons(cand, i, tax), missing))
    rows.sort(key=lambda r: (r[0], r[1], r[2]))
    return [
        {
            "internship_id": iid, "title": engine.internships[iid]["title"],
            "company_name": engine.internships[iid]["company_name"],
            "location_name": tax.city_name.get(engine.internships[iid]["location"], engine.internships[iid]["location"]),
            "missing_mandatory_ids": missing,
            "missing_mandatory": [tax.skill_name.get(s, s) for s in missing],
            "education_gap_levels": gap, "reason": "; ".join(render_all(codes)), "reason_codes": codes,
        }
        for gap, _, iid, codes, missing in rows[:k]
    ]


def skill_unlocks(engine, cand: dict, limit: int = 8) -> list[dict]:
    """"Learn X to unlock N internships": for internships whose education rule you meet and that miss exactly
    ONE mandatory skill, count how many each missing skill would open up."""
    tax = engine.tax
    counts: Counter = Counter()
    for i in engine.internships.values():
        c = classify(cand, i, tax, max_missing=1)
        if c and c[0] == "near":
            counts.update(s for s in i["mandatory_skills"] if s not in set(cand["skills"]))
    ranked = sorted(counts.items(), key=lambda kv: (-kv[1], tax.skill_name.get(kv[0], kv[0])))
    return [{"skill_id": s, "skill": tax.skill_name.get(s, s), "unlocks": n, "course_links": course_links(tax.skill_name.get(s, s))}
            for s, n in ranked[:limit]]


# ----------------------------------------------------------------------------- location (tracker #20)
NEARBY_KM = 100        # "near your home": same place, or within this many km (straight line)
FEW_NEARBY = 3         # fewer than this many reachable internships nearby -> tell the person

FACILITY_GROUPS = {    # filter keys -> exact facility text in the data (a person picks keys, never raw text)
    "food": "Meals provided on working days",
    "stay": "Accommodation assistance for outstation interns",
    "transport": "Company transport from nearby town",
    "travel_allowance": "Travel allowance",
}


def distance_km(tax, from_city: str | None, to_city: str | None) -> int | None:
    """Whole km between two cities; 0 for the same place; None when a coordinate is unknown."""
    if not from_city or not to_city:
        return None
    if from_city == to_city:
        return 0
    d = haversine_km(tax.city_coords.get(from_city), tax.city_coords.get(to_city))
    return None if d is None else int(round(d))


def has_facilities(intern: dict, keys) -> bool:
    """True when the internship offers EVERY requested facility (unknown keys are ignored)."""
    want = [FACILITY_GROUPS[k] for k in keys if k in FACILITY_GROUPS]
    have = set(intern.get("facilities") or [])
    return all(w in have for w in want)


def nearby_summary(engine, cand: dict, radius_km: int = NEARBY_KM) -> dict:
    """How many internships the person could actually take that are near home, for people who prefer to stay near.

    Counts eligible + close-match internships within `radius_km` of the home place (unknown distance counts as
    not near). `few` is only True when the person is NOT willing to relocate and fewer than FEW_NEARBY exist;
    nothing is ever removed from the results because of this (no hard zero)."""
    lp = cand["location_preferences"]
    home, tax = lp.get("home_location"), engine.tax
    count = 0
    for i in engine.internships.values():
        d = distance_km(tax, home, i["location"])
        if d is not None and d <= radius_km and classify(cand, i, tax):
            count += 1
    return {"nearby_count": count, "few_nearby": (not lp.get("willing_to_relocate")) and count < FEW_NEARBY}
