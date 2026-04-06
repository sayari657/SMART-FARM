import time
import json
import os
import random
import paho.mqtt.client as mqtt

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
HIVE_ID = 1

scenario = os.getenv("SCENARIO", "normal").lower()

client = mqtt.Client(client_id="iot_simulator")
while True:
    try:
        client.connect(MQTT_BROKER, MQTT_PORT)
        break
    except Exception:
        time.sleep(2)
client.loop_start()

print(f"Starting IoT Simulator with scenario: {scenario}")

def get_base_readings():
    return {
        "temperature": round(random.uniform(33.0, 36.0), 2),
        "humidity": round(random.uniform(40.0, 60.0), 2),
        "weight": round(random.uniform(45.0, 46.0), 2),
        "sound_level": round(random.uniform(50.0, 65.0), 2)
    }

step = 0
try:
    while True:
        data = get_base_readings()
        
        if scenario == "fire":
            data["temperature"] += step * 2.0
            data["sound_level"] += step * 5.0
        elif scenario == "predator":
            data["sound_level"] += 20.0
        elif scenario == "danger":
            data["temperature"] = 40.0
            data["sound_level"] = 30.0
        elif scenario == "anomaly":
            data["weight"] -= step * 1.5

        payload = json.dumps(data)
        client.publish(f"hive/{HIVE_ID}/telemetry", payload)
        print(f"Published telemetry: {payload}")
        
        step += 1
        time.sleep(5)
except KeyboardInterrupt:
    client.disconnect()
