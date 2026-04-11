import logging
import httpx
import json
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)

class MLLMService:
    """Service to interface with Ollama for vision and dialect (Derja) processing."""

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.vision_model = settings.VISION_MODEL
        self.derja_model = settings.DERJA_MODEL

    async def generate_response(
        self, 
        prompt: str, 
        model: str = settings.DERJA_MODEL,
        images: Optional[list] = None
    ) -> Dict[str, Any]:
        """Send a prompt to Ollama and get a response."""
        url = f"{self.base_url}/api/generate"
        payload = {
            "model": model,
            "prompt": prompt,
            "stream": False
        }
        if images:
            payload["images"] = images

        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Error calling MLLM ({model}): {str(e)}")
            return {"error": str(e), "response": "Error reaching sovereign cloud intelligence."}

    async def translate_to_derja(self, text: str) -> str:
        """Translate or generate responses in Tunisian Derja using Groq (Cloud) or Ollama (Local)."""
        
        # Priority 1: Groq Cloud (Agile Intelligence) if API Key is present
        if settings.GROQ_API_KEY:
            try:
                import httpx
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                        json={
                            "model": "llama-3.3-70b-versatile",
                            "messages": [
                                {"role": "system", "content": "You are a helpful Tunisian agricultural assistant. Always respond in Tunisian Derja."},
                                {"role": "user", "content": text}
                            ],
                            "temperature": 0.7
                        },
                        timeout=7.0
                    )
                    if response.status_code == 200:
                        data = response.json()
                        return data['choices'][0]['message']['content']
                    else:
                        logger.warning(f"Groq API error: {response.text}")
            except Exception as e:
                logger.error(f"Error calling Groq API: {str(e)}")

        # Priority 2: Local Ollama (Sovereign Mode)
        if not settings.LITE_MODE:
            try:
                import ollama
                response = ollama.chat(model=settings.DERJA_MODEL, messages=[
                    {'role': 'user', 'content': f"Translate/Respond in Tunisian Derja: {text}"},
                ])
                return response['message']['content']
            except Exception as e:
                logger.warning(f"Ollama error: {str(e)}. Falling back to Static Mode.")

        # Priority 3: Static Fallback (Mock Mode)
        return "يا فلاح، فمة مشكلة صغيرة في الاتصال. أما حسب ما نعرف، المزرعة لاباس. ثبت في لوميديتي والماء."

    async def analyze_visual(self, image_b64: str, prompt: str) -> str:
        """Perform visual reasoning using Llava-7B."""
        try:
            response = await self.generate_response(prompt, model=settings.VISION_MODEL, images=[image_b64])
            if "error" in response:
                raise Exception(response["error"])
            return response.get('response', "Visual analysis failed.")
        except Exception as e:
            logger.warning(f"Ollama (Llava) unreachable: {str(e)}. Using fallback reasoning.")
            return "الرؤية الذكية مش متوفرة توة. أما بالعين المجردة، الحيوانات تبان لاباس عليها."

mllm_service = MLLMService()
