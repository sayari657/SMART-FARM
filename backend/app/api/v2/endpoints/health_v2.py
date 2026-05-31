from fastapi import APIRouter
from datetime import datetime

router = APIRouter()


@router.get("/health", tags=["Health v2"])
def health_v2():
    return {
        "data": {"status": "ok", "version": "2.0.0", "api": "v2"},
        "meta": {"timestamp": datetime.utcnow().isoformat()},
        "errors": [],
    }
