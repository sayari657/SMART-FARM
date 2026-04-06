"""
Smart Farm AI - Dataset Replay Worker
Replays historical CSV/JSON telemetry files through the ingestion pipeline.
Useful for backtesting anomaly detection or populating a fresh database.

Usage:
    python dataset_replay.py --file data/bee_hive01_2024.csv --unit hive_01 --species bee
"""

import argparse
import json
import time
import logging
import requests
import csv
import os
from datetime import datetime

logging.basicConfig(level=logging.INFO, format="%(asctime)s [REPLAY] %(message)s")
logger = logging.getLogger(__name__)

API_BASE = os.getenv("API_BASE", "http://localhost:8000/api/v1")
_TOKEN_CACHE = {"token": None}


def _get_token(username="admin", password="admin123"):
    if _TOKEN_CACHE["token"]:
        return _TOKEN_CACHE["token"]
    r = requests.post(f"{API_BASE}/auth/login", json={"username": username, "password": password})
    r.raise_for_status()
    _TOKEN_CACHE["token"] = r.json()["access_token"]
    return _TOKEN_CACHE["token"]


def _post_record(unit_id: int, timestamp: str, metrics: dict, source: str = "replay"):
    token = _get_token()
    payload = {"unit_id": unit_id, "timestamp": timestamp, "metrics": metrics, "source": source}
    r = requests.post(
        f"{API_BASE}/telemetry",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
        timeout=10,
    )
    if r.status_code not in (200, 201):
        logger.warning(f"Post failed: {r.status_code} — {r.text[:80]}")


def replay_json(filepath: str, db_unit_id: int, speed: float = 1.0):
    """Replay a JSON file: list of {timestamp, metrics} dicts."""
    with open(filepath) as f:
        records = json.load(f)
    logger.info(f"Replaying {len(records)} records from {filepath}")
    for rec in records:
        ts      = rec.get("timestamp", datetime.utcnow().isoformat())
        metrics = rec.get("metrics", rec)
        _post_record(db_unit_id, ts, metrics)
        time.sleep(0.1 / max(speed, 0.01))  # respect replay speed
    logger.info("Replay complete.")


def replay_csv(filepath: str, db_unit_id: int, speed: float = 1.0, ts_col: str = "timestamp"):
    """Replay a CSV file: timestamp column + metric columns."""
    with open(filepath, newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
    logger.info(f"Replaying {len(rows)} CSV rows from {filepath}")
    for row in rows:
        ts = row.pop(ts_col, datetime.utcnow().isoformat())
        metrics = {k: float(v) for k, v in row.items() if v.replace(".", "").replace("-", "").isdigit()}
        _post_record(db_unit_id, ts, metrics)
        time.sleep(0.1 / max(speed, 0.01))
    logger.info("CSV replay complete.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Replay historical telemetry into Smart Farm AI")
    parser.add_argument("--file",    required=True,       help="Path to JSON or CSV file")
    parser.add_argument("--unit-id", required=True, type=int, help="Database unit ID")
    parser.add_argument("--speed",   default=1.0, type=float, help="Replay speed multiplier")
    parser.add_argument("--ts-col",  default="timestamp", help="CSV timestamp column name")
    args = parser.parse_args()

    if args.file.endswith(".json"):
        replay_json(args.file, args.unit_id, args.speed)
    elif args.file.endswith(".csv"):
        replay_csv(args.file, args.unit_id, args.speed, args.ts_col)
    else:
        logger.error("Unsupported file format. Use .json or .csv")
