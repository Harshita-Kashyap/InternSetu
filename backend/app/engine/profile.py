"""Input validation for candidate profiles and internship records.

Everything must use the canonical IDs from internsetu_taxonomy.json. Errors are collected (not raised one by
one) so the caller sees every problem at once, each with a plain-English message.
"""
from .matching.components import DURATION_WEEKS

KNOWN_DURATIONS = sorted(DURATION_WEEKS, key=lambda d: DURATION_WEEKS[d])


class InputError(ValueError):
    """Invalid user input. `.problems` is a list of readable messages."""

    def __init__(self, problems):
        self.problems = list(problems)
        super().__init__("; ".join(self.problems))


class _Check:
    def __init__(self, tax):
        self.tax, self.problems = tax, []

    def err(self, msg):
        self.problems.append(msg)

    def section(self, data, field, required=True):
        """Return the sub-object, {} if an optional one is absent, or None if it is missing/invalid (error recorded).
        An EMPTY object {} is a real (present) value: its missing fields are reported individually."""
        v = data.get(field)
        if v is None:
            if required:
                self.err(f"'{field}' is required.")
                return None
            return {}
        if not isinstance(v, dict):
            self.err(f"'{field}' must be an object (like {{...}}).")
            return None
        return v

    def text(self, data, field, required=True, where=""):
        v = data.get(field)
        if v is None or v == "":
            if required:
                self.err(f"'{where}{field}' is required.")
            return None
        if not isinstance(v, str):
            self.err(f"'{where}{field}' must be text.")
            return None
        return v

    def one_id(self, value, kind, label, required=True):
        if value is None:
            if required:
                self.err(f"'{label}' is required.")
            return None
        if not isinstance(value, str) or value not in self.tax.id_sets[kind]:
            self.err(f"'{label}': '{value}' is not a known {kind.replace('_', ' ')} ID. "
                     f"Use an ID from internsetu_taxonomy.json.")
            return None
        return value

    def id_list(self, data, field, kind, label=None, required=False):
        label = label or field
        v = data.get(field)
        if v is None:
            if required:
                self.err(f"'{label}' is required (it can be an empty list []).")
            return []
        if not isinstance(v, list) or not all(isinstance(x, str) for x in v):
            self.err(f"'{label}' must be a list of ID strings.")
            return []
        bad = sorted({x for x in v if x not in self.tax.id_sets[kind]})
        if bad:
            self.err(f"'{label}': unknown {kind} ID(s): {', '.join(bad)}. Use IDs from internsetu_taxonomy.json.")
        return list(dict.fromkeys(x for x in v if x not in bad))

    def flag(self, data, field, label):
        v = data.get(field, False)
        if not isinstance(v, bool):
            self.err(f"'{label}' must be true or false.")
            return False
        return v

    def money(self, data, field, label):
        v = data.get(field, 0)
        if isinstance(v, bool) or not isinstance(v, (int, float)) or v < 0:
            self.err(f"'{label}' must be a number that is 0 or more.")
            return 0
        return v

    def duration(self, v, label):
        if v is None:
            return None
        if v not in DURATION_WEEKS:
            self.err(f"'{label}': '{v}' is not a supported duration. Use one of: {', '.join(KNOWN_DURATIONS)}.")
            return None
        return v


def normalize_profile(profile, tax):
    """Validate a candidate profile and return it in the full shape the engine expects."""
    if not isinstance(profile, dict):
        raise InputError(["The profile must be a JSON object."])
    c = _Check(tax)

    edu_in = c.section(profile, "education")
    level = c.one_id(edu_in.get("education_level"), "education_level", "education.education_level") if edu_in \
        else None
    degree = c.one_id(edu_in.get("degree"), "degree", "education.degree", required=False) if edu_in else None
    field = c.one_id(edu_in.get("field_of_study"), "field_of_study", "education.field_of_study",
                     required=False) if edu_in else None

    skills = c.id_list(profile, "skills", "skill", required=True)
    interests = c.id_list(profile, "interests", "interest")
    roles = c.id_list(profile, "preferred_roles", "role")

    loc_in = c.section(profile, "location_preferences")
    home = c.one_id(loc_in.get("home_location"), "city", "location_preferences.home_location",
                    required=not loc_in.get("home_location_unlisted"))         if loc_in is not None else None
    loc_in = loc_in or {}
    travel = c.flag(loc_in, "willing_to_travel", "location_preferences.willing_to_travel")
    relocate = c.flag(loc_in, "willing_to_relocate", "location_preferences.willing_to_relocate")
    pref_locs = c.id_list(loc_in, "preferred_locations", "city", "location_preferences.preferred_locations")

    pr_in = c.section(profile, "preferences", required=False)
    sectors = c.id_list(pr_in, "preferred_sectors", "sector", "preferences.preferred_sectors")
    dur = c.duration(pr_in.get("duration_preference"), "preferences.duration_preference")
    stip_in = c.section(pr_in, "stipend_expectation", required=False)
    stipend = c.money(stip_in, "amount_inr_per_month", "preferences.stipend_expectation.amount_inr_per_month")

    cid = profile.get("candidate_id", "PROFILE")
    if not isinstance(cid, str) or not cid.strip():
        c.err("'candidate_id' must be a non-empty text if given.")
        cid = "PROFILE"

    if c.problems:
        raise InputError(c.problems)
    return {"candidate_id": cid,
            "education": {"education_level": level, "degree": degree, "field_of_study": field},
            "skills": skills, "interests": interests, "preferred_roles": roles,
            "location_preferences": {"home_location": home, "willing_to_travel": travel,
                                     "willing_to_relocate": relocate,
                                     "preferred_locations": pref_locs},
            "preferences": {"preferred_sectors": sectors, "duration_preference": dur,
                            "stipend_expectation": {"amount_inr_per_month": stipend}}}


def normalize_internship(rec, tax):
    """Validate a new internship record and return it in the catalog's shape."""
    if not isinstance(rec, dict):
        raise InputError(["The internship must be a JSON object."])
    c = _Check(tax)

    iid = c.text(rec, "internship_id")
    title = c.text(rec, "title")
    sector = c.one_id(rec.get("sector_id"), "sector", "sector_id")
    role = c.one_id(rec.get("role_id"), "role", "role_id")
    location = c.one_id(rec.get("location"), "city", "location")
    duration = c.duration(rec.get("duration"), "duration")
    if rec.get("duration") is None:
        c.err("'duration' is required.")

    edu_in = c.section(rec, "education_requirements")
    ok = edu_in is not None
    level = c.one_id(edu_in.get("education_level"), "education_level",
                     "education_requirements.education_level") if ok else None
    field = c.one_id(edu_in.get("field_of_study"), "field_of_study", "education_requirements.field_of_study",
                     required=False) if ok else None
    degree = c.one_id(edu_in.get("degree"), "degree", "education_requirements.degree",
                      required=False) if ok else None

    mand = c.id_list(rec, "mandatory_skills", "skill", required=True)
    pref = c.id_list(rec, "preferred_skills", "skill", required=True)
    stip_in = c.section(rec, "stipend")
    stipend = 0
    if stip_in is not None:
        if "amount_inr_per_month" not in stip_in:
            c.err("'stipend.amount_inr_per_month' is required.")
        else:
            stipend = c.money(stip_in, "amount_inr_per_month", "stipend.amount_inr_per_month")

    company = rec.get("company_name", "Unknown company")
    desc = rec.get("description", "")
    if not isinstance(company, str) or not isinstance(desc, str):
        c.err("'company_name' and 'description' must be text.")
    if c.problems:
        raise InputError(c.problems)
    return {"internship_id": iid, "company_name": company, "title": title, "sector_id": sector,
            "role_id": role, "description": desc,
            "education_requirements": {"education_level": level, "degree": degree, "field_of_study": field},
            "mandatory_skills": mand, "preferred_skills": [s for s in pref if s not in mand],
            "location": location, "duration": duration,
            "stipend": {"amount_inr_per_month": stipend, "currency": "INR"},
            "application_url": rec.get("application_url") if isinstance(rec.get("application_url"), str) else None}
