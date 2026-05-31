"""CV v2 — enriched detections with pagination and unified envelope."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.domain import CVEvent

router = APIRouter()


def _envelope(data, total: int, page: int, per_page: int):
    return {
        "data": data,
        "meta": {
            "total":    total,
            "page":     page,
            "per_page": per_page,
            "pages":    (total + per_page - 1) // per_page,
            "timestamp": datetime.utcnow().isoformat(),
        },
        "errors": [],
    }


@router.get("/events", summary="CV events — paginated + multi-category filter")
def list_cv_events_v2(
    page:       int   = Query(1, ge=1),
    per_page:   int   = Query(20, ge=1, le=100),
    category:   str   = Query(None, description="Filter by camera_id"),
    min_conf:   float = Query(0.0, ge=0.0, le=1.0),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(CVEvent)
    if category:
        q = q.filter(CVEvent.camera_id == category)
    if min_conf > 0:
        q = q.filter(CVEvent.confidence >= min_conf)

    total  = q.count()
    events = q.order_by(CVEvent.timestamp.desc()).offset((page - 1) * per_page).limit(per_page).all()

    data = [{
        "id":           e.id,
        "unit_id":      e.unit_id,
        "camera_id":    e.camera_id,
        "object_class": e.object_class,
        "confidence":   e.confidence,
        "severity":     e.severity,
        "timestamp":    e.timestamp.isoformat() if e.timestamp else None,
    } for e in events]

    return _envelope(data, total, page, per_page)


@router.get("/stats", summary="CV detection statistics by category")
def cv_stats_v2(
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    rows = (
        db.query(CVEvent.camera_id, func.count(CVEvent.id), func.avg(CVEvent.confidence))
        .group_by(CVEvent.camera_id)
        .all()
    )
    data = [{"category": r[0], "count": r[1], "avg_confidence": round(float(r[2] or 0), 3)} for r in rows]
    return _envelope(data, len(data), 1, len(data))
