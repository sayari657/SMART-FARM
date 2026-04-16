"""Smart Farm AI - CV Event Routes"""
import os
import io
import logging
from PIL import Image
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, File, UploadFile, HTTPException
from sqlalchemy.orm import Session
try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False

from app.core.database import get_db
from app.core.security import get_current_user
from app.services.data_service import CVService
from app.schemas.domain import CVEventCreate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cv", tags=["Computer Vision"])

# Model Registry (Provided by User)
MODEL_REGISTRY = {
    "bee": r"D:\cv data\cv bee detect from roboflow\final_export\best.pt",
    "livestock": r"D:\cv data\goat sheet and cow\model goat cow\best.pt",
    "leaves": r"D:\cv data\leaves\Detection diseases Leaves\best.pt",
    "olive": r"D:\cv data\olive\model olive-tree-diseases\best.pt",
    "insects": r"D:\cv data\insects\model insects_final\best.pt",
    "fire": r"D:\cv data\Fire Detection.v1i.yolov11\model-fire-detection-and-smoke\best.pt"
}

_models = {}

def get_yolo_model(category: str = "bee"):
    global _models
    if not HAS_YOLO:
        return None
    
    # Map friendly names to registry keys
    key = category.lower()
    if "cow" in key or "goat" in key or "sheep" in key:
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

@router.post("/detect")
async def detect_in_file(
    file: UploadFile = File(...), 
    category: Optional[str] = Query("bee"),
    _=Depends(get_current_user)
):
    """Run real YOLO OBB inference on an uploaded image file."""
    model = get_yolo_model(category)
    if not model:
        raise HTTPException(status_code=500, detail="YOLO model not initialized or ultralytics not installed.")
    
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # Run inference (conf=0.25 as per previous optimization)
        results = model.predict(image, conf=0.25)
        
        detections = []
        img_w, img_h = image.size
        
        for r in results:
            items = r.obb if hasattr(r, 'obb') and r.obb is not None else r.boxes
            if not items: continue
            
            for item in items:
                cls_id = int(item.cls[0])
                conf = float(item.conf[0])
                label = model.names[cls_id]
                
                # Get OBB (Oriented Bounding Box) coordinates
                # xywhr (center_x, center_y, width, height, rotation)
                bbox_raw = item.xywhr[0].tolist() if hasattr(item, 'xywhr') else item.xywh[0].tolist()
                
                # Convert to relative percentages for frontend
                relative_bbox = [
                    (bbox_raw[0] / img_w) * 100, # cx
                    (bbox_raw[1] / img_h) * 100, # cy
                    (bbox_raw[2] / img_w) * 100, # w
                    (bbox_raw[3] / img_h) * 100, # h
                    bbox_raw[4] if len(bbox_raw) > 4 else 0 # rotation (radians)
                ]
                
                detections.append({
                    "label": label,
                    "confidence": conf,
                    "bbox": relative_bbox,
                    "task": "obb" if hasattr(item, 'xywhr') else "detect"
                })
        
        return {"filename": file.filename, "detections": detections, "count": len(detections)}
        
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
