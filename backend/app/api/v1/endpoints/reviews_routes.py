"""Smart Farm AI — Public reviews / testimonials (landing page star ratings).

Public endpoints (no auth): visitors submit a 1–5 star review and the landing
page lists recent approved reviews with the average rating.
"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.domain import Review

router = APIRouter(prefix="/reviews", tags=["Reviews"])

MAX_NAME = 80
MAX_ROLE = 80
MAX_COMMENT = 600


def _ser(r: Review) -> dict:
    return {
        "id": r.id,
        "rating": r.rating,
        "name": r.name or "Anonyme",
        "role": r.role,
        "comment": r.comment,
        "created_at": r.created_at.isoformat() if r.created_at else None,
    }


@router.get("")
def list_reviews(db: Session = Depends(get_db), limit: int = 50):
    """Recent approved reviews + aggregate average and count."""
    limit = max(1, min(int(limit or 50), 100))
    rows = (
        db.query(Review)
        .filter(Review.approved.is_(True))
        .order_by(Review.created_at.desc())
        .limit(limit)
        .all()
    )
    total = db.query(Review).filter(Review.approved.is_(True)).count()
    avg = (
        db.query(Review).filter(Review.approved.is_(True))
        .with_entities(Review.rating).all()
    )
    average = round(sum(a[0] for a in avg) / len(avg), 1) if avg else 0.0
    return {"items": [_ser(r) for r in rows], "count": total, "average": average}


@router.post("", status_code=201)
def create_review(data: dict, db: Session = Depends(get_db)):
    """Submit a public review. Rating is required (1–5)."""
    try:
        rating = int(data.get("rating"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=422, detail="Note invalide.")
    if rating < 1 or rating > 5:
        raise HTTPException(status_code=422, detail="La note doit être entre 1 et 5.")

    def _clean(v, n):
        if not v:
            return None
        s = str(v).strip()
        return s[:n] if s else None

    review = Review(
        rating=rating,
        name=_clean(data.get("name"), MAX_NAME),
        role=_clean(data.get("role"), MAX_ROLE),
        comment=_clean(data.get("comment"), MAX_COMMENT),
        approved=True,
    )
    db.add(review)
    db.commit()
    db.refresh(review)
    return _ser(review)
