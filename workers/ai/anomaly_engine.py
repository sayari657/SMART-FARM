"""
Smart Farm AI - Anomaly Detection Engine
Uses Isolation Forest + rule-based explainability for multi-species anomaly detection.
"""

import numpy as np
import pandas as pd
import logging
import json
from datetime import datetime, timedelta
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)


class AnomalyEngine:
    """
    Species-aware anomaly detection using Isolation Forest.
    Each species has its own model trained on its feature set.
    """

    def __init__(self, contamination: float = 0.08, n_estimators: int = 100):
        self.contamination = contamination
        self.n_estimators = n_estimators
        self._models: dict = {}       # species -> IsolationForest
        self._scalers: dict = {}      # species -> StandardScaler
        self._feature_cols: dict = {} # species -> List[str]

    # -----------------------------------------------------------------------
    # Feature definitions per species
    # -----------------------------------------------------------------------

    FEATURES = {
        "bee": ["temperature", "humidity", "hive_weight", "sound_level"],
        "cow": ["body_temperature", "activity", "rumination", "milk_yield"],
        "poultry": ["coop_temperature", "humidity", "ammonia", "sound_level", "bird_count"],
        "sheep": ["body_temperature", "activity", "respiratory_rate"],
        "goat":  ["body_temperature", "activity", "milk_yield"],
    }

    def _extract_features(self, records: list, species: str) -> pd.DataFrame:
        """Extract a numeric feature matrix from a list of telemetry dicts."""
        cols = self.FEATURES.get(species, [])
        rows = []
        for r in records:
            metrics = r.get("metrics", {}) if isinstance(r, dict) else r
            row = {c: float(metrics.get(c, 0.0)) for c in cols}
            rows.append(row)
        df = pd.DataFrame(rows, columns=cols).fillna(0.0)
        return df

    def fit(self, records: list, species: str):
        """Train the Isolation Forest on historical telemetry records."""
        if len(records) < 20:
            logger.warning(f"[{species}] Insufficient data for training ({len(records)} records)")
            return False
        df = self._extract_features(records, species)
        scaler = StandardScaler()
        X = scaler.fit_transform(df)
        model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=42,
        )
        model.fit(X)
        self._models[species] = model
        self._scalers[species] = scaler
        self._feature_cols[species] = list(df.columns)
        logger.info(f"[{species}] IsolationForest trained on {len(records)} samples")
        return True

    def predict(self, record: dict, species: str) -> dict:
        """
        Returns:
            {
              "is_anomaly": bool,
              "isolation_score": float,   # negative = more anomalous
              "feature_contributions": dict
            }
        """
        if species not in self._models:
            # Fit on the single record as fallback (returns neutral)
            return {"is_anomaly": False, "isolation_score": 0.0, "feature_contributions": {}}

        cols = self._feature_cols[species]
        metrics = record.get("metrics", record)
        row = np.array([[float(metrics.get(c, 0.0)) for c in cols]])
        row_scaled = self._scalers[species].transform(row)

        score = self._models[species].score_samples(row_scaled)[0]
        is_anomaly = self._models[species].predict(row_scaled)[0] == -1

        # Feature contributions via mean absolute deviation from training mean
        feature_contribs = {}
        if is_anomaly:
            mean = self._scalers[species].mean_
            std  = self._scalers[species].scale_
            deviations = np.abs((row[0] - mean) / (std + 1e-9))
            total = deviations.sum() + 1e-9
            feature_contribs = {c: round(float(deviations[i] / total), 3)
                                 for i, c in enumerate(cols)}

        return {
            "is_anomaly": bool(is_anomaly),
            "isolation_score": round(float(score), 4),
            "feature_contributions": feature_contribs,
        }

    def batch_predict(self, records: list, species: str) -> list:
        """Score a list of telemetry records. Returns a list of result dicts."""
        if species not in self._models:
            return [{"is_anomaly": False, "isolation_score": 0.0, "feature_contributions": {}}
                    for _ in records]
        cols = self._feature_cols[species]
        rows = []
        for r in records:
            metrics = r.get("metrics", r)
            rows.append([float(metrics.get(c, 0.0)) for c in cols])
        X = np.array(rows)
        X_scaled = self._scalers[species].transform(X)
        scores = self._models[species].score_samples(X_scaled)
        preds  = self._models[species].predict(X_scaled)
        results = []
        mean = self._scalers[species].mean_
        std  = self._scalers[species].scale_
        for i, (score, pred) in enumerate(zip(scores, preds)):
            is_anomaly = pred == -1
            if is_anomaly:
                deviations = np.abs((X[i] - mean) / (std + 1e-9))
                total = deviations.sum() + 1e-9
                fc = {c: round(float(deviations[j] / total), 3) for j, c in enumerate(cols)}
            else:
                fc = {}
            results.append({
                "is_anomaly": bool(is_anomaly),
                "isolation_score": round(float(score), 4),
                "feature_contributions": fc,
            })
        return results


# Singleton for use across workers
anomaly_engine = AnomalyEngine()
