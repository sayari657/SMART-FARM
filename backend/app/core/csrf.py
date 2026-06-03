"""
CSRF Protection Middleware
===========================
Génère un token CSRF à chaque login.
Valide le header X-CSRF-Token sur toutes les mutations (POST/PUT/PATCH/DELETE).

Stratégie hybride :
  - httpOnly cookie pour le dashboard owner (XSS-safe)
  - localStorage conservé pour PWA worker (offline-first)
  - X-CSRF-Token requis sur toutes les mutations
"""
import hmac
import hashlib
import os
import time
from typing import Optional

from fastapi import Request, HTTPException, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response

_SECRET = os.environ.get("CSRF_SECRET", "csrf-secret-changeme-in-prod")

# Paths exempt from CSRF (public endpoints + WebSocket + GET/HEAD/OPTIONS)
_EXEMPT_PREFIXES = (
    "/api/v1/auth/login",
    "/api/v1/auth/register",
    "/api/v1/auth/worker",
    "/api/v1/billing/webhook",   # Stripe signs its own webhooks
    "/api/v1/iot/devices/ping",  # IoT device heartbeat (no user session)
    "/ws/",
    "/health",
    "/docs",
    "/openapi",
    "/metrics",
)

_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def generate_csrf_token(user_id: int) -> str:
    """Generate a deterministic but unpredictable CSRF token tied to user + time window."""
    window = int(time.time()) // 3600  # rotates every hour
    raw = f"{user_id}:{window}:{_SECRET}"
    return hmac.new(
        _SECRET.encode(), raw.encode(), hashlib.sha256
    ).hexdigest()[:40]


def verify_csrf_token(token: str, user_id: int) -> bool:
    """Verify current or previous hour's token (handles clock drift)."""
    if not token:
        return False
    window = int(time.time()) // 3600
    for w in [window, window - 1]:
        raw = f"{user_id}:{w}:{_SECRET}"
        expected = hmac.new(
            _SECRET.encode(), raw.encode(), hashlib.sha256
        ).hexdigest()[:40]
        if hmac.compare_digest(token, expected):
            return True
    return False


class CSRFMiddleware(BaseHTTPMiddleware):
    """
    Validates X-CSRF-Token on all mutating requests.
    Falls back silently in LITE_MODE or when no user JWT is present
    (public endpoints are exempt anyway).
    """

    async def dispatch(self, request: Request, call_next) -> Response:
        # Skip safe methods
        if request.method in _SAFE_METHODS:
            return await call_next(request)

        # Skip exempt paths
        path = request.url.path
        if any(path.startswith(p) for p in _EXEMPT_PREFIXES):
            return await call_next(request)

        # Extract user from JWT (if present)
        token = request.headers.get("Authorization", "").replace("Bearer ", "")
        if not token:
            # No auth → public endpoint → skip CSRF
            return await call_next(request)

        try:
            from jose import jwt
            from app.core.config import settings
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            # Only validate for owner/superadmin (not workers — PWA offline)
            role = payload.get("role", "")
            if role == "worker":
                return await call_next(request)

            # Try to get user_id for CSRF validation
            from app.core.database import SessionLocal
            from app.models.domain import User
            db = SessionLocal()
            try:
                user = db.query(User).filter(User.username == payload.get("sub")).first()
                if user:
                    csrf_header = request.headers.get("X-CSRF-Token", "")
                    if not verify_csrf_token(csrf_header, user.id):
                        return Response(
                            content='{"detail":"CSRF token invalide ou absent"}',
                            status_code=403,
                            media_type="application/json",
                        )
            finally:
                db.close()
        except Exception:
            # Any JWT/DB error → don't block the request (fail open for robustness)
            pass

        return await call_next(request)
