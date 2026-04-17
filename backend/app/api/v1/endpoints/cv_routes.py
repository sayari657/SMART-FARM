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
from app.core.config import settings
from app.services.data_service import CVService
from app.schemas.domain import CVEventCreate

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/cv", tags=["Computer Vision"])

# ── Model Registry ────────────────────────────────────────────────────────────
# Paths chargés depuis config.py (settings) — modifiables via variables d'env
# ou directement dans backend/app/core/config.py
MODEL_REGISTRY = {
    # ── Animaux ────────────────────────────────────────────────────────────────
    "bee":      settings.YOLO_BEE_PATH,       # 🐝 bee/final_export/best.pt
    "goat":     settings.YOLO_GOAT_PATH,      # 🐐 model goat cow/best.pt
    "cow":      settings.YOLO_COW_PATH,       # 🐄 model goat cow/best.pt
    "sheep":    settings.YOLO_SHEEP_PATH,     # 🐑 model goat cow/best.pt
    "livestock": settings.YOLO_GOAT_PATH,     # Alias bétail générique
    # ── Plantations ────────────────────────────────────────────────────────────
    "leaves":   settings.YOLO_LEAVES_PATH,    # 🌿 Detection diseases Leaves (12 cls)
    "olive":    settings.YOLO_OLIVE_PATH,     # 🫒 model olive-tree-diseases (5 cls)
    "insects":  settings.YOLO_INSECTS_PATH,   # 🦟 model insects_final (10 cls)
    "fire":     settings.YOLO_FIRE_PATH,      # 🔥 fire-detection-and-smoke
    "plants":   settings.YOLO_LEAVES_PATH,    # Alias plantes → leaves
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

@router.get("/models/{category}/metadata")
def get_model_metadata(category: str):
    """Get dynamic class names from the YOLO model data.yaml/names."""
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
        
        # ── Persist Analysis to Database ─────────────────────────────────────
        try:
            from app.models.domain import AnimalUnit, AnimalType
            
            # 1. Determine target system unit based on category
            sys_type_map = {
                "fire": "environment",
                "leaves": "plantation", "olive": "plantation", "insects": "plantation",
                "cow": "livestock", "goat": "livestock", "sheep": "livestock", "livestock": "livestock",
                "bee": "bee"
            }
            target_species = sys_type_map.get(category, "livestock")
            
            # Find the designated system unit
            unit = db.query(AnimalUnit).join(AnimalType).filter(
                AnimalType.species == target_species,
                AnimalUnit.name.like("System Monitor%")
            ).first()
            
            # If no system unit found, fallback to first available unit
            if not unit:
                unit = db.query(AnimalUnit).first()

            if unit:
                cv_service = CVService(db)
                for det in detections:
                    # Map severity
                    sev = "info"
                    lbl_low = det["label"].lower()
                    if any(x in lbl_low for x in ["fire", "blight", "army_worm", "critical"]):
                        sev = "critical"
                    elif any(x in lbl_low for x in ["smoke", "rust", "psyllid", "warning"]):
                        sev = "warning"
                    
                    event_data = CVEventCreate(
                        unit_id=unit.id,
                        object_class=det["label"],
                        confidence=det["confidence"],
                        severity=sev,
                        frame_metadata={"bbox": det["bbox"], "task": det["task"]},
                        camera_id="manual_scan"
                    )
                    cv_service.ingest(event_data)
                
                logger.info(f"Persisted {len(detections)} detections for unit {unit.id}")
        except Exception as db_err:
            logger.error(f"Failed to persist CV session: {db_err}")

        return {"filename": file.filename, "detections": detections, "count": len(detections)}
        
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

