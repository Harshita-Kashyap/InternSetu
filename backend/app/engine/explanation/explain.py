"""Stage 6: explanations built ONLY from actual candidate/internship evidence."""
from ..matching.scoring import score_pair

LOW_MATCH_THRESHOLD = 30.0     # match_percentage below this is tagged "Low match" (still shown, never hidden)
LOW_MATCH_TAG = "Low match"


def _names(ids, tax):
    return [tax.skill_name.get(s, s) for s in ids]


def skill_gap(cand, intern, tax):
    """Missing skills and related (same taxonomy category) skills the candidate already has."""
    have = set(cand["skills"])
    missing_mand = [s for s in intern["mandatory_skills"] if s not in have]
    missing_pref = [s for s in intern["preferred_skills"] if s not in have]
    related = []
    for m in missing_mand + missing_pref:
        cat = tax.skill_category.get(m)
        mates = sorted(s for s in have if tax.skill_category.get(s) == cat)
        if mates:
            related.append({"missing": tax.skill_name.get(m, m), "you_have": _names(mates, tax)})
    return {"missing_mandatory": _names(missing_mand, tax), "missing_preferred": _names(missing_pref, tax),
            "related_skills": related}


def explain(cand, intern, tax):
    """Return match %, why-recommended bullets, considerations and skill gap for one pair."""
    r = score_pair(cand, intern, tax)
    if not r["eligible"]:
        return {"eligible": False, "match_percentage": 0.0, "low_match": False, "match_tag": None,
                "why_recommended": [], "considerations": [r["eligibility_reason"]],
                "skill_gap": skill_gap(cand, intern, tax)}

    have = set(cand["skills"])
    wanted = list(dict.fromkeys(intern["mandatory_skills"] + intern["preferred_skills"]))
    matched = [s for s in wanted if s in have]
    why, cons = [], []

    if matched:
        shown = ", ".join(_names(matched, tax)[:4]) + (" ..." if len(matched) > 4 else "")
        why.append(f"Skills: {len(matched)} of {len(wanted)} required/preferred skills matched ({shown})")
    edu, req = cand["education"], intern["education_requirements"]
    if req.get("education_level"):
        same_field = req.get("field_of_study") in (None, edu["field_of_study"])
        why.append(f"Education requirement satisfied ({tax.edu_name.get(req['education_level'], req['education_level'])})"
                   + ("; field of study matches" if same_field else "; field of study differs"))
        if not same_field:
            cons.append("Field of study differs from the one listed for this internship")
    if r["role_score"] == 1.0:
        why.append(f"Preferred role matches ({tax.role_name.get(intern['role_id'])})")
    elif r["role_score"] == 0.5:
        why.append("Role is in the same domain as one of your preferred roles")
    if r["interest_sector_score"] == 1.0:
        why.append(f"Sector is one of your preferred sectors ({tax.sector_name.get(intern['sector_id'])})")
    else:
        cons.append("Sector is not among your preferred sectors")
    ls = r["location_score"]
    if ls == 1.0:
        why.append("Located in your home location")
    elif ls == 0.9:
        why.append("Located in one of your preferred locations")
    elif ls == 0.6:
        why.append("Located in your home state, and you are willing to travel")
    elif ls == 0.4:
        why.append("Different state, but you are willing to relocate")
    if r["preference_score"] < 1.0:
        if intern["stipend"]["amount_inr_per_month"] < cand["preferences"]["stipend_expectation"]["amount_inr_per_month"]:
            cons.append("Stipend is below your expectation")
        if cand["preferences"].get("duration_preference") != intern.get("duration"):
            cons.append(f"Duration ({intern.get('duration')}) differs from your preference "
                        f"({cand['preferences'].get('duration_preference')})")

    low = r["match_percentage"] < LOW_MATCH_THRESHOLD
    if low:
        cons.insert(0, f"{LOW_MATCH_TAG} ({r['match_percentage']:.2f}%): you meet the mandatory requirements, "
                       f"but overall suitability is below {LOW_MATCH_THRESHOLD:.0f}%")
    return {"eligible": True, "match_percentage": r["match_percentage"], "low_match": low,
            "match_tag": LOW_MATCH_TAG if low else None, "why_recommended": why,
            "considerations": cons, "skill_gap": skill_gap(cand, intern, tax)}
