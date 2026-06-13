"""
Telegram Bot notifications.

Unlike WhatsApp free-form text (24h customer-service window), Telegram delivers
business-initiated messages at any time — ideal for farm alerts. Set up:
  1. Create a bot via @BotFather → TELEGRAM_BOT_TOKEN
  2. Add the bot to a farm group, or have each worker /start it
  3. Set TELEGRAM_CHAT_ID (group id) for broadcast, or pass chat_id per user
"""
import logging

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)


def is_configured() -> bool:
    return bool(settings.TELEGRAM_BOT_TOKEN)


def send_telegram_message(text: str, chat_id: str = None) -> bool:
    """Send a Telegram message (best-effort). Falls back to TELEGRAM_CHAT_ID."""
    token = settings.TELEGRAM_BOT_TOKEN
    target = chat_id or settings.TELEGRAM_CHAT_ID
    if not token or not target:
        logger.info("Telegram not configured — message not sent")
        return False
    try:
        r = requests.post(
            f"https://api.telegram.org/bot{token}/sendMessage",
            json={"chat_id": target, "text": text[:4096], "parse_mode": "HTML"},
            timeout=12,
        )
        if r.status_code != 200:
            logger.error("Telegram send failed %s: %s", r.status_code, r.text)
            return False
        return True
    except Exception as exc:
        logger.error("Telegram send error: %s", exc)
        return False
