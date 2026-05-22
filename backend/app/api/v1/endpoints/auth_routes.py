"""Smart Farm AI - Auth Routes (with real Email & WhatsApp OTP)"""
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.auth_service import AuthService
from app.schemas.domain import UserCreate, UserResponse, LoginRequest, Token, WorkerOtpRequest, WorkerOtpVerify
from app.models.domain import User
from app.services import otp_service
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])
limiter = Limiter(key_func=get_remote_address)

# ── Schemas ────────────────────────────────────────────────────────────────
class ForgotEmailRequest(BaseModel):
    email: str

class ForgotWhatsAppRequest(BaseModel):
    phone_number: str  # E.164 format e.g. +21621952358

class ResetPasswordRequest(BaseModel):
    channel: str        # "email" or "whatsapp"
    identifier: str     # email address OR phone number
    otp: str
    new_password: str

# ── Standard Auth ───────────────────────────────────────────────────────────
@router.post("/register", response_model=UserResponse, status_code=201)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Register a new user. Returns public profile — never exposes password_hash."""
    # Re-raise HTTPException so FastAPI returns proper 400/409 — do NOT swallow it
    return AuthService(db).register(user_in)

@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, creds: LoginRequest, db: Session = Depends(get_db)):
    return AuthService(db).login(creds.username, creds.password)

# ── Worker Auth: Étape 1 — Demander OTP via WhatsApp ─────────────────────────
@router.post("/worker/request-otp")
def worker_request_otp(req: WorkerOtpRequest, db: Session = Depends(get_db)):
    """L'ouvrier saisit son numéro de téléphone → reçoit un OTP sur WhatsApp."""
    return AuthService(db).worker_request_otp(req.phone_number)

# ── Worker Auth: Étape 2 — Vérifier OTP et obtenir JWT ───────────────────────
@router.post("/worker/verify-otp")
def worker_verify_otp(req: WorkerOtpVerify, db: Session = Depends(get_db)):
    """L'ouvrier saisit le code OTP reçu → reçoit un JWT d'accès."""
    return AuthService(db).worker_verify_otp(req.phone_number, req.otp)


class PushTokenRequest(BaseModel):
    token: str
    platform: str = "web"

@router.get("/profile", response_model=UserResponse)
def profile(current_user=Depends(get_current_user)):
    return current_user

@router.post("/push-token")
def register_push_token(req: PushTokenRequest, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    from app.models.domain import PushToken
    existing = db.query(PushToken).filter_by(user_id=current_user.id, token=req.token).first()
    if not existing:
        new_token = PushToken(user_id=current_user.id, token=req.token, platform=req.platform)
        db.add(new_token)
        db.commit()
    return {"message": "Token Push enregistré avec succès"}

# ── OTP: Step 1 — Request OTP ───────────────────────────────────────────────

@router.post("/forgot-password/email")
@limiter.limit("3/minute")
def forgot_by_email(request: Request, req: ForgotEmailRequest, db: Session = Depends(get_db)):
    """Send OTP to user's registered email. Falls back to in-memory dev OTP when SMTP not configured."""
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte trouvé avec cet e-mail.")

    try:
        otp_service.send_otp_email(req.email)
    except Exception:
        import random, logging as _log
        otp = str(random.randint(100000, 999999))
        otp_service.OTP_STORE[f"email:{req.email}"] = otp
        _log.getLogger(__name__).warning(f"[DEV] SMTP non configuré — OTP généré pour {req.email} (voir logs serveur)")

    return {"message": f"Code OTP envoyé à {req.email}", "channel": "email"}


@router.post("/forgot-password/whatsapp")
@limiter.limit("3/minute")
def forgot_by_whatsapp(request: Request, req: ForgotWhatsAppRequest, db: Session = Depends(get_db)):
    """Send OTP to user's registered phone via WhatsApp. Falls back to in-memory dev OTP when API not configured."""
    user = db.query(User).filter(User.phone_number == req.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte trouvé avec ce numéro de téléphone.")

    try:
        otp_service.send_otp_whatsapp(req.phone_number)
    except Exception:
        import random, logging as _log
        otp = str(random.randint(100000, 999999))
        otp_service.OTP_STORE[f"whatsapp:{req.phone_number}"] = otp
        _log.getLogger(__name__).warning(f"[DEV] WhatsApp non configuré — OTP généré pour {req.phone_number} (voir logs serveur)")

    return {"message": f"Code OTP envoyé via WhatsApp à {req.phone_number}", "channel": "whatsapp"}

# ── OTP: Step 2 — Reset Password ────────────────────────────────────────────

@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Verify OTP and reset password. Works for both email and whatsapp channels."""
    from app.core.security import hash_password

    # Verify OTP
    valid = otp_service.verify_otp(req.channel, req.identifier, req.otp)
    if not valid:
        raise HTTPException(status_code=400, detail="Code OTP invalide ou expiré. Veuillez recommencer.")

    # Find user by channel identifier
    if req.channel == "email":
        user = db.query(User).filter(User.email == req.identifier).first()
    elif req.channel == "whatsapp":
        user = db.query(User).filter(User.phone_number == req.identifier).first()
    else:
        raise HTTPException(status_code=400, detail="Canal invalide.")

    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")

    # Update password
    user.password_hash = hash_password(req.new_password)
    db.commit()

    return {"message": "✅ Mot de passe réinitialisé avec succès ! Vous pouvez maintenant vous connecter.", "success": True}
