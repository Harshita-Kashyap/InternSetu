"""Simple in-memory limiter for failed logins (single server process).
Move to Redis if you ever run more than one server instance."""
import time
from collections import defaultdict, deque

from app.core.config import settings
from app.core.errors import ApiError


class LoginLimiter:
    def __init__(self) -> None:
        self._fails: dict[str, deque] = defaultdict(deque)

    def _recent(self, key: str):
        window = settings.login_lockout_minutes * 60
        q = self._fails[key]
        now = time.monotonic()
        while q and now - q[0] > window:
            q.popleft()
        return q

    def check(self, key: str) -> None:
        if len(self._recent(key)) >= settings.login_max_attempts:
            raise ApiError(
                429,
                "too_many_attempts",
                f"Too many failed attempts. Please try again in {settings.login_lockout_minutes} minutes.",
            )

    def fail(self, key: str) -> None:
        self._fails[key].append(time.monotonic())

    def reset(self, key: str) -> None:
        self._fails.pop(key, None)

    def clear(self) -> None:
        self._fails.clear()


login_limiter = LoginLimiter()
