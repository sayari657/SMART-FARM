"""
Smart Farm AI - OTP Notification Service
Supports Email (Gmail SMTP) and WhatsApp (Meta Cloud API)
"""
import secrets
import smtplib
import requests
import logging
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger(__name__)

# OTP_STORE: { key: {"otp": str, "expires": datetime} }
OTP_STORE: dict = {}
OTP_TTL_MINUTES = settings.OTP_TTL_MINUTES


def normalize_msisdn(phone: str) -> str | None:
    """Normalise a phone to E.164 digits (no '+') for the WhatsApp Cloud API.
    Returns None if the number is clearly invalid (so we don't send garbage)."""
    if not phone:
        return None
    digits = "".join(ch for ch in str(phone) if ch.isdigit())
    if digits.startswith("00"):
        digits = digits[2:]
    # Collapse a doubled country code typo, e.g. "216216..." → "216..."
    if digits.startswith("216216"):
        digits = digits[3:]
    # Valid international numbers are ~8–15 digits (E.164 max 15)
    if not (8 <= len(digits) <= 15):
        return None
    return digits


def _generate_otp() -> str:
    return str(secrets.randbelow(900000) + 100000)


def _store_otp(key: str, otp: str) -> None:
    OTP_STORE[key] = {
        "otp": otp,
        "expires": datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
    }


def store_otp(channel: str, identifier: str, otp: str) -> None:
    """Store a development OTP with the same TTL as real delivery channels."""
    _store_otp(f"{channel}:{identifier}", otp)


# ─────────────────────────────────────────────────────────────
# EMAIL OTP via Gmail SMTP
# ─────────────────────────────────────────────────────────────

def send_otp_email(email: str) -> str:
    """Send a real OTP email via Gmail SMTP. Returns the OTP."""
    otp = _generate_otp()
    _store_otp(f"email:{email}", otp)

    if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
        raise RuntimeError("SMTP_EMAIL and SMTP_PASSWORD not configured in .env")

    html_body = f"""
    <div style="font-family: Inter, Arial, sans-serif; max-width: 520px; margin: 0 auto; background: #0f1117; border-radius: 16px; padding: 40px; color: #e5e7eb; border: 1px solid #1f2937;">
      <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 32px;">
        <span style="font-size: 32px;">🌿</span>
        <div>
          <div style="font-size: 20px; font-weight: 800; color: #white;">Smart Farm AI</div>
          <div style="font-size: 12px; color: #6b7280;">Plateforme d'Intelligence Souveraine</div>
        </div>
      </div>

      <h2 style="color: #f9fafb; font-size: 22px; margin: 0 0 12px;">Code de vérification</h2>
      <p style="color: #9ca3af; font-size: 14px; margin-bottom: 28px;">
        Utilisez ce code pour réinitialiser votre mot de passe Smart Farm AI. Il expire dans <strong style="color:#f9fafb;">{OTP_TTL_MINUTES} minutes</strong>.
      </p>

      <div style="background: #1f2937; border: 2px solid #22c55e; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <div style="font-size: 42px; font-weight: 900; letter-spacing: 10px; color: #22c55e; font-family: monospace;">{otp}</div>
      </div>

      <p style="color: #6b7280; font-size: 12px;">
        ⚠️ Ne partagez jamais ce code avec qui que ce soit. L'équipe Smart Farm AI ne vous demandera jamais votre code.
      </p>
      <hr style="border-color: #1f2937; margin: 24px 0;" />
      <p style="color: #4b5563; font-size: 11px; text-align: center;">Smart Farm AI Enterprise Platform — Demande de réinitialisation automatisée</p>
    </div>
    """

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "🔐 Smart Farm AI — Votre code de réinitialisation"
    msg["From"] = f"Smart Farm AI <{settings.SMTP_EMAIL}>"
    msg["To"] = email
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_EMAIL, email, msg.as_string())
        logger.info(f"OTP email sent successfully to {email}")
    except Exception as e:
        logger.error(f"SMTP Error sending to {email}: {e}")
        raise

    return otp


def send_email_alert(to_email: str, title: str, message: str) -> bool:
    """Send a farm alert by email via Gmail SMTP. Real delivery, no Meta limits.
    Best-effort: returns True on success, False otherwise."""
    if not to_email or "@" not in to_email:
        return False
    if not settings.SMTP_EMAIL or not settings.SMTP_PASSWORD:
        logger.warning("SMTP not configured — alert email not sent to %s", to_email)
        return False

    safe_msg = (message or "").replace("\n", "<br/>")
    html_body = f"""
    <div style="font-family: Inter, Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #0f1117; border-radius: 16px; padding: 36px; color: #e5e7eb; border: 1px solid #1f2937;">
      <div style="display:flex; align-items:center; gap:12px; margin-bottom:24px;">
        <span style="font-size:30px;">🚨</span>
        <div>
          <div style="font-size:19px; font-weight:800; color:#fff;">Smart Farm AI — Alerte</div>
          <div style="font-size:12px; color:#6b7280;">Notification automatique</div>
        </div>
      </div>
      <div style="background:#1f2937; border-left:4px solid #ef4444; border-radius:10px; padding:18px 20px; margin-bottom:20px;">
        <div style="font-size:16px; font-weight:800; color:#fca5a5; margin-bottom:8px;">{title}</div>
        <div style="font-size:14px; color:#d1d5db; line-height:1.6;">{safe_msg}</div>
      </div>
      <p style="color:#6b7280; font-size:12px;">Connectez-vous à la plateforme pour traiter cette alerte.</p>
      <hr style="border-color:#1f2937; margin:20px 0;" />
      <p style="color:#4b5563; font-size:11px; text-align:center;">Smart Farm AI Enterprise Platform</p>
    </div>
    """
    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"🚨 Smart Farm AI — {title}"
    msg["From"] = f"Smart Farm AI <{settings.SMTP_EMAIL}>"
    msg["To"] = to_email
    msg.attach(MIMEText(html_body, "html"))
    try:
        with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.login(settings.SMTP_EMAIL, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_EMAIL, to_email, msg.as_string())
        logger.info("Alert email sent to %s", to_email)
        return True
    except Exception as e:
        logger.error("SMTP alert error to %s: %s", to_email, e)
        return False


# ─────────────────────────────────────────────────────────────
# WHATSAPP OTP via Meta Cloud API
# ─────────────────────────────────────────────────────────────

def send_otp_whatsapp(phone: str) -> str:
    """Send a real OTP via WhatsApp (Meta Cloud API v25.0). Returns the OTP."""
    otp = _generate_otp()
    _store_otp(f"whatsapp:{phone}", otp)

    if not settings.WHATSAPP_TOKEN or not settings.WHATSAPP_PHONE_ID:
        raise RuntimeError("WHATSAPP_TOKEN and WHATSAPP_PHONE_ID not configured in .env")

    api_version = getattr(settings, "WHATSAPP_API_VERSION", "v25.0")
    url = f"https://graph.facebook.com/{api_version}/{settings.WHATSAPP_PHONE_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }

    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "template",
        "template": {
            "name": "jaspers_market_order_confirmation_v1",
            "language": {"code": "en_US"},
            "components": [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "text": "Ouvrier Smart Farm"},
                        {"type": "text", "text": otp},
                        {"type": "text", "text": f"Valid for {OTP_TTL_MINUTES} minutes"},
                    ],
                }
            ],
        },
    }

    r = requests.post(url, headers=headers, json=payload, timeout=15)
    if r.status_code not in (200, 201):
        err = r.json().get("error", {})
        logger.error(f"WhatsApp OTP template failed {r.status_code}: {r.text}")
        raise RuntimeError(f"WhatsApp API Error: {err.get('message', r.text)}")

    logger.info(f"OTP WhatsApp sent successfully to {phone}")

    return otp


def send_whatsapp_alert(phone: str, title: str, message: str) -> bool:
    """Send a farm alert over WhatsApp.

    Uses an approved template (WHATSAPP_ALERT_TEMPLATE) when configured — this
    delivers business-initiated messages outside the 24h window. Otherwise falls
    back to free-form text (24h window only).
    """
    msisdn = normalize_msisdn(phone)
    if not msisdn:
        logger.warning("WhatsApp alert skipped — invalid phone number: %r", phone)
        return False

    template = getattr(settings, "WHATSAPP_ALERT_TEMPLATE", "")
    if not template:
        return send_whatsapp_text(msisdn, f"🚨 {title}\n{message}\n\n— Smart Farm AI")

    if not settings.WHATSAPP_TOKEN or not settings.WHATSAPP_PHONE_ID:
        logger.warning("WhatsApp not configured — alert not sent to %s", msisdn)
        return False
    api_version = getattr(settings, "WHATSAPP_API_VERSION", "v25.0")
    lang = getattr(settings, "WHATSAPP_ALERT_TEMPLATE_LANG", "fr")
    url = f"https://graph.facebook.com/{api_version}/{settings.WHATSAPP_PHONE_ID}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": msisdn,
        "type": "template",
        "template": {
            "name": template,
            "language": {"code": lang},
            "components": [{
                "type": "body",
                "parameters": [
                    {"type": "text", "text": title[:120]},
                    {"type": "text", "text": message[:600]},
                ],
            }],
        },
    }
    try:
        r = requests.post(url, headers={
            "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
            "Content-Type": "application/json",
        }, json=payload, timeout=15)
        if r.status_code not in (200, 201):
            logger.error("WhatsApp alert template failed %s → %s: %s", msisdn, r.status_code, r.text)
            # fall back to free-form text (works inside 24h window)
            return send_whatsapp_text(msisdn, f"🚨 {title}\n{message}\n\n— Smart Farm AI")
        logger.info("WhatsApp alert template sent to %s", msisdn)
        return True
    except Exception as exc:
        logger.error("WhatsApp alert error to %s: %s", msisdn, exc)
        return False


def send_whatsapp_text(phone: str, message: str) -> bool:
    """Send a free-form WhatsApp text (Meta Cloud API). Best-effort: returns success.

    Note: free-form text only delivers inside the 24h customer-service window
    (i.e. after the recipient has messaged the business). Outside it, Meta
    requires an approved template — see send_otp_whatsapp for the template form.
    """
    if not settings.WHATSAPP_TOKEN or not settings.WHATSAPP_PHONE_ID:
        logger.warning("WhatsApp not configured — alert text not sent to %s", phone)
        return False
    msisdn = normalize_msisdn(phone)
    if not msisdn:
        logger.warning("WhatsApp text skipped — invalid phone number: %r", phone)
        return False
    phone = msisdn
    api_version = getattr(settings, "WHATSAPP_API_VERSION", "v25.0")
    url = f"https://graph.facebook.com/{api_version}/{settings.WHATSAPP_PHONE_ID}/messages"
    headers = {
        "Authorization": f"Bearer {settings.WHATSAPP_TOKEN}",
        "Content-Type": "application/json",
    }
    payload = {
        "messaging_product": "whatsapp",
        "to": phone,
        "type": "text",
        "text": {"body": message[:4096]},
    }
    try:
        r = requests.post(url, headers=headers, json=payload, timeout=15)
        if r.status_code not in (200, 201):
            logger.error("WhatsApp text failed %s → %s: %s", phone, r.status_code, r.text)
            return False
        logger.info("WhatsApp alert sent to %s", phone)
        return True
    except Exception as exc:
        logger.error("WhatsApp text error to %s: %s", phone, exc)
        return False


# ─────────────────────────────────────────────────────────────
# VERIFY OTP
# ─────────────────────────────────────────────────────────────

def verify_otp(channel: str, identifier: str, otp: str) -> bool:
    """Verify OTP with TTL check. Deletes entry on success or expiry."""
    key = f"{channel}:{identifier}"
    entry = OTP_STORE.get(key)
    if not entry:
        return False
    if datetime.now(timezone.utc) > entry["expires"]:
        del OTP_STORE[key]
        return False
    if entry["otp"] == otp:
        del OTP_STORE[key]
        return True
    return False
