"""
2FA TOTP — Google Authenticator compatible
===========================================
Endpoints :
  POST /auth/2fa/setup      → génère secret + QR code URI (superadmin only)
  POST /auth/2fa/verify     → vérifie le code 6 chiffres + active 2FA
  POST /auth/2fa/disable    → désactive 2FA (avec password confirmation)
  POST /auth/2fa/validate   → vérifie lors du login (avant d'émettre le token final)
"""
import base64
import io
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import Column, String, Boolean
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, verify_password
from app.models.domain import User

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth/2fa", tags=["2FA TOTP"])

# ── Add TOTP columns lazily (SQLite safe) ─────────────────────────────────────

def _ensure_columns(db: Session):
    from sqlalchemy import text, inspect
    insp = inspect(db.bind)
    cols = [c["name"] for c in insp.get_columns("users")]
    with db.bind.connect() as conn:
        if "totp_secret" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN totp_secret VARCHAR(64)"))
            conn.commit()
        if "totp_enabled" not in cols:
            conn.execute(text("ALTER TABLE users ADD COLUMN totp_enabled BOOLEAN DEFAULT 0"))
            conn.commit()


# ── Schemas ───────────────────────────────────────────────────────────────────

class TOTPVerify(BaseModel):
    code: str  # 6-digit TOTP code

class TOTPDisable(BaseModel):
    password: str
    code: str

class TOTPValidate(BaseModel):
    username: str
    code: str


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_totp_lib():
    try:
        import pyotp
        return pyotp
    except ImportError:
        raise HTTPException(500, "pyotp not installed. Run: pip install pyotp")


def _qr_data_uri(secret: str, username: str) -> str:
    """Return base64 PNG data URI for QR code (requires qrcode lib)."""
    from app.core.config import settings
    pyotp = _get_totp_lib()
    uri = pyotp.totp.TOTP(secret).provisioning_uri(
        name=username, issuer_name=settings.TOTP_ISSUER
    )
    try:
        import qrcode
        img = qrcode.make(uri)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        b64 = base64.b64encode(buf.getvalue()).decode()
        return f"data:image/png;base64,{b64}"
    except ImportError:
        return uri  # fallback: return raw URI if qrcode not installed


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("/setup")
def setup_totp(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Generate a new TOTP secret for the current user. Returns QR code."""
    _ensure_columns(db)
    pyotp = _get_totp_lib()

    secret = pyotp.random_base32()

    # Store temporarily (not yet enabled)
    db.execute(
        __import__("sqlalchemy").text("UPDATE users SET totp_secret=:s WHERE id=:id"),
        {"s": secret, "id": current_user.id},
    )
    db.commit()

    qr = _qr_data_uri(secret, current_user.username)
    return {
        "secret": secret,
        "qr_code": qr,
        "message": "Scannez le QR code avec Google Authenticator, puis appelez /verify.",
    }


@router.post("/verify")
def verify_totp(
    body: TOTPVerify,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Verify the 6-digit code and enable 2FA for the account."""
    _ensure_columns(db)
    pyotp = _get_totp_lib()

    row = db.execute(
        __import__("sqlalchemy").text("SELECT totp_secret FROM users WHERE id=:id"),
        {"id": current_user.id},
    ).fetchone()

    if not row or not row[0]:
        raise HTTPException(400, "Aucun secret TOTP configuré. Appelez /setup d'abord.")

    totp = pyotp.TOTP(row[0])
    if not totp.verify(body.code.strip(), valid_window=1):
        raise HTTPException(400, "Code invalide ou expiré.")

    db.execute(
        __import__("sqlalchemy").text("UPDATE users SET totp_enabled=1 WHERE id=:id"),
        {"id": current_user.id},
    )
    db.commit()
    return {"ok": True, "message": "2FA activée avec succès."}


@router.post("/disable")
def disable_totp(
    body: TOTPDisable,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Disable 2FA — requires password + current TOTP code."""
    _ensure_columns(db)
    pyotp = _get_totp_lib()

    if not verify_password(body.password, current_user.password_hash):
        raise HTTPException(400, "Mot de passe incorrect.")

    row = db.execute(
        __import__("sqlalchemy").text("SELECT totp_secret, totp_enabled FROM users WHERE id=:id"),
        {"id": current_user.id},
    ).fetchone()

    if not row or not row[1]:
        raise HTTPException(400, "2FA n'est pas activée.")

    totp = pyotp.TOTP(row[0])
    if not totp.verify(body.code.strip(), valid_window=1):
        raise HTTPException(400, "Code TOTP invalide.")

    db.execute(
        __import__("sqlalchemy").text("UPDATE users SET totp_enabled=0, totp_secret=NULL WHERE id=:id"),
        {"id": current_user.id},
    )
    db.commit()
    return {"ok": True, "message": "2FA désactivée."}


@router.post("/validate")
def validate_totp_login(body: TOTPValidate, db: Session = Depends(get_db)):
    """
    Called after password auth succeeds.
    Returns {ok: true} if code valid (or 2FA not enabled).
    """
    _ensure_columns(db)
    pyotp = _get_totp_lib()

    from app.models.domain import User as UserModel
    user = db.query(UserModel).filter(UserModel.username == body.username).first()
    if not user:
        raise HTTPException(404, "User not found")

    row = db.execute(
        __import__("sqlalchemy").text("SELECT totp_secret, totp_enabled FROM users WHERE id=:id"),
        {"id": user.id},
    ).fetchone()

    if not row or not row[1]:
        return {"ok": True, "required": False}

    totp = pyotp.TOTP(row[0])
    if not totp.verify(body.code.strip(), valid_window=1):
        raise HTTPException(400, "Code 2FA invalide.")

    return {"ok": True, "required": True}


@router.get("/status")
def totp_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Return whether 2FA is enabled for the current user."""
    _ensure_columns(db)
    row = db.execute(
        __import__("sqlalchemy").text("SELECT totp_enabled FROM users WHERE id=:id"),
        {"id": current_user.id},
    ).fetchone()
    enabled = bool(row[0]) if row else False
    return {"totp_enabled": enabled, "user": current_user.username}
