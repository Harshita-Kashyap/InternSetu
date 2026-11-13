"""Engine evaluation helpers (tracker #25 and #27). Works on the v2 candidates; needs no database.

    python -m app.scripts.evaluate_engine fairness   [--dataset v2] [--json out.json]
    python -m app.scripts.evaluate_engine sensitivity [--dataset v2] [--json out.json]

fairness    : compares result quality between groups of candidates (remote district, first generation, low English,
              archetype, education level). The flags are in the candidate files for this purpose only; they are NEVER used
              for scoring. A gap above the threshold is reported as REVIEW. It is an indicator on synthetic data, not proof.
sensitivity : changes each scoring weight (set to 0, and +/-50%) and reports how much the top-5 list moves
              (average overlap with the default list) and whether every candidate still gets >= 3 results.
              Without independent human labels (#24) this shows how fragile the ranking is, not which weights are "right".
"""
import argparse
import json
import sys
from collections import defaultdict
from statistics import mean

from app.engine.matching.components import WEIGHTS
from app.engine.semantic.scorers import StructuredScorer
from app.engine.taxonomy import Taxonomy
from app.engine.tiers import MAX_MISSING, select_tiered
from app.scripts.audit_dataset import load

K = 5
GAP_SHARE = 0.10        # REVIEW when two groups differ by more than 10 percentage points
GAP_COUNT = 0.50        # ... or by more than half an eligible internship in the top 5


def _run(cands, by_id, tax, weights=None, k=K):
    scorer = StructuredScorer(tax, weights or WEIGHTS)
    return {c["candidate_id"]: select_tiered(c, by_id, tax, scorer, k, c["preferences"]["preferred_sectors"]) for c in cands}


def _metrics(group, picks):
    rows = [picks[c["candidate_id"]] for c in group]
    n = len(rows)
    top1 = [r[0][1] for r in rows if r and r[0][2] == "eligible"]
    return {
        "n": n,
        "mean_results": round(mean(len(r) for r in rows), 2),
        "share_at_least_3": round(sum(len(r) >= 3 for r in rows) / n, 3),
        "share_with_eligible": round(sum(any(t == "eligible" for _i, _s, t, _m in r) for r in rows) / n, 3),
        "mean_eligible_in_top5": round(mean(sum(t == "eligible" for _i, _s, t, _m in r) for r in rows), 2),
        "share_starter_only": round(sum(all(t != "eligible" and m > MAX_MISSING for _i, _s, t, m in r) for r in rows) / n, 3),
        "mean_top1_score": round(mean(top1), 3) if top1 else None,
    }


def fairness(dataset="v2") -> dict:
    tax_json, internships, cands = load(dataset)
    tax = Taxonomy(tax_json)
    by_id = {i["internship_id"]: i for i in internships}
    cands = [c for c in cands if c.get("context_flags")]
    if not cands:
        raise SystemExit("no candidate has context_flags (use --dataset v2)")
    picks = _run(cands, by_id, tax)
    dims = {
        "remote_district": lambda c: str(c["context_flags"]["remote_district"]),
        "first_generation": lambda c: str(c["context_flags"]["first_generation"]),
        "low_english": lambda c: str(c["context_flags"]["low_english"]),
        "archetype": lambda c: c["context_flags"]["archetype"],
        "education_level": lambda c: c["education"]["education_level"],
    }
    out, review = {"overall": _metrics(cands, picks), "groups": {}, "review": []}, []
    for dim, key in dims.items():
        buckets = defaultdict(list)
        for c in cands:
            buckets[key(c)].append(c)
        out["groups"][dim] = {g: _metrics(v, picks) for g, v in sorted(buckets.items())}
        usable = {g: m for g, m in out["groups"][dim].items() if m["n"] >= 20}      # tiny groups are too noisy to compare
        if len(usable) >= 2:
            for metric, limit in (("share_at_least_3", GAP_SHARE), ("share_with_eligible", GAP_SHARE), ("mean_eligible_in_top5", GAP_COUNT)):
                lo = min(usable, key=lambda g: usable[g][metric])
                hi = max(usable, key=lambda g: usable[g][metric])
                gap = round(usable[hi][metric] - usable[lo][metric], 3)
                if gap > limit:
                    review.append({"dimension": dim, "metric": metric, "lowest": lo, "highest": hi, "gap": gap})
    out["review"] = review
    return out


def _overlap(a, b):
    sa, sb = {x[0] for x in a}, {x[0] for x in b}
    return len(sa & sb) / max(1, len(sa | sb))


def sensitivity(dataset="v2") -> dict:
    tax_json, internships, cands = load(dataset)
    tax = Taxonomy(tax_json)
    by_id = {i["internship_id"]: i for i in internships}
    base = _run(cands, by_id, tax)
    variants = {}
    for key in WEIGHTS:
        if key == "preference":
            continue
        for label, f in (("zero", 0.0), ("minus50", 0.5), ("plus50", 1.5)):
            w = dict(WEIGHTS)
            w[key] = WEIGHTS[key] * f
            total = sum(w.values())
            w = {k: v / total for k, v in w.items()}           # keep the weights summing to 1
            alt = _run(cands, by_id, tax, w)
            variants[f"{key}:{label}"] = {
                "mean_top5_overlap": round(mean(_overlap(base[c["candidate_id"]], alt[c["candidate_id"]]) for c in cands), 3),
                "share_at_least_3": round(sum(len(v) >= 3 for v in alt.values()) / len(alt), 3),
                "same_top1": round(mean(bool(base[c["candidate_id"]] and alt[c["candidate_id"]] and base[c["candidate_id"]][0][0] == alt[c["candidate_id"]][0][0]) for c in cands), 3),
            }
    return {"default_weights": WEIGHTS, "candidates": len(cands), "variants": variants}


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("what", choices=["fairness", "sensitivity"])
    ap.add_argument("--dataset", default="v2", choices=["v1", "v2"])
    ap.add_argument("--json", help="also write the result to this file")
    a = ap.parse_args(argv)
    res = fairness(a.dataset) if a.what == "fairness" else sensitivity(a.dataset)
    if a.json:
        with open(a.json, "w", encoding="utf-8") as f:
            json.dump(res, f, indent=2, ensure_ascii=False)
    print(json.dumps(res, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
