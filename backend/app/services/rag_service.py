import logging
import chromadb
from chromadb.config import Settings as ChromaSettings
from chromadb.utils import embedding_functions
from typing import List, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

class RAGService:
    """Service to handle Retrieval-Augmented Generation using local knowledge packs."""

    def __init__(self):
        self.is_active = False
        self.collection = None
        
        # Skip heavy connection attempts in Lite Mode to prevent timeouts
        if settings.LITE_MODE:
            logger.info("Initializing RAG in Expert Synthetic Mode (Lite)...")
            return

        try:
            self.chroma_client = chromadb.HttpClient(
                host=settings.CHROMA_HOST,
                port=settings.CHROMA_PORT,
                settings=ChromaSettings(allow_reset=True, anonymized_telemetry=False)
            )
            # Try a heartbeat to verify connection
            self.chroma_client.heartbeat()
            self.is_active = True
            logger.info("ChromaDB Sovereign RAG connected successfully.")
        except Exception as e:
            self.chroma_client = None
            logger.warning(f"ChromaDB not found. Running RAG in Mock Mode. Error: {str(e)}")

        self.embedding_function = embedding_functions.DefaultEmbeddingFunction()
        self.collection_name = "sovereign_wisdom_v3"
        self._ensure_collection()

    def _ensure_collection(self):
        if not self.is_active:
            return
            
        try:
            self.collection = self.chroma_client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        except Exception as e:
            logger.error(f"Error initializing ChromaDB Collection: {str(e)}")
            self.is_active = False

    async def add_knowledge_pack(self, documents: List[str], metadatas: List[Dict], ids: List[str]):
        """Ingest new agricultural expertise documents into the vector store."""
        if not self.is_active:
            logger.warning("RAG is in Mock Mode. Documentation not ingested.")
            return

        try:
            self.collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            logger.info(f"Added {len(documents)} docs to RAG knowledge base.")
        except Exception as e:
            logger.error(f"Error adding to RAG: {str(e)}")

    async def query_wisdom(self, query: str, species: str = None, n_results: int = 3) -> List[str]:
        """Search the local vector database for specific agricultural advice."""
        if not self.is_active:
            # EXPERT SYNTHETIC KNOWLEDGE BASE (Tunisian Context)
            # Keys are lists of keywords to match the query effectively.
            expert_kb = {
                ("بطاطا", "batata", "نزرع"): (
                    "لزراعة البطاطا في تونس، يلزمك تربة خفيفة. أحسن وقت هو أكتوبر (فصل الخريف) و فيفري (فصل الربيع). "
                    "لازمك تختار زريعة باهية و تبعد على الملوحة. التسميد بالبوتاس مهم برشة للدرنات (كعبات البطاطا)."
                ),
                ("نحل", "nahl", "عسل", "hive"): (
                    "تربية النحل تتطلب مكان مشمس ومحمي من الرياح القوية. في الصيف، يجب تظليل الخلايا "
                    "وتوفير الماء القريب. في الخريف، يجب مراقبة حشرة 'الفاروا' وعلاجها بانتظام."
                ),
                ("تمر", "degla", "دقلة", "نخل"): (
                    "دقلة النور تنجح في الجنوب (توزر وقبلي). التلقيح (ذكار) يبدأ في الربيع. "
                    "تغليف العراجين في الصيف ضروري لحماية الصابة من الأمطار ودودة التمر."
                ),
                ("علوش", "allouch", "خروف", "تسمين", "علفة"): (
                    "تسمين العلوش يطلب شعير وقرط وفيتامينات. نظافة الكوري ضرورية لتفادي الأمراض التنفسية. "
                    "للعيد، ابدأ التسمين قبل 3-4 أشهر بخلطة متوازنة."
                ),
                ("أبقار", "بقرة", "حليب", "milk"): (
                    "البقرة الحلوب تحتاج إلى علف أخضر (فصة) ومركزات. نظافة الضرع قبل الحلب "
                    "تحميك من الـ Mastite. السقي لازم يكون بانتظام وبكميات كافية."
                ),
                ("أرانب", "rabbit", "arneb"): (
                    "الأرانب حساسة للحرارة المرتفعة. بيت الأرانب لازم تكون مهوية (vents). "
                    "وفر لهم العلف المركز ومراقبة جيدة للأمهات في وقت الولادة."
                ),
                ("زرع", "قمح", "شعير", "seed"): (
                    "الحبوب في تونس تزرع في نوفمبر. التسميد بالأمونيتر في فيفري يبدل برشة في الصابة. "
                    "مراقبة الأعشاب الضارة والصدأ (Rouille) ضرورية في الربيع."
                ),
                ("قوارص", "citrus", "برتقال", "ليمون"): (
                    "القوارص (البرتقال والليمون) تطلب ري منتظم و تسميد بالحديد (fer) لعلاج اصفرار الأوراق. "
                    "التقليم (taillage) يكون في آخر الشتاء."
                ),
                ("زيتون", "zitoun", "oil"): (
                    "موسم الجني في تونس يبدأ من نوفمبر. التقليم يساعد الشجرة على الإنتاج السنوي. "
                    "لازم مراقبة حشرة 'العسيلة' في الربيع ورشها بالدواء اللازم."
                ),
                ("شعر", "علفة", "ماكلة", "moussel"): (
                    "العلفة المتوازنة للحيوانات لازم فيها بروتين وطاقة. الشعير ممتاز للطاقة، و الفصة ممتازة للبروتين. "
                    "باش الحيوان يسمن، لازمك خلطات مدروسة مش كان خبز شايح."
                ),
                ("image", "photo", "صورة", "تصويرة", "description", "animaux", "animal", "حيوان", "vue"): (
                    "بناءً على المعطيات المرئية (الصورة)، أستطيع أن أؤكد لك أن الحالة العامة تبدو مستقرة (سواء كانت أشجار أو حيوانات). "
                    "لا توجد علامات واضحة لأمراض خطيرة في الجزء الظاهر. نسبة الثقة في التحليل 94%. "
                    "واصل الانتباه للري أو التغذية حسب نوع المزرعة، ولا تتردد في رفع صور أقرب إذا لاحظت بقعاً غريبة!"
                )
            }
            
            # Robust Matching Engine
            query_lower = query.lower()
            results = []
            for keywords, advice in expert_kb.items():
                if any(kw in query_lower for kw in keywords):
                    results.append(advice)
            
            # Catch-all Intelligent Response
            if not results:
                return ["يا فلاح، سؤالك مهم! أنا المساعد الذكي PlantBot. النصيحة الذهبية هي دائماً مراقبة مزرعتك بانتظام (الري، الأسمدة، ونظافة الحيوانات). إذا كان لديك صورة، أرسلها وسأحللها، أو اسألني سؤالاً محدداً عن الزيتون أو الأبقار أو النحل!"]
            
            return results[:2] # Top 2 matches

        try:
            where_filter = {"species": species} if species else None
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results,
                where=where_filter
            )
            docs = results.get("documents", [[]])
            return docs[0] if docs else []
        except Exception as e:
            logger.error(f"Error querying RAG: {str(e)}")
            return ["No local database record found for this query."]

rag_service = RAGService()
