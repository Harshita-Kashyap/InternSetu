"""PMIS pre-check: "Can I apply to PMIS at all?" Pure Python, stateless (nothing is stored).

Rules live in data/pmis_rules.json so they can change without code changes. Answers are self-declared and the
result is only a hint: the official portal makes the final decision.
"""
import json
import re
from pathlib import Path

RULES_PATH = Path(__file__).resolve().parents[2] / "data" / "pmis_rules.json"


def load_rules() -> dict:
    return json.loads(RULES_PATH.read_text(encoding="utf-8"))


# Bengali (machine-translated, not reviewed). Keyed by the start of the English sentence; numbers in the
# English text are passed to the Bengali template as {0}, {1}.
_BN = {
    "PMIS usually needs age": "PMIS-এ সাধারণত বয়স {0}-{1} বছর লাগে। আপনার বয়স এই সীমার বাইরে।",
    "Family income above": "পরিবারের বার্ষিক আয় {0} লাখ টাকার বেশি হলে যোগ্যতা নেই।",
    "A family member with": "পরিবারের কারও স্থায়ী সরকারি চাকরি থাকলে যোগ্যতা নেই।",
    "Degrees such as": "IIT/IIM/NLU, CA, MBA, MBBS বা PhD-র মতো ডিগ্রি যোগ্য নয়।",
    "If you have done": "আপনি সরকারি অ্যাপ্রেন্টিসশিপ (NATS/NAPS) করে থাকলে বা করলে যোগ্যতা নেই।",
    "You should not be in": "আপনি ফুল-টাইম চাকরিতে থাকা চলবে না।",
    "You may not be eligible": "আপনি PMIS-এর জন্য যোগ্য নাও হতে পারেন। নিচের কারণগুলো সরকারি পোর্টালে দেখে নিন।",
    "Answer the remaining": "নিশ্চিত হতে বাকি প্রশ্নগুলোর উত্তর দিন।",
    "You look likely": "আপনি যোগ্য বলে মনে হচ্ছে। চূড়ান্ত সিদ্ধান্ত সরকারি পোর্টাল নেয়।",
    "This is a self-declared": "এটি নিজের দেওয়া তথ্যের ভিত্তিতে একটি ইঙ্গিত, সরকারি সিদ্ধান্ত নয়। নিয়ম বদলাতে পারে; পোর্টালে যাচাই করুন।",
}


def _t(en, hi, mr):
    out = {"en": en, "hi": hi, "mr": mr}
    for start, bn in _BN.items():
        if en.startswith(start):
            out["bn"] = bn.format(*re.findall(r"\d+", en))
            break
    return out


def precheck(answers: dict, rules: dict | None = None) -> dict:
    """answers: age, family_income_lakh, family_govt_job, excluded_qualification, govt_apprenticeship,
    employed_full_time (all optional except age; None = not answered)."""
    r = rules or load_rules()
    blockers, unknown = [], []
    age = answers.get("age")
    if age is not None and not r["age_min"] <= age <= r["age_max"]:
        blockers.append({"code": "age", "text": _t(
            f"PMIS usually needs age {r['age_min']}-{r['age_max']}. Your age is outside this range.",
            f"PMIS में आमतौर पर आयु {r['age_min']}-{r['age_max']} वर्ष चाहिए। आपकी आयु इस सीमा से बाहर है।",
            f"PMIS साठी साधारणपणे वय {r['age_min']}-{r['age_max']} वर्षे हवे. तुमचे वय या मर्यादेबाहेर आहे.")})
    inc = answers.get("family_income_lakh")
    if inc is None:
        unknown.append("family_income_lakh")
    elif inc > r["family_income_limit_lakh"]:
        blockers.append({"code": "income", "text": _t(
            f"Family income above Rs {r['family_income_limit_lakh']} lakh a year is not eligible.",
            f"परिवार की वार्षिक आय Rs {r['family_income_limit_lakh']} लाख से अधिक होने पर पात्रता नहीं है।",
            f"कुटुंबाचे वार्षिक उत्पन्न Rs {r['family_income_limit_lakh']} लाखांपेक्षा जास्त असल्यास पात्रता नाही.")})
    checks = [
        ("family_govt_job", "govt_family",
         _t("A family member with a permanent government job makes you ineligible.",
            "परिवार में किसी के स्थायी सरकारी नौकरी में होने पर पात्रता नहीं है।",
            "कुटुंबातील कोणाकडे कायमची सरकारी नोकरी असल्यास पात्रता नाही.")),
        ("excluded_qualification", "qualification",
         _t("Degrees such as IIT/IIM/NLU, CA, MBA, MBBS or PhD are not eligible.",
            "IIT/IIM/NLU, CA, MBA, MBBS या PhD जैसी डिग्रियाँ पात्र नहीं हैं।",
            "IIT/IIM/NLU, CA, MBA, MBBS किंवा PhD सारख्या पदव्या पात्र नाहीत.")),
        ("govt_apprenticeship", "apprenticeship",
         _t("If you have done or are doing a government apprenticeship (NATS/NAPS), you are not eligible.",
            "यदि आपने सरकारी अप्रेंटिसशिप (NATS/NAPS) की है या कर रहे हैं, तो पात्रता नहीं है।",
            "तुम्ही सरकारी अप्रेंटिसशिप (NATS/NAPS) केली असल्यास किंवा करत असल्यास पात्रता नाही.")),
        ("employed_full_time", "employment",
         _t("You should not be in full-time employment.", "आप पूर्णकालिक नौकरी में नहीं होने चाहिए।",
            "तुम्ही पूर्णवेळ नोकरीत नसावे.")),
    ]
    for key, code, text in checks:
        v = answers.get(key)
        if v is None:
            unknown.append(key)
        elif v:
            blockers.append({"code": code, "text": text})
    if blockers:
        status = "likely_not_eligible"
    elif unknown or age is None:
        status = "check_details"
    else:
        status = "likely_eligible"
    summary = {
        "likely_not_eligible": _t("You may not be eligible for PMIS. Check the reasons below on the official portal.",
                                  "आप PMIS के लिए पात्र नहीं हो सकते। नीचे दिए कारण आधिकारिक पोर्टल पर जाँचें।",
                                  "तुम्ही PMIS साठी पात्र नसू शकता. खालील कारणे अधिकृत पोर्टलवर तपासा."),
        "check_details": _t("Answer the remaining questions to be sure.", "पक्का करने के लिए बाकी प्रश्नों के उत्तर दें।",
                            "खात्री करण्यासाठी उर्वरित प्रश्नांची उत्तरे द्या."),
        "likely_eligible": _t("You look likely to be eligible. The official portal makes the final decision.",
                              "आप पात्र लगते हैं। अंतिम निर्णय आधिकारिक पोर्टल करता है।",
                              "तुम्ही पात्र दिसता. अंतिम निर्णय अधिकृत पोर्टल घेते."),
    }[status]
    return {"status": status, "summary": summary, "blockers": blockers, "unanswered": unknown,
            "rules_version": r["version"], "official_url": r["official_url"],
            "notice": _t("This is a self-declared hint, not an official decision. Rules may change; verify on the portal.",
                         "यह स्वयं-घोषित संकेत है, आधिकारिक निर्णय नहीं। नियम बदल सकते हैं; पोर्टल पर जाँचें।",
                         "हा स्वतः दिलेल्या माहितीवर आधारित अंदाज आहे, अधिकृत निर्णय नाही. नियम बदलू शकतात; पोर्टलवर तपासा.")}
