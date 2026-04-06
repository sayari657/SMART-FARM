"""
Smart Farm AI - Auth Service
"""

from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.domain import User
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.domain import UserCreate, Token


class AuthService:
    def __init__(self, db: Session):
        self.db = db

    def register(self, user_in: UserCreate) -> User:
        if self.db.query(User).filter(User.username == user_in.username).first():
            raise HTTPException(status_code=400, detail="Username already registered")
        user = User(
            username=user_in.username,
            email=user_in.email,
            full_name=user_in.full_name,
            password_hash=hash_password(user_in.password),
            role=user_in.role,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)
        return user

    def login(self, username: str, password: str) -> Token:
        user = self.db.query(User).filter(User.username == username).first()
        if not user or not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
            )
        if not user.is_active:
            raise HTTPException(status_code=400, detail="Inactive account")
        token = create_access_token({"sub": user.username, "role": user.role})
        return Token(access_token=token)

    def get_profile(self, user: User) -> User:
        return user
