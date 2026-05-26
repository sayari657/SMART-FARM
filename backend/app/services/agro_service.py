import httpx
import logging
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class AgroService:
    def __init__(self):
        self.base_url = "https://trefle.io/api/v1"
        self.token = settings.TREFLE_API_TOKEN
        self.timeout = 10.0

    async def search_plants(self, query: str) -> Optional[Dict[str, Any]]:
        # Required to use token
        if not self.token or self.token == "your_placeholder_token_here_from_trefle_io":
            logger.warning("Using Trefle without a valid token. Returning mock data.")
            return {"data": [{"id": 0, "common_name": f"Mock Trefle Plant '{query}'", "scientific_name": "Mockus plantus"}]}

        params = {
            "token": self.token,
            "q": query
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/plants/search", params=params)
                response.raise_for_status()
                return response.json()
        except httpx.RequestError as exc:
            logger.error(f"Plant search error: {exc}")
            return None
        except httpx.HTTPStatusError as exc:
            logger.error(f"Plant search response error: {exc.response.status_code}")
            return None

    async def get_plant_details(self, plant_id: str) -> Optional[Dict[str, Any]]:
        if not self.token or self.token == "your_placeholder_token_here_from_trefle_io":
            logger.warning("Using Trefle without a valid token. Returning mock data.")
            return {"data": {"id": plant_id, "common_name": f"Mock Details {plant_id}", "scientific_name": "Mockus detailsus"}}

        params = {
            "token": self.token
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.base_url}/plants/{plant_id}", params=params)
                response.raise_for_status()
                return response.json()
        except httpx.RequestError as exc:
            logger.error(f"Plant details error: {exc}")
            return None
        except httpx.HTTPStatusError as exc:
            logger.error(f"Plant details response error: {exc.response.status_code}")
            return None

agro_service = AgroService()
