import os
import json
import time
import base64
import requests
from datetime import datetime
import paho.mqtt.client as mqtt
try:
    from ultralytics import YOLO
    import cv2
    HAS_LIBS = True
except ImportError:
    HAS_LIBS = False

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
HIVE_ID = os.getenv("HIVE_ID", 1)
# Support for RTSP or local camera
CAMERA_SOURCE = os.getenv("CAMERA_SOURCE", "0") 
if CAMERA_SOURCE.isdigit():
    CAMERA_SOURCE = int(CAMERA_SOURCE)

client = mqtt.Client(client_id="cv_sovereign_worker")
while True:
    try:
        client.connect(MQTT_BROKER, MQTT_PORT)
        break
    except Exception:
        time.sleep(2)
client.loop_start()

MODEL_PATH = r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\animal_weights\bee\final_export\best.pt"

def get_llava_reasoning(frame, discovery):
    """Trigger Llava for a 'Second Opinion' and logical reasoning."""
    print(f"--- 🧠 TRIGGERING SOVEREIGN REASONING (Llava) for {discovery} ---")
    _, buffer = cv2.imencode('.jpg', frame)
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    
    prompt = f"Analyze this agricultural camera frame. We detected {discovery}. Explain the situation and provide a Tunisian Derja alert if it is dangerous."
    
    try:
        response = requests.post(f"{OLLAMA_URL}/api/generate", json={
            "model": "llava",
            "prompt": prompt,
            "images": [img_base64],
            "stream": False
        }, timeout=45)
        return response.json().get("response", "No reasoning available.")
    except Exception as e:
        return f"Reasoning Error: {str(e)}"

def run_sovereign_inference():
    print(f"Loading YOLO OBB model from {MODEL_PATH}...")
    model = YOLO(MODEL_PATH)
    
    print(f"Starting Sovereign Vision on source: {CAMERA_SOURCE}...")
    cap = cv2.VideoCapture(CAMERA_SOURCE)
    
    last_reasoning_time = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret: break
        
        # YOLO Detection
        results = model.predict(frame, conf=0.3, verbose=False)
        
        for r in results:
            items = r.obb if hasattr(r, 'obb') and r.obb is not None else r.boxes
            if items and len(items) > 0:
                for item in items:
                    class_name = model.names[int(item.cls[0])]
                    conf = float(item.conf[0])
                    
                    # Core Discovery Payload
                    payload = {
                        "unit_id": HIVE_ID,
                        "object_class": class_name,
                        "confidence": conf,
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    
                    # If CRITICAL (e.g. predator, queen), trigger Llava reasoning
                    # Limit rate to once every 30 seconds to avoid GPU overload
                    if (class_name in ['predator', 'smoke', 'queen']) and (time.time() - last_reasoning_time > 30):
                        reasoning = get_llava_reasoning(frame, class_name)
                        payload["sovereign_reasoning"] = reasoning
                        last_reasoning_time = time.time()
                    
                    client.publish(f"hive/{HIVE_ID}/cv", json.dumps(payload))
                    print(f"Detected: {class_name} ({conf:.2f})")
        
        # Optional: Show window for local debug
        # cv2.imshow('Smart Farm Sovereign Vision', frame)
        if cv2.waitKey(1) & 0xFF == ord('q'): break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    if HAS_LIBS and os.path.exists(MODEL_PATH):
        run_sovereign_inference()
    else:
        print("Required libraries (CV2/Ultralytics) missing or model not found.")
