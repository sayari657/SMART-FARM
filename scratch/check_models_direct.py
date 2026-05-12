
import os
import sys
from pathlib import Path

# Fix BASE_DIR logic to match config.py
_BASE_DIR = Path(os.getcwd())

def check_model(category, path):
    print(f"Checking {category} model at {path}")
    if os.path.exists(path):
        try:
            from ultralytics import YOLO
            model = YOLO(path)
            print(f"Names: {model.names}")
        except Exception as e:
            print(f"Error: {e}")
    else:
        print(f"Path does not exist: {path}")

fire_path = str(_BASE_DIR / "ai_assets" / "Alert" / "model-fire-detection-and-smoke" / "best.pt")
check_model("fire", fire_path)
