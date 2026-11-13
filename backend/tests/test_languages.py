import re

from app.core.languages import LANG_PATTERN, UI_LANGUAGES


def test_ui_languages_accept_planned_codes_and_reject_others():
    rx = re.compile(LANG_PATTERN)
    for code in ("en", "hi", "mr", "bn", "te", "ta", "gu"):
        assert rx.match(code) and code in UI_LANGUAGES
    for bad in ("fr", "EN", "hin", "", "en;drop"):
        assert not rx.match(bad)
