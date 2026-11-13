"""Tiered selection of recommendations.

Tier "eligible": education level OK and every mandatory skill held (the old hard gate).
Tier "near"    : education level OK but 1-2 mandatory skills missing ("learn this to become eligible").
Internships whose education requirement is not met are never shown as near (education is a real PMIS rule).

Order: all eligible internships by score, then near ones (fewest missing skills first). If the candidate chose
sectors, each chosen sector (up to SECTOR_SLOTS) gets at least one slot when anything exists in it.
"""
from .eligibility.eligibility import check_eligibility

MAX_MISSING = 2
MIN_RESULTS = 3          # cold start: a person with few or no skills still gets this many options
COLD_START_MAX_MISSING = 99
SECTOR_SLOTS = 3


def classify(cand, intern, tax, max_missing=MAX_MISSING):
    """Return (tier, n_missing) or None when the internship is out of reach."""
    ok, _reason, missing = check_eligibility(cand, intern, tax)
    if ok:
        return "eligible", 0
    req = intern["education_requirements"].get("education_level")
    edu_ok = req is None or tax.rank(cand["education"]["education_level"]) >= tax.rank(req)
    if edu_ok and 1 <= len(missing) <= max_missing:
        return "near", len(missing)
    return None


def _home_state(cand, tax):
    """State of the candidate's home city, or None when unknown."""
    home = (cand.get("location_preferences") or {}).get("home_location")
    return getattr(tax, "city_state", {}).get(home) if home else None


def select_tiered(cand, internships, tax, scorer, k, sector_ids=(), max_missing=MAX_MISSING):
    """Return [(internship_id, score, tier, n_missing)] best first (at most k)."""
    cls = {}
    for iid, i in internships.items():
        c = classify(cand, i, tax, max_missing)
        if c:
            cls[iid] = c
    if len(cls) < min(MIN_RESULTS, k):
        # Cold-start fallback (tracker #21): too few matches, so also offer internships whose education rule is met even
        # when more skills are missing. Fewest missing skills first; education is still never relaxed.
        for iid, i in internships.items():
            if iid not in cls:
                c = classify(cand, i, tax, COLD_START_MAX_MISSING)
                if c:
                    cls[iid] = c
    memo = {}

    def sc(iid):
        if iid not in memo:
            memo[iid] = scorer.score(cand, internships[iid])
        return memo[iid]

    elig = sorted((i for i, c in cls.items() if c[0] == "eligible"), key=lambda i: (-sc(i), i))
    chosen = elig[:k]
    home_state = _home_state(cand, tax)

    def near_key(i):
        n = cls[i][1]
        if n <= max_missing or not home_state:
            return (0, n, -sc(i), i)
        # Cold-start picks (3+ skills missing): internships in the person's own state come first (tracker #21),
        # then fewest missing skills, then score.
        same = getattr(tax, "city_state", {}).get(internships[i].get("location")) == home_state
        return (1, 0 if same else 1, n, -sc(i), i)

    if len(chosen) < k:
        near = sorted((i for i, c in cls.items() if c[0] == "near"), key=near_key)
        chosen += near[:k - len(chosen)]

    wanted = list(dict.fromkeys(sector_ids))[:SECTOR_SLOTS]
    sector_of = lambda i: internships[i]["sector_id"]            # noqa: E731

    def sole(i):                      # the only chosen item for one of the wanted sectors
        return sector_of(i) in wanted and sum(sector_of(j) == sector_of(i) for j in chosen) == 1

    for sid in wanted:
        if any(sector_of(i) == sid for i in chosen):
            continue
        pool = [i for i in cls if sector_of(i) == sid and i not in chosen]
        if not pool:
            continue
        best = min(pool, key=lambda i: (cls[i][0] != "eligible", cls[i][1], -sc(i), i))
        if len(chosen) < k:
            chosen.append(best)
        else:
            victims = [i for i in reversed(chosen) if not sole(i)]
            if victims:
                chosen[chosen.index(victims[0])] = best

    chosen.sort(key=lambda i: (0, (0, -sc(i), i)) if cls[i][0] == "eligible" else (1, near_key(i)))
    return [(i, sc(i), cls[i][0], cls[i][1]) for i in chosen]
