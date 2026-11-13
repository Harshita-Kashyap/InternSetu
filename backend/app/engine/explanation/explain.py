"""Stage 6: explanations built ONLY from actual candidate/internship evidence.

Every sentence is a reason code + parameters (explanation/reasons.py). The result carries both the English text
(`why_recommended`, `considerations`) and the codes (`why_codes`, `consider_codes`) so the API can translate."""
from ..eligibility.eligibility import eligibility_reasons
from ..matching.scoring import score_pair
from ..tiers import MAX_MISSING
from .reasons import RANK, make, render_all

LOW_MATCH_THRESHOLD = 30.0     # match_percentage below this is tagged "Low match" (still shown, never hidden)
LOW_MATCH_TAG = "Low match"
MAX_REASONS = 3        # tracker #29: at most 3 reasons ...
MAX_IMPROVE = 1        # ... and 1 "what to improve" item


def _cap(why, cons):
    """Keep the most useful reasons first (skills, place, role, industry, education) and a single improvement tip."""
    return sorted(why, key=lambda r: RANK.get(r["code"], 9))[:MAX_REASONS], cons[:MAX_IMPROVE]


def _pack(why, cons):
    return {"why_recommended": render_all(why), "considerations": render_all(cons),
            "why_codes": why, "consider_codes": cons}


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


def explain(cand, intern, tax, near=False):
    """Return match %, why-recommended bullets, considerations and skill gap for one pair."""
    r = score_pair(cand, intern, tax, force=near)
    if not r["eligible"] and not near:
        return {"tier": None, "eligible": False, "match_percentage": 0.0, "low_match": False, "match_tag": None,
                **_pack([], eligibility_reasons(cand, intern, tax)), "skill_gap": skill_gap(cand, intern, tax)}

    have = set(cand["skills"])
    wanted = list(dict.fromkeys(intern["mandatory_skills"] + intern["preferred_skills"]))
    matched = [s for s in wanted if s in have]
    why, cons = [], []

    if matched:
        shown = ", ".join(_names(matched, tax)[:4]) + (" ..." if len(matched) > 4 else "")
        why.append(make("SKILLS_MATCH", n=len(matched), total=len(wanted), names=shown))
    edu, req = cand["education"], intern["education_requirements"]
    if req.get("education_level"):
        same_field = req.get("field_of_study") in (None, edu["field_of_study"])
        level = tax.edu_name.get(req["education_level"], req["education_level"])
        why.append(make("EDU_OK_SAME_FIELD" if same_field else "EDU_OK_OTHER_FIELD", level=level))
        if not same_field:
            cons.append(make("FIELD_DIFFERS"))
    # Role is not asked or scored (#38), so no role reason is shown.
    if r["interest_sector_score"] == 1.0:
        why.append(make("SECTOR_MATCH", sector=tax.sector_name.get(intern["sector_id"])))
    else:
        cons.append(make("SECTOR_OTHER"))
    loc = {1.0: "LOC_HOME", 0.9: "LOC_PREFERRED", 0.6: "LOC_HOME_STATE", 0.4: "LOC_OTHER_STATE"}.get(r["location_score"])
    if loc:
        why.append(make(loc))
    low = r["match_percentage"] < LOW_MATCH_THRESHOLD
    if low and not near:
        cons.insert(0, make("LOW_MATCH", pct=r["match_percentage"], limit=LOW_MATCH_THRESHOLD))
    if near:
        miss = _names(r["missing_mandatory_ids"], tax)
        if len(miss) > MAX_MISSING:      # cold start (#21): many skills missing, so call it a starting point
            cons.insert(0, make("STARTER", n=len(miss), names=", ".join(miss[:3]) + (" ..." if len(miss) > 3 else "")))
        else:
            cons.insert(0, make("CLOSE_MATCH", n=len(miss), names=", ".join(miss)))
    why, cons = _cap(why, cons)
    return {"tier": "near" if near else "eligible", "eligible": not near, "match_percentage": r["match_percentage"],
            "low_match": low, "match_tag": LOW_MATCH_TAG if low else None, "starter": bool(near and cons and cons[0]["code"] == "STARTER"),
            **_pack(why, cons),
            "skill_gap": skill_gap(cand, intern, tax)}
