import httpx
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class GeocodeService:
    def __init__(self):
        self.search_url = "https://nominatim.openstreetmap.org/search"
        self.reverse_url = "https://nominatim.openstreetmap.org/reverse"
        self.timeout = 10.0
        # Required by OSM policy
        self.headers = {
            "User-Agent": "SmartFarmAI/2.0 (Academic/PFE Project)"
        }

    async def search_address(self, query: str) -> Optional[list]:
        params = {
            "q": query,
            "format": "json",
            "limit": 5
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                response = await client.get(self.search_url, params=params)
                response.raise_for_status()
                return response.json()
        except httpx.RequestError as exc:
            logger.error(f"Geocode search error: {exc}")
            return None
        except httpx.HTTPStatusError as exc:
            logger.error(f"Geocode search response error: {exc.response.status_code}")
            return None

    async def reverse_geocode(self, lat: float, lon: float) -> Optional[Dict[str, Any]]:
        params = {
            "lat": lat,
            "lon": lon,
            "format": "json"
        }
        
        try:
            async with httpx.AsyncClient(timeout=self.timeout, headers=self.headers) as client:
                response = await client.get(self.reverse_url, params=params)
                response.raise_for_status()
                data = response.json()
                
                return {
                    "display_name": data.get("display_name"),
                    "address": data.get("address", {}),
                    "raw_data": data
                }
        except httpx.RequestError as exc:
            logger.error(f"Reverse geocode error: {exc}")
            return None
        except httpx.HTTPStatusError as exc:
            logger.error(f"Reverse geocode response error: {exc.response.status_code}")
            return None

geocode_service = GeocodeService()
