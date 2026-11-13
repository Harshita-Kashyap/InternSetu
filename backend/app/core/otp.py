"""One-time codes (OTP) without a database table.

How it works (plain words):
* The code is 6 digits computed from a secret key + the user + "what the code is for" + a 5-minute time slot.
* It is also tied to the user's current password hash, so it stops working the moment the password changes (single use).
* A code is accepted in the current and the previous time slot, so it lives 5-10 minutes.
* Wrong guesses are counted per account (OtpLimiter); resending is rate-limited.
Pure Python, no framework imports, so it can be tested on its own. The limiter is in memory (one server process);
move it to Redis/DB when more than one server runs (tracker #32).
"""
import hashlib
import hmac
import time
from collections import defaultdict, deque

SLOT_SECONDS = 300          # one time slot = 5 minutes
CODE_DIGITS = 6


def _slot(now: float | None) -> int:
    return int((time.time() if now is None else now) // SLOT_SECONDS)


def _code_for(secret: str, user_id: int, binding: str, purpose: str, slot: int) -> str:
    msg = f"{purpose}|{user_id}|{binding}|{slot}".encode()
    digest = hmac.new(secret.encode(), msg, hashlib.sha256).digest()
    return str(int.from_bytes(digest[:8], "big") % 10 ** CODE_DIGITS).zfill(CODE_DIGITS)


def make_code(secret: str, user_id: int, binding: str, purpose: str, now: float | None = None) -> str:
    """binding = something that changes after use, e.g. the user's password hash."""
    return _code_for(secret, user_id, binding, purpose, _slot(now))


def verify_code(secret: str, user_id: int, binding: str, purpose: str, code: str, now: float | None = None) -> bool:
    code = (code or "").strip()
    if len(code) != CODE_DIGITS or not code.isdigit():
        return False
    slot = _slot(now)
    ok = False
    for s in (slot, slot - 1):                      # no early exit: same work whatever the result
        ok |= hmac.compare_digest(_code_for(secret, user_id, binding, purpose, s), code)
    return ok


class OtpLimiter:
    """Max wrong guesses per key in a window, plus a minimum gap between sends."""

    def __init__(self, max_wrong: int = 5, window_s: int = 900, resend_gap_s: int = 60) -> None:
        self.max_wrong, self.window_s, self.resend_gap_s = max_wrong, window_s, resend_gap_s
        self._wrong: dict[str, deque] = defaultdict(deque)
        self._sent: dict[str, float] = {}

    def _recent(self, key: str, now: float):
        q = self._wrong[key]
        while q and now - q[0] > self.window_s:
            q.popleft()
        return q

    def locked(self, key: str, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        return len(self._recent(key, now)) >= self.max_wrong

    def wrong(self, key: str, now: float | None = None) -> None:
        now = time.monotonic() if now is None else now
        self._recent(key, now).append(now)

    def can_send(self, key: str, now: float | None = None) -> bool:
        now = time.monotonic() if now is None else now
        last = self._sent.get(key)
        return last is None or now - last >= self.resend_gap_s

    def sent(self, key: str, now: float | None = None) -> None:
        self._sent[key] = time.monotonic() if now is None else now

    def clear(self, key: str | None = None) -> None:
        if key is None:
            self._wrong.clear(); self._sent.clear()
        else:
            self._wrong.pop(key, None); self._sent.pop(key, None)


class UsedCodes:
    """Remembers codes that were already accepted, so a login/delete code works only once (in memory, like the limiter)."""

    def __init__(self) -> None:
        self._used: dict[str, float] = {}

    def use(self, user_id: int, purpose: str, code: str, now: float | None = None) -> bool:
        """True the first time this code is presented, False afterwards."""
        now = time.time() if now is None else now
        for k in [k for k, t in self._used.items() if now - t > 3 * SLOT_SECONDS]:
            del self._used[k]
        key = f"{purpose}|{user_id}|{code.strip()}"
        if key in self._used:
            return False
        self._used[key] = now
        return True

    def clear(self) -> None:
        self._used.clear()


otp_limiter = OtpLimiter()
used_codes = UsedCodes()
