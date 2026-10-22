"""Canonical taxonomy lookups. IDs from internsetu_taxonomy.json are the only vocabulary."""


class Taxonomy:
    def __init__(self, tax):
        self.edu_order = [e["id"] for e in tax["education_levels"]]
        self.edu_name = {e["id"]: e["name"] for e in tax["education_levels"]}
        self.edu_rank = {e: i for i, e in enumerate(self.edu_order)}
        self.city_state = {c["id"]: c["state"] for c in tax["indian_locations"]["districts_cities"]}
        self.city_name = {c["id"]: c["name"] for c in tax["indian_locations"]["districts_cities"]}
        self.skill_name = {s["id"]: s["name"] for s in tax["skills"]}
        self.skill_category = {s["id"]: s["category"] for s in tax["skills"]}
        self.role_name = {r["id"]: r["name"] for r in tax["roles"]}
        self.role_domain = {r["id"]: r["domain"] for r in tax["roles"]}
        self.sector_name = {s["id"]: s["name"] for s in tax["sectors"]}
        self.interest_name = {i["id"]: i["name"] for i in tax["interests"]}
        self.field_name = {f["id"]: f["name"] for f in tax["fields_of_study"]}
        self.degree_name = {d["id"]: d["name"] for d in tax["degrees"]}
        self.id_sets = {"education_level": set(self.edu_order), "degree": set(self.degree_name),
                        "field_of_study": set(self.field_name), "skill": set(self.skill_name),
                        "interest": set(self.interest_name), "role": set(self.role_name),
                        "sector": set(self.sector_name), "city": set(self.city_name)}

    def rank(self, edu_id, default=-1):
        return self.edu_rank.get(edu_id, default)
