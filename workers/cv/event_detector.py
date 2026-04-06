"""
Smart Farm AI - CV Event Detector
Stateful event aggregator: de-duplication, track management, and severity escalation.
"""

import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from dataclasses import dataclass, field

logger = logging.getLogger(__name__)


@dataclass
class DetectionTrack:
    object_class: str
    unit_id: str
    first_seen: datetime      = field(default_factory=datetime.utcnow)
    last_seen:  datetime      = field(default_factory=datetime.utcnow)
    count:      int           = 1
    max_confidence: float     = 0.0
    severity:   str           = "info"
    escalated:  bool          = False


# Classes that escalate in severity on repeated detection
ESCALATION_MAP = {
    "predator":  {"threshold_count": 2, "escalate_to": "critical"},
    "smoke":     {"threshold_count": 1, "escalate_to": "warning"},
    "fire":      {"threshold_count": 1, "escalate_to": "critical"},
    "dead_bird": {"threshold_count": 1, "escalate_to": "critical"},
    "crowding":  {"threshold_count": 3, "escalate_to": "warning"},
    "limping":   {"threshold_count": 2, "escalate_to": "warning"},
}

# Classes that are always just informational
INFO_CLASSES = {"bee", "cow", "standing", "lying", "feeding", "chicken", "feeder", "waterline", "sheep", "goat"}


class EventDetector:
    """
    Processes raw CV inference results into meaningful events.
    - Maintains a sliding window track per (unit_id, class)
    - Escalates severity on repeated detections
    - Suppresses duplicate events within the suppression window
    """

    def __init__(self, suppression_window_sec: int = 300):
        self._tracks: Dict[str, DetectionTrack] = {}
        self._suppression_window = timedelta(seconds=suppression_window_sec)

    def _track_key(self, unit_id: str, obj_class: str) -> str:
        return f"{unit_id}::{obj_class}"

    def process(self, unit_id: str, obj_class: str, confidence: float, 
                camera_id: str = "") -> Optional[dict]:
        """
        Process a single detection. Returns an event dict if it should be stored,
        or None if it is suppressed as a duplicate.
        """
        now = datetime.utcnow()
        key = self._track_key(unit_id, obj_class)
        track = self._tracks.get(key)

        if track and (now - track.last_seen) < self._suppression_window:
            # Within suppression window — update track but do not emit new event
            track.last_seen    = now
            track.count       += 1
            track.max_confidence = max(track.max_confidence, confidence)
            self._maybe_escalate(track)
            logger.debug(f"Suppressed duplicate {obj_class} for {unit_id} (count={track.count})")
            return None

        # New track or window expired — emit event
        severity = self._initial_severity(obj_class)
        if not track:
            track = DetectionTrack(
                object_class=obj_class, unit_id=unit_id,
                first_seen=now, last_seen=now,
                count=1, max_confidence=confidence, severity=severity,
            )
        else:
            track.last_seen    = now
            track.count       += 1
            track.max_confidence = max(track.max_confidence, confidence)
            track.severity    = severity

        self._tracks[key] = track
        self._maybe_escalate(track)

        return {
            "unit_id":    unit_id,
            "timestamp":  now.isoformat(),
            "object_class": obj_class,
            "confidence": confidence,
            "severity":   track.severity,
            "camera_id":  camera_id,
            "frame_metadata": {
                "track_count": track.count,
                "first_seen":  track.first_seen.isoformat(),
            },
        }

    def _initial_severity(self, obj_class: str) -> str:
        if obj_class in INFO_CLASSES:
            return "info"
        esc = ESCALATION_MAP.get(obj_class, {})
        return esc.get("escalate_to", "warning")

    def _maybe_escalate(self, track: DetectionTrack):
        if track.escalated:
            return
        esc = ESCALATION_MAP.get(track.object_class, {})
        if track.count >= esc.get("threshold_count", 999):
            track.severity = esc.get("escalate_to", track.severity)
            track.escalated = True
            logger.warning(f"ESCALATED: {track.object_class} on {track.unit_id} → {track.severity}")

    def purge_old_tracks(self, max_age_hours: int = 24):
        """Remove stale tracks outside the max age window."""
        cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
        before = len(self._tracks)
        self._tracks = {k: t for k, t in self._tracks.items() if t.last_seen >= cutoff}
        logger.debug(f"Purged {before - len(self._tracks)} stale tracks")


event_detector = EventDetector()
