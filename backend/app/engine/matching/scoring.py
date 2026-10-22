"""Combine eligibility + component scores into match_score / match_percentage / label."""
from ..eligibility.eligibility import check_eligibility
from .components import WEIGHTS, component_scores

ZERO = {"skills_score": 0.0, "education_score": 0.0, "location_score": 0.0,
        "interest_sector_score": 0.0, "role_score": 0.0, "preference_score": 0.0}

_KEY = {"skills": "skills_score", "education": "education_score", "location": "location_score",
        "interest_sector": "interest_sector_score", "role": "role_score", "preference": "preference_score"}


def relevance_label(score):
    """0-0.29 -> 0, 0.30-0.54 -> 1, 0.55-0.74 -> 2, 0.75-1 -> 3."""
    return 3 if score >= 0.75 else 2 if score >= 0.55 else 1 if score >= 0.30 else 0


def score_pair(cand, intern, tax, weights=WEIGHTS):
    """Eligibility first; ineligible pairs score 0 on everything."""
    eligible, reason, missing = check_eligibility(cand, intern, tax)
    comps = component_scores(cand, intern, tax) if eligible else dict(ZERO)
    score = round(sum(w * comps[_KEY[k]] for k, w in weights.items()), 4) if eligible else 0.0
    return {"eligible": eligible, "eligibility_reason": reason, "missing_mandatory_ids": missing,
            **comps, "match_score": score, "match_percentage": round(score * 100, 2),
            "relevance_label": relevance_label(score)}
