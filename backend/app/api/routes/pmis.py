from pydantic import BaseModel, Field
from fastapi import APIRouter

from app.services import pmis_rules

router = APIRouter(prefix="/pmis", tags=["PMIS"])


class PrecheckIn(BaseModel):
    age: int = Field(ge=10, le=80)
    family_income_lakh: float | None = Field(default=None, ge=0, le=10000, description="Family income per year, in lakh rupees")
    family_govt_job: bool | None = Field(default=None, description="Anyone in the family has a permanent government job")
    excluded_qualification: bool | None = Field(default=None, description="IIT/IIM/NLU, CA, MBA, MBBS, PhD etc.")
    govt_apprenticeship: bool | None = Field(default=None, description="Done or doing NATS/NAPS or a govt-funded internship")
    employed_full_time: bool | None = None


@router.get("/rules")
def get_rules():
    """Public PMIS facts used by the app (stipend, duration, limits). Editable in data/pmis_rules.json."""
    return pmis_rules.load_rules()


@router.post("/precheck")
def precheck(body: PrecheckIn):
    """Public and stateless: nothing is stored. Answers are a hint only; the PMIS portal decides."""
    return pmis_rules.precheck(body.model_dump())


_DOC_BN = {  # Bengali (machine-translated, not reviewed)
    "aadhaar": "আধার কার্ড (তৈরি রাখুন; InternSetu এটি কখনও চায় না, রাখেও না)",
    "mobile": "OTP আসতে পারে এমন মোবাইল নম্বর",
    "marksheets": "আপনার সর্বোচ্চ যোগ্যতার মার্কশিট ও সার্টিফিকেট (১০ম, ১২শ, ITI, ডিপ্লোমা বা ডিগ্রি)",
    "bank": "আপনার নিজের নামে ব্যাংক অ্যাকাউন্টের তথ্য (অ্যাকাউন্ট নম্বর, IFSC)",
    "income": "পরিবারের আয়ের প্রমাণ বা স্ব-ঘোষণা, পোর্টাল চাইলে",
}


def _d(i, en, hi, mr):
    return {"id": i, "label": {"en": en, "hi": hi, "mr": mr, "bn": _DOC_BN[i]}}


HANDOFF_DOCUMENTS = [
    _d("aadhaar", "Aadhaar card (keep it ready; InternSetu never asks for or stores it)", "आधार कार्ड (तैयार रखें; InternSetu इसे न माँगता है, न सहेजता है)", "आधार कार्ड (तयार ठेवा; InternSetu ते मागत नाही आणि साठवत नाही)"),
    _d("mobile", "Mobile number that works for OTP", "मोबाइल नंबर जिस पर OTP आ सके", "OTP येऊ शकेल असा मोबाइल क्रमांक"),
    _d("marksheets", "Marksheets and certificates of your highest qualification (10th, 12th, ITI, Diploma or degree)", "आपकी सबसे ऊँची योग्यता की अंकसूची और प्रमाणपत्र (10वीं, 12वीं, ITI, डिप्लोमा या डिग्री)", "तुमच्या सर्वोच्च शिक्षणाची गुणपत्रिका व प्रमाणपत्रे (10वी, 12वी, ITI, डिप्लोमा किंवा पदवी)"),
    _d("bank", "Bank account details (account number, IFSC) in your own name", "आपके नाम का बैंक खाता विवरण (खाता संख्या, IFSC)", "तुमच्या नावावरील बँक खात्याचा तपशील (खाते क्रमांक, IFSC)"),
    _d("income", "Family income proof or self-declaration, if the portal asks for it", "परिवार की आय का प्रमाण या स्व-घोषणा, यदि पोर्टल माँगे", "कुटुंबाच्या उत्पन्नाचा पुरावा किंवा स्वघोषणा, पोर्टलने मागितल्यास"),
]


@router.get("/handoff")
def handoff():
    """Public. Official portal link and the papers to keep ready before applying. Nothing is stored; Aadhaar is never collected."""
    rules = pmis_rules.load_rules()
    return {"official_url": rules["official_url"], "documents": HANDOFF_DOCUMENTS,
            "note": {"en": "Check the official portal for the current list. InternSetu does not apply for you.",
                     "hi": "वर्तमान सूची आधिकारिक पोर्टल पर देखें। InternSetu आपकी ओर से आवेदन नहीं करता।",
                     "mr": "सध्याची यादी अधिकृत पोर्टलवर पाहा. InternSetu तुमच्या वतीने अर्ज करत नाही.",
                     "bn": "বর্তমান তালিকা সরকারি পোর্টালে দেখুন। InternSetu আপনার হয়ে আবেদন করে না."}}
