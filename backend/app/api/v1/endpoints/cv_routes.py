"""Smart Farm AI - CV Event Routes"""
import os
import io
import logging
import time
import threading
from PIL import Image
from typing import List, Optional

from fastapi import APIRouter, Depends, Query, File, UploadFile, HTTPException
from sqlalchemy.orm import Session

# Absolute Imports
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.services.data_service import CVService
from app.schemas.domain import CVEventCreate

try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cv", tags=["Computer Vision"])

# -- Global Inference Lock --
inference_lock = threading.Lock()

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

@router.get("/models/{category}/metadata")
def get_model_metadata(category: str):
    model = get_yolo_model(category)
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    return {"category": category, "names": model.names}

@router.post("/detect")
async def detect_in_file(
    file: UploadFile = File(...), 
    category: Optional[str] = Query("bee"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user)
):
    from starlette.concurrency import run_in_threadpool
    with inference_lock:
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
                if not items: continue
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
            
            return {
                "filename": file.filename, 
                "detections": detections, 
                "count": len(detections),
                "status": "success"
            }
        except Exception as e:
            logger.error(f"Inference Crash: {e}")
            raise HTTPException(status_code=500, detail=str(e))
