
import os
import sys

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from app.core.config import settings
from ultralytics import YOLO

def check_model(category, path):
    print(f"Checking {category} model at {path}")
    if os.path.exists(path):
        try:
            model = YOLO(path)
            print(f"Names: {model.names}")
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("Path does not exist")

check_model("fire", settings.YOLO_FIRE_PATH)
check_model("livestock", settings.YOLO_GOAT_PATH)
