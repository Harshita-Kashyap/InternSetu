"""Reason codes for explanations (tracker #12, #16, #29).

The engine decides WHAT to say as a (code, params) pair; this table decides HOW it is said in each language.
  - The API returns both: the ready-made sentence (`why_recommended`, `considerations`) and the raw
    `why_codes` / `consider_codes` ([{"code": ..., "params": {...}}]) so a client can show its own wording
    or add a new language without any backend change (#13).
  - Wording target: simple everyday words (about Grade 6). Avoid "mandatory", "taxonomy", "eligibility criteria".
  - Hindi / Marathi / Bengali were written by the developer, not a native reviewer: have them checked before the pilot.
  - Skill / sector / city / education NAMES are placeholders filled from the stored taxonomy; they are not translated here.
Adding a language: add one more key to every entry in REASONS (tests/test_reasons.py checks none is missing).
"""

LANGS = ("en", "hi", "mr", "bn")

REASONS: dict[str, dict[str, str]] = {
    # ---- why recommended ----
    "SKILLS_MATCH": {
        "en": "You have {n} of the {total} skills they want ({names})",
        "hi": "उन्हें जो {total} कौशल चाहिए, उनमें से {n} आपके पास हैं ({names})",
        "mr": "त्यांना हवी असलेल्या {total} कौशल्यांपैकी {n} तुमच्याकडे आहेत ({names})",
        "bn": "তাদের চাওয়া {total}টি দক্ষতার মধ্যে {n}টি আপনার আছে ({names})",
    },
    "EDU_OK_SAME_FIELD": {
        "en": "You have the education they ask for, and your subject matches",
        "hi": "आपके पास उनकी माँगी हुई पढ़ाई है, और आपका विषय भी मेल खाता है",
        "mr": "त्यांनी मागितलेले शिक्षण तुमच्याकडे आहे, आणि तुमचा विषयही जुळतो",
        "bn": "তাদের চাওয়া শিক্ষাগত যোগ্যতা আপনার আছে, আর আপনার বিষয়ও মেলে",
    },
    "EDU_OK_OTHER_FIELD": {
        "en": "You have the education they ask for, but your subject is different",
        "hi": "आपके पास उनकी माँगी हुई पढ़ाई है, लेकिन आपका विषय अलग है",
        "mr": "त्यांनी मागितलेले शिक्षण तुमच्याकडे आहे, पण तुमचा विषय वेगळा आहे",
        "bn": "তাদের চাওয়া শিক্ষাগত যোগ্যতা আপনার আছে, তবে আপনার বিষয় আলাদা",
    },
    "ROLE_MATCH": {
        "en": "This is the kind of work you want ({role})",
        "hi": "यह वही काम है जो आप चाहते हैं ({role})",
        "mr": "हेच काम तुम्हाला हवे आहे ({role})",
        "bn": "এটি ঠিক সেই কাজ যা আপনি চান ({role})",
    },
    "ROLE_RELATED": {
        "en": "This work is close to the work you want",
        "hi": "यह काम आपके पसंद के काम के करीब है",
        "mr": "हे काम तुम्हाला हव्या असलेल्या कामाच्या जवळचे आहे",
        "bn": "এই কাজটি আপনার পছন্দের কাজের কাছাকাছি",
    },
    "SECTOR_MATCH": {
        "en": "It is in an industry you chose ({sector})",
        "hi": "यह आपके चुने हुए उद्योग में है ({sector})",
        "mr": "हे तुम्ही निवडलेल्या उद्योगात आहे ({sector})",
        "bn": "এটি আপনার বেছে নেওয়া শিল্পক্ষেত্রে ({sector})",
    },
    "LOC_HOME": {
        "en": "It is in your home place",
        "hi": "यह आपके अपने स्थान पर है",
        "mr": "हे तुमच्या मूळ ठिकाणी आहे",
        "bn": "এটি আপনার নিজের জায়গায়",
    },
    "LOC_PREFERRED": {
        "en": "It is in a place you chose",
        "hi": "यह आपके चुने हुए स्थान पर है",
        "mr": "हे तुम्ही निवडलेल्या ठिकाणी आहे",
        "bn": "এটি আপনার বেছে নেওয়া জায়গায়",
    },
    "LOC_HOME_STATE": {
        "en": "It is in your state, and you said you can travel",
        "hi": "यह आपके राज्य में है, और आपने कहा कि आप यात्रा कर सकते हैं",
        "mr": "हे तुमच्या राज्यात आहे, आणि तुम्ही प्रवास करू शकता असे सांगितले आहे",
        "bn": "এটি আপনার রাজ্যে, আর আপনি বলেছেন আপনি যাতায়াত করতে পারবেন",
    },
    "LOC_OTHER_STATE": {
        "en": "It is in another state, and you said you can move",
        "hi": "यह दूसरे राज्य में है, और आपने कहा कि आप वहाँ जा सकते हैं",
        "mr": "हे दुसऱ्या राज्यात आहे, आणि तुम्ही तिथे जाऊ शकता असे सांगितले आहे",
        "bn": "এটি অন্য রাজ্যে, আর আপনি বলেছেন আপনি সেখানে যেতে পারবেন",
    },
    # ---- things to consider / what to improve ----
    "FIELD_DIFFERS": {
        "en": "Your subject is different from the one they list",
        "hi": "आपका विषय उनके बताए विषय से अलग है",
        "mr": "तुमचा विषय त्यांनी सांगितलेल्या विषयापेक्षा वेगळा आहे",
        "bn": "আপনার বিষয় তাদের উল্লেখ করা বিষয় থেকে আলাদা",
    },
    "SECTOR_OTHER": {
        "en": "It is not in an industry you chose",
        "hi": "यह आपके चुने हुए उद्योग में नहीं है",
        "mr": "हे तुम्ही निवडलेल्या उद्योगात नाही",
        "bn": "এটি আপনার বেছে নেওয়া শিল্পক্ষেত্রে নয়",
    },
    "LOW_MATCH": {
        "en": "Low match ({pct:.2f}%): you meet the basic needs, but the fit is under {limit:.0f}%",
        "hi": "कम मैच ({pct:.2f}%): आप ज़रूरी शर्तें पूरी करते हैं, लेकिन मेल {limit:.0f}% से कम है",
        "mr": "कमी जुळणी ({pct:.2f}%): तुम्ही आवश्यक अटी पूर्ण करता, पण जुळणी {limit:.0f}% पेक्षा कमी आहे",
        "bn": "কম মিল ({pct:.2f}%): আপনি প্রাথমিক শর্ত পূরণ করেন, কিন্তু মিল {limit:.0f}%-এর কম",
    },
    "CLOSE_MATCH": {
        "en": "Close match: you need {n} more skill(s) first ({names}). Learn them to qualify.",
        "hi": "करीबी मैच: पहले {n} और कौशल चाहिए ({names})। इन्हें सीखकर आप पात्र बन सकते हैं।",
        "mr": "जवळची जुळणी: आधी आणखी {n} कौशल्ये हवीत ({names}). ती शिकून तुम्ही पात्र होऊ शकता.",
        "bn": "কাছাকাছি মিল: আগে আরও {n}টি দক্ষতা লাগবে ({names})। সেগুলো শিখলে আপনি যোগ্য হতে পারেন।",
    },
    "STARTER": {
        "en": "Starting point: you need {n} more skills first ({names}). Learn them one by one.",
        "hi": "शुरुआती विकल्प: पहले {n} और कौशल चाहिए ({names})। इन्हें एक-एक करके सीखें।",
        "mr": "सुरुवातीचा पर्याय: आधी आणखी {n} कौशल्ये हवीत ({names}). ती एक-एक करून शिका.",
        "bn": "শুরুর পথ: আগে আরও {n}টি দক্ষতা লাগবে ({names})। একটা একটা করে শিখুন।",
    },
    # ---- not eligible (internship detail) ----
    "NEED_SKILLS": {
        "en": "Skills you still need: {names}",
        "hi": "जो कौशल अभी चाहिए: {names}",
        "mr": "अजून हवी असलेली कौशल्ये: {names}",
        "bn": "যে দক্ষতা এখনও লাগবে: {names}",
    },
    "EDU_TOO_LOW": {
        "en": "Your education is lower than they ask for (yours: {have}, needed: {need})",
        "hi": "आपकी पढ़ाई उनकी माँग से कम है (आपकी: {have}, ज़रूरी: {need})",
        "mr": "तुमचे शिक्षण त्यांच्या मागणीपेक्षा कमी आहे (तुमचे: {have}, आवश्यक: {need})",
        "bn": "আপনার শিক্ষাগত যোগ্যতা তাদের চাওয়ার চেয়ে কম (আপনার: {have}, দরকার: {need})",
    },
}

# Order used when more than MAX_REASONS apply: skills, place, role, industry, education.
RANK = {"SKILLS_MATCH": 0, "LOC_HOME": 1, "LOC_PREFERRED": 1, "LOC_HOME_STATE": 1, "LOC_OTHER_STATE": 1,
        "ROLE_MATCH": 2, "ROLE_RELATED": 2, "SECTOR_MATCH": 3, "EDU_OK_SAME_FIELD": 4, "EDU_OK_OTHER_FIELD": 4}


def make(code: str, **params) -> dict:
    """One reason: {"code": "SKILLS_MATCH", "params": {"n": 3, ...}}. Params must be plain strings/numbers (JSON)."""
    if code not in REASONS:
        raise KeyError(f"unknown reason code: {code}")
    return {"code": code, "params": params}


def render(reason: dict, lang: str = "en") -> str:
    """Sentence for one reason in `lang` (unknown language or a bad parameter list falls back to English)."""
    table = REASONS.get(reason.get("code"))
    if table is None:
        return str(reason.get("code", ""))
    params = reason.get("params") or {}
    for lg in ((lang, "en") if lang in table else ("en",)):
        try:
            return table[lg].format(**params)
        except (KeyError, IndexError, ValueError):
            continue
    return table["en"]


def render_all(reasons: list[dict], lang: str = "en") -> list[str]:
    return [render(r, lang) for r in reasons]
