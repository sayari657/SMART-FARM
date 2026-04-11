import logging
from typing import Dict, Any, List
from app.services.weather_service import weather_service
from app.services.agro_service import agro_service
from app.services.mllm_service import mllm_service
from app.services.rag_service import rag_service
from app.models.domain import Farm

logger = logging.getLogger(__name__)

class RecommendationService:
    def __init__(self):
        pass

    async def generate_recommendations(self, farm: Farm, plant_query: str = "grass") -> Dict[str, Any]:
        """Combine Weather, Telemetry, and Sovereign RAG/MLLM into recommendations."""
        recs = []
        
        # 1. Weather based
        weather_summary = ""
        if farm.latitude and farm.longitude:
            weather = await weather_service.get_current_weather(farm.latitude, farm.longitude)
            if weather and "risks" in weather:
                weather_summary = f"Weather: {weather['temperature']}°C, {weather['condition']}."
                risks = weather["risks"]
                if risks.get("heat_stress"):
                    recs.append({
                        "type": "weather",
                        "title": "Heat Stress Warning",
                        "action": "Increase ventilation and water supply.",
                        "reason": f"Expected: {weather['temperature']}°C"
                    })
        
        # 2. RAG based Wisdom (Species specific)
        # Assuming we check for all species in the farm
        for animal in farm.animals:
            wisdom = await rag_service.query_wisdom(
                query=f"Recommendations for {animal.species} during {weather_summary}",
                species=animal.species
            )
            if wisdom:
                recs.append({
                    "type": "sovereign_rag",
                    "title": f"Local Expertise: {animal.species.capitalize()}",
                    "action": wisdom[0][:200], # Top result summary
                    "reason": "Retrieved from local UTAP/AVFA database."
                })

        # Add a default if nothing triggered
        if not recs:
            recs.append({
                "type": "operational",
                "title": "Routine Maintenance",
                "action": "Continue normal monitoring. All systems nominal.",
                "reason": "No severe risks detected by sovereign analysis."
            })

        # 3. Derja Synthesis (MLLM)
        # Generate a unified Derja summary for the farmer
        full_text = ". ".join([r["action"] for r in recs])
        derja_summary = await mllm_service.translate_to_derja(full_text)

        return {
            "farm_id": farm.id,
            "overall_status": "Attention Required" if any(r["type"] == "weather" for r in recs) else "Nominal",
            "recommendations": recs,
            "output_derja": derja_summary
        }

recommendation_service = RecommendationService()

recommendation_service = RecommendationService()
