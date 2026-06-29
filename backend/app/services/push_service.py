"""
Smart Farm AI — Push Notification Service
==========================================
Supports two push backends:
  1. Web Push (VAPID) — for PWA browsers, preferred
  2. FCM legacy       — fallback for native apps

VAPID keys: the public key is embedded below (safe to expose, the frontend
needs it). The PRIVATE key must only live in .env (VAPID_PRIVATE_KEY) —
Web Push is disabled when it is not configured.
"""
import json
import logging
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)

# ── VAPID / Web Push ───────────────────────────────────────────────────────
VAPID_PUBLIC_KEY  = "BL8D_5v7d_GmIvbSQkRjRXgwdmZq1u_vSfKsOjcGv-uwyeoN2T0-ODqSXZN5J1VF6bcoHVLlHNa91HsUZQjO1fI"
VAPID_PRIVATE_KEY = getattr(settings, "VAPID_PRIVATE_KEY", "")
VAPID_EMAIL       = getattr(settings, "VAPID_EMAIL", "")

# ── FCM legacy ─────────────────────────────────────────────────────────────
FCM_URL = "https://fcm.googleapis.com/fcm/send"


def _send_webpush(subscription_json: str, title: str, body: str, data: Optional[dict] = None) -> bool:
    """Send a Web Push notification to a single VAPID subscription."""
    if not VAPID_PRIVATE_KEY:
        logger.warning("Web Push disabled — VAPID_PRIVATE_KEY not configured in .env")
        return False
    try:
        from pywebpush import webpush, WebPushException
        sub = json.loads(subscription_json)
        webpush(
            subscription_info=sub,
            data=json.dumps({"title": title, "body": body, "data": data or {}}),
            vapid_private_key=VAPID_PRIVATE_KEY,
            vapid_claims={"sub": f"mailto:{VAPID_EMAIL}"},
        )
        return True
    except Exception as e:
        logger.warning("Web Push failed: %s", e)
        return False


def _send_fcm(token: str, title: str, body: str, data: Optional[dict] = None) -> bool:
    """Send via FCM legacy API."""
    if not getattr(settings, "FCM_SERVER_KEY", ""):
        return False
    try:
        payload = {
            "to": token,
            "notification": {"title": title, "body": body},
            "data": data or {},
        }
        r = httpx.post(
            FCM_URL,
            json=payload,
            headers={"Authorization": f"key={settings.FCM_SERVER_KEY}", "Content-Type": "application/json"},
            timeout=8,
        )
        return r.status_code == 200
    except Exception as e:
        logger.warning("FCM send failed: %s", e)
        return False


def _dispatch(token: str, platform: str, title: str, body: str, data: Optional[dict] = None) -> bool:
    """Route to Web Push or FCM based on token type."""
    if platform == "web-push" or token.startswith("{"):
        # JSON subscription object → Web Push
        return _send_webpush(token, title, body, data)
    else:
        # FCM registration token
        return _send_fcm(token, title, body, data)


# ── Public API ──────────────────────────────────────────────────────────────

def send_to_user(db: Session, user_id: int, title: str, body: str, data: Optional[dict] = None, email: bool = True) -> int:
    """Send notification to all devices of a single user (push + email). Returns push count sent.

    `email=True` (default) also delivers the same notification to the user's email
    (Gmail SMTP), so every notification the app sends is mirrored by email. Pass
    `email=False` when the caller already sends the email itself (avoids duplicates).
    """
    from app.models.domain import PushToken
    tokens = db.query(PushToken).filter(PushToken.user_id == user_id).all()
    sent = sum(1 for pt in tokens if _dispatch(pt.token, pt.platform or "fcm", title, body, data))
    logger.debug("push send_to_user %s → %d/%d sent", user_id, sent, len(tokens))

    if email:
        try:
            from app.models.domain import User
            from app.services.otp_service import send_email_alert
            u = db.query(User).filter(User.id == user_id).first()
            if u and getattr(u, "email", None):
                send_email_alert(u.email, title, body)
        except Exception as exc:
            logger.warning("Notification email to user %s failed: %s", user_id, exc)

    return sent


def broadcast_push(db: Session, title: str, body: str, target: str = "all", data: Optional[dict] = None) -> int:
    """Send notification to all users (or filtered by role). Returns count sent."""
    from app.models.domain import PushToken, User
    q = db.query(PushToken)
    if target != "all":
        q = q.join(User, User.id == PushToken.user_id).filter(User.role == target)
    tokens = q.all()
    sent = sum(1 for pt in tokens if _dispatch(pt.token, pt.platform or "fcm", title, body, data))
    logger.info("push broadcast target=%s → %d/%d sent", target, sent, len(tokens))

    # Mirror the broadcast by email to every targeted user (best-effort)
    try:
        from app.services.otp_service import send_email_alert
        uq = db.query(User)
        if target != "all":
            uq = uq.filter(User.role == target)
        emailed = 0
        for u in uq.all():
            if getattr(u, "email", None) and send_email_alert(u.email, title, body):
                emailed += 1
        logger.info("broadcast email target=%s → %d emails", target, emailed)
    except Exception as exc:
        logger.warning("Broadcast email failed: %s", exc)

    return sent


def notify_alert(db: Session, farm_id: int, alert_title: str, alert_body: str):
    """Notify the farm owner when a critical alert is triggered."""
    from app.models.domain import Farm
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if farm and farm.owner_id:
        send_to_user(
            db, farm.owner_id,
            f"🚨 {alert_title}", alert_body,
            {"farm_id": str(farm_id), "url": "/alerts"},
        )
