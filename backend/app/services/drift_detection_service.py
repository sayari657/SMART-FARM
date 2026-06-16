"""
Data Drift Detection Service — Smart Farm AI v3.0
Monitors distribution shifts in:
  - CV detection labels (class frequency drift)
  - Telemetry sensor readings (mean/std drift)
  - Confidence scores (model degradation signal)
Uses Population Stability Index (PSI) and Z-score for alerting.
"""
import logging
import os
from collections import Counter
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

PSI_WARNING  = float(os.getenv("PSI_WARNING",  "0.1"))   # PSI > threshold → moderate drift
PSI_CRITICAL = float(os.getenv("PSI_CRITICAL", "0.2"))   # PSI > threshold → significant drift


def _psi(expected: np.ndarray, actual: np.ndarray, buckets: int = 10) -> float:
    """Population Stability Index between two distributions."""
    eps = 1e-8
    breakpoints = np.linspace(0, 100, buckets + 1)
    exp_pct = np.histogram(expected, bins=np.percentile(expected, breakpoints))[0] / len(expected) + eps
    act_pct = np.histogram(actual,   bins=np.percentile(expected, breakpoints))[0] / len(actual)   + eps
    return float(np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct)))


def _label_psi(baseline: Counter, current: Counter) -> Tuple[float, dict]:
    """PSI for categorical label distributions."""
    all_labels = set(baseline) | set(current)
    eps = 1e-8
    b_total = sum(baseline.values()) or 1
    c_total = sum(current.values())  or 1
    psi = 0.0
    detail = {}
    for label in all_labels:
        b_pct = (baseline.get(label, 0) / b_total) + eps
        c_pct = (current.get(label, 0)  / c_total) + eps
        label_psi = (c_pct - b_pct) * np.log(c_pct / b_pct)
        psi += label_psi
        detail[label] = round(label_psi, 4)
    return round(psi, 4), detail


class DriftDetectionService:
    """Detects data/model drift by comparing recent vs baseline distributions."""

    def __init__(self, db: Session):
        self.db = db

    # ── CV Label Drift ─────────────────────────────────────────────────────────
    def detect_cv_label_drift(
        self,
        category: str,
        baseline_days: int = 30,
        recent_days:   int = 7,
    ) -> Dict:
        """Compare label distribution: last 7 days vs previous 30 days."""
        from app.models.domain import CVEvent

        cutoff_baseline = datetime.utcnow() - timedelta(days=baseline_days + recent_days)
        cutoff_recent   = datetime.utcnow() - timedelta(days=recent_days)

        baseline_events = (
            self.db.query(CVEvent.object_class)
            .filter(CVEvent.camera_id == category,
                    CVEvent.timestamp >= cutoff_baseline,
                    CVEvent.timestamp < cutoff_recent)
            .all()
        )
        recent_events = (
            self.db.query(CVEvent.object_class)
            .filter(CVEvent.camera_id == category,
                    CVEvent.timestamp >= cutoff_recent)
            .all()
        )

        if not baseline_events or not recent_events:
            return {"status": "insufficient_data", "category": category, "psi": None}

        baseline_counts = Counter(e[0] for e in baseline_events)
        recent_counts   = Counter(e[0] for e in recent_events)
        psi, detail     = _label_psi(baseline_counts, recent_counts)

        severity = "ok"
        if psi > PSI_CRITICAL:
            severity = "critical"
        elif psi > PSI_WARNING:
            severity = "warning"

        return {
            "category":        category,
            "psi":             psi,
            "severity":        severity,
            "baseline_n":      sum(baseline_counts.values()),
            "recent_n":        sum(recent_counts.values()),
            "label_psi":       detail,
            "baseline_top3":   baseline_counts.most_common(3),
            "recent_top3":     recent_counts.most_common(3),
            "baseline_days":   baseline_days,
            "recent_days":     recent_days,
            "checked_at":      datetime.utcnow().isoformat(),
        }

    # ── Confidence Score Drift ─────────────────────────────────────────────────
    def detect_confidence_drift(
        self,
        category: str,
        baseline_days: int = 30,
        recent_days:   int = 7,
    ) -> Dict:
        """Detect if model confidence scores are degrading (model drift)."""
        from app.models.domain import CVEvent

        cutoff_baseline = datetime.utcnow() - timedelta(days=baseline_days + recent_days)
        cutoff_recent   = datetime.utcnow() - timedelta(days=recent_days)

        def get_confs(start, end):
            rows = (
                self.db.query(CVEvent.confidence)
                .filter(CVEvent.camera_id == category,
                        CVEvent.timestamp >= start,
                        CVEvent.timestamp < end,
                        CVEvent.confidence.isnot(None))
                .all()
            )
            return np.array([r[0] for r in rows], dtype=float)

        baseline_confs = get_confs(cutoff_baseline, cutoff_recent)
        recent_confs   = get_confs(cutoff_recent, datetime.utcnow())

        if len(baseline_confs) < 5 or len(recent_confs) < 5:
            return {"status": "insufficient_data", "category": category}

        b_mean, b_std = float(np.mean(baseline_confs)), float(np.std(baseline_confs))
        r_mean = float(np.mean(recent_confs))

        z_score  = abs(r_mean - b_mean) / (b_std + 1e-8)
        psi      = _psi(baseline_confs, recent_confs) if len(baseline_confs) > 10 else 0.0
        degraded = r_mean < b_mean - 2 * b_std

        return {
            "category":      category,
            "baseline_mean": round(b_mean, 4),
            "recent_mean":   round(r_mean, 4),
            "z_score":       round(z_score, 3),
            "psi":           round(psi, 4),
            "degraded":      degraded,
            "severity":      "critical" if degraded else ("warning" if z_score > 2 else "ok"),
            "checked_at":    datetime.utcnow().isoformat(),
        }

    # ── Telemetry Drift ────────────────────────────────────────────────────────
    def detect_telemetry_drift(
        self,
        unit_id: int,
        feature: str = "temperature",
        baseline_days: int = 30,
        recent_days:   int = 7,
    ) -> Dict:
        """Detect drift in IoT sensor readings (temperature, humidity, weight…)."""
        from app.models.domain import TelemetryReading

        cutoff_baseline = datetime.utcnow() - timedelta(days=baseline_days + recent_days)
        cutoff_recent   = datetime.utcnow() - timedelta(days=recent_days)

        def get_vals(start, end):
            rows = (
                self.db.query(TelemetryReading)
                .filter(TelemetryReading.unit_id == unit_id,
                        TelemetryReading.timestamp >= start,
                        TelemetryReading.timestamp < end)
                .all()
            )
            return np.array([getattr(r, feature, None) for r in rows
                             if getattr(r, feature, None) is not None], dtype=float)

        baseline = get_vals(cutoff_baseline, cutoff_recent)
        recent   = get_vals(cutoff_recent, datetime.utcnow())

        if len(baseline) < 5 or len(recent) < 5:
            return {"status": "insufficient_data", "unit_id": unit_id, "feature": feature}

        b_mean, b_std = float(np.mean(baseline)), float(np.std(baseline))
        r_mean        = float(np.mean(recent))
        z_score       = abs(r_mean - b_mean) / (b_std + 1e-8)

        return {
            "unit_id":       unit_id,
            "feature":       feature,
            "baseline_mean": round(b_mean, 3),
            "recent_mean":   round(r_mean, 3),
            "z_score":       round(z_score, 3),
            "severity":      "critical" if z_score > 3 else ("warning" if z_score > 2 else "ok"),
            "checked_at":    datetime.utcnow().isoformat(),
        }

    # ── Full Audit ─────────────────────────────────────────────────────────────
    def run_full_audit(self, categories: Optional[List[str]] = None) -> Dict:
        """Run drift check for all CV categories and return summary."""
        if categories is None:
            categories = ["bee", "goat", "livestock", "chicken", "rabbit",
                          "leaves", "olive", "insects", "fire"]
        results = []
        alerts  = []
        for cat in categories:
            try:
                label_r = self.detect_cv_label_drift(cat)
                conf_r  = self.detect_confidence_drift(cat)
                results.append({"category": cat, "label_drift": label_r, "conf_drift": conf_r})
                if label_r.get("severity") in ("warning", "critical"):
                    alerts.append(f"Label drift [{label_r['severity']}] in {cat} — PSI={label_r['psi']}")
                if conf_r.get("severity") in ("warning", "critical"):
                    alerts.append(f"Confidence drift [{conf_r['severity']}] in {cat}")
            except Exception as e:
                logger.warning(f"Drift check failed for {cat}: {e}")

        return {
            "audited_at":   datetime.utcnow().isoformat(),
            "categories_n": len(categories),
            "alerts_n":     len(alerts),
            "alerts":       alerts,
            "results":      results,
        }
