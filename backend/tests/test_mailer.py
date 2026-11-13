import smtplib

import pytest

from app.core.config import settings
from app.services import mailer


class FakeSMTP:
    sent: list = []
    calls: list = []
    fail = False

    def __init__(self, host, port, timeout=0):
        FakeSMTP.calls.append(("connect", host, port))

    def __enter__(self):
        if FakeSMTP.fail:
            raise OSError("down")
        return self

    def __exit__(self, *a):
        return False

    def starttls(self):
        FakeSMTP.calls.append(("starttls",))

    def login(self, u, p):
        FakeSMTP.calls.append(("login", u, p))

    def send_message(self, msg):
        FakeSMTP.sent.append(msg)


@pytest.fixture(autouse=True)
def _reset():
    FakeSMTP.sent, FakeSMTP.calls, FakeSMTP.fail = [], [], False


def test_log_only_mode_returns_false_and_sends_nothing(monkeypatch, caplog):
    monkeypatch.setattr(settings, "smtp_host", "")
    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)
    with caplog.at_level("WARNING"):
        assert mailer.send_email("a@b.co", "Hi", "Body 123456") is False
    assert FakeSMTP.calls == [] and "dev mode" in caplog.text


def test_smtp_mode_sends_with_tls_and_login(monkeypatch):
    for k, v in {"smtp_host": "smtp.test", "smtp_port": 587, "smtp_user": "me@x.com", "smtp_password": "pw", "mail_from": "InternSetu <me@x.com>"}.items():
        monkeypatch.setattr(settings, k, v)
    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)
    assert mailer.send_email("to@b.co", "Subject", "Hello") is True
    assert ("starttls",) in FakeSMTP.calls and ("login", "me@x.com", "pw") in FakeSMTP.calls
    msg = FakeSMTP.sent[0]
    assert msg["To"] == "to@b.co" and msg["Subject"] == "Subject" and msg["From"] == "InternSetu <me@x.com>"


def test_smtp_failure_never_raises(monkeypatch):
    monkeypatch.setattr(settings, "smtp_host", "smtp.test")
    monkeypatch.setattr(smtplib, "SMTP", FakeSMTP)
    FakeSMTP.fail = True
    assert mailer.send_email("to@b.co", "S", "B") is False


@pytest.mark.parametrize("kind", ["signup", "login", "delete"])
@pytest.mark.parametrize("lang", ["en", "hi", "mr", "bn"])
def test_code_emails_exist_in_every_language_and_contain_the_code(kind, lang):
    subject, body = mailer.kind_code_email(kind, "123456", lang)
    assert subject and "123456" in body


def test_unknown_language_falls_back_to_english():
    assert mailer.kind_code_email("signup", "654321", "xx") == mailer.kind_code_email("signup", "654321", "en")
    assert "123456" in mailer.reset_code_email("123456", "hi")[1]
