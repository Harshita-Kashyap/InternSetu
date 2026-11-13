"""High-level entry point:  recommend(profile)  and the RecommendationEngine class used by the API.

    from src.engine import recommend
    result = recommend(profile, k=5, method="hybrid")
"""
import json
import os
import threading
from pathlib import Path

from .data_loading import DATA, load_internships, load_taxonomy
from .eligibility.eligibility import check_eligibility
from .pipeline import Recommender
from .profile import InputError, normalize_internship, normalize_profile
from .ranking.ranker import MAX_K, MIN_K
from .semantic.scorers import (DEFAULT_HYBRID_WEIGHTS, EmbeddingScorer, HybridScorer, StructuredScorer,
                               TfidfScorer)
from .taxonomy import Taxonomy

STARTER_MESSAGE = ("These are starting points: you need a few more skills for each one. "
                   "Learn them step by step.")
CLOSE_MESSAGE = ("These are close matches: you need 1-2 more skills for each one. "
                 "Learn them to qualify.")
METHODS = ("hybrid", "baseline", "tfidf", "semantic")
ADDED_FILE = Path(os.environ.get("INTERNSETU_ADDED_FILE", DATA / "internships" / "added_internships.json"))


class EngineUnavailable(RuntimeError):
    """A scorer could not be built (for example the semantic model could not be downloaded)."""


class DuplicateInternship(ValueError):
    pass


class RecommendationEngine:
    def __init__(self, added_file=ADDED_FILE, embedding_model=None, hybrid_weights=None,
                 taxonomy_data=None, internships=None):
        # INTEGRATION CHANGE (backend): optionally receive the taxonomy and the internship catalog
        # (e.g. from the database) instead of reading the JSON files. Defaults keep the old behaviour.
        self.tax = Taxonomy(taxonomy_data if taxonomy_data is not None else load_taxonomy())
        self.internships = dict(internships) if internships is not None else load_internships()
        self.base_count = len(self.internships)
        self.added_file = Path(added_file) if added_file else None
        self._embedding_model = embedding_model
        self.hybrid_weights = hybrid_weights or DEFAULT_HYBRID_WEIGHTS
        self._lock = threading.RLock()
        self._structured = StructuredScorer(self.tax)
        self._tfidf = self._semantic = None
        if self.added_file and self.added_file.exists():
            for rec in json.loads(self.added_file.read_text(encoding="utf-8")):
                self.internships[rec["internship_id"]] = rec

    # ---------------------------------------------------------------- scorers (built on first use)
    def _get_tfidf(self):
        if self._tfidf is None:
            self._tfidf = TfidfScorer(self.internships, self.tax)
        return self._tfidf

    def _get_semantic(self):
        if self._semantic is None:
            try:
                self._semantic = EmbeddingScorer(self.internships, self.tax, model=self._embedding_model)
            except Exception as e:                      # model download / load problems
                raise EngineUnavailable(
                    "The semantic model (all-MiniLM-L6-v2) could not be loaded: "
                    f"{type(e).__name__}: {e}. Check your internet connection for the first run, "
                    "or use method 'baseline' or 'tfidf', which do not need it.") from e
        return self._semantic

    def _scorer(self, method):
        if method == "baseline":
            return self._structured
        if method == "tfidf":
            return self._get_tfidf()
        if method == "semantic":
            return self._get_semantic()
        if method == "hybrid":
            return HybridScorer(self._structured, self._get_tfidf(), self._get_semantic(), self.hybrid_weights)
        raise InputError([f"'method' must be one of: {', '.join(METHODS)}."])

    def preload(self):
        """Build every scorer now (loads the model). Raises EngineUnavailable if the model is unavailable."""
        with self._lock:
            self._get_tfidf()
            self._get_semantic()

    def status(self):
        return {"internships_loaded": len(self.internships),
                "internships_added_by_api": len(self.internships) - self.base_count,
                "hybrid_weights": self.hybrid_weights,
                "methods_ready": {"baseline": True, "tfidf": self._tfidf is not None,
                                  "semantic": self._semantic is not None}}

    # ---------------------------------------------------------------- recommend
    def recommend(self, profile, k=MAX_K, method="hybrid", include_near=False, only_sectors=False):
        """Validate `profile`, then return up to k ranked recommendations (empty list if none are eligible)."""
        if method not in METHODS:
            raise InputError([f"'method' must be one of: {', '.join(METHODS)}."])
        if isinstance(k, bool) or not isinstance(k, int) or not MIN_K <= k <= MAX_K:
            raise InputError([f"'k' must be a whole number from {MIN_K} to {MAX_K}."])
        cand = normalize_profile(profile, self.tax)
        with self._lock:
            eligible_n = sum(check_eligibility(cand, i, self.tax)[0] for i in self.internships.values())
            recs = Recommender(self.internships, self.tax, self._scorer(method), k).recommend(
                cand, include_near=include_near, only_sectors=only_sectors) if (eligible_n or include_near) else []
            for r in recs:
                r["location_name"] = self.tax.city_name.get(r["location"], r["location"])
        message = None
        if not recs:
            message = ("No internship fits this profile yet. To qualify you need all the must-have skills and at least "
                       "the education level they ask for.")
        elif any(r.get("starter") for r in recs):
            message = STARTER_MESSAGE
        elif any(r.get("tier") == "near" for r in recs):
            message = CLOSE_MESSAGE
        elif len(recs) < MIN_K:
            message = f"Only {len(recs)} internship(s) fit you fully, so fewer than {MIN_K} are shown."
        return {"candidate_id": cand["candidate_id"], "method": method, "k": k,
                "eligible_internships_in_catalog": eligible_n, "count": len(recs),
                "message": message, "recommendations": recs}

    # ---------------------------------------------------------------- add internship
    def add_internship(self, record):
        """Validate and add one internship; it is saved to the 'added' file so it survives a restart."""
        rec = normalize_internship(record, self.tax)
        with self._lock:
            if rec["internship_id"] in self.internships:
                raise DuplicateInternship(f"An internship with ID '{rec['internship_id']}' already exists.")
            rec.update({"data_source": "api", "dataset_version": "added"})
            self.internships[rec["internship_id"]] = rec
            self._tfidf = None                                   # IDF changes with the catalog -> rebuild lazily
            if self._semantic is not None:
                self._semantic.extend({rec["internship_id"]: rec})
            saved = self._persist()
        return rec, saved

    def _persist(self):
        if not self.added_file:
            return False
        added = [r for iid, r in self.internships.items() if r.get("data_source") == "api"]
        try:
            tmp = self.added_file.with_suffix(".tmp")
            tmp.write_text(json.dumps(added, indent=1), encoding="utf-8")
            tmp.replace(self.added_file)
            return True
        except OSError:
            return False


_default = None


def get_default_engine():
    global _default
    if _default is None:
        _default = RecommendationEngine()
    return _default


def recommend(profile, k=MAX_K, method="hybrid"):
    """Convenience wrapper:  recommend(profile) -> dict with a 'recommendations' list."""
    return get_default_engine().recommend(profile, k=k, method=method)
