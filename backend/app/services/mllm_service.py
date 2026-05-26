import logging
import httpx
from datetime import datetime
from typing import Dict, Any, Optional
from app.core.config import settings

logger = logging.getLogger(__name__)


class MLLMService:
    """Service to interface with Ollama (LLaVA + Labess-7B) and Groq Cloud fallback."""

    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.vision_model = settings.VISION_MODEL
        self.derja_model = settings.DERJA_MODEL

    async def generate_response(
        self,
        prompt: str,
        model: str = None,
        images: Optional[list] = None,
        timeout: float = 60.0,
    ) -> Dict[str, Any]:
        """Send a prompt to Ollama /api/generate."""
        model = model or settings.DERJA_MODEL
        url = f"{self.base_url}/api/generate"
        payload = {"model": model, "prompt": prompt, "stream": False}
        if images:
            payload["images"] = images

        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                response = await client.post(url, json=payload)
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"Ollama ({model}) error: {e}")
            return {"error": str(e)}

    # ── Text: Labess-7B (Ollama) → Groq (cloud) → static ─────────────────────

    async def translate_to_derja(self, text: str) -> str:
        """
        Call the LLM chain:
          1. Local Ollama (Labess-7B) — sovereign, full Darija
          2. Groq Cloud (Llama-3.3-70B) — fast cloud fallback
          3. Static fallback — always returns something
        """
        # Priority 1 — Ollama (Labess-7B)
        if not settings.LITE_MODE:
            try:
                import ollama
                resp = ollama.chat(
                    model=settings.DERJA_MODEL,
                    messages=[{"role": "user", "content": text}],
                )
                return resp["message"]["content"]
            except Exception as e:
                logger.warning(f"Ollama ({settings.DERJA_MODEL}) unavailable: {e} → Groq fallback")

        # Priority 2 — Groq (llama-3.3-70b-versatile)
        if settings.GROQ_API_KEY:
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                        json={
                            "model": "llama-3.3-70b-versatile",
                            "messages": [
                                {
                                    "role": "system",
                                    "content": (
                                        "You are a Tunisian agricultural expert. "
                                        "Always respond in Tunisian Darija (دارجة تونسية)."
                                    ),
                                },
                                {"role": "user", "content": text},
                            ],
                            "temperature": 0.7,
                            "max_tokens": 1024,
                        },
                        timeout=15.0,
                    )
                    if resp.status_code == 200:
                        return resp.json()["choices"][0]["message"]["content"]
                    logger.warning(f"Groq error {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.error(f"Groq error: {e}")

        # Priority 3 — static
        return (
            "يا فلاح، فمة مشكلة صغيرة في الاتصال. "
            "أما حسب ما نعرف، المزرعة لاباس. "
            "ثبت في لوميديتي والماء."
        )

    # ── Vision: LLaVA (Ollama) → Groq Vision → text-only fallback ─────────────

    async def analyze_visual(self, image_b64: str, prompt: str) -> str:
        """
        Analyse an image:
          1. Ollama LLaVA  — local vision model (15 s timeout)
          2. Groq Vision   — llama-3.2-11b-vision-preview (10 s timeout)
          3. Text fallback — returns empty string so caller can degrade gracefully
        """
        # Priority 1 — Ollama LLaVA
        try:
            result = await self.generate_response(
                prompt=prompt,
                model=settings.VISION_MODEL,
                images=[image_b64],
                timeout=15.0,
            )
            if result and "error" not in result:
                text = result.get("response", "").strip()
                if text:
                    logger.info("LLaVA vision OK")
                    return text
        except Exception as e:
            logger.warning(f"LLaVA unavailable: {e}")

        # Priority 2 — Groq Vision (llama-3.2-11b-vision-preview)
        if settings.GROQ_API_KEY:
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                        json={
                            "model": "llama-3.2-11b-vision-preview",
                            "messages": [
                                {
                                    "role": "user",
                                    "content": [
                                        {
                                            "type": "image_url",
                                            "image_url": {
                                                "url": f"data:image/jpeg;base64,{image_b64}"
                                            },
                                        },
                                        {"type": "text", "text": prompt},
                                    ],
                                }
                            ],
                            "max_tokens": 600,
                            "temperature": 0.3,
                        },
                        timeout=10.0,
                    )
                    if resp.status_code == 200:
                        text = resp.json()["choices"][0]["message"]["content"].strip()
                        logger.info("Groq vision OK")
                        return text
                    logger.warning(f"Groq vision error {resp.status_code}")
            except Exception as e:
                logger.warning(f"Groq vision error: {e}")

        # Priority 3 — no vision available
        logger.warning("No vision model available — returning empty")
        return ""

    # ── Strategic Reporting: Intelligent Farm Analysis ────────────────────────

    async def generate_strategic_report(self, data: Dict[str, Any]) -> str:
        """
        Generate a strategic summary based on farm statistics.
        Uses Labess-7B or Groq.
        """
        prompt = (
            "أنت خبير زراعي ذكي. بناءً على هذه المعطيات للمزرعة، أعطيني تقرير استراتيجي "
            "بالدارجة التونسية. ركز على المشاكل والحلول الممكنة.\n\n"
            f"التاريخ: {datetime.now().strftime('%d/%m/%Y')}\n"
            f"عدد الحيوانات: {data.get('animal_count', 0)}\n"
            f"عدد النباتات/المساحات: {data.get('plant_count', 0)}\n"
            f"متوسط الصحة: {data.get('avg_health', 0)}%\n"
            f"التنبيهات النشطة: {data.get('active_alerts', 0)}\n"
            f"التنبيهات الخطيرة: {data.get('critical_alerts', 0)}\n"
            f"أهم المشاكل المكتشفة: {data.get('top_anomalies', 'لا توجد')}\n\n"
            "التقرير يجب أن يكون احترافي، مشجع، وعملي."
        )
        return await self.translate_to_derja(prompt)

    # ── OCR: extract visible text from image ──────────────────────────────────

    async def extract_text_ocr(self, image_b64: str) -> str:
        """
        Extract text visible in the image using:
          1. pytesseract (if installed)
          2. LLaVA / Groq Vision with OCR-specific prompt (fallback)
        """
        # Try pytesseract first (lightweight, no model needed)
        try:
            import pytesseract
            import base64
            from PIL import Image
            import io

            img_bytes = base64.b64decode(image_b64)
            img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
            text = pytesseract.image_to_string(img, lang="fra+ara+eng").strip()
            if text:
                logger.info(f"pytesseract OCR: {len(text)} chars")
                return text
        except ImportError:
            pass  # pytesseract not installed — use vision fallback
        except Exception as e:
            logger.warning(f"pytesseract error: {e}")

        # Fallback: ask LLaVA / Groq Vision to extract text
        ocr_prompt = (
            "Please extract and list ALL text, numbers, labels, brand names, "
            "dates, or written content visible in this image. "
            "If no text is visible, respond with 'NO_TEXT'. "
            "Do not describe the image, only return the extracted text."
        )
        text = await self.analyze_visual(image_b64, ocr_prompt)
        if text and text.strip() != "NO_TEXT" and len(text) > 5:
            return text
        return ""


mllm_service = MLLMService()
