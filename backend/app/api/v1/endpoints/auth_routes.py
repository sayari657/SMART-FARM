"""Smart Farm AI - Auth Routes"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.auth_service import AuthService
from app.schemas.domain import UserCreate, UserResponse, LoginRequest, Token

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=201)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    return AuthService(db).register(user_in)

@router.post("/login", response_model=Token)
def login(creds: LoginRequest, db: Session = Depends(get_db)):
    return AuthService(db).login(creds.username, creds.password)

@router.get("/profile", response_model=UserResponse)
def profile(current_user=Depends(get_current_user)):
    return current_user
