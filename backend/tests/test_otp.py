"""OTP core (pure Python)."""
from app.core.otp import OtpLimiter, SLOT_SECONDS, make_code, verify_code

S = "x" * 40


def test_code_is_six_digits_and_verifies():
    c = make_code(S, 7, "hash-a", "password-reset", now=1000)
    assert len(c) == 6 and c.isdigit()
    assert verify_code(S, 7, "hash-a", "password-reset", c, now=1000)


def test_wrong_user_purpose_secret_or_binding_fails():
    c = make_code(S, 7, "hash-a", "password-reset", now=1000)
    assert not verify_code(S, 8, "hash-a", "password-reset", c, now=1000)
    assert not verify_code(S, 7, "hash-a", "delete-account", c, now=1000)
    assert not verify_code("y" * 40, 7, "hash-a", "password-reset", c, now=1000)
    assert not verify_code(S, 7, "hash-CHANGED", "password-reset", c, now=1000)   # single use: password changed


def test_expiry_between_five_and_ten_minutes():
    t = 10 * SLOT_SECONDS
    c = make_code(S, 7, "h", "p", now=t)
    assert verify_code(S, 7, "h", "p", c, now=t + SLOT_SECONDS)           # next slot: still valid
    assert not verify_code(S, 7, "h", "p", c, now=t + 2 * SLOT_SECONDS)   # two slots later: expired


def test_garbage_codes_rejected():
    for bad in ("", "12345", "1234567", "abcdef", None):
        assert not verify_code(S, 7, "h", "p", bad, now=1000)


def test_limiter_locks_and_resend_gap():
    lim = OtpLimiter(max_wrong=3, window_s=100, resend_gap_s=60)
    for i in range(3):
        assert not lim.locked("k", now=i)
        lim.wrong("k", now=i)
    assert lim.locked("k", now=5) and not lim.locked("k", now=500)         # window passes
    assert lim.can_send("k", now=0)
    lim.sent("k", now=0)
    assert not lim.can_send("k", now=30) and lim.can_send("k", now=61)
