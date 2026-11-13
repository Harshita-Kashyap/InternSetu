from app.scripts import evaluate_engine as ev


def test_fairness_report_shape_and_coverage():
    r = ev.fairness("v2")
    assert r["overall"]["n"] == 700
    assert r["overall"]["share_at_least_3"] == 1.0           # every candidate gets >= 3 results
    assert {"remote_district", "first_generation", "low_english", "archetype", "education_level"} <= set(r["groups"])
    for rv in r["review"]:
        assert rv["gap"] > 0 and rv["dimension"] in r["groups"]


def test_context_flags_do_not_change_results():
    """The flags are for evaluation only: removing them must not change a single recommendation."""
    t, i, c = ev.load("v2")
    tax = ev.Taxonomy(t)
    by = {x["internship_id"]: x for x in i}
    sample = c[:40]
    a = ev._run(sample, by, tax)
    stripped = [{k: v for k, v in x.items() if k != "context_flags"} for x in sample]
    assert a == ev._run(stripped, by, tax)


def test_sensitivity_keeps_three_results_and_default_is_stable():
    r = ev.sensitivity("v2")
    assert len(r["variants"]) == 15
    assert all(v["share_at_least_3"] == 1.0 for v in r["variants"].values())
    assert all(0 <= v["mean_top5_overlap"] <= 1 for v in r["variants"].values())


def test_role_has_zero_weight_and_no_role_reason():
    """#38: role is not asked in the apps, so it carries no weight and no role reason is shown."""
    assert ev.WEIGHTS["role"] == 0 and abs(sum(ev.WEIGHTS.values()) - 1.0) < 1e-9
    assert ev.WEIGHTS["skills"] == 0.35 and ev.WEIGHTS["interest_sector"] == 0.25
