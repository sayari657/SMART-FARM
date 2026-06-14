"""
Alert dispatch — notify the people attached to a farm.

Sends an alert to the farm OWNER and the WORKERS assigned to that farm,
over WhatsApp (free-form text) and Web Push, best-effort per recipient.
"""
import logging
from typing import List, Dict

from sqlalchemy.orm import Session

from app.models.domain import Farm, User, WorkerAssignment
from app.services.otp_service import send_whatsapp_alert, send_email_alert
from app.services.push_service import send_to_user
from app.services.telegram_service import send_telegram_message, is_configured as telegram_configured

logger = logging.getLogger(__name__)

_TARGETS = ("all", "owner", "workers")


def get_farm_recipients(db: Session, farm_id: int, target: str = "all") -> List[User]:
    """Resolve the User rows to notify for a farm (deduplicated)."""
    if target not in _TARGETS:
        target = "all"
    recipients: List[User] = []

    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if farm and target in ("all", "owner") and farm.owner_id:
        owner = db.query(User).filter(User.id == farm.owner_id).first()
        if owner:
            recipients.append(owner)

    if target in ("all", "workers"):
        workers = (
            db.query(User)
            .join(WorkerAssignment, WorkerAssignment.worker_id == User.id)
            .filter(WorkerAssignment.farm_id == farm_id,
                    WorkerAssignment.is_active == True)  # noqa: E712
            .all()
        )
        recipients.extend(workers)

    # Deduplicate by user id, preserve order
    seen, unique = set(), []
    for u in recipients:
        if u.id not in seen:
            seen.add(u.id)
            unique.append(u)
    return unique


def notify_farm_alert(
    db: Session,
    farm_id: int,
    title: str,
    message: str,
    target: str = "all",
    sent_by: str = "system",
) -> Dict:
    """Dispatch an alert to a farm's owner + assigned workers via WhatsApp + push."""
    recipients = get_farm_recipients(db, farm_id, target)

    results = []
    for u in recipients:
        whatsapp_ok = False
        email_ok = False
        push_count = 0
        if u.phone_number:
            whatsapp_ok = send_whatsapp_alert(u.phone_number, title, message)
        # Email — real, free, no Meta limits (Gmail SMTP already used for OTP)
        if getattr(u, "email", None):
            email_ok = send_email_alert(u.email, title, message)
        try:
            push_count = send_to_user(db, u.id, f"🚨 {title}", message, {"type": "alert", "farm_id": farm_id})
        except Exception as exc:
            logger.warning("Push to user %s failed: %s", u.id, exc)
        results.append({
            "user_id": u.id,
            "name": u.full_name or u.username,
            "role": u.role,
            "phone": u.phone_number,
            "email": getattr(u, "email", None),
            "whatsapp_sent": whatsapp_ok,
            "email_sent": email_ok,
            "push_devices": push_count,
        })

    # Telegram broadcast to the farm group/channel (no 24h window limit)
    telegram_sent = False
    if telegram_configured():
        telegram_sent = send_telegram_message(f"🚨 <b>{title}</b>\n{message}\n\n— Smart Farm AI")

    sent_wa = sum(1 for r in results if r["whatsapp_sent"])
    sent_email = sum(1 for r in results if r["email_sent"])
    logger.info("Alert '%s' by %s → farm %s: %d recipients, %d WhatsApp, %d email, telegram=%s",
                title, sent_by, farm_id, len(results), sent_wa, sent_email, telegram_sent)
    return {
        "farm_id": farm_id,
        "target": target,
        "recipients": len(results),
        "whatsapp_sent": sent_wa,
        "email_sent": sent_email,
        "telegram_sent": telegram_sent,
        "results": results,
    }
