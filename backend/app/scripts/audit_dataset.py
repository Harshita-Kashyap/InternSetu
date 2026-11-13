"""Dataset audit (tracker #28). Exits with code 1 when a hard check fails, so it can run in CI.

    python -m app.scripts.audit_dataset --dataset v2        # or v1
Hard checks : unknown ids, duplicate ids, duplicate listings, mandatory skills above the cap, durations outside 6/9 months
              (v2), stipend different from pmis_rules.json (v2), candidates that get fewer than 3 results.
Reported    : mix by education / sector / location type, share with food / stay / transport, share of candidates
              with an eligible result, coverage per candidate archetype.
"""
import argparse
import json
import sys
from collections import Counter
from pathlib import Path

from app.engine.semantic.scorers import StructuredScorer
from app.engine.taxonomy import Taxonomy
from app.engine.tiers import classify, select_tiered

DATA = Path(__file__).resolve().parents[2] / "data"
FILES = {"v1": ("internsetu_taxonomy.json", "internsetu_synthetic_internships_v1.json", "internsetu_synthetic_candidates_v1.json"),
         "v2": ("v2/internsetu_taxonomy_v2.json", "v2/internsetu_internships_v2.json", "v2/internsetu_candidates_v2.json")}
FOOD, STAY, TRANSPORT = "Meals provided on working days", "Accommodation assistance for outstation interns", "Travel allowance"


def load(dataset):
    t, i, c = (json.loads((DATA / f).read_text(encoding="utf-8")) for f in FILES[dataset])
    return t, i["internships"], c["candidates"]


def audit(dataset="v2", max_mandatory=2, min_results=3) -> dict:
    tax_json, internships, candidates = load(dataset)
    tax = Taxonomy(tax_json)
    rules = json.loads((DATA / "pmis_rules.json").read_text(encoding="utf-8"))
    errors: list[str] = []
    ids = Counter(i["internship_id"] for i in internships)
    errors += [f"duplicate internship id {k}" for k, v in ids.items() if v > 1]
    cids = Counter(c["candidate_id"] for c in candidates)
    errors += [f"duplicate candidate id {k}" for k, v in cids.items() if v > 1]
    seen = Counter((i["company_name"], i["title"], i["location"]) for i in internships)
    dup_listings = sum(v - 1 for v in seen.values() if v > 1)
    if dup_listings:
        errors.append(f"{dup_listings} duplicate listings (same company, title and place)")
    sets = tax.id_sets
    bad = Counter()
    for i in internships:
        e = i["education_requirements"]
        for kind, val in (("sector", i["sector_id"]), ("role", i["role_id"]), ("city", i["location"]), ("education_level", e["education_level"]),
                          ("degree", e.get("degree")), ("field_of_study", e.get("field_of_study"))):
            if val is not None and val not in sets[kind]:
                bad[f"{kind}:{val}"] += 1
        bad.update(f"skill:{s}" for s in i["mandatory_skills"] + i["preferred_skills"] if s not in sets["skill"])
    for c in candidates:
        e, loc = c["education"], c["location_preferences"]
        bad.update(f"skill:{s}" for s in c["skills"] if s not in sets["skill"])
        bad.update(f"city:{x}" for x in [loc["home_location"], *loc["preferred_locations"]] if x not in sets["city"])
        bad.update(f"role:{r}" for r in c["preferred_roles"] if r not in sets["role"])
        bad.update(f"sector:{s}" for s in c["preferences"]["preferred_sectors"] if s not in sets["sector"])
        if e["education_level"] not in sets["education_level"]:
            bad[f"education_level:{e['education_level']}"] += 1
    errors += [f"unknown id {k} ({v}x)" for k, v in bad.items()]
    too_many = sum(len(i["mandatory_skills"]) > max_mandatory for i in internships)
    if too_many:
        errors.append(f"{too_many} listings have more than {max_mandatory} mandatory skills")
    if dataset == "v2":
        off = Counter(i["duration"] for i in internships if i["duration"] not in ("6 months", "9 months"))
        if off:
            errors.append(f"durations outside 6/9 months: {dict(off)}")
        wrong = sum(i["stipend"]["amount_inr_per_month"] != rules["stipend_inr_per_month"] for i in internships)
        if wrong:
            errors.append(f"{wrong} listings do not use the fixed stipend {rules['stipend_inr_per_month']}")

    by_id = {i["internship_id"]: i for i in internships}
    scorer = StructuredScorer(tax)
    few, no_eligible, per_arch = [], 0, {}
    for c in candidates:
        picks = select_tiered(c, by_id, tax, scorer, 5, c["preferences"]["preferred_sectors"])
        if len(picks) < min_results:
            few.append(c["candidate_id"])
        if not any(t == "eligible" for _i, _s, t, _n in picks):
            no_eligible += 1
        a = (c.get("context_flags") or {}).get("archetype", "all")
        tot, ok = per_arch.get(a, (0, 0))
        per_arch[a] = (tot + 1, ok + (len(picks) >= min_results))
    if few:
        errors.append(f"{len(few)} candidates get fewer than {min_results} results, e.g. {few[:5]}")

    n = len(internships)
    pct = lambda x: round(100 * x / n, 1)  # noqa: E731
    report = {
        "dataset": dataset, "internships": n, "candidates": len(candidates),
        "education_mix_%": {k: pct(v) for k, v in Counter(i["education_requirements"]["education_level"] for i in internships).most_common()},
        "low_education_share_%": pct(sum(i["education_requirements"]["education_level"] in ("EDU-10", "EDU-12", "EDU-ITI", "EDU-DIPLOMA") for i in internships)),
        "oil_gas_share_%": pct(sum(i["sector_id"] == "SEC-026" for i in internships)),
        "sectors_used": len({i["sector_id"] for i in internships}),
        "duration_mix": dict(Counter(i["duration"] for i in internships)),
        "mandatory_skill_count": dict(sorted(Counter(len(i["mandatory_skills"]) for i in internships).items())),
        "small_town_share_%": pct(sum(i["location"].split("-")[-1] not in {c["id"].split("-")[-1] for c in tax_json["indian_locations"]["districts_cities"][:70]} for i in internships)),
        "facility_share_%": {"food": pct(sum(FOOD in i["facilities"] for i in internships)), "stay": pct(sum(STAY in i["facilities"] for i in internships)),
                             "transport": pct(sum(TRANSPORT in i["facilities"] or "Company transport from nearby town" in i["facilities"] for i in internships))},
        "candidates_with_>=%d_results_%%" % min_results: round(100 * (1 - len(few) / max(1, len(candidates))), 1),
        "candidates_with_an_eligible_result_%": round(100 * (1 - no_eligible / max(1, len(candidates))), 1),
        "coverage_by_archetype_%": {a: round(100 * ok / tot, 1) for a, (tot, ok) in per_arch.items()},
        "errors": errors,
    }
    return report


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dataset", choices=["v1", "v2"], default="v2")
    ap.add_argument("--max-mandatory", type=int, default=2)
    a = ap.parse_args()
    r = audit(a.dataset, a.max_mandatory)
    print(json.dumps(r, indent=1))
    sys.exit(1 if r["errors"] else 0)


if __name__ == "__main__":
    main()
