"""Stage 2: the six structured component scores (each in [0, 1]).

Only meaningful for eligible pairs. Rules follow the handover (section 3E).
"""

WEIGHTS = {"skills": 0.30, "education": 0.25, "location": 0.20,
           "interest_sector": 0.15, "role": 0.05, "preference": 0.05}

DURATION_WEEKS = {"4 weeks": 4, "6 weeks": 6, "8 weeks": 8, "10 weeks": 10, "12 weeks": 12,
                  "1 month": 4, "2 months": 8, "3 months": 12, "4 months": 16, "6 months": 24}


def _weeks(text):
    return DURATION_WEEKS.get((text or "").strip())


def skills_score(cand, intern):
    """|candidate & (mandatory | preferred)| / |mandatory | preferred|; 1.0 if none listed."""
    union = set(intern["mandatory_skills"]) | set(intern["preferred_skills"])
    if not union:
        return 1.0
    return len(union & set(cand["skills"])) / len(union)


def education_score(cand, intern, tax):
    """1.0 same level+field, .75 same level other field, .85 higher level same field, .6 higher other field."""
    req = intern["education_requirements"]
    req_level, req_field = req.get("education_level"), req.get("field_of_study")
    if req_level is None:
        return 1.0
    field_ok = req_field is None or cand["education"]["field_of_study"] == req_field
    same_level = tax.rank(cand["education"]["education_level"], 0) == tax.rank(req_level, 0)
    if same_level:
        return 1.0 if field_ok else 0.75
    return 0.85 if field_ok else 0.6


def location_score(cand, intern, tax):
    """1.0 home, .9 preferred city, .6 same state + willing to travel, .4 willing to relocate, else 0."""
    loc = intern["location"]
    lp = cand["location_preferences"]
    home = lp["home_location"]
    if loc == home:
        return 1.0
    if loc in set(lp.get("preferred_locations", [])):
        return 0.9
    if tax.city_state.get(loc) == tax.city_state.get(home) and lp.get("willing_to_travel"):
        return 0.6
    if lp.get("willing_to_relocate"):
        return 0.4
    return 0.0


def interest_sector_score(cand, intern):
    """Ground truth uses preferred_sectors only (candidate `interests` are not used)."""
    return 1.0 if intern["sector_id"] in set(cand["preferences"]["preferred_sectors"]) else 0.0


def role_score(cand, intern, tax):
    """1.0 exact preferred role, .5 same role domain, else 0."""
    rid = intern["role_id"]
    prefs = set(cand.get("preferred_roles", []))
    if rid in prefs:
        return 1.0
    if tax.role_domain.get(rid) in {tax.role_domain.get(r) for r in prefs}:
        return 0.5
    return 0.0


def preference_score(cand, intern):
    """Mean of stipend-meets-expectation (0/1) and duration closeness (1 exact, .5 within 4 weeks, else 0)."""
    parts = [1.0 if intern["stipend"]["amount_inr_per_month"]
             >= cand["preferences"]["stipend_expectation"]["amount_inr_per_month"] else 0.0]
    cw, iw = _weeks(cand["preferences"].get("duration_preference")), _weeks(intern.get("duration"))
    if cw is not None and iw is not None:
        d = abs(cw - iw)
        parts.append(1.0 if d == 0 else 0.5 if d <= 4 else 0.0)
    return sum(parts) / len(parts)


def component_scores(cand, intern, tax):
    return {
        "skills_score": skills_score(cand, intern),
        "education_score": education_score(cand, intern, tax),
        "location_score": location_score(cand, intern, tax),
        "interest_sector_score": interest_sector_score(cand, intern),
        "role_score": role_score(cand, intern, tax),
        "preference_score": preference_score(cand, intern),
    }
