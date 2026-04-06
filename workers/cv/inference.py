"""
Smart Farm AI - CV Inference Module (YOLO-ready scaffold)
Wraps model inference with pre/post processing for multi-species detection.

In production: load an actual YOLO .pt model via ultralytics.
In development: uses simulated detections for integration testing.
"""

import logging
import random
import numpy as np
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Detection:
    object_class: str
    confidence: float
    bbox: List[int]           # [x1, y1, x2, y2]
    track_id: Optional[int] = None


class CVInference:
    """
    YOLO-compatible inference wrapper.
    Replace _simulate_detections() with actual model.predict() calls.
    """

    # Species → expected detection classes
    CLASS_POOLS = {
        "bee":     ["bee", "predator", "smoke", "fire", "varroa_mite"],
        "cow":     ["cow", "standing", "lying", "limping", "feeding"],
        "poultry": ["chicken", "crowding", "dead_bird", "feeder", "waterline"],
        "sheep":   ["sheep", "limping", "grazing", "isolated", "predator"],
        "goat":    ["goat", "feeding", "fighting", "limping", "predator"],
    }

    CLASS_WEIGHTS = {            # Relative frequency weights
        "bee":       0.70, "predator": 0.04, "smoke": 0.03, "fire": 0.01, "varroa_mite": 0.06,
        "cow":       0.55, "standing": 0.20, "lying": 0.15, "limping": 0.03, "feeding": 0.10, "estrus": 0.02,
        "chicken":   0.55, "crowding": 0.07, "dead_bird": 0.02, "feeder": 0.15, "waterline": 0.10, "pecking": 0.05,
        "sheep":     0.65, "grazing":  0.20, "isolated":  0.05,
        "goat":      0.65, "fighting": 0.05,
        "limping": 0.03, "predator": 0.04,
    }

    def __init__(self, model_path: Optional[str] = None, device: str = "cpu"):
        self.model_path  = model_path
        self.device      = device
        self._model      = None
        self._is_real_model = False

        if model_path:
            self._load_model(model_path)

    def _load_model(self, path: str):
        """Load a YOLO model. Requires ultralytics package."""
        try:
            from ultralytics import YOLO
            self._model = YOLO(path)
            self._model.to(self.device)
            self._is_real_model = True
            logger.info(f"YOLO model loaded from {path} on {self.device}")
        except ImportError:
            logger.warning("ultralytics not installed — using simulated detections")
        except Exception as e:
            logger.error(f"Model load failed: {e} — using simulated detections")

    def run(self, frame: Optional[np.ndarray], species: str, camera_id: str = "") -> List[Detection]:
        """
        Run inference on a frame.
        If no real model is loaded, returns simulated detections.
        """
        if self._is_real_model and frame is not None:
            return self._run_real(frame, species)
        return self._simulate_detections(species)

    def _run_real(self, frame: np.ndarray, species: str) -> List[Detection]:
        """Run actual YOLO inference (production path)."""
        results = self._model(frame, verbose=False)
        detections = []
        for r in results:
            for box in r.boxes:
                cls   = int(box.cls[0])
                label = self._model.names[cls]
                det   = Detection(
                    object_class=label,
                    confidence=float(box.conf[0]),
                    bbox=[int(x) for x in box.xyxy[0].tolist()],
                )
                detections.append(det)
        return detections

    def _simulate_detections(self, species: str) -> List[Detection]:
        """Generate realistic simulated detections for development/testing."""
        pool = self.CLASS_POOLS.get(species, ["unknown"])
        weights = [self.CLASS_WEIGHTS.get(c, 0.05) for c in pool]
        total   = sum(weights)
        weights = [w / total for w in weights]

        # Simulate 1–4 detections per frame
        n_det = random.choices([1, 2, 3, 4], weights=[0.5, 0.3, 0.15, 0.05])[0]
        dets  = []
        for i in range(n_det):
            cls  = random.choices(pool, weights=weights)[0]
            conf = round(random.uniform(0.65, 0.99), 3)
            bbox = [
                random.randint(0, 400), random.randint(0, 300),
                random.randint(400, 700), random.randint(300, 500),
            ]
            dets.append(Detection(object_class=cls, confidence=conf, bbox=bbox, track_id=i))
        return dets


cv_inference = CVInference()
