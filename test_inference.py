import os
from PIL import Image
import io
try:
    from ultralytics import YOLO
    print("Ultralytics found.")
except ImportError as e:
    print(f"Ultralytics NOT found: {e}")
    exit(1)

# Model path as specified by user
MODEL_PATH = r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\animal_weights\bee\final_export\best.pt"
if not os.path.exists(MODEL_PATH):
    print(f"Model NOT found at {MODEL_PATH}")
    exit(1)

model = YOLO(MODEL_PATH)
print("Model loaded.")

# Generic image for testing
img = Image.new('RGB', (640, 640), color=(73, 109, 137))
results = model.predict(img, conf=0.25)
print(f"Results: {len(results)} image(s) processed.")
for r in results:
    items = r.obb if hasattr(r, 'obb') and r.obb is not None else r.boxes
    print(f"Detections: {len(items) if items is not None else 0}")
