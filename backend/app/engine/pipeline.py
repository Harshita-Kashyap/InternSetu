"""End-to-end: candidate profile -> eligibility -> scoring -> ranking -> top 3-5 with explanations."""
from .explanation.explain import explain
from .ranking.ranker import MAX_K, rank_candidate
from .tiers import select_tiered


class Recommender:
    def __init__(self, internships, tax, scorer, k=MAX_K):
        self.internships, self.tax, self.scorer, self.k = internships, tax, scorer, k

    def recommend(self, cand, k=None, include_near=False, only_sectors=False):
        """Return up to k recommendation dicts (empty if nothing is eligible and include_near is False).

        include_near=True: fill with "close matches" (1-2 mandatory skills missing) and guarantee a slot for
        each preferred sector (see engine/tiers.py)."""
        k = k or self.k
        sectors = cand["preferences"].get("preferred_sectors", [])
        pool = self.internships
        if only_sectors and sectors:   # "only my industries": nothing outside the chosen sectors is considered
            pool = {iid: i for iid, i in self.internships.items() if i["sector_id"] in set(sectors)}
        if include_near:
            picks = [(iid, sc, tier) for iid, sc, tier, _n in select_tiered(cand, pool, self.tax, self.scorer, k, sectors)]
        else:
            picks = [(iid, sc, "eligible") for iid, sc in rank_candidate(cand, pool, self.tax, self.scorer, k)]
        out = []
        for rank, (iid, ranking_score, tier) in enumerate(picks, start=1):
            i = pool[iid]
            out.append({"rank": rank, "internship_id": iid, "title": i["title"],
                        "company_name": i["company_name"], "location": i["location"],
                        "ranking_score": round(ranking_score, 4),
                        **explain(cand, i, self.tax, near=(tier == "near"))})
        return out
