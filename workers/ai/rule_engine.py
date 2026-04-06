"""
Smart Farm AI - Rule Engine
Evaluates telemetry + CV events against species-specific rule sets.
Returns triggered rule names and severity assessments.
"""

from typing import List, Dict, Optional, Any
from dataclasses import dataclass, field
import logging

logger = logging.getLogger(__name__)


@dataclass
class RuleResult:
    rule_id: str
    label: str
    triggered: bool
    severity: str = "info"   # info | warning | critical
    message: str = ""
    evidence: Dict[str, Any] = field(default_factory=dict)


class RuleEngine:
    """
    Evaluate a set of rule functions against a telemetry snapshot + optional CV events.
    Rules are registered per species via @rule decorators.
    """

    def __init__(self):
        self._rules: Dict[str, List[callable]] = {}

    def register(self, species: str, rule_fn: callable):
        self._rules.setdefault(species, []).append(rule_fn)

    def evaluate(self, species: str, metrics: Dict[str, float],
                 cv_events: Optional[List[dict]] = None,
                 settings: Optional[Dict[str, float]] = None) -> List[RuleResult]:
        rules = self._rules.get(species, [])
        results = []
        for fn in rules:
            try:
                result = fn(metrics, cv_events or [], settings or {})
                if result:
                    results.append(result)
            except Exception as e:
                logger.error(f"Rule {fn.__name__} failed: {e}")
        triggered = [r for r in results if r.triggered]
        logger.debug(f"[{species}] Triggered {len(triggered)}/{len(results)} rules")
        return triggered


# ---------------------------------------------------------------------------
# Global engine singleton
# ---------------------------------------------------------------------------
rule_engine = RuleEngine()


# ===========================================================================
# BEE RULES (fully implemented)
# ===========================================================================

def bee_heat_stress(metrics, cv_events, settings) -> RuleResult:
    temp = metrics.get("temperature", 0)
    humidity = metrics.get("humidity", 100)
    threshold = settings.get("bee_temp_max", 36.0)
    h_min = settings.get("bee_humidity_min", 45.0)
    triggered = temp > threshold and humidity < h_min
    return RuleResult(
        rule_id="bee_heat_stress", label="Heat Stress Risk",
        triggered=triggered, severity="warning",
        message=f"Temperature {temp}°C above {threshold}°C threshold with humidity {humidity}% below {h_min}%",
        evidence={"temperature": temp, "humidity": humidity},
    )


def bee_predation_risk(metrics, cv_events, settings) -> RuleResult:
    predator_detected = any(e.get("object_class") in ("predator", "hornet") for e in cv_events)
    sound_spike = metrics.get("sound_level", 0) > 60
    activity_proxy = metrics.get("hive_weight", 30) < 25
    triggered = predator_detected and (sound_spike or activity_proxy)
    return RuleResult(
        rule_id="bee_predation_risk", label="Predation Risk",
        triggered=triggered, severity="critical",
        message="Predator detected combined with anomalous hive activity indicators",
        evidence={"predator_cv": predator_detected, "sound_level": metrics.get("sound_level")},
    )


def bee_fire_alert(metrics, cv_events, settings) -> RuleResult:
    smoke_detected = any(e.get("object_class") == "smoke" for e in cv_events)
    fire_detected  = any(e.get("object_class") == "fire"  for e in cv_events)
    high_temp = metrics.get("temperature", 0) > 38.0
    triggered = (smoke_detected or fire_detected) and high_temp
    return RuleResult(
        rule_id="bee_fire_alert", label="Fire / Smoke Alert",
        triggered=triggered, severity="critical",
        message="Smoke or fire detected with elevated hive temperature",
        evidence={"smoke": smoke_detected, "fire": fire_detected, "temperature": metrics.get("temperature")},
    )


def bee_swarming_suspicion(metrics, cv_events, settings) -> RuleResult:
    weight = metrics.get("hive_weight", 30)
    drop_threshold = settings.get("bee_weight_drop_alert", 1.5)
    # Proxy: sound spike during daytime suggests swarm departure
    sound = metrics.get("sound_level", 0)
    triggered = weight < (30 - drop_threshold) and sound > 55
    return RuleResult(
        rule_id="bee_swarming_suspicion", label="Swarming Suspicion",
        triggered=triggered, severity="warning",
        message=f"Weight drop below threshold ({weight:.1f} kg) with elevated sound ({sound:.0f} dB) may indicate swarming",
        evidence={"hive_weight": weight, "sound_level": sound},
    )


# Register bee rules
for _fn in [bee_heat_stress, bee_predation_risk, bee_fire_alert, bee_swarming_suspicion]:
    rule_engine.register("bee", _fn)


# ===========================================================================
# COW RULES (scaffold — extend with veterinary thresholds)
# ===========================================================================

def cow_fever(metrics, cv_events, settings) -> RuleResult:
    temp = metrics.get("body_temperature", 38.5)
    threshold = settings.get("cow_temp_max", 39.5)
    triggered = temp > threshold
    return RuleResult(
        rule_id="cow_fever", label="Fever Detected",
        triggered=triggered, severity="warning",
        message=f"Body temperature {temp}°C exceeds {threshold}°C — possible infection or heat stress",
        evidence={"body_temperature": temp},
    )


def cow_low_activity(metrics, cv_events, settings) -> RuleResult:
    activity = metrics.get("activity", 120)
    triggered = activity < 30
    return RuleResult(
        rule_id="cow_low_activity", label="Low Activity",
        triggered=triggered, severity="warning",
        message=f"Activity dropped to {activity} steps/h — check for lameness or illness",
        evidence={"activity": activity},
    )


def cow_milk_yield_drop(metrics, cv_events, settings) -> RuleResult:
    milk = metrics.get("milk_yield", 22)
    triggered = milk < 10
    return RuleResult(
        rule_id="cow_milk_yield_drop", label="Milk Yield Drop",
        triggered=triggered, severity="warning",
        message=f"Milk yield {milk} L/day — significantly below average",
        evidence={"milk_yield": milk},
    )


def cow_limping_detected(metrics, cv_events, settings) -> RuleResult:
    limping = any(e.get("object_class") == "limping" for e in cv_events)
    return RuleResult(
        rule_id="cow_limping", label="Lameness Detected",
        triggered=limping, severity="warning",
        message="Computer vision detected limping behaviour",
        evidence={"cv_class": "limping"},
    )


for _fn in [cow_fever, cow_low_activity, cow_milk_yield_drop, cow_limping_detected]:
    rule_engine.register("cow", _fn)


# ===========================================================================
# POULTRY RULES (scaffold)
# ===========================================================================

def poultry_ammonia_high(metrics, cv_events, settings) -> RuleResult:
    ammonia = metrics.get("ammonia", 0)
    threshold = settings.get("poultry_ammonia_max", 25.0)
    triggered = ammonia > threshold
    return RuleResult(
        rule_id="poultry_ammonia_high", label="High Ammonia",
        triggered=triggered, severity="critical",
        message=f"Ammonia {ammonia} ppm exceeds safe limit {threshold} ppm — ventilate immediately",
        evidence={"ammonia": ammonia},
    )


def poultry_dead_bird(metrics, cv_events, settings) -> RuleResult:
    dead = any(e.get("object_class") == "dead_bird" for e in cv_events)
    return RuleResult(
        rule_id="poultry_dead_bird", label="Mortality Event",
        triggered=dead, severity="critical",
        message="Dead bird detected by computer vision — investigate and remove immediately",
        evidence={"cv_class": "dead_bird"},
    )


def poultry_crowding(metrics, cv_events, settings) -> RuleResult:
    crowding = any(e.get("object_class") == "crowding" for e in cv_events)
    return RuleResult(
        rule_id="poultry_crowding", label="Overcrowding Detected",
        triggered=crowding, severity="warning",
        message="Crowding behaviour detected — check for thermal stress or feed competition",
        evidence={"cv_class": "crowding"},
    )


def poultry_high_temp(metrics, cv_events, settings) -> RuleResult:
    temp = metrics.get("coop_temperature", 21)
    threshold = settings.get("poultry_temp_max", 28.0)
    triggered = temp > threshold
    return RuleResult(
        rule_id="poultry_high_temp", label="High Coop Temperature",
        triggered=triggered, severity="warning",
        message=f"Coop temperature {temp}°C above {threshold}°C — risk of heat stress",
        evidence={"coop_temperature": temp},
    )


for _fn in [poultry_ammonia_high, poultry_dead_bird, poultry_crowding, poultry_high_temp]:
    rule_engine.register("poultry", _fn)
