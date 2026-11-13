"""Stage 1: hard eligibility gate (mandatory skills + minimum education level)."""


def check_eligibility(cand, intern, tax):
    """Return (eligible, reason, missing_mandatory_skill_ids)."""
    missing = sorted(set(intern["mandatory_skills"]) - set(cand["skills"]))
    reasons = []
    if missing:
        reasons.append("Missing mandatory skill(s): " + ", ".join(tax.skill_name.get(s, s) for s in missing))

    req = intern["education_requirements"].get("education_level")
    edu_ok = True
    if req is not None:
        clevel = cand["education"]["education_level"]
        edu_ok = tax.rank(clevel) >= tax.rank(req)
        if not edu_ok:
            reasons.append(f"Education level below requirement (candidate: {clevel}, required: {req})")

    eligible = not missing and edu_ok
    reason = "; ".join(reasons) if reasons else "Meets mandatory skill and minimum education requirements"
    return eligible, reason, missing


def eligibility_reasons(cand, intern, tax):
    """Same checks as check_eligibility, but as reason codes (see explanation/reasons.py) for plain-language output."""
    from ..explanation.reasons import make
    out = []
    missing = sorted(set(intern["mandatory_skills"]) - set(cand["skills"]))
    if missing:
        out.append(make("NEED_SKILLS", names=", ".join(tax.skill_name.get(s, s) for s in missing)))
    req = intern["education_requirements"].get("education_level")
    if req is not None:
        clevel = cand["education"]["education_level"]
        if tax.rank(clevel) < tax.rank(req):
            out.append(make("EDU_TOO_LOW", have=tax.edu_name.get(clevel, clevel), need=tax.edu_name.get(req, req)))
    return out
