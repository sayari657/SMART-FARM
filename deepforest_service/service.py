"""
DeepForest tree-crown detection microservice (isolated venv).

Why a microservice? DeepForest pulls heavy, conflicting deps (opencv-python-headless,
rasterio, geopandas, pytorch-lightning) that clash with the main backend's
opencv-python / YOLO stack. Keeping it in its own venv + process avoids any clash.

The main backend (app/api/v1/endpoints/orchard_routes.py) POSTs the satellite
mosaic here when settings.DEEPFOREST_URL is set (default http://localhost:8800),
and falls back to its built-in classical detector if this service is down.

Contract (matches the backend):
    POST /detect   form-data: file=<png>, mpp=<float opt>, species=<str opt>
    → {"width": W, "height": H, "trees": [{"cx": x, "cy": y}, ...], "engine": "deepforest"}
    (cx/cy are pixel coords in the returned WxH space; the backend maps them to GPS.)

Run:  start.bat   (or)   .venv\\Scripts\\python -m uvicorn service:app --port 8800
"""
import io
import logging

import cv2
import numpy as np
from fastapi import FastAPI, File, Form, UploadFile

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("deepforest-service")

app = FastAPI(title="DeepForest Tree Detection", version="1.0")
_MODEL = None

# DeepForest is trained on ~0.1 m/px airborne imagery. Free satellite tiles here
# are ~0.48 m/px (Esri z18), so we upsample to this target before inference.
TARGET_MPP = 0.16
SCORE_THRESH = 0.20


def get_model():
    """Lazy-load the pretrained crown detector (DeepForest 2.x API, 1.x fallback)."""
    global _MODEL
    if _MODEL is not None:
        return _MODEL
    from deepforest import main as df_main
    m = df_main.deepforest()
    for loader in (
        lambda: m.load_model("weecology/deepforest-tree"),
        lambda: m.use_release(),
    ):
        try:
            loader()
            break
        except Exception as exc:  # noqa: BLE001
            log.warning("model loader failed: %s", exc)
    try:
        m.config["score_thresh"] = SCORE_THRESH
    except Exception:  # noqa: BLE001
        pass
    _MODEL = m
    log.info("DeepForest model ready.")
    return _MODEL


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _MODEL is not None}


@app.post("/detect")
async def detect(file: UploadFile = File(...), mpp: float = Form(0.0), species: str = Form("")):
    raw = await file.read()
    img = cv2.imdecode(np.frombuffer(raw, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return {"width": 0, "height": 0, "trees": [], "engine": "deepforest", "error": "decode"}

    # Upsample toward the model's native resolution for tiny satellite crowns.
    up = 3.0
    if mpp and mpp > 0:
        up = max(1.0, min(4.0, mpp / TARGET_MPP))
    if abs(up - 1.0) > 0.05:
        img = cv2.resize(img, None, fx=up, fy=up, interpolation=cv2.INTER_CUBIC)
    H, W = img.shape[:2]
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    model = get_model()
    boxes = None
    for call in (
        lambda: model.predict_tile(image=rgb, patch_size=400, patch_overlap=0.25),
        lambda: model.predict_image(image=rgb),
    ):
        try:
            boxes = call()
            break
        except Exception as exc:  # noqa: BLE001
            log.warning("predict failed: %s", exc)

    trees = []
    if boxes is not None and len(boxes):
        for _, r in boxes.iterrows():
            trees.append({"cx": float((r["xmin"] + r["xmax"]) / 2.0),
                          "cy": float((r["ymin"] + r["ymax"]) / 2.0)})
    log.info("detected %d trees (image %dx%d, up=%.2f, species=%s)", len(trees), W, H, up, species)
    return {"width": W, "height": H, "trees": trees, "engine": "deepforest"}
