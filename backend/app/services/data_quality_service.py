"""
Data Quality Service — Smart Farm AI v3.0
==========================================
Valide et surveille la qualité des données télémétriques avant insertion.

Fonctionnalités :
  - Range checks par métrique (bornes physiques réalistes)
  - Spike detection (valeur > N σ par rapport à l'historique)
  - Completeness tracking (données manquantes)
  - Quality score agrégé (0-100)
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Plages physiques valides par métrique
# ---------------------------------------------------------------------------
METRIC_RANGES: dict[str, tuple[float, float]] = {
    # Sol / irrigation
    "temperature":      (-10.0, 60.0),
    "temp":             (-10.0, 60.0),
    "humidity":         (0.0,   100.0),
    "soil":             (0.0,   100.0),   # humidité sol %
    "soil_moisture":    (0.0,   100.0),
    "pressure":         (0.0,   10.0),    # bar
    "flow":             (0.0,   500.0),   # L/min

    # Ruche / apiculture
    "hive_temp":        (10.0,  55.0),    # °C
    "brood_temp":       (28.0,  40.0),    # °C (couvain : 34-36°C normal)
    "hive_weight":      (0.0,   200.0),   # kg
    "ext_temp":         (-10.0, 55.0),
    "ext_hum":          (0.0,   100.0),
    "weight":           (0.0,   200.0),

    # Volaille
    "sound_level":      (30.0,  120.0),   # dB
    "ammonia":          (0.0,   100.0),   # ppm
    "co2":              (0.0,   5000.0),  # ppm
    "bird_count":       (0.0,   100000.0),

    # Bovin
    "body_temperature": (35.0,  42.5),    # °C
    "milk_yield":       (0.0,   60.0),    # L/jour
    "activity":         (0.0,   100.0),
    "rumination":       (0.0,   600.0),   # min/jour
    "respiratory_rate": (10.0,  80.0),    # resp/min
}

# Seuil de spike detection (nb d'écarts-types)
SPIKE_SIGMA_THRESHOLD = 5.0

# Minimum de points historiques pour spike detection
MIN_HISTORY_FOR_SPIKE = 5


# ---------------------------------------------------------------------------
# Core validation
# ---------------------------------------------------------------------------

def check_metric_range(metric: str, value: float) -> tuple[bool, str | None]:
    """Vérifie qu'une valeur est dans les bornes physiques."""
    key = metric.lower()
    if key not in METRIC_RANGES:
        return True, None

    lo, hi = METRIC_RANGES[key]
    if not (lo <= value <= hi):
        return False, f"{metric}={value} hors bornes [{lo}, {hi}]"
    return True, None


def check_spike(metric: str, value: float, history: list[float]) -> tuple[bool, dict[str, Any]]:
    """Détecte un spike : valeur > SPIKE_SIGMA_THRESHOLD σ par rapport à l'historique."""
    if len(history) < MIN_HISTORY_FOR_SPIKE:
        return False, {"z_score": None, "warning": None}

    arr = np.array(history, dtype=float)
    mean = float(np.mean(arr))
    std = float(np.std(arr))
    if std < 1e-6:
        return False, {"z_score": 0.0, "warning": None}

    z_score = abs(value - mean) / std
    is_spike = z_score > SPIKE_SIGMA_THRESHOLD
    return is_spike, {
        "z_score": round(z_score, 2),
        "mean": round(mean, 4),
        "std": round(std, 4),
        "warning": f"Spike détecté : {metric}={value} (z={z_score:.1f}σ)" if is_spike else None,
    }


def check_telemetry_quality(
    metrics: dict[str, float],
    history_by_metric: dict[str, list[float]] | None = None,
) -> dict[str, Any]:
    """
    Valide un enregistrement télémétriques complet.

    Parameters
    ----------
    metrics : dict clé→valeur des métriques de ce relevé
    history_by_metric : dict clé→liste des valeurs historiques récentes (optionnel)

    Returns
    -------
    dict avec : valid (bool), issues (list), quality_score (0-100), flags
    """
    issues = []
    flags: dict[str, Any] = {}
    history_by_metric = history_by_metric or {}

    for metric, value in metrics.items():
        if value is None:
            issues.append(f"Valeur manquante pour {metric}")
            continue
        try:
            val = float(value)
        except (TypeError, ValueError):
            issues.append(f"Valeur non numérique pour {metric}: {value!r}")
            continue

        # Range check
        in_range, range_warning = check_metric_range(metric, val)
        if not in_range:
            issues.append(range_warning)
            flags[f"{metric}_out_of_range"] = True

        # Spike check
        if metric in history_by_metric:
            is_spike, spike_details = check_spike(metric, val, history_by_metric[metric])
            if is_spike:
                issues.append(spike_details["warning"])
                flags[f"{metric}_spike"] = True
                flags[f"{metric}_z_score"] = spike_details["z_score"]

    n_metrics = len(metrics)
    n_issues = len(issues)
    quality_score = max(0, round(100 * (1 - n_issues / max(n_metrics, 1))))

    return {
        "valid": n_issues == 0,
        "issues": issues,
        "quality_score": quality_score,
        "flags": flags,
        "n_metrics_checked": n_metrics,
        "n_issues": n_issues,
    }


# ---------------------------------------------------------------------------
# Quality report from DB
# ---------------------------------------------------------------------------

def get_quality_report(db, unit_id: int, days: int = 7) -> dict[str, Any]:
    """
    Rapport de qualité agrégé sur les N derniers jours pour une unité.
    """
    from app.models.domain import TelemetryRecord

    since = datetime.utcnow() - timedelta(days=days)
    records = (
        db.query(TelemetryRecord)
        .filter(TelemetryRecord.unit_id == unit_id, TelemetryRecord.timestamp >= since)
        .order_by(TelemetryRecord.timestamp.asc())
        .all()
    )

    if not records:
        return {
            "unit_id": unit_id,
            "days": days,
            "total_records": 0,
            "completeness": 0.0,
            "outliers_detected": 0,
            "quality_score": 0,
            "message": "Aucune donnée dans la période sélectionnée",
        }

    # Collect history per metric for spike detection
    history_by_metric: dict[str, list[float]] = {}
    outliers = 0
    all_issues: list[str] = []

    for rec in records:
        metrics = rec.metrics or {}
        # Build history window (all previous records for this metric)
        result = check_telemetry_quality(metrics, history_by_metric)
        outliers += result["n_issues"]
        all_issues.extend(result["issues"])

        # Update history
        for k, v in metrics.items():
            if v is not None:
                history_by_metric.setdefault(k, []).append(float(v))

    # Completeness: detect gaps > 2× median interval
    timestamps = [r.timestamp for r in records]
    intervals = [(timestamps[i+1] - timestamps[i]).total_seconds()
                 for i in range(len(timestamps)-1)]
    completeness = 1.0
    if intervals:
        median_interval = float(np.median(intervals))
        gaps = sum(1 for iv in intervals if iv > 3 * median_interval)
        completeness = round(1.0 - gaps / len(intervals), 3)

    # Aggregate quality score
    total_checks = sum(len(r.metrics or {}) for r in records)
    quality_score = max(0, round(100 * (1 - outliers / max(total_checks, 1))))

    # Most frequent issues
    from collections import Counter
    issue_counts = Counter(all_issues)
    top_issues = [{"issue": k, "count": v} for k, v in issue_counts.most_common(5)]

    return {
        "unit_id": unit_id,
        "days": days,
        "total_records": len(records),
        "completeness": completeness,
        "outliers_detected": outliers,
        "quality_score": quality_score,
        "top_issues": top_issues,
        "metrics_tracked": list(history_by_metric.keys()),
        "period_start": records[0].timestamp.isoformat(),
        "period_end": records[-1].timestamp.isoformat(),
    }
