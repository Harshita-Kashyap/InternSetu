"""Turns the three JSON dataset files into flat rows. Pure Python (no database) so it is easy to test."""
import re

_DURATION = re.compile(r"^\s*(\d+)\s*(week|weeks|month|months)\s*$", re.IGNORECASE)


def parse_duration(label: str) -> tuple[str, int]:
    m = _DURATION.match(label)
    if not m:
        raise ValueError(f"Unrecognised duration: {label!r}")
    n, unit = int(m.group(1)), m.group(2).lower()
    return label.strip(), (n if unit.startswith("week") else round(n * 52 / 12))


def parse_taxonomy(data: dict) -> dict:
    entries: list[dict] = []
    synonyms: list[tuple[str, str]] = []

    def add(entry_type, items, parent_key=None, ranked=False):
        for idx, it in enumerate(items, start=1):
            entries.append(
                {
                    "id": it["id"],
                    "type": entry_type,
                    "name": it["name"],
                    "parent_id": it.get(parent_key) if parent_key else None,
                    "order_rank": idx if ranked else None,
                }
            )
            for alias in it.get("aliases", []):
                synonyms.append((it["id"], alias))

    add("education_level", data["education_levels"], ranked=True)  # list order = low to high
    add("degree", data["degrees"], "education_level")
    add("field_of_study", data["fields_of_study"])
    add("skill_category", data["skill_categories"])
    add("skill", data["skills"], "category")
    add("sector", data["sectors"])
    add("role_domain", data["role_domains"])
    add("role", data["roles"], "domain")
    add("interest", data["interests"])
    loc = data["indian_locations"]
    add("state", loc["states"])
    add("state", loc["union_territories"])
    add("city", loc["districts_cities"], "state")

    ids = [e["id"] for e in entries]
    dupes = {i for i in ids if ids.count(i) > 1}
    if dupes:
        raise ValueError(f"Duplicate taxonomy ids: {sorted(dupes)[:5]}")
    return {"entries": entries, "synonyms": synonyms}


def parse_internships(data: dict) -> list[dict]:
    rows = []
    for r in data["internships"]:
        label, weeks = parse_duration(r["duration"])
        edu = r["education_requirements"]
        stipend = r.get("stipend") or {}
        rows.append(
            {
                "external_id": r["internship_id"],
                "company_name": r["company_name"],
                "title": r["title"],
                "description": r["description"],
                "sector_id": r["sector_id"],
                "role_id": r["role_id"],
                "location_id": r["location"],
                "min_education_id": edu["education_level"],
                "degree_id": edu.get("degree"),
                "field_of_study_id": edu.get("field_of_study"),
                "education_note": edu.get("notes"),
                "duration_label": label,
                "duration_weeks": weeks,
                "stipend_inr_per_month": stipend.get("amount_inr_per_month"),
                "facilities": r.get("facilities", []),
                "application_url": r.get("application_url"),
                "dataset_version": r.get("dataset_version"),
                "mandatory": list(r["mandatory_skills"]),
                "preferred": list(r["preferred_skills"]),
            }
        )
    return rows


def parse_candidates(data: dict) -> list[dict]:
    rows = []
    for c in data["candidates"]:
        edu, loc, pref, exp = c["education"], c["location_preferences"], c["preferences"], c["experience"]
        dur_label, dur_weeks = parse_duration(pref["duration_preference"])
        links = (
            [("skill", s) for s in c["skills"]]
            + [("interest", s) for s in c["interests"]]
            + [("preferred_role", s) for s in c["preferred_roles"]]
            + [("preferred_sector", s) for s in pref["preferred_sectors"]]
            + [("preferred_location", s) for s in loc["preferred_locations"]]
            + [("language", s) for s in c["language_metadata"]["languages_known"]]
        )
        rows.append(
            {
                "external_id": c["candidate_id"],
                "education_level_id": edu["education_level"],
                "degree_id": edu.get("degree"),
                "field_of_study_id": edu.get("field_of_study"),
                "year_of_completion": edu.get("year_of_completion"),
                "home_location_id": loc["home_location"],
                "willing_to_relocate": bool(loc["willing_to_relocate"]),
                "willing_to_travel": bool(loc["willing_to_travel"]),
                "duration_label": dur_label,
                "duration_weeks": dur_weeks,
                "stipend_expectation": (pref.get("stipend_expectation") or {}).get("amount_inr_per_month"),
                "work_mode_preference": pref.get("work_mode_preference"),
                "role_preference_strength": pref.get("role_preference_strength"),
                "overall_skill_level": exp.get("overall_skill_level"),
                "has_prior_internship": bool(exp.get("has_prior_internship")),
                "internship_count": exp.get("internship_count", 0),
                "project_count": exp.get("project_count", 0),
                "english_proficiency": c["language_metadata"].get("english_proficiency"),
                "links": list(dict.fromkeys(links)),
            }
        )
    return rows
