"""
Anomaly ML Service — Isolation Forest sur la télémétrie IoT
============================================================
Ferme la boucle du modèle Anomaly (colonnes isolation_score +
feature_contributions déjà en base) avec un vrai détecteur non supervisé :

  - Fenêtre glissante de télémétrie par unité (48 h par défaut).
  - Matrice de features = toutes les métriques numériques du JSON
    (temperature, humidity, soil, weight, …).
  - IsolationForest (contamination 5 %) → score ∈ [-0.5, 0.5]
    (plus négatif = plus anormal).
  - Explicabilité : contribution par feature = |z-score| de la mesure
    vs la distribution de la fenêtre (stocké dans feature_contributions).
  - Déduplication : pas de nouvelle anomalie IF si une non-acquittée
    existe déjà pour l'unité dans les 6 dernières heures.

Lancé par le job APScheduler n°6 (scan horaire) et exposable à la demande.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any, Optional

import numpy as np

logger = logging.getLogger(__name__)

try:
    from sklearn.ensemble import IsolationForest
    _SKLEARN = True
except ImportError:                                   # pragma: no cover
    _SKLEARN = False
    logger.warning("scikit-learn absent — détection IsolationForest désactivée")

WINDOW_HOURS = 48
MIN_POINTS = 24            # minimum de points pour ajuster le modèle
CONTAMINATION = 0.05
DEDUP_HOURS = 6
SCORE_CRITICAL = -0.15     # score IF en dessous → critical
SCORE_WARNING = -0.05


def _numeric_metrics(metrics: dict) -> dict[str, float]:
    out = {}
    for k, v in (metrics or {}).items():
        if isinstance(v, (int, float)) and not isinstance(v, bool):
            out[k] = float(v)
    return out


def _build_matrix(records) -> tuple[np.ndarray, list[str], list]:
    """Matrice (n_points, n_features) sur l'union des clés numériques."""
    keys: set[str] = set()
    parsed = []
    for r in records:
        m = _numeric_metrics(r.metrics)
        if m:
            parsed.append((r, m))
            keys.update(m)
    if not parsed:
        return np.empty((0, 0)), [], []
    feature_names = sorted(keys)
    X = np.full((len(parsed), len(feature_names)), np.nan)
    for i, (_, m) in enumerate(parsed):
        for j, k in enumerate(feature_names):
            if k in m:
                X[i, j] = m[k]
    # Imputation par moyenne de colonne (capteur silencieux ≠ anomalie)
    col_means = np.nanmean(X, axis=0)
    idx = np.where(np.isnan(X))
    X[idx] = np.take(col_means, idx[1])
    return X, feature_names, [r for r, _ in parsed]


def _contributions(X: np.ndarray, row: int, names: list[str]) -> dict[str, float]:
    """|z-score| de chaque feature du point vs la fenêtre (explicabilité)."""
    mu = X.mean(axis=0)
    sd = X.std(axis=0) + 1e-8
    z = np.abs((X[row] - mu) / sd)
    return {n: round(float(v), 2) for n, v in
            sorted(zip(names, z), key=lambda t: -t[1])}


def scan_unit(db, unit_id: int, window_hours: int = WINDOW_HOURS) -> Optional[dict[str, Any]]:
    """Détecte une anomalie IF sur la fenêtre récente d'une unité.
    Crée une ligne Anomaly si le dernier point est anormal. Retourne un
    résumé ou None si rien d'anormal / données insuffisantes."""
    if not _SKLEARN:
        return None

    from app.models.domain import Anomaly, TelemetryRecord

    since = datetime.utcnow() - timedelta(hours=window_hours)
    records = (
        db.query(TelemetryRecord)
        .filter(TelemetryRecord.unit_id == unit_id, TelemetryRecord.timestamp >= since)
        .order_by(TelemetryRecord.timestamp.asc())
        .all()
    )
    if len(records) < MIN_POINTS:
        return None

    X, names, rows = _build_matrix(records)
    if X.shape[0] < MIN_POINTS or X.shape[1] == 0:
        return None

    model = IsolationForest(
        n_estimators=100, contamination=CONTAMINATION, random_state=42,
    )
    model.fit(X)
    scores = model.decision_function(X)        # négatif = anormal
    last_idx = len(rows) - 1
    last_score = float(scores[last_idx])

    if last_score >= SCORE_WARNING:
        return None                            # dernier point normal

    # Déduplication
    recent_dup = (
        db.query(Anomaly)
        .filter(
            Anomaly.unit_id == unit_id,
            Anomaly.anomaly_type == "isolation_forest",
            Anomaly.is_acknowledged == False,  # noqa: E712
            Anomaly.timestamp >= datetime.utcnow() - timedelta(hours=DEDUP_HOURS),
        )
        .first()
    )
    if recent_dup:
        return None

    contribs = _contributions(X, last_idx, names)
    top = list(contribs.items())[:3]
    severity = "critical" if last_score <= SCORE_CRITICAL else "warning"
    description = (
        "Profil télémétrique anormal (Isolation Forest) — métriques déviantes : "
        + ", ".join(f"{k} (z={v})" for k, v in top)
    )

    anomaly = Anomaly(
        unit_id=unit_id,
        anomaly_type="isolation_forest",
        description=description,
        severity=severity,
        isolation_score=round(last_score, 4),
        rules_triggered=[f"if_score<{SCORE_CRITICAL if severity == 'critical' else SCORE_WARNING}"],
        feature_contributions=contribs,
    )
    db.add(anomaly)
    db.commit()

    logger.info("IsolationForest: anomalie %s unité %s (score=%.3f)",
                severity, unit_id, last_score)
    return {
        "unit_id": unit_id,
        "severity": severity,
        "isolation_score": round(last_score, 4),
        "top_features": dict(top),
        "window_points": len(rows),
    }


def scan_all_units(db) -> list[dict[str, Any]]:
    """Scanne toutes les unités ayant de la télémétrie récente."""
    from app.models.domain import TelemetryRecord

    since = datetime.utcnow() - timedelta(hours=WINDOW_HOURS)
    unit_ids = [
        uid for (uid,) in
        db.query(TelemetryRecord.unit_id)
        .filter(TelemetryRecord.timestamp >= since)
        .distinct()
        .all()
    ]
    found = []
    for uid in unit_ids:
        try:
            res = scan_unit(db, uid)
            if res:
                found.append(res)
        except Exception as exc:
            logger.warning("Scan IF unité %s : %s", uid, exc)
    return found
