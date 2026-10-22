"""Turn RAW candidate / internship attributes into text for TF-IDF and embeddings.

Only raw profile and catalog fields are used (canonical taxonomy names). No label or evaluation
data is ever read here.
"""


def candidate_text(cand, tax):
    parts = [tax.skill_name.get(s, s) for s in cand["skills"]]
    parts += [tax.role_name.get(r, r) for r in cand.get("preferred_roles", [])]
    parts += [tax.sector_name.get(s, s) for s in cand["preferences"].get("preferred_sectors", [])]
    edu = cand["education"]
    parts += [tax.field_name.get(edu.get("field_of_study"), ""), tax.degree_name.get(edu.get("degree"), "")]
    return ". ".join(p for p in parts if p)


def internship_text(intern, tax):
    parts = [intern["title"], tax.role_name.get(intern["role_id"], ""),
             tax.sector_name.get(intern["sector_id"], "")]
    parts += [tax.skill_name.get(s, s) for s in intern["mandatory_skills"]]
    parts += [tax.skill_name.get(s, s) for s in intern["preferred_skills"]]
    parts.append(tax.field_name.get(intern["education_requirements"].get("field_of_study"), ""))
    parts.append(intern.get("description", ""))
    return ". ".join(p for p in parts if p)
