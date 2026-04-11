import random

def get_rabbit_status(metrics: dict) -> dict:
    """Rabbit-specific logic for v3.0 sovereign cloud."""
    nest_temp = metrics.get('nest_temperature', 20.0)
    feed = metrics.get('feed_consumption', 150)
    
    anomalies = []
    if nest_temp < 15:
        anomalies.append("Cold stress in nest — potential kit mortality.")
    elif nest_temp > 30:
        anomalies.append("Heat stress in nest.")
        
    if feed < 100:
        anomalies.append("Low feed conversion — check for digestive issues.")
        
    return {
        "species": "rabbit",
        "health_score": max(0, 100 - (len(anomalies) * 20)),
        "anomalies": anomalies,
        "derja_context": "أرانب (Cuniculture)"
    }
