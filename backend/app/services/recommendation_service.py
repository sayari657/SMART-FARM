import logging
from typing import Dict, Any, List
from app.services.weather_service import weather_service
from app.services.agro_service import agro_service
from app.models.domain import Farm

logger = logging.getLogger(__name__)

class RecommendationService:
    def __init__(self):
        pass

    async def generate_recommendations(self, farm: Farm, plant_query: str = "grass") -> Dict[str, Any]:
        """Combine Weather, Telemetry (via proxy), and Plant info into recommendations"""
        recs = []
        
        # 1. Weather based
        if farm.latitude and farm.longitude:
            weather = await weather_service.get_current_weather(farm.latitude, farm.longitude)
            if weather and "risks" in weather:
                risks = weather["risks"]
                if risks.get("heat_stress"):
                    recs.append({
                        "type": "weather",
                        "title": "Heat Stress Warning",
                        "action": "Increase ventilation in coops and ensure constant fresh water supply for all livestock.",
                        "reason": f"Expected external temperature: {weather['temperature']}°C"
                    })
                if risks.get("cold_stress"):
                    recs.append({
                        "type": "weather",
                        "title": "Cold Stress Warning",
                        "action": "Activate heat lamps for poultry and ensure dry bedding for sheep.",
                        "reason": f"Expected external temperature: {weather['temperature']}°C"
                    })
                if risks.get("storm_risk"):
                    recs.append({
                        "type": "weather",
                        "title": "Storm Risk",
                        "action": "Secure outdoor assets and prepare to move grazing animals indoors.",
                        "reason": f"High wind speeds detected: {weather['wind_speed']} km/h"
                    })
        
        # 2. Agro / Plant based
        plant_data = await agro_service.search_plants(plant_query)
        if plant_data and plant_data.get("data"):
            plant = plant_data["data"][0]  # Take top result for now
            recs.append({
                "type": "agronomic",
                "title": f"Forage Optimization ({plant.get('common_name', 'Unknown')})",
                "action": "Adjust livestock grazing rotation schedules based on current plant growth patterns.",
                "reason": f"Correlated with local Trefle.io agronomic data for '{plant.get('scientific_name', '')}'."
            })

        # Add a default if nothing triggered
        if not recs:
            recs.append({
                "type": "operational",
                "title": "Routine Maintenance",
                "action": "Continue normal monitoring. All systems nominal.",
                "reason": "No severe weather or agronomic risks detected."
            })

        return {
            "farm_id": farm.id,
            "overall_status": "Attention Required" if any(r["type"] == "weather" for r in recs) else "Nominal",
            "recommendations": recs
        }

recommendation_service = RecommendationService()
