from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from app.core.database import get_db
from app.core.security import get_current_user
from app.services.recommendation_service import recommendation_service
from app.models.domain import Farm
from sqlalchemy.orm import Session

router = APIRouter()

# Per-user rate limit — AI generation is expensive (Ollama + ChromaDB + weather API)
def _user_key(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        try:
            from jose import jwt
            from app.core.config import settings
            payload = jwt.decode(auth[7:], settings.SECRET_KEY, algorithms=[settings.ALGORITHM], options={"verify_exp": False})
            sub = payload.get("sub")
            if sub:
                return f"user:{sub}"
        except Exception:
            pass
    return request.client.host if request.client else "unknown"

_limiter = Limiter(key_func=_user_key)

@router.get("/{farm_id}")
@_limiter.limit("10/minute")    # 10 générations AI/min par utilisateur
async def get_farm_recommendations(
    request: Request,
    farm_id: int,
    plant: str = "grass",
    db: Session = Depends(get_db),
    current_user = Depends(get_current_user)
):
    farm = db.query(Farm).filter(Farm.id == farm_id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found")

    data = await recommendation_service.generate_recommendations(farm, plant_query=plant)
    return data
