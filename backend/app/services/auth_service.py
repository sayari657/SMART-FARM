"""
Smart Farm AI - Auth Service
"""

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from fastapi import HTTPException, status
from app.models.domain import User
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.domain import UserCreate, Token
import random

MOCK_OTP_STORE = {}

class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, user_in: UserCreate) -> User:
        clean_user = user_in.username.strip()
        clean_email = user_in.email.strip() if user_in.email else None

        # Check username
        if self.db.query(User).filter(User.username == clean_user).first():
            raise HTTPException(status_code=400, detail="Ce nom d'utilisateur est déjà utilisé. Choisissez-en un autre.")
        # Check email
        if clean_email and self.db.query(User).filter(User.email == clean_email).first():
            raise HTTPException(status_code=400, detail="Cette adresse e-mail est déjà associée à un compte.")
        user = User(
            username=clean_user,
            email=clean_email,
            phone_number=user_in.phone_number,
            full_name=user_in.full_name,
            password_hash=hash_password(user_in.password),
            role=user_in.role,
        )
        self.db.add(user)
        try:
            self.db.commit()
            self.db.refresh(user)
        except IntegrityError as e:
            self.db.rollback()
            err = str(e.orig).lower()
            if 'email' in err:
                raise HTTPException(status_code=400, detail="Cette adresse e-mail est déjà associée à un compte.")
            if 'phone' in err:
                raise HTTPException(status_code=400, detail="Ce numéro de téléphone est déjà associé à un compte.")
            raise HTTPException(status_code=400, detail="Une erreur de duplication est survenue. Vérifiez vos informations.")
        return user

    def login(self, username: str, password: str) -> Token:
        from sqlalchemy import or_
        clean_username = username.strip()
        user = self.db.query(User).filter(
            or_(User.username == clean_username, User.email == clean_username)
        ).first()
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Identifiant ou mot de passe incorrect",
            )
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive account")
        token = create_access_token({"sub": user.username, "role": user.role})
        return Token(access_token=token)

    def worker_request_otp(self, phone_number: str) -> dict:
        """Étape 1 — Both workers and owners can use the mobile OTP login with their phone number."""
        from app.models.domain import WorkerAssignment
        from app.services import otp_service

        user = self.db.query(User).filter(User.phone_number == phone_number).first()
        if not user:
            raise HTTPException(
                status_code=404,
                detail="Ce numéro n'est pas enregistré. Contactez votre responsable de ferme."
            )

        if user.role == "worker":
            # Workers must be assigned to at least one farm
            assignment = self.db.query(WorkerAssignment).filter(
                WorkerAssignment.worker_id == user.id,
                WorkerAssignment.is_active == True,
            ).first()
            if not assignment:
                raise HTTPException(status_code=403, detail="Aucune ferme assignée. Contactez votre propriétaire.")
        elif user.role != "owner":
            raise HTTPException(status_code=403, detail="Accès non autorisé.")

        # Send OTP (WhatsApp) — dev fallback stores OTP in memory
        try:
            otp_service.send_otp_whatsapp(phone_number)
        except Exception:
            import random as _r, logging as _log
            otp = str(_r.randint(100000, 999999))
            otp_service.OTP_STORE[f"whatsapp:{phone_number}"] = otp
            _log.getLogger(__name__).warning(f"[DEV] WhatsApp non configuré — OTP pour {phone_number} dans OTP_STORE")

        return {"message": f"Code OTP envoyé sur WhatsApp au {phone_number}", "phone": phone_number}

    def worker_verify_otp(self, phone_number: str, otp: str) -> dict:
        """Étape 2 — Verify OTP and return a JWT with the user's actual role."""
        from app.models.domain import WorkerAssignment, FarmOwner
        from app.services import otp_service
        from app.schemas.domain import WorkerLoginResponse

        valid = otp_service.verify_otp("whatsapp", phone_number, otp)
        if not valid:
            raise HTTPException(status_code=400, detail="Code OTP invalide ou expiré. Veuillez réessayer.")

        user = self.db.query(User).filter(User.phone_number == phone_number).first()
        if not user or not user.is_active:
            raise HTTPException(status_code=400, detail="Compte inactif.")

        # Resolve farm_id based on role
        if user.role == "worker":
            assignment = self.db.query(WorkerAssignment).filter(
                WorkerAssignment.worker_id == user.id,
                WorkerAssignment.is_active == True,
            ).first()
            farm_id = assignment.farm_id if assignment else None
        else:
            # Owner — pick the first farm they manage
            ownership = self.db.query(FarmOwner).filter(FarmOwner.owner_id == user.id).first()
            farm_id = ownership.farm_id if ownership else None

        token = create_access_token({"sub": user.username, "role": user.role, "farm_id": farm_id})

        return WorkerLoginResponse(
            access_token=token,
            role=user.role,
            farm_id=farm_id,
            worker_name=user.full_name or user.username,
            phone_number=phone_number,
        )

    def get_profile(self, user: User) -> User:
        return user


    def generate_otp_by_phone(self, phone_number: str) -> str:
        # Find user by phone
        user = self.db.query(User).filter(User.phone_number == phone_number).first()
        if not user:
            raise HTTPException(status_code=404, detail="Numéro de téléphone introuvable.")
        
        # Generate 5-digit OTP
        otp = str(random.randint(10000, 99999))
        MOCK_OTP_STORE[phone_number] = otp
        return otp

    def reset_password_by_phone(self, phone_number: str, otp: str, new_password: str) -> bool:
        user = self.db.query(User).filter(User.phone_number == phone_number).first()
        if not user:
            raise HTTPException(status_code=404, detail="Numéro de téléphone introuvable.")
        
        # Verify OTP
        stored_otp = MOCK_OTP_STORE.get(phone_number)
        if not stored_otp or stored_otp != otp:
            raise HTTPException(status_code=400, detail="Code OTP invalide ou expiré.")
        
        # Update password
        user.password_hash = hash_password(new_password)
        self.db.commit()
        
        # Clear OTP
        del MOCK_OTP_STORE[phone_number]
        return True
