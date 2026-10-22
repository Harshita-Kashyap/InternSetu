"""End-to-end: candidate profile -> eligibility -> scoring -> ranking -> top 3-5 with explanations."""
from .explanation.explain import explain
from .ranking.ranker import MAX_K, rank_candidate


class Recommender:
    def __init__(self, internships, tax, scorer, k=MAX_K):
        self.internships, self.tax, self.scorer, self.k = internships, tax, scorer, k

    def recommend(self, cand, k=None):
        """Return a list of up to k recommendation dicts (empty if no eligible internship exists)."""
        out = []
        for rank, (iid, ranking_score) in enumerate(
                rank_candidate(cand, self.internships, self.tax, self.scorer, k or self.k), start=1):
            i = self.internships[iid]
            out.append({"rank": rank, "internship_id": iid, "title": i["title"],
                        "company_name": i["company_name"], "location": i["location"],
                        "ranking_score": round(ranking_score, 4),
                        **explain(cand, i, self.tax)})
        return out
