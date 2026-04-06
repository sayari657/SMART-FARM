"""
Smart Farm AI - Telemetry Parser
Normalizes raw MQTT payloads into standardized telemetry records.
"""

import json
import logging
from datetime import datetime
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)


class TelemetryParser:
    """
    Parses and normalizes raw MQTT message payloads.
    Handles different payload formats from various IoT hardware vendors.
    """

    def parse(self, topic: str, raw_payload: bytes) -> Optional[Dict[str, Any]]:
        """
        Parse an MQTT message into a normalized telemetry record.

        Topic convention:
            smart_farm/<species>/<unit_identifier>/telemetry

        Returns:
            {
                "species":    str,
                "unit_id":    str,
                "timestamp":  str (ISO8601),
                "metrics":    dict,
                "source":     "mqtt",
            }
            or None if parsing fails.
        """
        try:
            parts = topic.split("/")
            if len(parts) < 4 or parts[-1] != "telemetry":
                logger.debug(f"Skipping non-telemetry topic: {topic}")
                return None

            species    = parts[1]
            unit_id    = parts[2]
            payload    = json.loads(raw_payload.decode("utf-8"))
            metrics    = self._extract_metrics(payload, species)
            timestamp  = payload.get("timestamp", datetime.utcnow().isoformat())

            return {
                "species":   species,
                "unit_id":   unit_id,
                "timestamp": timestamp,
                "metrics":   metrics,
                "source":    "mqtt",
            }

        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error on {topic}: {e}")
        except Exception as e:
            logger.error(f"Parse error on {topic}: {e}")
        return None

    def _extract_metrics(self, payload: dict, species: str) -> Dict[str, float]:
        """
        Extract numeric metrics from payload, applying species-specific
        validation and unit conversions.
        """
        raw_metrics = payload.get("metrics", payload)
        metrics     = {}

        for key, value in raw_metrics.items():
            try:
                val = float(value)
                # Apply species-specific range clamping
                val = self._clamp(key, val, species)
                metrics[key] = round(val, 3)
            except (TypeError, ValueError):
                logger.debug(f"Skipping non-numeric metric {key}={value}")

        return metrics

    # Acceptable value ranges per metric (for outlier rejection)
    RANGES = {
        "temperature":      (10.0,  50.0),
        "body_temperature": (35.0,  42.0),
        "coop_temperature": (10.0,  40.0),
        "humidity":         (0.0,  100.0),
        "hive_weight":      (0.0,  100.0),
        "sound_level":      (20.0, 120.0),
        "activity":         (0.0,  500.0),
        "rumination":       (0.0,   90.0),
        "milk_yield":       (0.0,   60.0),
        "ammonia":          (0.0,  200.0),
        "bird_count":       (0.0, 5000.0),
        "respiratory_rate": (10.0,  60.0),
    }

    def _clamp(self, key: str, value: float, species: str) -> float:
        rng = self.RANGES.get(key)
        if rng:
            lo, hi = rng
            if value < lo or value > hi:
                logger.warning(f"Out-of-range {key}={value} for {species}, clamping to [{lo},{hi}]")
                return max(lo, min(hi, value))
        return value


telemetry_parser = TelemetryParser()
