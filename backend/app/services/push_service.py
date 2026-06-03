"""
FCM Push Notification Service
================================
Sends push notifications to all registered devices of a user (or broadcast).
Uses Firebase Cloud Messaging v1 API (HTTP).
Falls back to no-op when FCM_SERVER_KEY is not configured.
"""
import logging
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger(__name__)

FCM_URL = "https://fcm.googleapis.com/fcm/send"


def _headers():
    return {
        "Authorization": f"key={settings.FCM_SERVER_KEY}",
        "Content-Type": "application/json",
    }


def send_to_user(
    db: Session,
    user_id: int,
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> int:
    """Send notification to all devices of a single user. Returns count sent."""
    if not settings.FCM_SERVER_KEY:
        logger.debug("FCM_SERVER_KEY not set — push skipped for user %s", user_id)
        return 0

    from app.models.domain import PushToken
    tokens = db.query(PushToken).filter(PushToken.user_id == user_id).all()
    if not tokens:
        return 0

    sent = 0
    for pt in tokens:
        try:
            payload = {
                "to": pt.token,
                "notification": {"title": title, "body": body},
                "data": data or {},
            }
            r = httpx.post(FCM_URL, json=payload, headers=_headers(), timeout=8)
            if r.status_code == 200:
                sent += 1
            else:
                logger.warning("FCM error %s for token %s: %s", r.status_code, pt.token[:20], r.text)
        except Exception as e:
            logger.warning("FCM send failed: %s", e)
    return sent


def broadcast_push(
    db: Session,
    title: str,
    body: str,
    target: str = "all",  # all | owner | worker
    data: Optional[dict] = None,
) -> int:
    """Send notification to all users (or filtered by role). Returns count sent."""
    if not settings.FCM_SERVER_KEY:
        return 0

    from app.models.domain import PushToken, User
    q = db.query(PushToken)
    if target != "all":
        q = q.join(User, User.id == PushToken.user_id).filter(User.role == target)

    tokens = [pt.token for pt in q.all()]
    if not tokens:
        return 0

    # FCM supports up to 1000 tokens per multicast
    sent = 0
    for i in range(0, len(tokens), 1000):
        chunk = tokens[i:i + 1000]
        try:
            payload = {
                "registration_ids": chunk,
                "notification": {"title": title, "body": body},
                "data": data or {},
            }
            r = httpx.post(FCM_URL, json=payload, headers=_headers(), timeout=10)
            if r.status_code == 200:
                result = r.json()
                sent += result.get("success", 0)
            else:
                logger.warning("FCM broadcast error %s: %s", r.status_code, r.text)
        except Exception as e:
            logger.warning("FCM broadcast failed: %s", e)
    return sent


def notify_alert(db: Session, farm_id: int, alert_title: str, alert_body: str):
    """Notify the farm owner when a critical alert is triggered."""
    from app.models.domain import Farm
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if farm and farm.owner_id:
        send_to_user(db, farm.owner_id, f"🚨 {alert_title}", alert_body, {"farm_id": str(farm_id)})
