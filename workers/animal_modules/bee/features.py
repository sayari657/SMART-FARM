"""
Smart Farm AI - Bee Animal Module
Fully implemented species module for Honeybee (Apis mellifera) monitoring.
"""

# --------------- Features -----------------------------------------------

BEE_FEATURES = ["temperature", "humidity", "hive_weight", "sound_level"]

BEE_FEATURE_RANGES = {
    "temperature":  (30.0, 38.0),   # °C — optimal colony temp
    "humidity":     (40.0, 80.0),   # % — hive humidity
    "hive_weight":  (10.0, 80.0),   # kg — production hive
    "sound_level":  (30.0, 75.0),   # dB — acoustic activity
}

# --------------- CV Classes ---------------------------------------------

BEE_CV_CLASSES = {
    "bee":          {"severity": "info",     "description": "Normal honeybee activity detected"},
    "predator":     {"severity": "critical", "description": "Potential predator at hive entrance"},
    "smoke":        {"severity": "warning",  "description": "Smoke detected near hive"},
    "fire":         {"severity": "critical", "description": "Fire confirmed near hive"},
    "varroa_mite":  {"severity": "warning",  "description": "Varroa mite infestation indicators"},
}

# --------------- Thresholds (defaults, overridden by DB settings) --------

BEE_THRESHOLDS = {
    "temp_max":           36.0,   # °C — heat stress alert
    "temp_min":           32.0,   # °C — low temperature alert
    "humidity_min":       45.0,   # %
    "humidity_max":       85.0,   # %
    "weight_drop_24h":    1.5,    # kg — swarming / theft alert
    "sound_spike_db":     65.0,   # dB — abnormal acoustic event
}

# --------------- Seasonal Notes -----------------------------------------

BEE_SEASONAL_GUIDANCE = {
    "spring":  "Monitor for swarm cells. Colony should be growing rapidly.",
    "summer":  "Watch for heat stress and water availability. Peak foraging season.",
    "autumn":  "Prepare for winter. Check food stores and treat for varroa.",
    "winter":  "Minimal disturbance. Monitor weight for starvation risk.",
}
