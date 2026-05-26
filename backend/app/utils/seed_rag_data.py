import asyncio
import logging
from app.services.rag_service import rag_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Sample "Agricultural Wisdom" from Tunisian Expert Sources (Synthetic for Demo)
KNOWLEDGE_SAMPLES = [
    {
        "id": "bee-heat-stress-utap",
        "species": "bee",
        "doc": "يا فلاح، إذا فاتت السخانة في بيت النحل (Rucher) 37 درجة، لازمك توفر التظليل وتبرد البيت بالماء. السخانة الزايدة تنجم تقتل الحضنة وتخلي النحل يهجر البيت. دليل الجمعية التونسية لتربية النحل ينصح بماء نظيف قريب من المناحل.",
        "meta": {"source": "Tunisian Apiculture Assoc", "topic": "Heat Stress"}
    },
    {
        "id": "poultry-flu-avfa",
        "species": "poultry",
        "doc": "عند اكتشاف نفوق مفاجئ في دجاج التسمين (Broiler)، يجب عزل العنبر فوراً والاتصال بالمصالح البيطرية التابعة للمندوبية الجهوية للتنمية الفلاحية (CRDA). الوقاية من أنفلونزا الطيور تتطلب تعقيم الداخل والخارج.",
        "meta": {"source": "AVFA Poultry Guide", "topic": "Disease Prevention"}
    },
    {
        "id": "sheep-laming-enmv",
        "species": "sheep",
        "doc": "الكشف المبكر عن العرج (Lameness) عند الأغنام ضروري لتفادي تعفن الضلف (Foot Rot). ينصح بتغطيس الأرجل في كبريتات النحاس حسب بروتوكولات المدرسة الوطنية للطب البيطري (ENMV) بسيدي ثابت.",
        "meta": {"source": "ENMV Sidi Thabet", "topic": "Locomotor Health"}
    },
    {
        "id": "rabbit-nest-vet-tn",
        "species": "rabbit",
        "doc": "درجة حرارة عش الأرانب (Nest) لازم تكون بين 20 و 25 درجة. في حالة البرد القارس، استعمل القش الكافي لحماية الصغار من الموت. مراقبة استهلاك العلف يومياً تعطي فكرة على الصحة العامة للأرنب.",
        "meta": {"source": "Tunisian Vet Protocols", "topic": "Cuniculture Care"}
    }
]

async def seed_rag():
    logger.info("Starting Sovereign RAG Seeding...")

    documents = [s["doc"] for s in KNOWLEDGE_SAMPLES]
    metadatas = [{"species": s["species"], **s["meta"]} for s in KNOWLEDGE_SAMPLES]
    ids = [s["id"] for s in KNOWLEDGE_SAMPLES]

    await rag_service.add_knowledge_pack(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )

    logger.info("Seeding complete. local knowledge base is now active.")

if __name__ == "__main__":
    asyncio.run(seed_rag())
