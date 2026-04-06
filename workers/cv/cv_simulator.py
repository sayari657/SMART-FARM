"""
Smart Farm AI - CV Simulator
Generates fake computer vision detection events and posts them via HTTP API.
"""

import time
import json
import random
import logging
import requests
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s [CV-SIM] %(message)s")
logger = logging.getLogger(__name__)

API_BASE = "http://localhost:8000/api/v1"

# CV class pools per species with associated severities
CV_POOLS = {
    "bee": [
        {"class": "bee",      "severity": "info",     "weight": 70},
        {"class": "predator", "severity": "critical",  "weight": 5},
        {"class": "smoke",    "severity": "warning",   "weight": 3},
        {"class": "fire",     "severity": "critical",  "weight": 1},
        {"class": "varroa_mite", "severity": "warning","weight": 8},
    ],
    "cow": [
        {"class": "cow",      "severity": "info",     "weight": 60},
        {"class": "standing", "severity": "info",     "weight": 20},
        {"class": "lying",    "severity": "info",     "weight": 15},
        {"class": "limping",  "severity": "warning",  "weight": 3},
        {"class": "feeding",  "severity": "info",     "weight": 10},
    ],
    "poultry": [
        {"class": "chicken",  "severity": "info",     "weight": 60},
        {"class": "crowding", "severity": "warning",  "weight": 8},
        {"class": "dead_bird","severity": "critical", "weight": 2},
        {"class": "feeder",   "severity": "info",     "weight": 15},
        {"class": "waterline","severity": "info",     "weight": 10},
    ],
}

# Maps identifier -> (db_unit_id, species)
UNIT_MAP = {
    "hive_01":          (1, "bee"),
    "hive_02":          (2, "bee"),
    "hive_03":          (3, "bee"),
    "cow_05":           (5, "cow"),
    "cow_12":           (6, "cow"),
    "poultry_house_02": (8, "poultry"),
}

_TOKEN_CACHE = {"token": None}


def _get_token():
    if _TOKEN_CACHE["token"]:
        return _TOKEN_CACHE["token"]
    r = requests.post(f"{API_BASE}/auth/login",
                      json={"username": "admin", "password": "admin123"})
    r.raise_for_status()
    _TOKEN_CACHE["token"] = r.json()["access_token"]
    return _TOKEN_CACHE["token"]


def _pick_class(pool):
    weights = [p["weight"] for p in pool]
    total   = sum(weights)
    r = random.uniform(0, total)
    cumsum = 0
    for item in pool:
        cumsum += item["weight"]
        if r <= cumsum:
            return item
    return pool[0]


def generate_event(unit_id_str: str, db_unit_id: int, species: str) -> dict:
    pool   = CV_POOLS.get(species, CV_POOLS["bee"])
    picked = _pick_class(pool)
    return {
        "unit_id":      db_unit_id,
        "timestamp":    datetime.utcnow().isoformat(),
        "object_class": picked["class"],
        "confidence":   round(random.uniform(0.72, 0.99), 3),
        "severity":     picked["severity"],
        "camera_id":    f"cam_{unit_id_str}",
        "frame_metadata": {
            "frame_id": random.randint(1000, 9999),
            "bbox": [random.randint(0, 300), random.randint(0, 200),
                     random.randint(100, 400), random.randint(100, 300)],
        },
    }


def run(interval: int = 45):
    logger.info(f"CV Simulator started — generating events every {interval}s")
    while True:
        # Pick a random unit
        uid_str, (db_id, species) = random.choice(list(UNIT_MAP.items()))
        event = generate_event(uid_str, db_id, species)

        try:
            token = _get_token()
            r = requests.post(f"{API_BASE}/cv/events", json=event,
                              headers={"Authorization": f"Bearer {token}"}, timeout=5)
            if r.status_code == 201:
                logger.info(f"CV event [{species}/{uid_str}] → {event['object_class']} ({event['severity']}) conf={event['confidence']}")
            else:
                logger.warning(f"API error: {r.status_code}")
        except Exception as e:
            logger.error(f"Failed to post CV event: {e}")

        time.sleep(interval)


if __name__ == "__main__":
    run()
