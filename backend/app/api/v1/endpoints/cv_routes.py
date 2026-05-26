"""Smart Farm AI - CV Event Routes"""
import os
import io
import logging
import time
import asyncio
from datetime import datetime, timedelta, timezone
from PIL import Image
from typing import Optional

from fastapi import APIRouter, Depends, Query, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

# Absolute Imports
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.services.data_service import CVService
from app.schemas.domain import CVEventCreate, AlertCreate

try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cv", tags=["Computer Vision"])

# -- Global Inference Lock --
inference_lock = asyncio.Lock()

# ── Model Registry ────────────────────────────────────────────────────────────
MODEL_REGISTRY = {
    "bee":      settings.YOLO_BEE_PATH,
    "goat":     settings.YOLO_GOAT_PATH,
    "cow":      settings.YOLO_COW_PATH,
    "sheep":    settings.YOLO_SHEEP_PATH,
    "livestock": settings.YOLO_GOAT_PATH,
    "leaves":   settings.YOLO_LEAVES_PATH,
    "olive":    settings.YOLO_OLIVE_PATH,
    "insects":  settings.YOLO_INSECTS_PATH,
    "lemon":    settings.YOLO_LEMON_PATH,
    "orange":   settings.YOLO_ORANGE_PATH,
    "fire":     settings.YOLO_FIRE_PATH,
    "plants":   settings.YOLO_LEAVES_PATH,
}

_models = {}

def get_yolo_model(category: str = "bee"):
    global _models
    if not HAS_YOLO:
        return None
    key = category.lower()
    if any(k in key for k in ["cow", "goat", "sheep"]):
        key = "livestock"

    path = MODEL_REGISTRY.get(key, MODEL_REGISTRY["bee"])

    if key not in _models:
        if os.path.exists(path):
            try:
                _models[key] = YOLO(path)
                logger.info(f"Loaded YOLO model for {key} from {path}")
            except Exception as e:
                logger.error(f"Failed to load model {key}: {e}")
                return None
        else:
            logger.error(f"Model not found for {key} at {path}")
            return None
    return _models[key]

def _serialize(e):
    return {
        "id": e.id, "unit_id": e.unit_id,
        "timestamp": e.timestamp.isoformat() if e.timestamp else None,
        "object_class": e.object_class, "confidence": e.confidence,
        "severity": e.severity, "thumbnail_url": e.thumbnail_url,
        "frame_metadata": e.frame_metadata, "camera_id": e.camera_id,
        "unit_name": e.unit.name if e.unit else None,
    }

@router.get("/events")
def get_recent(limit: int = Query(50, le=200), db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_serialize(e) for e in CVService(db).get_recent(limit=limit)]

@router.get("/events/{unit_id}")
def get_by_unit(unit_id: int, limit: int = Query(100, le=500), db: Session = Depends(get_db), _=Depends(get_current_user)):
    return [_serialize(e) for e in CVService(db).get_by_unit(unit_id, limit=limit)]

@router.post("/events", status_code=201)
def ingest(data: CVEventCreate, db: Session = Depends(get_db), _=Depends(get_current_user)):
    e = CVService(db).ingest(data)
    return {"id": e.id, "unit_id": e.unit_id, "object_class": e.object_class}

@router.delete("/events/{event_id}", status_code=204)
def delete_event(event_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    from app.models.domain import CVEvent
    db.query(CVEvent).filter(CVEvent.id == event_id).delete()
    db.commit()

@router.delete("/events", status_code=200)
def purge_events(
    ids: str = Query(None, description="Comma-separated event IDs to delete"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    """Bulk delete CV events by ID list, or all if no ids provided."""
    from app.models.domain import CVEvent
    q = db.query(CVEvent)
    if ids:
        id_list = [int(i) for i in ids.split(',') if i.strip().isdigit()]
        q = q.filter(CVEvent.id.in_(id_list))
    count = q.count()
    q.delete(synchronize_session=False)
    db.commit()
    return {"deleted": count}

@router.get("/stats/drift")
def model_drift_stats(
    days: int = Query(7, le=30),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    """
    MLOps drift detection: compare confidence distribution of the last N days
    vs the previous N days for each model category.
    A mean drop > 10pp or std increase > 50% flags a drift warning.
    """
    from app.models.domain import CVEvent
    from sqlalchemy import func
    now = datetime.now(timezone.utc)
    window_end   = now
    window_start = now - timedelta(days=days)
    prev_end     = window_start
    prev_start   = now - timedelta(days=days * 2)

    categories = db.query(CVEvent.camera_id).distinct().all()
    results = {}

    for (cat,) in categories:
        if not cat:
            continue

        def _stats(start, end):
            rows = db.query(
                func.avg(CVEvent.confidence).label("mean"),
                func.count(CVEvent.id).label("count"),
            ).filter(
                CVEvent.camera_id == cat,
                CVEvent.confidence.isnot(None),
                CVEvent.timestamp >= start,
                CVEvent.timestamp < end,
            ).first()
            mean  = round(float(rows.mean or 0) * 100, 2)
            count = rows.count or 0

            vals = [
                r[0] for r in db.query(CVEvent.confidence).filter(
                    CVEvent.camera_id == cat,
                    CVEvent.confidence.isnot(None),
                    CVEvent.timestamp >= start,
                    CVEvent.timestamp < end,
                ).all()
            ]
            if len(vals) > 1:
                import statistics
                std = round(statistics.stdev(vals) * 100, 2)
            else:
                std = 0.0
            return {"mean_pct": mean, "std_pct": std, "count": count}

        current  = _stats(window_start, window_end)
        previous = _stats(prev_start, prev_end)

        mean_delta = previous["mean_pct"] - current["mean_pct"]
        std_delta  = (current["std_pct"] - previous["std_pct"]) if previous["std_pct"] else 0

        drift = mean_delta > 10 or (previous["std_pct"] > 0 and std_delta / previous["std_pct"] > 0.5)
        results[cat] = {
            "current_window":  current,
            "previous_window": previous,
            "mean_drop_pp":    round(mean_delta, 2),
            "std_increase_pp": round(std_delta, 2),
            "drift_detected":  drift,
            "status":          "DRIFT ⚠️" if drift else "STABLE ✅",
        }

    overall = any(v["drift_detected"] for v in results.values())
    return {
        "window_days":   days,
        "overall_status": "DRIFT DETECTED" if overall else "ALL STABLE",
        "categories":    results,
        "evaluated_at":  now.isoformat(),
    }


@router.get("/models/health")
def models_health():
    """MLOps health check — which models are loaded and ready."""
    statuses = {}
    for key, path in MODEL_REGISTRY.items():
        if key == "plants":
            continue
        statuses[key] = {
            "loaded": key in _models,
            "path_exists": os.path.exists(path),
            "path": path,
        }
    all_ready = all(v["path_exists"] for v in statuses.values())
    return {"status": "ready" if all_ready else "degraded", "models": statuses}

@router.get("/models/{category}/metadata")
def get_model_metadata(category: str):
    model = get_yolo_model(category)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"category": category, "names": model.names}

@router.get("/stats/plants")
def plant_cv_stats(
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    """Real-time CV event KPIs for plant/crop monitoring dashboard."""
    from app.models.domain import CVEvent
    from sqlalchemy import func
    plant_cats = ["leaves", "olive", "insects", "lemon", "orange"]
    cutoff_7d  = datetime.now(timezone.utc) - timedelta(days=7)
    cutoff_30d = datetime.now(timezone.utc) - timedelta(days=30)

    total = db.query(func.count(CVEvent.id)).filter(
        CVEvent.camera_id.in_(plant_cats)
    ).scalar() or 0

    disease_alerts = db.query(func.count(CVEvent.id)).filter(
        CVEvent.camera_id.in_(plant_cats),
        CVEvent.severity.in_(["warning", "critical"]),
        CVEvent.timestamp >= cutoff_7d
    ).scalar() or 0

    avg_conf_raw = db.query(func.avg(CVEvent.confidence)).filter(
        CVEvent.camera_id.in_(plant_cats),
        CVEvent.confidence.isnot(None),
        CVEvent.timestamp >= cutoff_30d
    ).scalar()

    insects_7d = db.query(func.count(CVEvent.id)).filter(
        CVEvent.camera_id == "insects",
        CVEvent.timestamp >= cutoff_7d
    ).scalar() or 0

    return {
        "total_detections": total,
        "disease_alerts_7d": disease_alerts,
        "avg_confidence_pct": round(float(avg_conf_raw) * 100, 1) if avg_conf_raw else 0.0,
        "insect_detections_7d": insects_7d,
    }


@router.get("/events/plants/recent")
def plant_recent_events(
    limit: int = Query(20, le=100),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    """Most recent plant CV detections (leaves / olive / insects) for detection log."""
    from app.models.domain import CVEvent
    plant_cats = ["leaves", "olive", "insects", "lemon", "orange"]
    rows = (
        db.query(CVEvent)
        .filter(CVEvent.camera_id.in_(plant_cats))
        .order_by(CVEvent.timestamp.desc())
        .limit(limit)
        .all()
    )
    return [_serialize(e) for e in rows]


@router.post("/detect")
async def detect_in_file(
    file: UploadFile = File(...),
    category: Optional[str] = Query("bee"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    from starlette.concurrency import run_in_threadpool
    async with inference_lock:
        try:
            model = await run_in_threadpool(get_yolo_model, category)
            if not model:
                raise HTTPException(status_code=500, detail=f"IA {category} non prête.")

            contents = await file.read()
            image = Image.open(io.BytesIO(contents))

            start_t = time.time()
            results = await run_in_threadpool(model.predict, image, conf=0.25)
            logger.info(f"[YOLO] OK in {(time.time()-start_t)*1000:.1f}ms")

            detections = []
            img_w, img_h = image.size
            for r in results:
                items = getattr(r, 'obb', None) or getattr(r, 'boxes', None)
                if not items:
                    continue
                for item in items:
                    cls_id = int(item.cls[0])
                    bbox_raw = (item.xywhr[0] if hasattr(item, 'xywhr') else item.xywh[0]).tolist()
                    detections.append({
                        "label": model.names[cls_id],
                        "confidence": float(item.conf[0]),
                        "bbox": [
                            (bbox_raw[0] / img_w) * 100, (bbox_raw[1] / img_h) * 100,
                            (bbox_raw[2] / img_w) * 100, (bbox_raw[3] / img_h) * 100,
                            bbox_raw[4] if len(bbox_raw) > 4 else 0
                        ]
                    })

            # Auto-ingest high priority detections (Fire/Smoke)
            # Some models use numeric labels (0, 1, 2, 3, 4) for fire levels/zones
            priority_classes = ['fire', 'smoke', 'incendie', '0', '1', '2', '3', '4']
            high_priority_dets = [d for d in detections if d['label'].lower() in priority_classes]

            # Build compressed thumbnail once for all events of this image
            thumbnail_b64 = None
            try:
                import base64
                thumb = image.copy()
                thumb.thumbnail((520, 390))
                buf = io.BytesIO()
                thumb.save(buf, format='JPEG', quality=72)
                thumbnail_b64 = "data:image/jpeg;base64," + base64.b64encode(buf.getvalue()).decode('utf-8')
            except Exception:
                pass

            if high_priority_dets and category == "fire":
                from app.models.domain import AnimalUnit
                from app.services.data_service import AlertService
                # Use a default unit (the first one found) or fallback
                default_unit = db.query(AnimalUnit).first()
                if default_unit:
                    for det in high_priority_dets:
                        try:
                            # Map numeric labels to human readable if needed
                            label_display = det['label']
                            if label_display in ['0', '1', '2', '3', '4']:
                                label_display = f"Zone/Niveau {label_display} (Feu)"

                            # 1. Ingest CV Event with thumbnail in frame_metadata
                            CVService(db).ingest(CVEventCreate(
                                unit_id=default_unit.id,
                                object_class=label_display,
                                confidence=det['confidence'],
                                severity="critical",
                                camera_id=category,
                                frame_metadata={"thumbnail_b64": thumbnail_b64, "detections": detections} if thumbnail_b64 else {"detections": detections}
                            ))
                            # 2. Create System Alert
                            AlertService(db).create_alert(AlertCreate(
                                unit_id=default_unit.id,
                                alert_type="fire_detection",
                                message=f"🚨 ALERTE INCENDIE CRITIQUE : {label_display.upper()} détecté par le Moniteur Souverain (Confiance: {int(det['confidence']*100)}%)",
                                severity="critical"
                            ))
                            logger.info(f"[YOLO] Emergency alert created for {det['label']}")
                        except Exception as ingest_err:
                            logger.error(f"Ingest Error: {ingest_err}")

            return {
                "filename": file.filename,
                "detections": detections,
                "count": len(detections),
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Inference Crash: {e}")
            raise HTTPException(status_code=500, detail=str(e))
