"""Pluggable pair scorers. Every scorer exposes `score(cand, intern) -> float in [0, 1]`.

- StructuredScorer : weighted six-component match_score (the baseline)
- TfidfScorer      : TF-IDF cosine similarity between candidate text and internship text
- EmbeddingScorer  : sentence-transformer (all-MiniLM-L6-v2) cosine similarity
- HybridScorer     : weighted blend of the three (eligibility gating happens in the ranker)

Scorers only see raw candidate / internship records. Eligibility is NOT applied here.
"""
import hashlib
from pathlib import Path

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer

from ..matching.components import WEIGHTS, component_scores
from .text import candidate_text, internship_text

CACHE = Path(__file__).resolve().parent.parent.parent / ".cache"
MODEL_NAME = "sentence-transformers/all-MiniLM-L6-v2"

_KEY = {"skills": "skills_score", "education": "education_score", "location": "location_score",
        "interest_sector": "interest_sector_score", "role": "role_score", "preference": "preference_score"}


class StructuredScorer:
    name = "structured"

    def __init__(self, tax, weights=WEIGHTS):
        self.tax, self.weights = tax, weights

    def score(self, cand, intern):
        comps = component_scores(cand, intern, self.tax)
        return round(sum(w * comps[_KEY[k]] for k, w in self.weights.items()), 4)


class _VectorScorer:
    """Shared caching for scorers that embed each candidate/internship once."""

    MAX_CACHED = 2000

    def _cand_vec(self, cand):
        # Keyed by the candidate's TEXT (not candidate_id): two different profiles must never share a vector.
        text = candidate_text(cand, self.tax)
        if text not in self._cvecs:
            if len(self._cvecs) >= self.MAX_CACHED:
                self._cvecs.clear()
            self._cvecs[text] = self._encode_text(text)
        return self._cvecs[text]


class TfidfScorer(_VectorScorer):
    """Vocabulary/IDF fitted on the internship catalog only; candidates are projected into it."""
    name = "tfidf"

    def __init__(self, internships, tax):
        self.tax = tax
        self._ids = list(internships)
        self._idx = {iid: n for n, iid in enumerate(self._ids)}
        self.vec = TfidfVectorizer(lowercase=True, stop_words="english", ngram_range=(1, 2),
                                   sublinear_tf=True, min_df=1)
        self._imat = self.vec.fit_transform([internship_text(internships[i], tax) for i in self._ids])
        self._cvecs = {}

    def _encode_text(self, text):
        return self.vec.transform([text])

    def score(self, cand, intern):
        # rows are L2-normalised, so the dot product is the cosine similarity
        s = (self._cand_vec(cand) @ self._imat[self._idx[intern["internship_id"]]].T).toarray()[0, 0]
        return float(min(max(s, 0.0), 1.0))


class EmbeddingScorer(_VectorScorer):
    name = "semantic"

    def __init__(self, internships, tax, model_name=MODEL_NAME, model=None):
        self.tax = tax
        self._ids = list(internships)
        self._idx = {iid: n for n, iid in enumerate(self._ids)}
        self._model = model
        self.model_name = model_name
        self._imat = self._load_internship_embeddings([internship_text(internships[i], tax) for i in self._ids])
        self._cvecs = {}

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def _encode(self, texts):
        return np.asarray(self._get_model().encode(texts, normalize_embeddings=True,
                                                   show_progress_bar=False), dtype=np.float32)

    def _load_internship_embeddings(self, texts):
        key = hashlib.sha1((self.model_name + "\n" + "\n".join(texts)).encode("utf-8")).hexdigest()[:16]
        path = CACHE / f"internship_emb_{key}.npy"
        if path.exists():
            return np.load(path)
        mat = self._encode(texts)
        try:
            CACHE.mkdir(exist_ok=True)
            np.save(path, mat)
        except OSError:
            pass                      # cache is only an optimisation
        return mat

    def _encode_text(self, text):
        return self._encode([text])[0]

    def extend(self, new_internships):
        """Add newly created internships without re-encoding the existing ones."""
        new_ids = [i for i in new_internships if i not in self._idx]
        if not new_ids:
            return
        mat = self._encode([internship_text(new_internships[i], self.tax) for i in new_ids])
        for i in new_ids:
            self._idx[i] = len(self._ids)
            self._ids.append(i)
        self._imat = np.vstack([self._imat, mat])

    def score(self, cand, intern):
        s = float(self._cand_vec(cand) @ self._imat[self._idx[intern["internship_id"]]])
        return min(max(s, 0.0), 1.0)


# tuned on the validation split only (experiments.run_evaluation); each component >= 0.10 so it stays a true blend
DEFAULT_HYBRID_WEIGHTS = {"structured": 0.70, "tfidf": 0.20, "semantic": 0.10}


class HybridScorer:
    """final = w_s * structured + w_t * tfidf + w_e * semantic  (weights sum to 1, tunable)."""
    name = "hybrid"

    def __init__(self, structured, tfidf, semantic, weights=None):
        self.parts = {"structured": structured, "tfidf": tfidf, "semantic": semantic}
        self.weights = dict(weights or DEFAULT_HYBRID_WEIGHTS)
        if abs(sum(self.weights.values()) - 1.0) > 1e-9 or set(self.weights) != set(self.parts):
            raise ValueError("hybrid weights must cover structured/tfidf/semantic and sum to 1")

    def score(self, cand, intern):
        return sum(self.weights[k] * self.parts[k].score(cand, intern) for k in self.parts)
