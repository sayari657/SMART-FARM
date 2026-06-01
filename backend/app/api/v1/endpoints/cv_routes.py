"""Smart Farm AI - CV Event Routes"""
import os
import io
import logging
import time
import asyncio
from datetime import datetime, timedelta, timezone
from PIL import Image
from typing import Optional

from fastapi import APIRouter, Depends, Query, File, UploadFile, HTTPException, Request
from sqlalchemy.orm import Session
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

# Absolute Imports
from app.core.database import get_db
from app.core.security import get_current_user
from app.core.config import settings
from app.core.farm_guard import get_scoped_farm_ids
from app.services.data_service import CVService
from app.schemas.domain import CVEventCreate, AlertCreate
from typing import List

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
    "bee":              settings.YOLO_BEE_PATH,
    "goat":             settings.YOLO_GOAT_PATH,
    "cow":              settings.YOLO_COW_PATH,
    "sheep":            settings.YOLO_SHEEP_PATH,
    "livestock":        settings.YOLO_GOAT_PATH,
    "goat_disease":     settings.YOLO_GOAT_DISEASE_PATH,
    "chicken_disease":  settings.YOLO_CHICKEN_DISEASE_PATH,
    "chicken_detect":   settings.YOLO_CHICKEN_DETECT_PATH,
    "chicken":          settings.YOLO_CHICKEN_DISEASE_PATH,
    "rabbit":           settings.YOLO_RABBIT_PATH,
    "cow_behavior":     settings.YOLO_COW_BEHAVIOR_PATH,
    "leaves":          settings.YOLO_LEAVES_PATH,
    "olive":           settings.YOLO_OLIVE_PATH,
    "insects":         settings.YOLO_INSECTS_PATH,
    "lemon":           settings.YOLO_LEMON_PATH,
    "orange":          settings.YOLO_ORANGE_PATH,
    "plantdoc":        settings.YOLO_PLANTDOC_PATH,
    "fire":            settings.YOLO_FIRE_PATH,
    "plants":          settings.YOLO_LEAVES_PATH,
}

_models = {}

def get_yolo_model(category: str = "bee"):
    global _models
    if not HAS_YOLO:
        return None
    key = category.lower()
    # goat/cow/sheep → livestock detection model
    if any(k in key for k in ["cow", "sheep"]):
        key = "livestock"
    # goat alone → livestock (detection), goat_disease → disease model
    if key == "goat":
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
            logger.warning(f"Model not found for {key} at {path}")
            return None
    return _models[key]


def _run_dual_inference(img_array, model_pairs: list, conf: float = 0.25) -> list:
    """Generic dual inference: runs multiple (registry_key, label) model pairs."""
    results = []
    for key, label in model_pairs:
        model = get_yolo_model(key)
        if model is None:
            continue
        try:
            preds = model(img_array, conf=conf, verbose=False)[0]
            for box in (preds.boxes or []):
                cls_id = int(box.cls[0])
                results.append({
                    "label":      model.names[cls_id],
                    "confidence": round(float(box.conf[0]), 3),
                    "bbox":       [round(v, 1) for v in box.xyxy[0].tolist()],
                    "model":      label,
                })
        except Exception as e:
            logger.error(f"Dual inference error ({key}): {e}")
    return results


def run_dual_goat_inference(img_array, conf: float = 0.25):
    """Goat detection (cow/goat/sheep) + goat disease simultaneously."""
    return _run_dual_inference(img_array,
        [("livestock", "detection"), ("goat_disease", "disease")], conf)


def run_dual_chicken_inference(img_array, conf: float = 0.25):
    """Chicken detection (rooster) + chicken disease simultaneously."""
    return _run_dual_inference(img_array,
        [("chicken_detect", "detection"), ("chicken_disease", "disease")], conf)


def run_dual_cow_inference(img_array, conf: float = 0.25):
    """Cow detection (cow/goat/sheep) + cow behavior (Lie/Stand/Walk) simultaneously."""
    return _run_dual_inference(img_array,
        [("livestock", "detection"), ("cow_behavior", "behavior")], conf)

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
def get_recent(
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    farm_ids: List[int] = Depends(get_scoped_farm_ids),
):
    """CV events scoped to selected farm. Returns [] if user has no farms yet."""
    if not farm_ids:
        return []
    return [_serialize(e) for e in CVService(db).get_recent_by_farms(farm_ids, limit=limit)]

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
    if settings.LITE_MODE:
        return {"category": category, "names": {}, "available": False, "reason": "lite_mode"}
    model = get_yolo_model(category)
    if not model:
        return {"category": category, "names": {}, "available": False, "reason": "model_not_found"}
    return {"category": category, "names": model.names, "available": True}

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
@limiter.limit("30/minute")
async def detect_in_file(
    request: Request,  # noqa: ARG001 — slowapi reads client IP from this
    file: UploadFile = File(...),
    category: Optional[str] = Query("bee"),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from starlette.concurrency import run_in_threadpool
    async with inference_lock:
        try:
            contents = await file.read()
            image = Image.open(io.BytesIO(contents))
            img_w, img_h = image.size
            cat = category.lower()
            start_t = time.time()

            # ── Dual goat inference: detection + disease simultaneously ────────
            if cat in ("goat", "livestock"):
                import numpy as np
                img_array = np.array(image)
                dual = await run_in_threadpool(run_dual_goat_inference, img_array, 0.25)
                logger.info(f"[YOLO dual-goat] {len(dual)} dets in {(time.time()-start_t)*1000:.1f}ms")
                return {
                    "filename":   file.filename,
                    "detections": dual,
                    "count":      len(dual),
                    "models":     ["livestock (detection)", "goat_disease (disease)"],
                    "status":     "success",
                }

            # ── Dual cow: detection (cow/goat/sheep) + behavior (Lie/Stand/Walk) ─
            if cat in ("cow", "cattle"):
                import numpy as np
                img_array = np.array(image)
                dual = await run_in_threadpool(run_dual_cow_inference, img_array, 0.25)
                logger.info(f"[YOLO dual-cow] {len(dual)} dets in {(time.time()-start_t)*1000:.1f}ms")
                return {
                    "filename":   file.filename,
                    "detections": dual,
                    "count":      len(dual),
                    "models":     ["livestock (detection)", "cow_behavior (Lie/Stand/Walk)"],
                    "status":     "success",
                }

            # ── Dual chicken: detection (rooster) + disease simultaneously ─────
            if cat == "chicken":
                import numpy as np
                img_array = np.array(image)
                dual = await run_in_threadpool(run_dual_chicken_inference, img_array, 0.25)
                logger.info(f"[YOLO dual-chicken] {len(dual)} dets in {(time.time()-start_t)*1000:.1f}ms")
                return {
                    "filename":   file.filename,
                    "detections": dual,
                    "count":      len(dual),
                    "models":     ["chicken_detect (rooster)", "chicken_disease (maladies)"],
                    "status":     "success",
                }

            # ── Standard single-model inference ───────────────────────────────
            model = await run_in_threadpool(get_yolo_model, category)
            if not model:
                raise HTTPException(
                    status_code=503,
                    detail=f"Modèle IA '{category}' non disponible sur ce serveur (mode cloud sans fichiers YOLO)."
                )

            results = await run_in_threadpool(model.predict, image, conf=0.25)
            logger.info(f"[YOLO] OK in {(time.time()-start_t)*1000:.1f}ms")

            detections = []
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
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Inference Crash: {e}")
            raise HTTPException(status_code=500, detail=str(e))


# ---------------------------------------------------------------------------
# Segmentation endpoint (YOLOv8-seg)
# ---------------------------------------------------------------------------

@router.post("/segment")
async def segment_file(
    file: UploadFile = File(...),
    category: Optional[str] = Query("leaves"),
    _=Depends(get_current_user),
):
    """
    Semantic segmentation via YOLOv8-seg models (if available in ai_assets/seg/).
    Falls back to standard detection bounding boxes if no seg model found.
    """
    from starlette.concurrency import run_in_threadpool

    seg_path = os.path.join(
        os.path.dirname(settings.YOLO_LEAVES_PATH), "..", "seg", f"{category}_seg.pt"
    )
    seg_path = os.path.normpath(seg_path)

    async with inference_lock:
        try:
            contents = await file.read()
            image = Image.open(io.BytesIO(contents))

            if HAS_YOLO and os.path.exists(seg_path):
                seg_model = YOLO(seg_path)
                results = await run_in_threadpool(seg_model.predict, image, conf=0.25)
                masks_out = []
                for r in results:
                    if hasattr(r, "masks") and r.masks is not None:
                        for i, mask in enumerate(r.masks.data):
                            cls_id = int(r.boxes.cls[i]) if r.boxes else 0
                            masks_out.append({
                                "label": seg_model.names[cls_id],
                                "confidence": float(r.boxes.conf[i]) if r.boxes else 0.0,
                                "mask_shape": list(mask.shape),
                                "mask_sum_px": int(mask.sum().item()),
                            })
                return {"filename": file.filename, "task": "segmentation", "masks": masks_out,
                        "model": seg_path, "count": len(masks_out)}
            else:
                # Graceful fallback: standard detection
                model = await run_in_threadpool(get_yolo_model, category)
                if not model:
                    raise HTTPException(status_code=503, detail="Modèle seg non disponible")
                results = await run_in_threadpool(model.predict, image, conf=0.25)
                detections = []
                for r in results:
                    items = getattr(r, "boxes", None)
                    if items:
                        for item in items:
                            detections.append({
                                "label": model.names[int(item.cls[0])],
                                "confidence": float(item.conf[0]),
                            })
                return {"filename": file.filename, "task": "detection_fallback",
                        "note": f"Modèle seg '{category}_seg.pt' non trouvé — détection standard utilisée",
                        "detections": detections, "count": len(detections)}
        except HTTPException:
            raise
        except Exception as exc:
            logger.error("Segmentation error: %s", exc)
            raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Model Precision-Recall metrics (ModelEvaluation table)
# ---------------------------------------------------------------------------

@router.get("/models/{model_name}/metrics", summary="Métriques Precision-Recall par classe YOLO")
def get_model_metrics(
    model_name: str,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    from app.models.domain import ModelEvaluation
    latest = (
        db.query(ModelEvaluation)
        .filter(ModelEvaluation.model_name == model_name)
        .order_by(ModelEvaluation.eval_date.desc())
        .first()
    )
    if not latest:
        raise HTTPException(status_code=404, detail=f"Aucune évaluation pour le modèle '{model_name}'")
    return {
        "model_name": latest.model_name,
        "eval_date": latest.eval_date.isoformat(),
        "map50": latest.map50,
        "map50_95": latest.map50_95,
        "class_metrics": latest.class_metrics,
        "dataset_size": latest.dataset_size,
        "notes": latest.notes,
    }


@router.post("/models/{model_name}/evaluate", summary="Lancer l'évaluation du modèle YOLO (stocke PR par classe)")
async def evaluate_model(
    model_name: str,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    """
    Lance model.val() sur le dataset de validation et stocke les métriques
    Precision/Recall/F1 par classe dans ModelEvaluation.
    """
    from app.models.domain import ModelEvaluation
    from starlette.concurrency import run_in_threadpool

    if not HAS_YOLO:
        raise HTTPException(status_code=503, detail="YOLO non disponible sur ce serveur")

    model = get_yolo_model(model_name)
    if not model:
        raise HTTPException(status_code=404, detail=f"Modèle '{model_name}' non trouvé")

    try:
        metrics = await run_in_threadpool(model.val)

        class_metrics = {}
        if hasattr(metrics, "box") and hasattr(metrics.box, "maps"):
            names = model.names
            maps = metrics.box.maps
            p_vals = getattr(metrics.box, "p", [None] * len(names))
            r_vals = getattr(metrics.box, "r", [None] * len(names))
            for idx, name in names.items():
                p = float(p_vals[idx]) if p_vals is not None and idx < len(p_vals) else None
                r = float(r_vals[idx]) if r_vals is not None and idx < len(r_vals) else None
                f1 = round(2 * p * r / (p + r), 4) if p and r and (p + r) > 0 else None
                class_metrics[name] = {"precision": p, "recall": r, "f1": f1,
                                       "ap50": float(maps[idx]) if maps is not None and idx < len(maps) else None}

        evaluation = ModelEvaluation(
            model_name=model_name,
            eval_date=datetime.utcnow(),
            class_metrics=class_metrics,
            map50=float(metrics.box.map50) if hasattr(metrics, "box") else None,
            map50_95=float(metrics.box.map) if hasattr(metrics, "box") else None,
            notes=f"Évaluation automatique par {current_user.username}",
        )
        db.add(evaluation)
        db.commit()
        db.refresh(evaluation)

        return {
            "model_name": model_name,
            "map50": evaluation.map50,
            "map50_95": evaluation.map50_95,
            "class_metrics": class_metrics,
            "eval_id": evaluation.id,
            "status": "success",
        }
    except Exception as exc:
        logger.error("Model evaluation failed: %s", exc)
        raise HTTPException(status_code=500, detail=str(exc))


# ---------------------------------------------------------------------------
# Lameness Scoring (Sprecher scale 0-5)
# ---------------------------------------------------------------------------

@router.get("/lameness/{unit_id}/history", summary="Historique du score de boiterie (échelle Sprecher 0-5)")
def lameness_history(
    unit_id: int,
    limit: int = Query(30, le=200),
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    """
    Retourne l'historique des scores de boiterie extraits de CVEvent.frame_metadata.
    Le score Sprecher (0-5) est stocké lors de la détection livestock.
    """
    from app.models.domain import CVEvent
    events = (
        db.query(CVEvent)
        .filter(
            CVEvent.unit_id == unit_id,
            CVEvent.camera_id.in_(["livestock", "cow", "goat", "sheep"]),
        )
        .order_by(CVEvent.timestamp.desc())
        .limit(limit)
        .all()
    )

    history = []
    for ev in events:
        meta = ev.frame_metadata or {}
        lameness_score = meta.get("lameness_score")
        if lameness_score is not None:
            history.append({
                "event_id": ev.id,
                "timestamp": ev.timestamp.isoformat() if ev.timestamp else None,
                "lameness_score": lameness_score,
                "confidence": meta.get("confidence", ev.confidence),
                "object_class": ev.object_class,
                "severity": ev.severity,
                "sprecher_description": _sprecher_label(lameness_score),
            })

    avg_score = round(sum(h["lameness_score"] for h in history) / len(history), 2) if history else None

    return {
        "unit_id": unit_id,
        "history": history,
        "count": len(history),
        "avg_lameness_score": avg_score,
        "scale": "Sprecher 0-5 (0=normal, 1=légère, 2=modérée, 3=boiterie, 4=grave, 5=critique)",
    }


@router.get("/lameness/methodology", summary="Documentation de la méthode de scoring boiterie")
def lameness_methodology():
    """Documentation de l'échelle Sprecher et de la méthode de scoring."""
    return {
        "scale": "Sprecher Locomotion Scoring System (1993)",
        "reference": "Sprecher DJ, Hostetler DE, Kaneene JB (1997). Theriogenology 47:1179-1187",
        "scores": {
            0: {"label": "Normal", "description": "Station et démarche normales, dos droit",
                "action": "Aucune"},
            1: {"label": "Légèrement anormal", "description": "Légère rigidité à la marche, dos légèrement arqué",
                "action": "Surveillance"},
            2: {"label": "Anormal", "description": "Dos arqué en station, démarche raide",
                "action": "Examen podal dans les 7 jours"},
            3: {"label": "Boiterie", "description": "Dos arqué, un ou plusieurs membres favorisés",
                "action": "Examen vétérinaire dans les 48h"},
            4: {"label": "Boiterie grave", "description": "Membres clairement favorisés, difficultés locomotrices",
                "action": "Examen vétérinaire urgent"},
            5: {"label": "Critique", "description": "Animal ne peut pas se lever ou se déplace très difficilement",
                "action": "Intervention vétérinaire immédiate"},
        },
        "integration": "Le score est extrait de CVEvent.frame_metadata['lameness_score'] lors de chaque détection livestock.",
        "model": "YOLO livestock + prompt LLaVA pour scoring visuel",
    }


def _sprecher_label(score: int) -> str:
    labels = {0: "Normal", 1: "Légèrement anormal", 2: "Anormal",
               3: "Boiterie", 4: "Boiterie grave", 5: "Critique"}
    return labels.get(int(score), "Inconnu")
