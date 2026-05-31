"""
Model A/B Testing — Smart Farm AI v3.0
Compares two YOLO model versions on the same image and returns
side-by-side metrics: detections, confidence, inference time.
"""
import io
import os
import time
import logging
from typing import Optional

from fastapi import APIRouter, File, UploadFile, Query, Depends, HTTPException
from PIL import Image

from app.core.security import get_current_user
from app.core.config import settings

router = APIRouter(prefix="/ab-test", tags=["Model A/B Testing"])
logger = logging.getLogger(__name__)

# Registry: slug → path  (add new model versions here)
AB_REGISTRY = {
    # Animals
    "goat_v1":          settings.YOLO_GOAT_PATH,
    "goat_disease_v1":  settings.YOLO_GOAT_DISEASE_PATH,
    "chicken_v1":       settings.YOLO_CHICKEN_DISEASE_PATH,
    "chicken_detect_v1":settings.YOLO_CHICKEN_DETECT_PATH,
    "rabbit_v1":        settings.YOLO_RABBIT_PATH,
    "cow_behavior_v1":  settings.YOLO_COW_BEHAVIOR_PATH,
    "bee_v1":           settings.YOLO_BEE_PATH,
    # Plants
    "leaves_v1":        settings.YOLO_LEAVES_PATH,
    "olive_v1":         settings.YOLO_OLIVE_PATH,
    "plantdoc_v1":      settings.YOLO_PLANTDOC_PATH,
    "orange_v1":        settings.YOLO_ORANGE_PATH,
    "lemon_v1":         settings.YOLO_LEMON_PATH,
    # Alert
    "fire_v1":          settings.YOLO_FIRE_PATH,
}


def _run_model(path: str, image: Image.Image, conf: float) -> dict:
    """Load and run a YOLO model, return detections + timing."""
    try:
        from ultralytics import YOLO
    except ImportError:
        raise HTTPException(503, "YOLO not available on this server")

    if not os.path.exists(path):
        raise HTTPException(404, f"Model not found: {path}")

    t0 = time.perf_counter()
    model = YOLO(path)
    results = model.predict(image, conf=conf, verbose=False)
    elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)

    dets = []
    for r in results:
        for box in (r.boxes or []):
            cls_id = int(box.cls[0])
            dets.append({
                "label":      model.names[cls_id],
                "confidence": round(float(box.conf[0]), 3),
                "bbox":       [round(v, 1) for v in box.xyxy[0].tolist()],
            })

    avg_conf = round(sum(d["confidence"] for d in dets) / len(dets), 3) if dets else 0.0
    return {
        "model_path":    path.split("ai_assets")[-1],
        "detections":    dets,
        "count":         len(dets),
        "avg_confidence":avg_conf,
        "inference_ms":  elapsed_ms,
    }


@router.get("/models", summary="List available model slugs for A/B testing")
def list_ab_models(_=Depends(get_current_user)):
    return {
        slug: {"path": path.split("ai_assets")[-1], "exists": os.path.exists(path)}
        for slug, path in AB_REGISTRY.items()
    }


@router.post("/compare", summary="Run same image through model_a vs model_b")
async def compare_models(
    file:    UploadFile = File(...),
    model_a: str = Query(..., description="Slug from /ab-test/models, e.g. 'goat_v1'"),
    model_b: str = Query(..., description="Slug from /ab-test/models, e.g. 'goat_disease_v1'"),
    conf:    float = Query(0.25, ge=0.05, le=0.95),
    _=Depends(get_current_user),
):
    if model_a not in AB_REGISTRY:
        raise HTTPException(400, f"Unknown model_a: '{model_a}'. GET /ab-test/models for list.")
    if model_b not in AB_REGISTRY:
        raise HTTPException(400, f"Unknown model_b: '{model_b}'. GET /ab-test/models for list.")

    contents = await file.read()
    image    = Image.open(io.BytesIO(contents))

    from starlette.concurrency import run_in_threadpool
    result_a = await run_in_threadpool(_run_model, AB_REGISTRY[model_a], image, conf)
    result_b = await run_in_threadpool(_run_model, AB_REGISTRY[model_b], image, conf)

    winner = model_a
    reason = "equal"
    if result_a["avg_confidence"] > result_b["avg_confidence"]:
        winner = model_a
        reason = f"higher avg confidence ({result_a['avg_confidence']} vs {result_b['avg_confidence']})"
    elif result_b["avg_confidence"] > result_a["avg_confidence"]:
        winner = model_b
        reason = f"higher avg confidence ({result_b['avg_confidence']} vs {result_a['avg_confidence']})"
    elif result_b["inference_ms"] < result_a["inference_ms"]:
        winner = model_b
        reason = f"faster inference ({result_b['inference_ms']}ms vs {result_a['inference_ms']}ms)"

    return {
        "filename":  file.filename,
        "model_a":   {**{"slug": model_a}, **result_a},
        "model_b":   {**{"slug": model_b}, **result_b},
        "winner":    winner,
        "reason":    reason,
        "conf_used": conf,
    }
