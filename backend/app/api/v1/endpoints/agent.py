import logging
from fastapi import APIRouter, HTTPException, Query, Request
from typing import Optional, List
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.services.agent_service import agent_service

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
logger = logging.getLogger(__name__)


class DetectionItem(BaseModel):
    label: str
    confidence: float
    bbox: Optional[List[float]] = None


class ChatRequest(BaseModel):
    query: str
    species: Optional[str] = None
    detections: Optional[List[DetectionItem]] = None


@router.post("/chat")
@limiter.limit("20/minute")
async def chat_with_agent(
    request: Request,  # required by slowapi
    query: str = Query(...),
    species: Optional[str] = Query(None),
):
    """
    Simple GET-style chat (backward compat for existing frontend calls).
    No detections context — pure text query.
    Rate limited: 20/minute per IP.
    """
    logger.debug("Agent request from %s", request.client.host if request.client else "unknown")
    try:
        result = await agent_service.chat(query, species=species, detections=None)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze")
@limiter.limit("20/minute")
async def analyze_with_detections(request: Request, body: ChatRequest):
    """
    CV-aware chat: sends detections as context so the AI diagnoses
    the specific problems found by the YOLO model.
    Rate limited: 20/minute per IP.
    """
    logger.debug("Agent request from %s", request.client.host if request.client else "unknown")
    try:
        detections = [d.model_dump() for d in body.detections] if body.detections else []
        result = await agent_service.chat(
            query=body.query,
            species=body.species,
            detections=detections,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ReportRequest(BaseModel):
    detections: List[DetectionItem]
    species: Optional[str] = None
    image_count: Optional[int] = 1


@router.post("/report")
@limiter.limit("10/minute")
async def generate_fast_report(request: Request, body: ReportRequest):
    """
    Fast diagnostic report from YOLO detections — bypasses Ollama, goes straight
    to Groq for ~1s response. Returns structured Darija diagnosis.
    """
    logger.debug("Report request from %s", request.client.host if request.client else "unknown")
    from app.core.config import settings
    import httpx

    dets = body.detections
    species = body.species or "livestock"
    img_count = body.image_count or 1

    # Build detection summary
    counts: dict = {}
    conf_sum = 0.0
    for d in dets:
        counts[d.label] = counts.get(d.label, 0) + 1
        conf_sum += d.confidence
    avg_conf = round(conf_sum / len(dets) * 100) if dets else 0
    summary = ", ".join(f"{v}× {k}" for k, v in counts.items())

    # Species-specific expert persona + structured output format
    personas = {
        "goat":     "خبير بيطري تونسي متخصص في الماعز",
        "livestock":"خبير بيطري تونسي متخصص في المواشي",
        "cow":      "خبير بيطري تونسي متخصص في الأبقار",
        "sheep":    "خبير بيطري تونسي متخصص في الغنم",
        "chicken":  "خبير بيطري تونسي متخصص في الدواجن",
        "rabbit":   "خبير بيطري تونسي متخصص في الأرانب",
        "bee":      "خبير نحّال تونسي ومتخصص في صحة النحل",
        "leaves":   "مهندس زراعي تونسي متخصص في أمراض النباتات",
        "olive":    "خبير زيتون تونسي ومهندس فلاحي",
        "insects":  "خبير في وقاية النباتات والمكافحة المتكاملة",
        "fire":     "مسؤول سلامة وطوارئ في المزارع",
    }
    persona = personas.get(species, "خبير زراعي تونسي")

    system = (
        f"أنت {persona}. تجاوب حصراً بالدارجة التونسية وبالحروف العربية فقط "
        "(ممنوع الحروف اللاتينية ولا أرقام عوض الحروف مثل 3 و7 و9). "
        "كن مباشراً وعملياً. لا تضيف مقدمات طويلة."
    )

    user_msg = (
        f"الكاميرا رصدت في {img_count} صورة: {summary}. "
        f"نسبة الثقة: {avg_conf}%.\n\n"
        "اعطيني تقرير قصير ومفيد على هذا الشكل:\n"
        "🔍 التشخيص: [شنوا اللي كشفتو الكاميرا]\n"
        "⚠️ الخطورة: [خطير / متوسط / عادي]\n"
        "💊 العلاج: [الخطوات العملية الفورية]\n"
        "🛡️ الوقاية: [كيفاش تمنع تكرار المشكل]"
    )

    if not settings.GROQ_API_KEY:
        # fallback to agent_service
        result = await agent_service.chat(user_msg, species=species, detections=[d.model_dump() for d in dets])
        return result

    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {settings.GROQ_API_KEY}"},
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user_msg},
                    ],
                    "temperature": 0.4,
                    "max_tokens": 512,
                },
            )
        if resp.status_code == 200:
            text = resp.json()["choices"][0]["message"]["content"]
            return {"response_derja": text, "species": species, "detections_count": len(dets), "avg_conf": avg_conf}
        logger.warning(f"Groq report error {resp.status_code}")
    except Exception as e:
        logger.error(f"Groq report failed: {e}")

    # fallback
    result = await agent_service.chat(user_msg, species=species, detections=[d.model_dump() for d in dets])
    return result


class ImageAnalysisRequest(BaseModel):
    image_b64: str
    query: Optional[str] = None
    species: Optional[str] = None


@router.post("/analyze-image")
@limiter.limit("10/minute")
async def analyze_image_with_agent(request: Request, body: ImageAnalysisRequest):
    """
    Full image analysis pipeline:
      1. LLaVA / Groq Vision → visual description
      2. pytesseract / Groq Vision OCR → text extraction
      3. RAG + Labess-7B / Groq → Tunisian Darija response
    Rate limited: 10/minute per IP (vision is expensive).
    """
    logger.debug("Agent request from %s", request.client.host if request.client else "unknown")
    try:
        result = await agent_service.analyze_image(
            image_b64=body.image_b64,
            query=body.query or "",
            species=body.species,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
