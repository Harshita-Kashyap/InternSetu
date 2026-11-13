"""Languages the apps can show. Only some have translated server text; the rest fall back to English
(see engine/explanation/reasons.py and services/localize.py). Add a code here when its UI file exists."""
from typing import Literal

UI_LANGUAGES = ("en", "hi", "mr", "bn", "te", "ta", "gu")
LanguageCode = Literal["en", "hi", "mr", "bn", "te", "ta", "gu"]
LANG_PATTERN = "^(" + "|".join(UI_LANGUAGES) + ")$"
