"""
Smart Farm AI - Explainability Engine
Produces human-readable explanations for anomaly detections and rule triggers.
"""

from typing import Dict, List, Any, Optional
from dataclasses import dataclass


@dataclass
class Explanation:
    anomaly_type: str
    severity: str
    summary: str
    contributing_factors: List[Dict[str, Any]]
    triggered_rules: List[str]
    confidence: float


class ExplainabilityEngine:
    """
    Converts raw anomaly scores + feature contributions into
    structured, human-readable explanations.
    """

    FACTOR_LABELS = {
        # Bee
        "temperature":     "Hive internal temperature",
        "humidity":        "Relative humidity",
        "hive_weight":     "Colony weight",
        "sound_level":     "Acoustic activity level",
        # Cow
        "body_temperature": "Body temperature",
        "activity":         "Physical activity",
        "rumination":       "Rumination time",
        "milk_yield":       "Milk production",
        # Poultry
        "coop_temperature": "Coop environment temperature",
        "ammonia":          "Ammonia concentration",
        "bird_count":       "Flock headcount",
    }

    def explain(
        self,
        species: str,
        metrics: Dict[str, float],
        isolation_score: float,
        feature_contributions: Dict[str, float],
        triggered_rules: List[str],
        anomaly_type: str = "anomaly_detected",
    ) -> Explanation:
        """
        Build a structured explanation from anomaly engine outputs.
        """
        severity   = self._score_to_severity(isolation_score, triggered_rules)
        summary    = self._build_summary(species, anomaly_type, triggered_rules)
        factors    = self._rank_factors(metrics, feature_contributions)
        confidence = self._estimate_confidence(isolation_score, len(triggered_rules))

        return Explanation(
            anomaly_type=anomaly_type,
            severity=severity,
            summary=summary,
            contributing_factors=factors,
            triggered_rules=triggered_rules,
            confidence=round(confidence, 1),
        )

    def _score_to_severity(self, score: float, rules: List[str]) -> str:
        """Map isolation score and rule count to severity label."""
        critical_rules = {"bee_predation_risk", "bee_fire_alert",
                          "poultry_dead_bird", "poultry_ammonia_high"}
        if any(r in critical_rules for r in rules):
            return "critical"
        if score < -0.3 or len(rules) >= 2:
            return "warning"
        if score < -0.1:
            return "warning"
        return "info"

    def _build_summary(self, species: str, anomaly_type: str, rules: List[str]) -> str:
        """Build a one-sentence summary."""
        rule_str = ""
        if rules:
            readable = [r.replace("_", " ").title() for r in rules]
            rule_str = " Rules triggered: " + ", ".join(readable) + "."
        type_str = anomaly_type.replace("_", " ").title()
        return f"[{species.upper()}] {type_str} detected by AI engine.{rule_str}"

    def _rank_factors(
        self, metrics: Dict[str, float], contributions: Dict[str, float]
    ) -> List[Dict[str, Any]]:
        """Return top contributing factors sorted by contribution weight."""
        factors = []
        for key, contrib in sorted(contributions.items(), key=lambda x: -x[1]):
            label = self.FACTOR_LABELS.get(key, key.replace("_", " ").title())
            value = metrics.get(key, None)
            factors.append({
                "feature":      key,
                "label":        label,
                "value":        round(value, 2) if value is not None else None,
                "contribution": round(contrib * 100, 1),   # as percentage
                "direction":    "high" if value and value > 0 else "low",
            })
        return factors[:5]  # top 5 factors

    def _estimate_confidence(self, score: float, rule_count: int) -> float:
        """
        Combine isolation score signal strength with rule evidence count
        into a 0-100 confidence estimate.
        """
        # Score: more negative = more anomalous, range typically -0.5 to 0
        score_conf  = min(100, max(0, (abs(score) / 0.5) * 70))
        rule_conf   = min(30, rule_count * 15)
        return score_conf + rule_conf


explainability_engine = ExplainabilityEngine()
