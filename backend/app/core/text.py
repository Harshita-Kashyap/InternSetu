"""Text normalisation used for matching what users type to taxonomy entries."""
import re
import unicodedata

_SEPARATORS = re.compile(r"[/\-_.]")


def normalize_text(s: str) -> str:
    s = unicodedata.normalize("NFKC", s).casefold().replace("&", " and ")
    s = _SEPARATORS.sub(" ", s)
    # keep letters, combining marks (Devanagari vowel signs!), digits, spaces, + and #
    s = "".join(ch for ch in s if ch in "+# " or unicodedata.category(ch)[0] in ("L", "M", "N") or ch.isspace())
    return re.sub(r"\s+", " ", s).strip()


def compact(s: str) -> str:
    return normalize_text(s).replace(" ", "")
