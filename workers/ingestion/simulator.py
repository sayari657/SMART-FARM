"""
Smart Farm AI - Telemetry Simulator
Generates realistic fake IoT telemetry and publishes via MQTT or HTTP.
Run: python simulator.py
"""

import time
import json
import random
import math
import logging
import argparse
from datetime import datetime
import paho.mqtt.client as mqtt

logging.basicConfig(level=logging.INFO, format="%(asctime)s [SIM] %(message)s")
logger = logging.getLogger(__name__)

MQTT_BROKER = "localhost"
MQTT_PORT = 1883
TOPIC_PREFIX = "smart_farm"

# ---------------------------------------------------------------------------
# Per-species telemetry generators
# ---------------------------------------------------------------------------

def gen_bee(unit_id: str, t: float) -> dict:
    """Simulate honeybee hive metrics with diurnal temperature variation."""
    hour = datetime.utcnow().hour
    temp_base = 34.5 + 2.0 * math.sin(2 * math.pi * (hour - 6) / 24)
    return {
        "unit_id": unit_id,
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": {
            "temperature":  round(temp_base + random.gauss(0, 0.4), 2),
            "humidity":     round(60 + random.gauss(0, 3), 1),
            "hive_weight":  round(28.5 - t * 0.002 + random.gauss(0, 0.1), 3),
            "sound_level":  round(42 + random.gauss(0, 4), 1),
        }
    }

def gen_cow(unit_id: str, t: float) -> dict:
    """Simulate dairy cow health metrics."""
    hour = datetime.utcnow().hour
    activity = max(0, 120 + 80 * math.sin(2 * math.pi * (hour - 9) / 24) + random.gauss(0, 15))
    return {
        "unit_id": unit_id,
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": {
            "body_temperature": round(38.5 + random.gauss(0, 0.2), 2),
            "activity":         round(activity, 0),
            "rumination":       round(max(0, 45 + random.gauss(0, 7)), 1),
            "milk_yield":       round(max(0, 22 + random.gauss(0, 1.5)), 2),
        }
    }

def gen_poultry(unit_id: str, t: float) -> dict:
    """Simulate broiler house environmental metrics."""
    return {
        "unit_id": unit_id,
        "timestamp": datetime.utcnow().isoformat(),
        "metrics": {
            "coop_temperature": round(21 + random.gauss(0, 1.2), 2),
            "humidity":         round(65 + random.gauss(0, 4), 1),
            "ammonia":          round(max(0, 18 + random.gauss(0, 3)), 1),
            "sound_level":      round(55 + random.gauss(0, 6), 1),
            "bird_count":       int(max(0, 480 + random.gauss(0, 10))),
        }
    }

GENERATORS = {
    "bee":     gen_bee,
    "cow":     gen_cow,
    "poultry": gen_poultry,
}

# ---------------------------------------------------------------------------
# Units to simulate (mirrors seed data)
# ---------------------------------------------------------------------------
UNITS = [
    {"id": "hive_01",          "species": "bee"},
    {"id": "hive_02",          "species": "bee"},
    {"id": "hive_03",          "species": "bee"},
    {"id": "cow_05",           "species": "cow"},
    {"id": "cow_12",           "species": "cow"},
    {"id": "cow_18",           "species": "cow"},
    {"id": "poultry_house_02", "species": "poultry"},
]


def run(interval: int = 60):
    client = mqtt.Client(client_id="smart_farm_simulator")
    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    client.loop_start()
    logger.info(f"Simulator started — publishing every {interval}s")
    t = 0
    while True:
        for unit in UNITS:
            gen_fn = GENERATORS.get(unit["species"])
            if not gen_fn:
                continue
            payload = gen_fn(unit["id"], t)
            topic = f"{TOPIC_PREFIX}/{unit['species']}/{unit['id']}/telemetry"
            client.publish(topic, json.dumps(payload), qos=1)
            logger.info(f"Published → {topic}: {payload['metrics']}")
        t += interval
        time.sleep(interval)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--interval", type=int, default=30, help="Seconds between readings")
    args = parser.parse_args()
    run(args.interval)
