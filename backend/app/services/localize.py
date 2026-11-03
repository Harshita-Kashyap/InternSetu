"""Translate the generated explanation sentences (why recommended, considerations, eligibility reasons,
messages, disclaimer) into Hindi / Marathi. Taxonomy names (skills, sectors, cities) stay as stored."""
import re

# (regex on the English sentence, hindi template, marathi template)  -- {0},{1},{2} = captured groups
_R = [
    (r"^Skills: (\d+) of (\d+) required/preferred skills matched \((.*)\)$",
     "कौशल: {1} में से {0} आवश्यक/पसंदीदा कौशल मेल खाते हैं ({2})", "कौशल्ये: {1} पैकी {0} आवश्यक/पसंतीची कौशल्ये जुळतात ({2})"),
    (r"^Education requirement satisfied \((.*)\); field of study matches$",
     "शिक्षा की आवश्यकता पूरी होती है ({0}); अध्ययन क्षेत्र मेल खाता है", "शिक्षणाची अट पूर्ण होते ({0}); अभ्यासाचे क्षेत्र जुळते"),
    (r"^Education requirement satisfied \((.*)\); field of study differs$",
     "शिक्षा की आवश्यकता पूरी होती है ({0}); अध्ययन क्षेत्र अलग है", "शिक्षणाची अट पूर्ण होते ({0}); अभ्यासाचे क्षेत्र वेगळे आहे"),
    (r"^Field of study differs from the one listed for this internship$",
     "अध्ययन क्षेत्र इस इंटर्नशिप में बताए गए क्षेत्र से अलग है", "अभ्यासाचे क्षेत्र या इंटर्नशिपमध्ये नमूद क्षेत्रापेक्षा वेगळे आहे"),
    (r"^Preferred role matches \((.*)\)$", "पसंदीदा भूमिका मेल खाती है ({0})", "पसंतीची भूमिका जुळते ({0})"),
    (r"^Role is in the same domain as one of your preferred roles$",
     "भूमिका आपकी पसंदीदा भूमिकाओं में से एक के समान क्षेत्र की है", "ही भूमिका तुमच्या पसंतीच्या भूमिकेसारख्याच क्षेत्रातील आहे"),
    (r"^Sector is one of your preferred sectors \((.*)\)$", "क्षेत्र आपके पसंदीदा क्षेत्रों में से एक है ({0})", "क्षेत्र तुमच्या पसंतीच्या क्षेत्रांपैकी एक आहे ({0})"),
    (r"^Sector is not among your preferred sectors$", "क्षेत्र आपके पसंदीदा क्षेत्रों में शामिल नहीं है", "क्षेत्र तुमच्या पसंतीच्या क्षेत्रांमध्ये नाही"),
    (r"^Located in your home location$", "आपके गृह स्थान पर स्थित है", "तुमच्या मूळ ठिकाणी आहे"),
    (r"^Located in one of your preferred locations$", "आपके पसंदीदा स्थानों में से एक पर स्थित है", "तुमच्या पसंतीच्या ठिकाणांपैकी एका ठिकाणी आहे"),
    (r"^Located in your home state, and you are willing to travel$", "आपके गृह राज्य में स्थित है, और आप यात्रा करने को तैयार हैं", "तुमच्या मूळ राज्यात आहे, आणि तुम्ही प्रवासास तयार आहात"),
    (r"^Different state, but you are willing to relocate$", "अलग राज्य है, लेकिन आप दूसरी जगह जाने को तैयार हैं", "वेगळे राज्य आहे, पण तुम्ही स्थलांतरास तयार आहात"),
    (r"^Stipend is below your expectation$", "वजीफ़ा आपकी अपेक्षा से कम है", "विद्यावेतन तुमच्या अपेक्षेपेक्षा कमी आहे"),
    (r"^Duration \((.*)\) differs from your preference \((.*)\)$", "अवधि ({0}) आपकी पसंद ({1}) से अलग है", "कालावधी ({0}) तुमच्या पसंतीपेक्षा ({1}) वेगळा आहे"),
    (r"^Low match \(([\d.]+)%\): you meet the mandatory requirements, but overall suitability is below (\d+)%$",
     "कम मैच ({0}%): आप अनिवार्य आवश्यकताएँ पूरी करते हैं, लेकिन कुल उपयुक्तता {1}% से कम है",
     "कमी जुळणी ({0}%): तुम्ही अनिवार्य अटी पूर्ण करता, पण एकूण योग्यता {1}% पेक्षा कमी आहे"),
    (r"^Low match$", "कम मैच", "कमी जुळणी"),
    (r"^Missing mandatory skill\(s\): (.*)$", "अनिवार्य कौशल की कमी: {0}", "अनिवार्य कौशल्ये कमी: {0}"),
    (r"^Education level below requirement \(candidate: (.*), required: (.*)\)$",
     "शिक्षा स्तर आवश्यकता से कम (उम्मीदवार: {0}, आवश्यक: {1})", "शिक्षण पातळी आवश्यकतेपेक्षा कमी (उमेदवार: {0}, आवश्यक: {1})"),
    (r"^Meets mandatory skill and minimum education requirements$",
     "अनिवार्य कौशल और न्यूनतम शिक्षा की आवश्यकताएँ पूरी होती हैं", "अनिवार्य कौशल्ये आणि किमान शिक्षणाची अट पूर्ण होते"),
    (r"^InternSetu only suggests internships\. .*$",
     "InternSetu केवल इंटर्नशिप सुझाता है। अंतिम चयन PMIS और कंपनियाँ करती हैं। मैच प्रतिशत दर्शाता है कि आपकी प्रोफ़ाइल इंटर्नशिप से कितनी मेल खाती है; यह चयन की संभावना नहीं है।",
     "InternSetu फक्त इंटर्नशिप सुचवते. अंतिम निवड PMIS आणि कंपन्या करतात. जुळणी टक्केवारी तुमची प्रोफाइल इंटर्नशिपशी किती जुळते ते दाखवते; ती निवडीची शक्यता नाही."),
    (r"^Demo data: these are synthetic internships.*$",
     "डेमो डेटा: ये शोध के लिए बनाई गई सिंथेटिक इंटर्नशिप हैं, वास्तविक PMIS सूची नहीं।", "डेमो डेटा: या संशोधनासाठी तयार केलेल्या सिंथेटिक इंटर्नशिप आहेत, खऱ्या PMIS यादी नाहीत."),
    (r"^No eligible internships were found\..*$",
     "कोई पात्र इंटर्नशिप नहीं मिली। पात्रता के लिए सभी अनिवार्य कौशल और कम से कम आवश्यक शिक्षा स्तर चाहिए, इसलिए अभी सूची में कुछ भी इस प्रोफ़ाइल के योग्य नहीं है।",
     "पात्र इंटर्नशिप सापडल्या नाहीत. पात्रतेसाठी सर्व अनिवार्य कौशल्ये आणि किमान आवश्यक शिक्षण पातळी हवी, म्हणून सध्या यादीतील काहीही या प्रोफाइलसाठी पात्र नाही."),
    (r"^Only (\d+) eligible internship\(s\) found, so fewer than (\d+) are returned\.$",
     "केवल {0} पात्र इंटर्नशिप मिली, इसलिए {1} से कम दिखाई जा रही हैं।", "फक्त {0} पात्र इंटर्नशिप सापडल्या, म्हणून {1} पेक्षा कमी दाखवल्या आहेत."),
]
_RULES = [(re.compile(p), {"hi": h, "mr": m}) for p, h, m in _R]
_KEYS = {"why_recommended", "considerations", "reason", "message", "disclaimer", "demo_notice", "match_tag"}
LANGS = ("en", "hi", "mr")


def tr_text(s: str, lang: str) -> str:
    if lang not in ("hi", "mr") or not isinstance(s, str):
        return s
    if "; " in s and s.startswith(("Missing mandatory", "Education level below")):  # joined eligibility reasons
        return "; ".join(tr_text(p, lang) for p in s.split("; "))
    for rx, t in _RULES:
        m = rx.match(s)
        if m:
            return t[lang].format(*m.groups())
    return s


def localize(obj, lang: str | None):
    """Return obj with known explanation fields translated (en or unknown -> unchanged)."""
    if lang not in ("hi", "mr"):
        return obj
    if isinstance(obj, list):
        return [localize(x, lang) for x in obj]
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            if k in _KEYS and isinstance(v, str):
                out[k] = tr_text(v, lang)
            elif k in _KEYS and isinstance(v, list) and all(isinstance(x, str) for x in v):
                out[k] = [tr_text(x, lang) for x in v]
            else:
                out[k] = localize(v, lang)
        return out
    return obj
