"""Maps free text to taxonomy entries (REQ-4.3.3, 4.3.4, 4.2.4). Pure Python, no database.

exact   -> same name / alias / synonym (ignoring case, spaces, punctuation)
fuzzy   -> very close spelling (ratio >= 0.90), accepted automatically
suggest -> close but not sure (ratio >= 0.75): NOT accepted, flagged for admin with a suggestion
none    -> nothing close: flagged for admin
"""
from dataclasses import dataclass
from difflib import SequenceMatcher, get_close_matches
from typing import Iterable

from app.core.text import compact, normalize_text

FUZZY_ACCEPT = 0.90
SUGGEST_MIN = 0.75
MIN_LEN_FOR_FUZZY_ACCEPT = 4


@dataclass(frozen=True)
class Match:
    entry_id: str | None
    method: str  # exact | fuzzy | suggest | none
    score: float

    @property
    def is_mapped(self) -> bool:
        return self.method in ("exact", "fuzzy")


class TaxonomyIndex:
    def __init__(self) -> None:
        self._norm: dict[str, dict[str, str]] = {}
        self._compact: dict[str, dict[str, str]] = {}
        self.collisions: list[tuple[str, str, str]] = []  # (type, label, id) ignored because already used

    def add(self, entry_id: str, entry_type: str, labels: Iterable[str]) -> None:
        norm = self._norm.setdefault(entry_type, {})
        comp = self._compact.setdefault(entry_type, {})
        for label in labels:
            n = normalize_text(label)
            if not n:
                continue
            if n in norm and norm[n] != entry_id:
                self.collisions.append((entry_type, label, entry_id))
                continue
            norm[n] = entry_id
            comp.setdefault(n.replace(" ", ""), entry_id)

    def match(self, text: str, entry_type: str) -> Match:
        n = normalize_text(text)
        if not n:
            return Match(None, "none", 0.0)
        norm = self._norm.get(entry_type, {})
        if n in norm:
            return Match(norm[n], "exact", 1.0)
        c = n.replace(" ", "")
        comp = self._compact.get(entry_type, {})
        if c in comp:
            return Match(comp[c], "exact", 1.0)
        close = get_close_matches(n, list(norm), n=1, cutoff=SUGGEST_MIN)
        if not close:
            return Match(None, "none", 0.0)
        score = SequenceMatcher(None, n, close[0]).ratio()
        if score >= FUZZY_ACCEPT and len(n) >= MIN_LEN_FOR_FUZZY_ACCEPT:
            return Match(norm[close[0]], "fuzzy", score)
        return Match(norm[close[0]], "suggest", score)
