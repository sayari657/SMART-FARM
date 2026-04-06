import os
import json
import time
import random
from datetime import datetime
import paho.mqtt.client as mqtt
try:
    from ultralytics import YOLO
    HAS_YOLO = True
except ImportError:
    HAS_YOLO = False

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
SCENARIO = os.getenv("SCENARIO", "normal").lower()
HIVE_ID = 1

client = mqtt.Client(client_id="cv_inference")
while True:
    try:
        client.connect(MQTT_BROKER, MQTT_PORT)
        break
    except Exception:
        time.sleep(2)
client.loop_start()

# Path to the custom bee detection model
MODEL_PATH = r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\animal_weights\bee\final_export\best.pt"

def run_real_inference():
    print(f"Loading YOLO OBB model from {MODEL_PATH}...")
    try:
        model = YOLO(MODEL_PATH)
        print("Model loaded successfully!")
    except Exception as e:
        print(f"Error loading model: {e}")
        return
    
    # Using source=0 (camera) for real-time stream with a lower confidence threshold for sensitivity
    print("Starting camera feed (source=0)...")
    results = model.predict(source=0, stream=True, conf=0.25, imgsz=768) 
    
    for r in results:
        # Note: For OBB, we use r.obb instead of r.boxes
        items = r.obb if hasattr(r, 'obb') and r.obb is not None else r.boxes
        
        if items and len(items) > 0:
            print(f"--- Detected {len(items)} objects ---")
            for item in items:
                cls = int(item.cls[0])
                conf = float(item.conf[0])
                class_name = model.names[cls]
                
                # Detected classes: bee, drone, pollenbee, queen
                payload = {
                    "unit_id": HIVE_ID,
                    "object_class": class_name,
                    "confidence": conf,
                    "bounding_box": str(item.xywhr[0].tolist()) if hasattr(item, 'xywhr') else str(item.xywh[0].tolist()),
                    "severity": "critical" if class_name == 'queen' else "info",
                    "timestamp": datetime.utcnow().isoformat()
                }
                client.publish(f"hive/{HIVE_ID}/cv", json.dumps(payload))
                print(f"  > {class_name.upper()} | Confidence: {conf:.2f}")
        
        # Slight delay to keep the MQTT stream manageable
        time.sleep(0.3)

def run_simulated_inference():
    print("Running CV Inference in SIMULATION mode.")
    step = 0
    while True:
        detections = []
        if random.random() > 0.2:
            detections.append({"object_class": "bee", "confidence": random.uniform(0.7, 0.98), "bounding_box": "[100, 100, 50, 50]"})
            
        if SCENARIO == "fire" and step > 4:
            detections.append({"object_class": "smoke", "confidence": random.uniform(0.8, 0.99), "bounding_box": "[0, 0, 200, 200]"})
        
        elif SCENARIO == "predator" and step > 2:
            detections.append({"object_class": "predator", "confidence": random.uniform(0.6, 0.95), "bounding_box": "[50, 50, 100, 100]"})
        
        for d in detections:
            client.publish(f"hive/{HIVE_ID}/cv", json.dumps(d))
            print(f"Simulated CV: {d['object_class']} ({d['confidence']:.2f})")
            
        step += 1
        time.sleep(4)

if __name__ == "__main__":
    if os.path.exists(MODEL_PATH) and HAS_YOLO:
        run_real_inference()
    else:
        print(f"Model {MODEL_PATH} not found. Falling back to simulation.")
        run_simulated_inference()
