import re

_MOBILE_RE = re.compile(r"^[6-9]\d{9}$")


def normalize_mobile(raw: str) -> str:
    """Accepts 9876543210, +91 98765 43210, 09876543210, 919876543210."""
    digits = re.sub(r"[\s\-()]", "", raw)
    if digits.startswith("+91"):
        digits = digits[3:]
    elif digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if not _MOBILE_RE.match(digits):
        raise ValueError("Enter a valid 10-digit mobile number.")
    return digits


def validate_password(pw: str) -> str:
    if len(pw) < 8:
        raise ValueError("Password must be at least 8 characters.")
    if len(pw.encode("utf-8")) > 72:  # bcrypt limit
        raise ValueError("Password is too long (maximum 72 bytes).")
    if not re.search(r"[A-Za-z]", pw) or not re.search(r"\d", pw):
        raise ValueError("Password must contain at least one letter and one number.")
    return pw


def clean_name(raw: str) -> str:
    name = re.sub(r"\s+", " ", raw).strip()
    if len(name) < 2:
        raise ValueError("Please enter your full name.")
    if re.search(r"[<>]", name):
        raise ValueError("Name contains invalid characters.")
    return name


def clean_free_text(raw: str, max_len: int = 100) -> str:
    """For user-typed values such as 'other skill' (SRS 5.2: clean free text before saving)."""
    text = re.sub(r"\s+", " ", raw).strip()
    if not text:
        raise ValueError("Please enter a value.")
    if len(text) > max_len:
        raise ValueError(f"Please keep this under {max_len} characters.")
    if re.search(r"[<>{}\\]", text):
        raise ValueError("This contains characters that are not allowed.")
    return text
