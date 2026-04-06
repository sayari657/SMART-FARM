"""
Smart Farm AI - MQTT Consumer
Subscribes to all telemetry topics, parses payloads, and stores via HTTP API.
Run: python mqtt_consumer.py
"""

import json
import logging
import requests
import paho.mqtt.client as mqtt
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s [MQTT] %(message)s")
logger = logging.getLogger(__name__)

MQTT_BROKER   = "localhost"
MQTT_PORT     = 1883
TOPIC_PREFIX  = "smart_farm"
SUBSCRIBE_ALL = f"{TOPIC_PREFIX}/#"
API_BASE      = "http://localhost:8000/api/v1"

# Simple auth token cache — replace with env var / secure vault in production
_TOKEN_CACHE = {"token": None}


def _get_token() -> str:
    if _TOKEN_CACHE["token"]:
        return _TOKEN_CACHE["token"]
    resp = requests.post(f"{API_BASE}/auth/login",
                         json={"username": "admin", "password": "admin123"})
    resp.raise_for_status()
    _TOKEN_CACHE["token"] = resp.json()["access_token"]
    return _TOKEN_CACHE["token"]


def _post_telemetry(unit_identifier: str, metrics: dict, timestamp: str, source: str = "mqtt"):
    """POST a telemetry record to the backend API.
    In production, you would resolve unit_identifier → DB unit_id via a lookup cache.
    Here we trust the simulator to embed the correct unit_id.
    """
    token = _get_token()
    # NOTE: In production, maintain an in-memory map {identifier: db_id}
    # For demo, we POST with identifier as unit_id placeholder
    headers = {"Authorization": f"Bearer {token}"}
    payload = {
        "unit_id": 1,  # resolved dynamically in production
        "timestamp": timestamp,
        "metrics": metrics,
        "source": source,
    }
    try:
        r = requests.post(f"{API_BASE}/telemetry", json=payload, headers=headers, timeout=5)
        if r.status_code == 201:
            logger.debug(f"Stored telemetry for {unit_identifier}")
        else:
            logger.warning(f"API error {r.status_code}: {r.text[:100]}")
    except Exception as e:
        logger.error(f"Failed to post telemetry: {e}")


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        logger.info(f"Connected to MQTT broker. Subscribing to {SUBSCRIBE_ALL}")
        client.subscribe(SUBSCRIBE_ALL, qos=1)
    else:
        logger.error(f"MQTT connection failed with code {rc}")


def on_message(client, userdata, msg):
    try:
        topic_parts = msg.topic.split("/")
        # Expected: smart_farm/<species>/<unit_id>/telemetry
        if len(topic_parts) < 4 or topic_parts[-1] != "telemetry":
            return
        species    = topic_parts[1]
        unit_id    = topic_parts[2]
        payload    = json.loads(msg.payload.decode("utf-8"))
        metrics    = payload.get("metrics", {})
        timestamp  = payload.get("timestamp", datetime.utcnow().isoformat())
        logger.info(f"[{species}/{unit_id}] {metrics}")
        _post_telemetry(unit_id, metrics, timestamp, source="mqtt")
    except Exception as e:
        logger.error(f"Error processing message on {msg.topic}: {e}")


def run():
    client = mqtt.Client(client_id="smart_farm_consumer")
    client.on_connect = on_connect
    client.on_message = on_message
    client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
    logger.info("MQTT consumer started — waiting for messages...")
    client.loop_forever()


if __name__ == "__main__":
    run()
