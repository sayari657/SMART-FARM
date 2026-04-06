"""
Smart Farm AI - Feature Builder
Transforms raw telemetry records into feature vectors for anomaly detection.
"""

import numpy as np
import pandas as pd
from typing import List, Dict, Any
from datetime import datetime


class FeatureBuilder:
    """
    Builds numerical feature matrices from raw telemetry dictionaries.
    Handles missing values, rolling statistics, and derived features.
    """

    # Rolling window sizes for statistical features
    WINDOWS = [3, 6, 12]   # e.g. 3-point, 6-point, 12-point rolling

    def build(self, records: List[Dict[str, Any]], species: str) -> pd.DataFrame:
        """
        Args:
            records: list of telemetry dicts with {'timestamp': ..., 'metrics': {...}}
            species: 'bee' | 'cow' | 'poultry' | 'sheep' | 'goat'
        Returns:
            DataFrame with raw + derived features, one row per record
        """
        if not records:
            return pd.DataFrame()

        # Flatten metrics into rows
        rows = []
        for r in records:
            m = r.get("metrics", {}) if isinstance(r, dict) else {}
            row = {"timestamp": r.get("timestamp", datetime.utcnow())}
            row.update({k: float(v) for k, v in m.items() if isinstance(v, (int, float))})
            rows.append(row)

        df = pd.DataFrame(rows).sort_values("timestamp").reset_index(drop=True)
        df = df.fillna(method="ffill").fillna(0)

        numeric_cols = [c for c in df.columns if c != "timestamp"]

        # Rolling mean and std features
        for col in numeric_cols:
            for w in self.WINDOWS:
                if len(df) >= w:
                    df[f"{col}_roll{w}_mean"] = df[col].rolling(w, min_periods=1).mean()
                    df[f"{col}_roll{w}_std"]  = df[col].rolling(w, min_periods=1).std().fillna(0)

        # Species-specific derived features
        if species == "bee":
            df = self._bee_features(df)
        elif species == "cow":
            df = self._cow_features(df)
        elif species == "poultry":
            df = self._poultry_features(df)

        return df.drop(columns=["timestamp"], errors="ignore")

    def _bee_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add bee-specific derived features."""
        if "hive_weight" in df.columns:
            df["weight_delta_1h"] = df["hive_weight"].diff().fillna(0)
        if "temperature" in df.columns and "humidity" in df.columns:
            # Heat index proxy
            df["heat_index"] = df["temperature"] - 0.55 * (1 - df["humidity"] / 100) * (df["temperature"] - 14.5)
        return df

    def _cow_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add cow-specific derived features."""
        if "activity" in df.columns and "rumination" in df.columns:
            # Welfare composite: high activity + sufficient rumination = healthy
            df["welfare_index"] = (df["activity"] / 200 + df["rumination"] / 60).clip(0, 2)
        if "milk_yield" in df.columns:
            df["milk_delta_1d"] = df["milk_yield"].diff().fillna(0)
        return df

    def _poultry_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Add poultry-specific derived features."""
        if "ammonia" in df.columns and "coop_temperature" in df.columns:
            # Combined stress index
            df["env_stress"] = df["ammonia"] / 25.0 + df["coop_temperature"] / 28.0
        if "bird_count" in df.columns:
            df["bird_count_delta"] = df["bird_count"].diff().fillna(0)
        return df


feature_builder = FeatureBuilder()
