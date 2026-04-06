import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class WeatherService:
    def __init__(self):
        self.base_url = "https://api.open-meteo.com/v1/forecast"
        self.timeout = 10.0

    async def get_current_weather(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        params = {
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation"
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.base_url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if "current" in data:
                    current_data = data["current"]
                    
                    # Risk assessment
                    heat_stress = current_data.get("temperature_2m", 0) > 35
                    cold_stress = current_data.get("temperature_2m", 0) < 5
                    storm_risk = current_data.get("wind_speed_10m", 0) > 40
                    
                    risks = {
                        "heat_stress": heat_stress,
                        "cold_stress": cold_stress,
                        "storm_risk": storm_risk,
                    }
                    
                    return {
                        "temperature": current_data.get("temperature_2m"),
                        "humidity": current_data.get("relative_humidity_2m"),
                        "wind_speed": current_data.get("wind_speed_10m"),
                        "precipitation": current_data.get("precipitation"),
                        "risks": risks,
                        "raw_data": data
                    }
                return None
        except httpx.RequestError as exc:
            logger.error(f"An error occurred while requesting {exc.request.url!r}.")
            return None
        except httpx.HTTPStatusError as exc:
            logger.error(f"Error response {exc.response.status_code} while requesting {exc.request.url!r}.")
            return None

    async def get_forecast(self, lat: float, lon: float, days: int = 7) -> Optional[Dict[str, Any]]:
        params = {
            "latitude": lat,
            "longitude": lon,
            "hourly": "temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m",
            "forecast_days": days
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(self.base_url, params=params)
                response.raise_for_status()
                return response.json()
        except httpx.RequestError as exc:
            logger.error(f"Forecast request error: {exc}")
            return None
        except httpx.HTTPStatusError as exc:
            logger.error(f"Forecast response error: {exc.response.status_code}")
            return None

weather_service = WeatherService()
