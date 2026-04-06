"""
Smart Farm AI - Cow Animal Module (scaffold)
Extensible module for Dairy/Beef Cattle monitoring.
"""

COW_FEATURES = ["body_temperature", "activity", "rumination", "milk_yield"]

COW_CV_CLASSES = {
    "cow":      {"severity": "info",     "description": "Cow detected in frame"},
    "standing": {"severity": "info",     "description": "Cow in standing posture"},
    "lying":    {"severity": "info",     "description": "Cow lying down"},
    "limping":  {"severity": "warning",  "description": "Gait abnormality / lameness detected"},
    "feeding":  {"severity": "info",     "description": "Feeding behaviour detected"},
    "estrus":   {"severity": "info",     "description": "Estrus behaviour detected"},
}

COW_THRESHOLDS = {
    "temp_max":          39.5,   # °C — fever threshold
    "temp_min":          37.5,   # °C
    "activity_min":      30.0,   # steps/h — low activity alert
    "rumination_min":    20.0,   # min/h — reduced rumination alert
    "milk_drop_pct":     20.0,   # % drop from rolling average
}

COW_FEATURES_NOTES = """
Extend this module with:
- Pedometer-based lameness scoring (locomotion 0-5 scale)
- Automated oestrus detection from activity peaks
- Milk conductivity as mastitis early warning
- Progesterone-based reproductive monitoring
"""
