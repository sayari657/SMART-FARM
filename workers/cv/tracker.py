"""
Smart Farm AI - CV Object Tracker
Simple IoU-based multi-object tracker for maintaining detection identity across frames.
"""

import numpy as np
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime


@dataclass
class Track:
    track_id:    int
    object_class: str
    bbox:        List[int]       # [x1, y1, x2, y2]
    confidence:  float
    age:         int = 0         # frames since last detection
    hits:        int = 1         # detection confirmations
    first_seen:  datetime = field(default_factory=datetime.utcnow)
    last_seen:   datetime = field(default_factory=datetime.utcnow)


def _iou(box_a: List[int], box_b: List[int]) -> float:
    """Intersection over Union for two bounding boxes [x1,y1,x2,y2]."""
    xa = max(box_a[0], box_b[0])
    ya = max(box_a[1], box_b[1])
    xb = min(box_a[2], box_b[2])
    yb = min(box_a[3], box_b[3])
    inter = max(0, xb - xa) * max(0, yb - ya)
    area_a = (box_a[2]-box_a[0]) * (box_a[3]-box_a[1])
    area_b = (box_b[2]-box_b[0]) * (box_b[3]-box_b[1])
    union = area_a + area_b - inter
    return inter / union if union > 0 else 0.0


class MultiObjectTracker:
    """
    Greedy IoU-based tracker.
    Detections above iou_threshold are matched to existing tracks.
    Unmatched tracks age out after max_age frames.
    """

    def __init__(self, iou_threshold: float = 0.3, max_age: int = 5, min_hits: int = 2):
        self.iou_threshold = iou_threshold
        self.max_age       = max_age
        self.min_hits      = min_hits
        self._tracks: List[Track] = []
        self._next_id = 0

    def update(self, detections: List[dict]) -> List[Track]:
        """
        Update tracks with new detections.
        detections: list of {'object_class', 'confidence', 'bbox'}
        Returns: list of confirmed Track objects (hits >= min_hits)
        """
        now = datetime.utcnow()

        # Age all tracks
        for t in self._tracks:
            t.age += 1

        matched_track_ids = set()
        matched_det_idxs  = set()

        # Greedy matching
        for i, det in enumerate(detections):
            best_iou  = self.iou_threshold
            best_tidx = None
            for j, track in enumerate(self._tracks):
                if track.object_class != det["object_class"]:
                    continue
                iou = _iou(det["bbox"], track.bbox)
                if iou >= best_iou:
                    best_iou  = iou
                    best_tidx = j
            if best_tidx is not None:
                t = self._tracks[best_tidx]
                t.bbox        = det["bbox"]
                t.confidence  = det["confidence"]
                t.hits       += 1
                t.age         = 0
                t.last_seen   = now
                matched_track_ids.add(best_tidx)
                matched_det_idxs.add(i)

        # Create new tracks for unmatched detections
        for i, det in enumerate(detections):
            if i not in matched_det_idxs:
                new_track = Track(
                    track_id=self._next_id,
                    object_class=det["object_class"],
                    bbox=det["bbox"],
                    confidence=det["confidence"],
                )
                self._tracks.append(new_track)
                self._next_id += 1

        # Remove dead tracks
        self._tracks = [t for t in self._tracks if t.age <= self.max_age]

        # Return confirmed tracks
        return [t for t in self._tracks if t.hits >= self.min_hits]

    def reset(self):
        self._tracks.clear()
        self._next_id = 0


tracker = MultiObjectTracker()
