"""
Smart Farm AI - Recommendation Engine
Converts triggered rule results and anomaly scores into actionable recommendations.
"""

from typing import List, Dict, Optional
from dataclasses import dataclass

# Import rule result type
from workers.ai.rule_engine import RuleResult


@dataclass
class RecommendationOutput:
    rule_id: str
    probable_cause: str
    recommendation_text: str
    urgency_level: str   # low | medium | high | critical
    confidence_score: float


# ---------------------------------------------------------------------------
# Recommendation templates, keyed by rule_id
# ---------------------------------------------------------------------------

TEMPLATES: Dict[str, dict] = {

    # BEE
    "bee_heat_stress": {
        "probable_cause": "Elevated hive temperature with low humidity — likely midday sun exposure or ventilation failure.",
        "recommendation_text": (
            "1. Relocate hive to partial shade or install reflective cover.\n"
            "2. Place a water source (shallow tray) within 5 m of the hive.\n"
            "3. Add an upper entrance to improve airflow.\n"
            "4. Inspect brood for signs of heat damage (sunken, discoloured cappings).\n"
            "5. Monitor closely for next 24h."
        ),
        "urgency_level": "high",
        "confidence_score": 87.0,
    },
    "bee_predation_risk": {
        "probable_cause": "Predator (likely hornet / wasp) detected approaching hive entrance with correlated activity anomalies.",
        "recommendation_text": (
            "1. Install entrance reducer to width < 1 cm.\n"
            "2. Set hornet traps baited with fermented fruit within 5 m radius.\n"
            "3. Inspect entrance and surrounding area for nests.\n"
            "4. Remove dead bees at entrance (prevents attracting more predators).\n"
            "5. Schedule follow-up inspection within 48 h."
        ),
        "urgency_level": "critical",
        "confidence_score": 92.0,
    },
    "bee_fire_alert": {
        "probable_cause": "Smoke or fire detected near hive combined with elevated temperature — possible external fire or deliberate smoking event.",
        "recommendation_text": (
            "1. Immediately inspect hive surroundings for fire source.\n"
            "2. If uncontrolled fire: move hives if safe to do so.\n"
            "3. Do NOT open hive during or after fire — bees will be agitated.\n"
            "4. Contact local fire service if fire is uncontrolled.\n"
            "5. Post-event: check queen survival and colony strength."
        ),
        "urgency_level": "critical",
        "confidence_score": 95.0,
    },
    "bee_swarming_suspicion": {
        "probable_cause": "Significant weight drop combined with sound spike — colony may have recently swarmed or is preparing to swarm.",
        "recommendation_text": (
            "1. Perform full hive inspection within 24 h.\n"
            "2. Look for queen cells (emergency or swarm cells).\n"
            "3. If queen is absent: introduce a new queen or allow emergency queen rearing.\n"
            "4. Check for theft signs (hive entrance robbing activity).\n"
            "5. Record weight baseline after inspection."
        ),
        "urgency_level": "high",
        "confidence_score": 79.0,
    },

    # COW
    "cow_fever": {
        "probable_cause": "Elevated body temperature — possible mastitis, respiratory infection, or heat stress.",
        "recommendation_text": (
            "1. Isolate animal from herd immediately.\n"
            "2. Take rectal temperature for accurate reading.\n"
            "3. Call veterinarian if temperature > 40°C or persists > 2 h.\n"
            "4. Provide fresh water and shade.\n"
            "5. Check for other symptoms: nasal discharge, lameness, reduced milk."
        ),
        "urgency_level": "high",
        "confidence_score": 83.0,
    },
    "cow_low_activity": {
        "probable_cause": "Significant activity drop may indicate pain, illness, or post-calving complications.",
        "recommendation_text": (
            "1. Visual inspection for obvious injury (lameness, wounds).\n"
            "2. Check rumen motility by auscultation.\n"
            "3. Record feed and water intake.\n"
            "4. Alert veterinarian if no improvement in 4 h."
        ),
        "urgency_level": "medium",
        "confidence_score": 74.0,
    },
    "cow_milk_yield_drop": {
        "probable_cause": "Sudden milk drop may indicate mastitis, nutritional imbalance, or stress event.",
        "recommendation_text": (
            "1. Perform California Mastitis Test (CMT) on all quarters.\n"
            "2. Check ration composition and feed availability.\n"
            "3. Review recent stressors (transport, pen changes).\n"
            "4. Continue monitoring for 3 days — escalate if persistent."
        ),
        "urgency_level": "medium",
        "confidence_score": 71.0,
    },
    "cow_limping": {
        "probable_cause": "Computer vision detected gait abnormality suggesting lameness.",
        "recommendation_text": (
            "1. Perform locomotion scoring (0–5 scale).\n"
            "2. Lift and clean hooves — check for foot rot, sole ulcer, or white line disease.\n"
            "3. If score ≥ 3: call hoof trimmer / vet.\n"
            "4. Ensure dry lying areas to prevent further hoof deterioration."
        ),
        "urgency_level": "high",
        "confidence_score": 86.0,
    },

    # POULTRY
    "poultry_ammonia_high": {
        "probable_cause": "Elevated ammonia from poorly managed litter or ventilation failure — toxic to birds and workers.",
        "recommendation_text": (
            "1. Open all ventilation panels immediately.\n"
            "2. Apply litter amendment (acidifier or zeolite).\n"
            "3. Reduce stocking density if possible.\n"
            "4. Inspect drinkers for leaks (wet litter increases ammonia).\n"
            "5. Worker PPE (respirator) required for entry until levels < 10 ppm."
        ),
        "urgency_level": "critical",
        "confidence_score": 91.0,
    },
    "poultry_dead_bird": {
        "probable_cause": "Mortality event detected — may indicate infectious disease, environmental failure, or predation.",
        "recommendation_text": (
            "1. Remove and bag dead birds immediately (biosecurity protocol).\n"
            "2. Visual flock assessment for signs of illness (respiratory, neurological).\n"
            "3. Submit carcass samples to diagnostic lab if multiple birds affected.\n"
            "4. Review vaccination history and biosecurity logs.\n"
            "5. Contact veterinarian if mortality rate > 0.5% per day."
        ),
        "urgency_level": "critical",
        "confidence_score": 93.0,
    },
    "poultry_crowding": {
        "probable_cause": "Overcrowding near feeder or water line — may indicate feed or water shortage.",
        "recommendation_text": (
            "1. Check feeder and waterline operation.\n"
            "2. Ensure feeder space ≥ 2.5 cm/bird.\n"
            "3. Verify house temperature — overheating causes clustering.\n"
            "4. Observe flock for 30 min for pecking behaviour."
        ),
        "urgency_level": "medium",
        "confidence_score": 77.0,
    },
    "poultry_high_temp": {
        "probable_cause": "Coop temperature exceeds safe range — risk of heat stress and elevated mortality.",
        "recommendation_text": (
            "1. Activate all fans and cooling pads.\n"
            "2. Add electrolytes to drinking water.\n"
            "3. Avoid feed during hottest part of the day.\n"
            "4. Reduce stocking density if persistent."
        ),
        "urgency_level": "high",
        "confidence_score": 84.0,
    },
}


class RecommendationEngine:
    def generate(self, triggered_rules: List[RuleResult]) -> List[RecommendationOutput]:
        outputs = []
        for rule in triggered_rules:
            template = TEMPLATES.get(rule.rule_id)
            if template:
                outputs.append(RecommendationOutput(
                    rule_id=rule.rule_id,
                    probable_cause=template["probable_cause"],
                    recommendation_text=template["recommendation_text"],
                    urgency_level=template["urgency_level"],
                    confidence_score=template["confidence_score"],
                ))
            else:
                # Generic fallback
                outputs.append(RecommendationOutput(
                    rule_id=rule.rule_id,
                    probable_cause=f"Rule '{rule.label}' triggered: {rule.message}",
                    recommendation_text="Inspect the animal unit and consult your farm manager or veterinarian.",
                    urgency_level="medium",
                    confidence_score=60.0,
                ))
        return outputs


recommendation_engine = RecommendationEngine()
