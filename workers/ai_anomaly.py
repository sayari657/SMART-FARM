import paho.mqtt.client as mqtt_client
import json
import os
import time
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest

import yaml

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))

# DVC MLOps Parameter Management
params = {}
if os.path.exists("params.yaml"):
    with open("params.yaml", "r") as f:
        params = yaml.safe_load(f).get("ai_anomaly", {})

n_estimators = params.get("n_estimators", 100)
contamination = params.get("contamination", 0.1)
random_state = params.get("random_state", 42)

clf = IsolationForest(n_estimators=n_estimators, contamination=contamination, random_state=random_state)
history = []
latest_cv = []

def analyze_hive(data):
    alerts = []
    
    temp = data.get("temperature", 35.0)
    sound = data.get("sound_level", 50.0)
    weight = data.get("weight", 45.0)
    
    activity = max(0, min(100, (sound - 30) * 2))
    health = 100
    swarm_risk = 0

    if activity < 30 and temp > 38.0:
        alerts.append({
            "type": "CRITICAL", 
            "msg": "Hive Danger: Heat Stress",
            "priority": "HIGH",
            "root_cause": f"Extreme internal temperature ({temp}°C) combined with critically low activity ({activity}%).",
            "suggested_action": "Inspect immediately. Provide emergency ventilation and water source.",
            "impact": "Imminent colony collapse and brood death due to overheating."
        })
        health -= 30
        
    if len(history) > 10:
        avg_weight = np.mean([h['weight'] for h in history[-10:]])
        if abs(weight - avg_weight) > 3.0:
            alerts.append({
                "type": "WARNING", 
                "msg": "Abnormal Weight Fluctuation",
                "priority": "MEDIUM",
                "root_cause": f"Weight shifted drastically from {avg_weight:.1f}kg to {weight}kg in a short span.",
                "suggested_action": "Check for swarming signs or potential honey theft.",
                "impact": "Loss of productive workforce or honey stores."
            })
            swarm_risk += 60
            health -= 20
            
    if sound > 80.0:
        alerts.append({
            "type": "WARNING", 
            "msg": "Abnormal Acoustic Pattern",
            "priority": "LOW",
            "root_cause": f"Sound level spiked to {sound} dB, indicating high agitation.",
            "suggested_action": "Schedule a routine check for pests or queenlessness.",
            "impact": "Reduced productivity and increased stress levels."
        })
        health -= 15

    smoke = any(cv['object_class'] == 'smoke' for cv in latest_cv)
    predator = any(cv['object_class'] == 'predator' or cv['object_class'] == 'wasp' or cv['object_class'] == 'hornet' for cv in latest_cv)
    
    if smoke and temp > 37.0:
        alerts.append({
            "type": "CRITICAL", 
            "msg": "Fire Alert Triggered",
            "priority": "HIGH",
            "root_cause": f"Computer Vision detected opaque smoke accompanied by rapid temperature rise ({temp}°C).",
            "suggested_action": "Dispatch emergency response immediately. Secure the perimeter.",
            "impact": "Total destruction of apiary assets and surrounding property."
        })
        health -= 50
        
    if predator and activity < 40:
        alerts.append({
            "type": "CRITICAL", 
            "msg": "Predation Risk: Active Threat",
            "priority": "HIGH",
            "root_cause": "Visual detection of hornets/wasps combined with suppressed bee activity.",
            "suggested_action": "Install entrance reducers and hornet traps immediately.",
            "impact": "Colony decimation by aggressive predators."
        })
        health -= 40
        
    if len(history) > 50:
        df = pd.DataFrame(history[-50:])
        features = df[['temperature', 'humidity', 'weight', 'sound_level']]
        clf.fit(features)
        
        current_features = pd.DataFrame([data])
        prediction = clf.predict(current_features)
        
        if prediction[0] == -1:
            alerts.append({
                "type": "INFO", 
                "msg": "AI Isolation Forest Anomaly",
                "priority": "LOW",
                "root_cause": "The multi-dimensional array of telemetry violated the 90th percentile bounds of normal historical variance.",
                "suggested_action": "Monitor closely. No immediate action required unless symptoms compound.",
                "impact": "Early indicator of subtle disease or environmental shift."
            })
            health -= 10
            
    return alerts, max(0, health), activity, min(100, swarm_risk)

def on_message(client, userdata, msg):
    topic = msg.topic
    try:
        payload = json.loads(msg.payload.decode())
        hive_id = topic.split('/')[1]
        
        if "cv" in topic:
            latest_cv.append(payload)
            if len(latest_cv) > 5: latest_cv.pop(0)
            
        elif "telemetry" in topic:
            history.append(payload)
            if len(history) > 200: history.pop(0)
            
            alerts, health_score, activity_score, swarm_risk = analyze_hive(payload)
            
            health_payload = {
                "health_score": health_score,
                "activity_score": activity_score,
                "swarm_risk": swarm_risk
            }
            client.publish(f"hive/{hive_id}/health", json.dumps(health_payload))
            
            for alert in alerts:
                alert_payload = {
                    "alert_type": alert['type'],
                    "message": alert['msg'],
                    "priority": alert.get("priority"),
                    "root_cause": alert.get("root_cause"),
                    "suggested_action": alert.get("suggested_action"),
                    "impact": alert.get("impact")
                }
                client.publish(f"hive/{hive_id}/alert", json.dumps(alert_payload))
                
    except Exception as e:
        pass

def run():
    client = mqtt_client.Client(client_id="ai_anomaly_worker")
    client.on_message = on_message
    while True:
        try:
            client.connect(MQTT_BROKER, MQTT_PORT)
            client.subscribe("hive/#")
            client.loop_forever()
        except Exception:
            time.sleep(2)

if __name__ == "__main__":
    run()
