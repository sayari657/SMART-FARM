"""
Smart Farm AI - Poultry Animal Module (scaffold)
Extensible module for Broiler / Layer flock monitoring.
"""

POULTRY_FEATURES = ["coop_temperature", "humidity", "ammonia", "sound_level", "bird_count"]

POULTRY_CV_CLASSES = {
    "chicken":  {"severity": "info",     "description": "Live chicken detected"},
    "crowding": {"severity": "warning",  "description": "Abnormal crowding behaviour"},
    "dead_bird":{"severity": "critical", "description": "Dead bird detected"},
    "feeder":   {"severity": "info",     "description": "Feed activity at feeder"},
    "waterline":{"severity": "info",     "description": "Water consumption activity"},
    "pecking":  {"severity": "warning",  "description": "Aggressive pecking behaviour"},
}

POULTRY_THRESHOLDS = {
    "temp_max":       28.0,   # °C — heat stress (broilers)
    "temp_min":       18.0,   # °C — cold stress
    "humidity_max":   80.0,   # %
    "ammonia_max":    25.0,   # ppm — welfare limit
    "bird_count_drop_pct": 2.0,  # % drop indicating mortality event
}

POULTRY_MODULE_NOTES = """
Extend this module with:
- Feed conversion ratio (FCR) tracking
- Uniformity scoring from computer vision
- Water-to-feed ratio monitoring
- Disease outbreak pattern recognition (Newcastle, Gumboro)
"""
