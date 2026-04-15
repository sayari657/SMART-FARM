import logging
from qdrant_client import QdrantClient
from qdrant_client.http import models
from sentence_transformers import SentenceTransformer
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
QDRANT_HOST = os.getenv("QDRANT_HOST", "localhost")
QDRANT_PORT = int(os.getenv("QDRANT_PORT", 6333))
COLLECTION_NAME = "bovine_expertise"

def seed_qdrant():
    try:
        client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT)
        model = SentenceTransformer('BAAI/bge-m3')

        # Create collection
        client.recreate_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(size=1024, distance=models.Distance.COSINE),
        )
        logger.info(f"Collection {COLLECTION_NAME} created.")

        # Expertise Data (Derja/FR Hybrid)
        knowledge_base = [
            {
                "text": "الالتهاب الرئوي عند الأبقار (Pneumonie): يظهر في شكل كحة وسيلان في الأنف. السبب هو الرطوبة ونقص التهوية. العلاج يتطلب مضادات حيوية تحت إشراف بيطري.",
                "metadata": {"category": "health", "disease": "pneumonie"}
            },
            {
                "text": "La fièvre aphteuse (Kof): مرض شديد العدوى. العلامات هي ظهور بقع في الفم والقدمين. يجب عزل البقرة فوراً وتعقيم الكوري.",
                "metadata": {"category": "health", "disease": "kof"}
            },
            {
                "text": "نظام التسمين (Engraissement): للعلوش أو العجل، أحسن خلطة هي 70% شعير و30% قرط وفيتامينات. الماء لازم يكون نظيف وبرشة.",
                "metadata": {"category": "nutrition", "type": "engraissement"}
            },
            {
                "text": "Conseil Hygiène Milk (الحليب): نظافة الضرع قبل الحلب أساسية لتفادي الـ Mastite (التهاب الضرع). استعمل المعقمات المناسبة.",
                "metadata": {"category": "production", "disease": "mastite"}
            }
        ]

        # Ingest
        for i, item in enumerate(knowledge_base):
            vector = model.encode(item["text"]).tolist()
            client.upsert(
                collection_name=COLLECTION_NAME,
                points=[
                    models.PointStruct(
                        id=i,
                        vector=vector,
                        payload=item
                    )
                ]
            )
        
        logger.info(f"Successfully seeded {len(knowledge_base)} expertise documents to Qdrant.")

    except Exception as e:
        logger.error(f"Error seeding Qdrant: {e}")

if __name__ == "__main__":
    seed_qdrant()
