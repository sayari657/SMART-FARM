import asyncio
import logging
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.services.rag_service import rag_service
from app.services.mllm_service import mllm_service

logger = logging.getLogger(__name__)

# ── Species-specific system prompts ──────────────────────────────────────────
SPECIES_PROMPTS = {
    "cow": (
        "أنت خبير بيطري متخصص في تربية الأبقار في تونس. "
        "تعرف جيداً سلالات البقر التونسية (فريزيان، مونتبيليار، بلدي). "
        "تشخّص الأمراض البصرية: العرج، الحمى، انخفاض إنتاج الحليب، مشاكل الجلد. "
        "تجاوب دائماً بالدارجة التونسية الأصيلة، بأسلوب الفلاح، واضح ومباشر."
    ),
    "sheep": (
        "أنت خبير في تربية الغنم التونسي (بربري، قرمودي، سيدي تابت). "
        "تعرف أمراض الأغنام: البروسيلا، الجرب، الطفيليات، مشاكل الولادة. "
        "إذا شفت عرج أو ضعف أو جرح، تعطي خطوات الإسعافات الأولية فوراً. "
        "تجاوب بالدارجة التونسية."
    ),
    "goat": (
        "أنت خبير في تربية الماعز الحليبي في تونس (بلدي، شامي، صاهل). "
        "تتخصص في إنتاج الحليب، أمراض الضرع، الجرب، الطفيليات. "
        "تجاوب بالدارجة التونسية مع نصائح عملية وسريعة."
    ),
    "livestock": (
        "أنت خبير بيطري متخصص في تربية المواشي في تونس (بقر، غنم، ماعز). "
        "تشخّص الأمراض من الصور: العرج، الجروح، الحمى، نقص التغذية. "
        "تجاوب بالدارجة التونسية مع خطوات علاجية واضحة."
    ),
    "bee": (
        "أنت خبير في تربية النحل التونسي. "
        "تتخصص في أمراض النحل: الفاروا، العفن الأمريكي، نقص الغذاء، الإجهاد الحراري، خطر الهجرة. "
        "إذا شفت فاروا أو طفيلي في الصورة، تعطي بروتوكول علاج فوري. "
        "تجاوب بالدارجة التونسية مع دليل تربية النحل التونسي كمرجع."
    ),
    "poultry": (
        "أنت خبير في تربية الدواجن التونسية (دجاج لحم، بياض، رومي). "
        "تتخصص في أمراض الطيور: إنفلونزا الطيور، النيوكاسل، الكوكسيديا، مشاكل التهوية (النشادر). "
        "إذا شفت حيوان ميت أو تزاحم أو سلوك غير طبيعي، تعطي إجراء طارئ. "
        "تجاوب بالدارجة التونسية."
    ),
    "rabbit": (
        "أنت خبير في تربية الأرانب في تونس. "
        "تتخصص في أمراض الأرانب: الجرب، النزلة المعوية، الإجهاد الحراري، مشاكل التغذية. "
        "تجاوب بالدارجة التونسية مع نصائح عملية."
    ),
    "leaves": (
        "أنت خبير زراعي متخصص في أمراض نباتات تونس (طماطم، فاصوليا، فراولة). "
        "تشخّص من الصور: عفن الطماطم، صدأ الفاصوليا، لفحة الفراولة، بقعة البكتيريا. "
        "تعطي بروتوكول رش فوري مع أسماء المبيدات المتوفرة في تونس. "
        "تجاوب بالدارجة التونسية."
    ),
    "olive": (
        "أنت خبير في زراعة الزيتون التونسي (شتوي، زرازي، شيتوي). "
        "تشخّص من الصور: عين الطاووس، الجرب، الدودة، السواد. "
        "تعطي برنامج رش متكيّف مع المناخ التونسي ودليل CTAB. "
        "تجاوب بالدارجة التونسية."
    ),
    "insects": (
        "أنت خبير في مكافحة آفات المحاصيل التونسية. "
        "تشخّص من الصور: دودة الجيش، خنفساء البقوليات، حشرة الأرز، العنكبوت الأحمر، حشرة التبغ. "
        "تعطي برنامج مكافحة متكامل (كيميائي + بيولوجي) مع أسماء المبيدات في السوق التونسية. "
        "تجاوب بالدارجة التونسية."
    ),
    "fire": (
        "أنت خبير في إدارة الطوارئ والحرائق الزراعية في تونس. "
        "إذا كشفت الكاميرا عن دخان أو نيران، تعطي إجراء طارئ فوري: إخلاء الحيوانات، الاتصال بالحماية المدنية (198)، حماية المحاصيل. "
        "تجاوب بالدارجة التونسية بأسلوب سريع وحازم."
    ),
    "plant": (
        "أنت خبير زراعي شامل في تونس. "
        "تشخّص أمراض النباتات والحشرات والآفات. "
        "تجاوب بالدارجة التونسية مع توصيات علاجية عملية."
    ),
}

DEFAULT_PROMPT = (
    "أنت خبير في الزراعة التونسية. تتحدث الدارجة التونسية بطلاقة. "
    "تعطي نصائح عملية للفلاح التونسي بناءً على ما تراه في الصور أو ما يسألك عنه."
)

def _build_cv_context(detections: List[Dict]) -> str:
    """Convert YOLO detections list into an Arabic description for the prompt."""
    if not detections:
        return ""
    counts = {}
    for d in detections:
        label = d.get("label", d.get("object_class", "unknown"))
        counts[label] = counts.get(label, 0) + 1

    parts = []
    for label, count in counts.items():
        conf_values = [d.get("confidence", 0) for d in detections if d.get("label", d.get("object_class")) == label]
        avg_conf = sum(conf_values) / len(conf_values) if conf_values else 0
        parts.append(f"- {count}x {label.replace('_', ' ')} (ثقة: {avg_conf*100:.0f}%)")

    return "نتائج كاميرا الذكاء الاصطناعي:\n" + "\n".join(parts)


class AgentService:
    def __init__(self):
        pass

    def _get_system_prompt(self, species: Optional[str]) -> str:
        if not species:
            return DEFAULT_PROMPT
        key = species.lower().strip()
        return SPECIES_PROMPTS.get(key, DEFAULT_PROMPT)

    async def chat(
        self,
        query: str,
        species: str = None,
        detections: Optional[List[Dict]] = None,
    ) -> Dict[str, Any]:
        logger.info(f"Agri-Agent query='{query}' species={species} detections={len(detections or [])}d")

        # 1. RAG context
        wisdom_chunks = await rag_service.query_wisdom(query, species=species, n_results=3)
        rag_context = "\n---\n".join(wisdom_chunks) if wisdom_chunks else ""

        # 2. CV detections context
        cv_context = _build_cv_context(detections or [])

        # 3. Build full prompt
        system_prompt = self._get_system_prompt(species)

        parts = [f"[نظام]: {system_prompt}"]
        if cv_context:
            parts.append(cv_context)
        if rag_context:
            parts.append(f"[دليل زراعي]:\n{rag_context}")
        parts.append(f"[سؤال الفلاح]: {query}")

        full_prompt = "\n\n".join(parts)

        # 4. Call AI
        use_advanced = bool(settings.GROQ_API_KEY) or not settings.LITE_MODE
        if use_advanced:
            response_text = await mllm_service.translate_to_derja(full_prompt)
        else:
            # Synthetic fallback: build answer from CV context + RAG
            if cv_context and detections:
                labels = list({d.get("label", d.get("object_class", "")) for d in detections})
                label_str = "، ".join(l.replace("_", " ") for l in labels[:3])
                response_text = (
                    f"يا فلاح، الكاميرا كشفت على: {label_str}. "
                )
                if wisdom_chunks:
                    response_text += f"\n\nمن دليل UTAP: {wisdom_chunks[0][:300]}"
                else:
                    response_text += "خذ بالك وراقب الحيوان جيداً وإذا الحالة خطيرة اتصل بالطبيح البيطري."
            elif wisdom_chunks:
                response_text = f"يا فلاح، راني هوني باش نعاونك:\n\n{wisdom_chunks[0]}"
            else:
                response_text = "يا فلاح، راني نخدم في النمط السريع. للمزيد من التفاصيل الدقيقة ابدأ النسخة الكاملة."

        return {
            "query": query,
            "response_derja": response_text,
            "sources": wisdom_chunks[:2],
            "context_used": bool(wisdom_chunks or cv_context),
            "cv_detections_used": bool(cv_context),
            "species": species,
        }

    async def analyze_image(
        self,
        image_b64: str,
        query: str = "",
        species: str = None,
    ) -> Dict[str, Any]:
        """
        Analyse an image end-to-end:
          1. Run LLaVA vision + OCR extraction in parallel
          2. Build enriched prompt with visual description + OCR text
          3. Pass through the full chat pipeline (RAG + Labess-7B / Groq)
        """
        logger.info(f"analyze_image: species={species} query='{query[:60]}'")

        # Run vision description and OCR concurrently
        vision_prompt = (
            "Describe this agricultural image in detail: "
            "identify all animals, plants, diseases, injuries, objects, and conditions visible. "
            "Note any abnormalities, symptoms, or urgent issues."
        )
        vision_task = mllm_service.analyze_visual(image_b64, vision_prompt)
        ocr_task = mllm_service.extract_text_ocr(image_b64)
        vision_result, ocr_text = await asyncio.gather(vision_task, ocr_task)

        # Build enriched query
        context_parts = []
        if vision_result:
            context_parts.append(f"[وصف الصورة بالذكاء الاصطناعي]: {vision_result}")
        if ocr_text:
            context_parts.append(f"[نص مكتشف في الصورة (OCR)]: {ocr_text}")

        user_query = query.strip() or "حلّل هذه الصورة وأعطيني تقرير مفصّل."
        enriched_query = user_query
        if context_parts:
            enriched_query += "\n\n" + "\n\n".join(context_parts)

        result = await self.chat(query=enriched_query, species=species, detections=None)
        result["vision_analysis"] = vision_result
        result["ocr_text"] = ocr_text
        result["had_image"] = True
        return result


agent_service = AgentService()
