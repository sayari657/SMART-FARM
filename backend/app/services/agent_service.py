import logging
from typing import List, Dict, Any
from app.core.config import settings
from app.services.rag_service import rag_service
from app.services.mllm_service import mllm_service

logger = logging.getLogger(__name__)

class AgentService:
    def __init__(self):
        self.system_prompt = (
            "You are the Smart Farm AI Sovereign Assistant, an expert in Tunisian agriculture. "
            "Your goal is to help farmers manage their bees, cows, poultry, sheep, goats, and rabbits. "
            "You MUST speak in Tunisian Derja when responding to the farmer. "
            "Use the provided context from agricultural guides to be as accurate as possible. "
            "If you don't know the answer based on the context, say you don't know in Derja."
        )

    async def chat(self, query: str, species: str = None) -> Dict[str, Any]:
        """Process a farmer's query using RAG and Synthetic Intelligence (Lite) or MLLM (Enterprise)."""
        logger.info(f"Agri-Agent processing query: {query} (Species: {species})")

        # 1. Retrieve Knowledge via RAG
        print(f"DEBUG: Starting RAG for {query}...")
        wisdom_chunks = await rag_service.query_wisdom(query, species=species, n_results=3)
        print(f"DEBUG: RAG complete. Found {len(wisdom_chunks)} chunks.")
        context = "\n---\n".join(wisdom_chunks) if wisdom_chunks else "No specific guide found."

        # 2. Decision Logic: Use MLLM/Groq if available, otherwise Synthetic Mode
        use_advanced_ai = not settings.LITE_MODE or settings.GROQ_API_KEY
        
        if use_advanced_ai:
            # ADVANCED AI MODE (Groq or Ollama)
            prompt = (
                f"Context from Tunisian Agricultural Guides:\n{context}\n\n"
                f"Farmer's Question: {query}\n\n"
            )
            print(f"DEBUG: Calling Advanced AI (Groq/Ollama)...")
            response_text = await mllm_service.translate_to_derja(prompt)
            print(f"DEBUG: AI response received.")
        else:
            # SYNTHETIC REASONING MODE (Fast, Offline, Reliable)
            intro = "يا فلاح، راني نخدم في 'النمط السريع' (Lite Mode) أما هاو شنوا نجم نقلك: "
            if wisdom_chunks and "يا فلاح، سؤالك مهم" not in wisdom_chunks[0]:
                response_text = f"{intro}\n\n{wisdom_chunks[0]}"
            else:
                response_text = "يا فلاح، راني هوني باش نعاونك. سؤالك يحتاج النسخة الكاملة (Docker) باش نعطيك تفاصيل دقيقة، أما بصفة عامة رد بالك على الري ونظافة المزرعة."

        return {
            "query": query,
            "response_derja": response_text,
            "sources": wisdom_chunks[:2], 
            "context_used": True if wisdom_chunks else False,
            "is_lite": not rag_service.is_active or (settings.DATABASE_URL and "sqlite" in settings.DATABASE_URL.lower())
        }

agent_service = AgentService()
