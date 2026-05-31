"""
Stream Routes — WebSocket Video Inference
==========================================
Endpoint WebSocket pour l'inférence YOLO en temps réel sur flux vidéo.

Protocol :
  Client → envoie frames en base64 JSON : {"frame": "<base64>", "model": "bee"}
  Server → renvoie détections + frame annotée : {"detections": [...], "inference_ms": 143}

Rate limit : max 5 FPS par connexion (200ms entre frames).
"""

from __future__ import annotations

import asyncio
import base64
import io
import logging
import time
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.websockets import WebSocketState

logger = logging.getLogger(__name__)
router = APIRouter(tags=["Video Streaming"])

# Max frames per second per connection
MAX_FPS = 5
MIN_INTERVAL_S = 1.0 / MAX_FPS  # 200ms


def _decode_frame(frame_b64: str):
    """Decode a base64 image to PIL Image."""
    from PIL import Image
    data = base64.b64decode(frame_b64)
    return Image.open(io.BytesIO(data))


def _run_inference(model, image) -> list[dict[str, Any]]:
    """Synchronous YOLO inference — called via run_in_threadpool."""
    results = model.predict(image, conf=0.25, verbose=False)
    detections = []
    img_w, img_h = image.size
    for r in results:
        items = getattr(r, "obb", None) or getattr(r, "boxes", None)
        if not items:
            continue
        for item in items:
            cls_id = int(item.cls[0])
            bbox_raw = (item.xywhr[0] if hasattr(item, "xywhr") else item.xywh[0]).tolist()
            detections.append({
                "label": model.names[cls_id],
                "confidence": round(float(item.conf[0]), 3),
                "bbox": [
                    round((bbox_raw[0] / img_w) * 100, 2),
                    round((bbox_raw[1] / img_h) * 100, 2),
                    round((bbox_raw[2] / img_w) * 100, 2),
                    round((bbox_raw[3] / img_h) * 100, 2),
                ],
            })
    return detections


@router.websocket("/ws/stream/{unit_id}")
async def video_stream_inference(
    websocket: WebSocket,
    unit_id: int,
    token: str | None = None,
    model: str = "bee",
):
    """
    WebSocket endpoint for real-time YOLO inference on video frames.

    Query params:
      - token : JWT access token (required)
      - model : YOLO model category (default: bee)

    Message format (client → server):
      {"frame": "<base64_jpeg>", "model": "bee"}

    Response format (server → client):
      {"detections": [...], "inference_ms": 143, "frame_id": 42, "model": "bee"}
      or {"error": "message"} on failure
    """
    # Auth check
    if not token:
        await websocket.close(code=1008, reason="Authentication required")
        return

    try:
        from app.core.security import get_ws_tenant_id
        get_ws_tenant_id(token)
    except Exception:
        await websocket.close(code=1008, reason="Invalid token")
        return

    await websocket.accept()
    logger.info("[Stream] WS connected unit_id=%s model=%s", unit_id, model)

    # Lazy-import to avoid circular
    try:
        from app.api.v1.endpoints.cv_routes import get_yolo_model, inference_lock, HAS_YOLO
    except ImportError:
        await websocket.send_json({"error": "CV module unavailable"})
        await websocket.close()
        return

    if not HAS_YOLO:
        await websocket.send_json({"error": "YOLO non disponible sur ce serveur (mode cloud)"})
        await websocket.close()
        return

    from starlette.concurrency import run_in_threadpool

    frame_id = 0
    last_frame_time = 0.0
    current_model_name = model

    try:
        while websocket.client_state == WebSocketState.CONNECTED:
            try:
                data = await asyncio.wait_for(websocket.receive_json(), timeout=30.0)
            except asyncio.TimeoutError:
                await websocket.send_json({"ping": "alive", "unit_id": unit_id})
                continue
            except WebSocketDisconnect:
                break

            # Rate limiting: enforce MIN_INTERVAL_S between frames
            now = time.monotonic()
            elapsed = now - last_frame_time
            if elapsed < MIN_INTERVAL_S:
                await asyncio.sleep(MIN_INTERVAL_S - elapsed)
            last_frame_time = time.monotonic()

            frame_b64 = data.get("frame")
            requested_model = data.get("model", current_model_name)

            if not frame_b64:
                await websocket.send_json({"error": "Champ 'frame' manquant"})
                continue

            # Switch model if requested
            if requested_model != current_model_name:
                current_model_name = requested_model

            try:
                image = await run_in_threadpool(_decode_frame, frame_b64)
            except Exception as exc:
                await websocket.send_json({"error": f"Décodage image échoué: {exc}"})
                continue

            try:
                async with inference_lock:
                    yolo = await run_in_threadpool(get_yolo_model, current_model_name)
                    if not yolo:
                        await websocket.send_json({"error": f"Modèle '{current_model_name}' non disponible"})
                        continue

                    t0 = time.monotonic()
                    detections = await run_in_threadpool(_run_inference, yolo, image)
                    inference_ms = round((time.monotonic() - t0) * 1000, 1)

                frame_id += 1
                await websocket.send_json({
                    "detections": detections,
                    "count": len(detections),
                    "inference_ms": inference_ms,
                    "frame_id": frame_id,
                    "model": current_model_name,
                    "unit_id": unit_id,
                })

            except Exception as exc:
                logger.error("[Stream] Inference error: %s", exc)
                await websocket.send_json({"error": f"Inférence échouée: {exc}"})

    except WebSocketDisconnect:
        pass
    finally:
        logger.info("[Stream] WS disconnected unit_id=%s frames_processed=%s", unit_id, frame_id)
        if websocket.client_state == WebSocketState.CONNECTED:
            await websocket.close()
