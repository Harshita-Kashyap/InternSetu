"""Stage 5: eligibility filter -> score -> sort -> top-K."""
from ..eligibility.eligibility import check_eligibility

MIN_K, MAX_K = 3, 5


def rank_candidate(cand, internships, tax, scorer, k=MAX_K):
    """Return up to k (internship_id, ranking_score) tuples, best first.

    1. Ineligible internships are removed first (mandatory skills / minimum education).
    2. The remaining ones are scored by `scorer`.
    3. Sorted by score descending; ties broken by internship_id for reproducibility.
    If fewer than k eligible internships exist, fewer are returned (possibly none).
    Not padded with ineligible internships.
    """
    if not MIN_K <= k <= MAX_K:
        raise ValueError(f"k must be between {MIN_K} and {MAX_K}")
    scored = [(iid, scorer.score(cand, i)) for iid, i in internships.items()
              if check_eligibility(cand, i, tax)[0]]
    scored.sort(key=lambda t: (-t[1], t[0]))
    return scored[:k]


def rank_pool(cand, internship_ids, internships, tax, scorer):
    """Rank a given pool (e.g. a candidate's sampled pairs) with the same rules; returns all eligible, best first."""
    scored = [(iid, scorer.score(cand, internships[iid])) for iid in internship_ids
              if check_eligibility(cand, internships[iid], tax)[0]]
    scored.sort(key=lambda t: (-t[1], t[0]))
    return scored
