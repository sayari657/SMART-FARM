import logging
from typing import Dict, Any
from app.services.weather_service import weather_service
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
                temp = weather.get('temperature', 'N/A')
                hum  = weather.get('humidity', 'N/A')
                wind = weather.get('wind_speed', 'N/A')
                weather_summary = f"Weather: {temp}°C, Humidity: {hum}%, Wind: {wind} km/h."
                risks = weather["risks"]
                if risks.get("heat_stress"):
                    recs.append({
                        "type": "weather",
                        "title": "Heat Stress Warning",
                        "action": "Increase ventilation and water supply.",
                        "reason": f"Temperature: {temp}°C — above 35°C threshold."
                    })
                if risks.get("cold_stress"):
                    recs.append({
                        "type": "weather",
                        "title": "Cold Stress Warning",
                        "action": "Ensure animal shelter heating and water doesn't freeze.",
                        "reason": f"Temperature: {temp}°C — below 5°C threshold."
                    })
                if risks.get("storm_risk"):
                    recs.append({
                        "type": "weather",
                        "title": "Storm Risk Alert",
                        "action": "Secure outdoor equipment and check hive anchoring.",
                        "reason": f"Wind speed: {wind} km/h — above 40 km/h threshold."
                    })

        # 2. RAG based Wisdom (Species specific deduplication)
        # We group by species to avoid repetitive cards if there are multiple units of the same type
        farm_species = {unit.animal_type.species for unit in farm.units if unit.animal_type}

        for species in farm_species:
            # Enhanced query including weather context for better RAG matching
            context_query = f"Recommendations for {species} managing {weather_summary}"
            wisdom = await rag_service.query_wisdom(
                query=context_query,
                species=species,
                n_results=2
            )

            if wisdom:
                # Deduplicate identical wisdom snippets and combine them
                unique_wisdom = []
                for w in wisdom:
                    if w not in unique_wisdom:
                        unique_wisdom.append(w)

                combined_action = " ".join([w[:300] for w in unique_wisdom])

                recs.append({
                    "type": "sovereign_rag",
                    "title": f"Expertise Locale: {species.capitalize()}",
                    "action": combined_action,
                    "reason": "Analyse croisée entre les guides UTAP/AVFA et les conditions météo actuelles."
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
