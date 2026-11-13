"""Sends plain-text email. Without SMTP settings it only logs the message (development mode), so the app works
with no email account. Set SMTP_HOST (and usually SMTP_USER / SMTP_PASSWORD / MAIL_FROM) to send real mail.
Free options for a college project: Gmail with an app password, Brevo (300 mails/day free), Resend free tier."""
import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

log = logging.getLogger("internsetu.mail")


def smtp_configured() -> bool:
    return bool(settings.smtp_host)


def send_email(to: str, subject: str, body: str) -> bool:
    """Returns True when handed to an SMTP server, False in log-only mode or on failure (never raises)."""
    if not smtp_configured():
        log.warning("EMAIL (dev mode, not sent) to=%s subject=%s\n%s", to, subject, body)
        return False
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = settings.mail_from or settings.smtp_user or "no-reply@internsetu.local", to, subject
    msg.set_content(body)
    try:
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as s:
            s.starttls()
            if settings.smtp_user:
                s.login(settings.smtp_user, settings.smtp_password or "")
            s.send_message(msg)
        return True
    except Exception:  # noqa: BLE001 - the caller must not reveal whether mail worked
        log.exception("Could not send email to %s", to)
        return False


def reset_code_email(code: str, lang: str = "en") -> tuple[str, str]:
    text = {
        "en": ("Your InternSetu reset code", f"Your InternSetu code is {code}. It works for 10 minutes. If you did not ask for it, ignore this email."),
        "hi": ("आपका InternSetu रीसेट कोड", f"आपका InternSetu कोड {code} है। यह 10 मिनट तक चलेगा। अगर आपने नहीं माँगा, तो इस ईमेल को अनदेखा करें।"),
        "mr": ("तुमचा InternSetu रीसेट कोड", f"तुमचा InternSetu कोड {code} आहे. तो 10 मिनिटे चालेल. तुम्ही मागितला नसेल तर हा ईमेल दुर्लक्षित करा."),
        "bn": ("আপনার InternSetu রিসেট কোড", f"আপনার InternSetu কোড {code}। এটি ১০ মিনিট কাজ করবে। আপনি না চাইলে এই ইমেইল উপেক্ষা করুন।"),
    }
    return text.get(lang, text["en"])


_KIND = {  # what the code is for, per language (machine-translated for mr/bn, not reviewed)
    "signup": {
        "en": ("Verify your email for InternSetu", "Your InternSetu sign-up code is {c}. It works for 10 minutes and only once. If you did not ask for it, ignore this email."),
        "hi": ("InternSetu के लिए अपना ईमेल सत्यापित करें", "आपका InternSetu साइन-अप कोड {c} है। यह 10 मिनट तक और सिर्फ़ एक बार चलेगा। अगर आपने नहीं माँगा, तो इस ईमेल को अनदेखा करें।"),
        "mr": ("InternSetu साठी तुमचा ईमेल सत्यापित करा", "तुमचा InternSetu साइन-अप कोड {c} आहे. तो 10 मिनिटे आणि फक्त एकदाच चालेल. तुम्ही मागितला नसेल तर हा ईमेल दुर्लक्षित करा."),
        "bn": ("InternSetu-র জন্য আপনার ইমেইল যাচাই করুন", "আপনার InternSetu সাইন-আপ কোড {c}। এটি ১০ মিনিট এবং শুধু একবার কাজ করবে। আপনি না চাইলে এই ইমেইল উপেক্ষা করুন।"),
    },
    "login": {
        "en": ("Your InternSetu login code", "Your InternSetu login code is {c}. It works for 10 minutes and only once. If you did not ask for it, ignore this email."),
        "hi": ("आपका InternSetu लॉगिन कोड", "आपका InternSetu लॉगिन कोड {c} है। यह 10 मिनट तक और सिर्फ़ एक बार चलेगा। अगर आपने नहीं माँगा, तो इस ईमेल को अनदेखा करें।"),
        "mr": ("तुमचा InternSetu लॉगिन कोड", "तुमचा InternSetu लॉगिन कोड {c} आहे. तो 10 मिनिटे आणि फक्त एकदाच चालेल. तुम्ही मागितला नसेल तर हा ईमेल दुर्लक्षित करा."),
        "bn": ("আপনার InternSetu লগইন কোড", "আপনার InternSetu লগইন কোড {c}। এটি ১০ মিনিট এবং শুধু একবার কাজ করবে। আপনি না চাইলে এই ইমেইল উপেক্ষা করুন।"),
    },
    "delete": {
        "en": ("Confirm deleting your InternSetu account", "Your code to delete your InternSetu account is {c}. It works for 10 minutes and only once. If you did not ask for it, do not share it; your account stays as it is."),
        "hi": ("अपना InternSetu खाता हटाने की पुष्टि करें", "आपका InternSetu खाता हटाने का कोड {c} है। यह 10 मिनट तक और सिर्फ़ एक बार चलेगा। अगर आपने नहीं माँगा, तो इसे किसी को न बताएँ; आपका खाता वैसा ही रहेगा।"),
        "mr": ("तुमचे InternSetu खाते हटवण्याची खात्री करा", "तुमचे InternSetu खाते हटवण्याचा कोड {c} आहे. तो 10 मिनिटे आणि फक्त एकदाच चालेल. तुम्ही मागितला नसेल तर तो कोणाला सांगू नका; तुमचे खाते तसेच राहील."),
        "bn": ("আপনার InternSetu অ্যাকাউন্ট মুছে ফেলা নিশ্চিত করুন", "আপনার InternSetu অ্যাকাউন্ট মোছার কোড {c}। এটি ১০ মিনিট এবং শুধু একবার কাজ করবে। আপনি না চাইলে কাউকে এটি দেবেন না; আপনার অ্যাকাউন্ট যেমন আছে তেমনই থাকবে।"),
    },
}


def kind_code_email(kind: str, code: str, lang: str = "en") -> tuple[str, str]:
    subject, body = _KIND[kind].get(lang, _KIND[kind]["en"])
    return subject, body.format(c=code)
