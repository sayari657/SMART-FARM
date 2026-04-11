"""Smart Farm AI - Auth Routes (with real Email & WhatsApp OTP)"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.auth_service import AuthService
from app.schemas.domain import UserCreate, UserResponse, LoginRequest, Token
from app.models.domain import User
from app.services import otp_service
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])

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
    return AuthService(db).register(user_in)

@router.post("/login", response_model=Token)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    return AuthService(db).login(creds.username, creds.password)

@router.get("/profile", response_model=UserResponse)
def profile(current_user=Depends(get_current_user)):
    return current_user

# ── OTP: Step 1 — Request OTP ───────────────────────────────────────────────

@router.post("/forgot-password/email")
def forgot_by_email(req: ForgotEmailRequest, db: Session = Depends(get_db)):
    """Send OTP to user's registered email via Gmail SMTP."""
    # Verify the email exists in db
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte trouvé avec cet e-mail.")
    try:
        otp_service.send_otp_email(req.email)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'envoi email : {str(e)}")
    return {"message": f"Code OTP envoyé à {req.email}", "channel": "email"}

@router.post("/forgot-password/whatsapp")
def forgot_by_whatsapp(req: ForgotWhatsAppRequest, db: Session = Depends(get_db)):
    """Send OTP to user's registered phone via WhatsApp (Meta Cloud API)."""
    user = db.query(User).filter(User.phone_number == req.phone_number).first()
    if not user:
        raise HTTPException(status_code=404, detail="Aucun compte trouvé avec ce numéro de téléphone.")
    try:
        otp_service.send_otp_whatsapp(req.phone_number)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur d'envoi WhatsApp : {str(e)}")
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
