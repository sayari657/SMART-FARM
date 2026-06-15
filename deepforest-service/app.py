"""
DeepForest microservice — isolated tree-crown detection.

Runs in its OWN venv with its OWN torch (does NOT touch the main backend's
torch 2.11 / YOLO models). The Smart Farm backend POSTs a satellite image here
and gets back crown centroids (pixel coords); the backend maps them to GPS and
stores the trees.

Run:
  cd deepforest-service
  python -m venv .venv && .venv\\Scripts\\activate
  pip install -r requirements.txt
  uvicorn app:app --host 0.0.0.0 --port 8800

Then in backend/.env:  DEEPFOREST_URL=http://localhost:8800
"""
import logging

import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("deepforest-svc")

app = FastAPI(title="DeepForest Service")
_model = None


def get_model():
    """Lazy-load the pretrained DeepForest crown detector (downloads once)."""
    global _model
    if _model is None:
        from deepforest import main as df_main
        _model = df_main.deepforest()
        # DeepForest 2.x: pretrained tree-crown model from HuggingFace
        try:
            _model.load_model("weecology/deepforest-tree")
        except Exception as exc:
            logger.warning("named load_model failed (%s) → default", exc)
            _model.load_model()
        logger.info("DeepForest model loaded.")
    return _model


@app.get("/health")
def health():
    return {"status": "ok", "model": "deepforest"}


@app.post("/detect")
async def detect(file: UploadFile = File(...), patch: int = 400, overlap: float = 0.25):
    """Detect tree crowns; returns centroids in the uploaded image's pixel space."""
    data = await file.read()
    img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)
    if img is None:
        return {"width": 0, "height": 0, "count": 0, "trees": [], "error": "bad image"}
    h, w = img.shape[:2]
    rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    model = get_model()
    df = None
    try:
        # predict_tile slices the image into windows → high recall on big areas
        df = model.predict_tile(image=rgb, patch_size=patch, patch_overlap=overlap)
    except Exception as exc:
        logger.warning("predict_tile failed (%s) → predict_image", exc)
        try:
            df = model.predict_image(image=rgb)
        except Exception as exc2:
            logger.error("predict_image failed: %s", exc2)

    trees = []
    if df is not None and len(df):
        for _, r in df.iterrows():
            trees.append({
                "cx": float((r["xmin"] + r["xmax"]) / 2),
                "cy": float((r["ymin"] + r["ymax"]) / 2),
                "score": float(r.get("score", 0) or 0),
            })
    logger.info("Detected %d crowns on %dx%d image", len(trees), w, h)
    return {"width": w, "height": h, "count": len(trees), "trees": trees}
