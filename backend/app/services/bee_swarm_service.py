"""
Bee Swarm Prediction — risque d'essaimage par télémétrie de ruche
=================================================================
Signal principal (littérature apicole + dataset HiveEyes Würzburg/Schwartau) :
une chute de poids brutale (≥ 1,5-2 kg en moins de 2 h) signale un essaimage
en cours ; la congestion (gain soutenu + T° couvain élevée) en période
d'essaimage (mars-juin) signale un risque imminent.

Features extraites de la télémétrie (balance + sonde couvain du nœud ESP32) :
  - delta_poids_1h / delta_poids_24h (kg)
  - pente_poids_7j (kg/jour, régression linéaire)
  - deviation_temp_couvain (écart à 35 °C, optimum biologique)
  - saison (mois courant)

Si un modèle ML entraîné existe (mlops/train_swarm_model.py →
ai_assets/anomaly_detection/swarm_model.joblib), son score est combiné
au score expert (moyenne pondérée 60/40).

Sources de données, par ordre de priorité :
  1. TelemetryRecord (metrics JSON contenant weight + hive_temp)
  2. iot/iot_telemetry.csv (collecteur Wokwi NODE_B)
"""

from __future__ import annotations

import csv
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)

IOT_CSV = Path(__file__).resolve().parents[3] / "iot" / "iot_telemetry.csv"
MODEL_PATH = Path(__file__).resolve().parents[3] / "ai_assets" / "anomaly_detection" / "swarm_model.joblib"

# Alias de métriques (CSV FR + firmware EN + JSON DB)
WEIGHT_KEYS = {"weight", "poids ruche", "poids", "hive_weight"}
BROOD_KEYS = {"hive_temp", "temp couvain", "brood_temp", "couvain"}

SWARM_SEASON_MONTHS = (3, 4, 5, 6)
BROOD_OPTIMAL_C = 35.0


# ---------------------------------------------------------------------------
# Chargement télémétrie
# ---------------------------------------------------------------------------

def _norm(metric: str) -> str:
    return (metric or "").strip().lower()


def load_csv_series() -> list[dict[str, Any]]:
    """Série {ts, weight, hive_temp} depuis le CSV du collecteur IoT (NODE_B)."""
    if not IOT_CSV.exists():
        return []
    points: dict[str, dict[str, Any]] = {}
    try:
        with open(IOT_CSV, encoding="utf-8") as f:
            for row in csv.DictReader(f):
                node = (row.get("Node") or "").upper()
                if "B" not in node:        # NODE_B / Node B (Rucher)
                    continue
                m = _norm(row.get("Metric"))
                try:
                    val = float(row.get("Value"))
                except (TypeError, ValueError):
                    continue
                ts = row.get("Timestamp")
                p = points.setdefault(ts, {"ts": ts})
                if m in WEIGHT_KEYS:
                    p["weight"] = val
                elif m in BROOD_KEYS:
                    p["hive_temp"] = val
    except Exception as exc:
        logger.warning("Lecture CSV IoT impossible : %s", exc)
        return []
    series = [p for _, p in sorted(points.items()) if "weight" in p]
    return series


def load_db_series(db, limit: int = 500) -> list[dict[str, Any]]:
    """Série depuis TelemetryRecord (metrics JSON avec une clé poids)."""
    try:
        from app.models.domain import TelemetryRecord
        records = (
            db.query(TelemetryRecord)
            .order_by(TelemetryRecord.timestamp.desc())
            .limit(limit)
            .all()
        )
    except Exception:
        return []
    series = []
    for r in reversed(records):
        metrics = r.metrics or {}
        lower = {_norm(k): v for k, v in metrics.items()}
        weight = next((lower[k] for k in WEIGHT_KEYS if k in lower), None)
        if weight is None:
            continue
        brood = next((lower[k] for k in BROOD_KEYS if k in lower), None)
        series.append({
            "ts": r.timestamp.isoformat() if r.timestamp else None,
            "weight": float(weight),
            "hive_temp": float(brood) if brood is not None else None,
        })
    return series


# ---------------------------------------------------------------------------
# Features + score
# ---------------------------------------------------------------------------

def _parse_ts(ts: str) -> Optional[datetime]:
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(ts[:19], fmt)
        except (ValueError, TypeError):
            continue
    return None


def extract_features(series: list[dict[str, Any]]) -> Optional[dict[str, float]]:
    if len(series) < 3:
        return None
    pts = [(p, _parse_ts(p["ts"])) for p in series]
    pts = [(p, t) for p, t in pts if t is not None]
    if len(pts) < 3:
        return None

    last_p, last_t = pts[-1]

    def delta_over(hours: float) -> float:
        """Variation de poids sur la fenêtre passée (kg)."""
        for p, t in pts:
            if (last_t - t).total_seconds() <= hours * 3600:
                return last_p["weight"] - p["weight"]
        return last_p["weight"] - pts[0][0]["weight"]

    # Pente sur 7 j par moindres carrés (kg/jour)
    week = [(p, t) for p, t in pts if (last_t - t).total_seconds() <= 7 * 86400]
    slope = 0.0
    if len(week) >= 2:
        xs = [(t - week[0][1]).total_seconds() / 86400 for _, t in week]
        ys = [p["weight"] for p, _ in week]
        n = len(xs)
        mx, my = sum(xs) / n, sum(ys) / n
        den = sum((x - mx) ** 2 for x in xs)
        slope = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / den if den else 0.0

    temps = [p["hive_temp"] for p, _ in pts[-24:] if p.get("hive_temp") is not None]
    brood_dev = (sum(temps) / len(temps) - BROOD_OPTIMAL_C) if temps else 0.0

    return {
        "delta_1h": round(delta_over(1), 2),
        "delta_24h": round(delta_over(24), 2),
        "slope_7d": round(slope, 3),
        "brood_dev": round(brood_dev, 2),
        "month": last_t.month,
        "weight": round(last_p["weight"], 2),
        "n_points": len(pts),
    }


def expert_score(f: dict[str, float]) -> tuple[float, list[str]]:
    """Score expert 0-100 + signaux explicatifs (règles littérature apicole)."""
    score = 0.0
    signals: list[str] = []
    in_season = f["month"] in SWARM_SEASON_MONTHS

    if f["delta_1h"] <= -1.5:
        score += 60
        signals.append(f"Chute brutale {f['delta_1h']:+.1f} kg en 1 h — essaim probablement parti ou vol")
    elif f["delta_1h"] <= -0.8:
        score += 35
        signals.append(f"Chute suspecte {f['delta_1h']:+.1f} kg en 1 h")

    if f["delta_24h"] <= -2.0 and f["delta_1h"] > -0.8:
        score += 25
        signals.append(f"Perte {f['delta_24h']:+.1f} kg sur 24 h")

    if f["brood_dev"] >= 1.5:
        score += 15
        signals.append(f"T° couvain élevée (+{f['brood_dev']:.1f} °C vs 35 °C) — congestion/surchauffe")

    if in_season:
        score += 15
        signals.append("Période d'essaimage (mars-juin)")
        if f["slope_7d"] >= 0.3:
            score += 10
            signals.append(f"Gain soutenu {f['slope_7d']:+.2f} kg/j sur 7 j — colonie forte, risque congestion")

    return min(100.0, score), signals


def _ml_score(f: dict[str, float]) -> Optional[float]:
    """Probabilité du modèle ML si entraîné (mlops/train_swarm_model.py)."""
    if not MODEL_PATH.exists():
        return None
    try:
        import joblib
        model = joblib.load(MODEL_PATH)
        X = [[f["delta_1h"], f["delta_24h"], f["slope_7d"], f["brood_dev"], f["month"]]]
        return float(model.predict_proba(X)[0][1]) * 100.0
    except Exception as exc:
        logger.warning("Modèle essaimage indisponible : %s", exc)
        return None


def _level(score: float) -> str:
    if score >= 70:
        return "critical"
    if score >= 45:
        return "high"
    if score >= 25:
        return "moderate"
    return "low"


_RECOMMENDATIONS = {
    "critical": "Inspecter IMMÉDIATEMENT : vérifier cellules royales, poser une hausse, "
                "préparer une ruchette de capture. Si essaim parti : chercher la grappe à proximité.",
    "high": "Inspection sous 48 h : détruire/cueillir les cellules royales, aérer, "
            "ajouter une hausse pour décongestionner.",
    "moderate": "Surveillance rapprochée : vérifier l'espace disponible et la ponte de la reine.",
    "low": "Situation normale — suivi hebdomadaire standard.",
}


def compute_swarm_risk(db=None) -> dict[str, Any]:
    """Risque d'essaimage à partir de la meilleure source de télémétrie disponible."""
    source = "telemetry_db"
    series = load_db_series(db) if db is not None else []
    if len(series) < 3:
        series = load_csv_series()
        source = "iot_csv"
    if len(series) < 3:
        return {"available": False,
                "reason": "Télémétrie ruche insuffisante (balance connectée requise)"}

    f = extract_features(series)
    if not f:
        return {"available": False, "reason": "Horodatage télémétrie illisible"}

    score, signals = expert_score(f)
    ml = _ml_score(f)
    if ml is not None:
        score = round(0.6 * score + 0.4 * ml, 1)
        signals.append(f"Modèle ML (HiveEyes) : {ml:.0f} %")

    level = _level(score)
    return {
        "available": True,
        "source": source,
        "score": round(score),
        "level": level,
        "signals": signals or ["Aucun signal d'essaimage détecté"],
        "features": f,
        "recommendation": _RECOMMENDATIONS[level],
        "series_tail": [
            {"ts": p["ts"], "weight": p["weight"]} for p in series[-48:]
        ],
    }
