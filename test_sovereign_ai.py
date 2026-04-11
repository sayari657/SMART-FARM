import asyncio
import logging
import base64
from app.services.mllm_service import mllm_service
from app.services.rag_service import rag_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_end_to_end_intelligence():
    print("\n--- 🧠 SMART FARM AI v3.0 SOVEREIGN TEST ---\n")

    # 1. Test RAG Retrieval
    print("STEP 1: Querying Local RAG (Agricultural Wisdom)...")
    species = "bee"
    query = "Heat stress in hive at 39°C"
    wisdom = await rag_service.query_wisdom(query, species=species)
    print(f"Result (RAG): {wisdom[0][:150]}...\n")

    # 2. Test MLLM Translation (Derja)
    print("STEP 2: Synthesizing Tunisian Derja Alert via Labess-7B...")
    base_alert = "Severe heat stress detected in Bee Hive B04. Ventilation is required."
    derja = await mllm_service.translate_to_derja(base_alert)
    print(f"Result (Derja): {derja}\n")

    # 3. Test Visual Analysis (Mocked or real if dummy provided)
    print("STEP 3: Testing Visual Reasoning via Llava-7B...")
    # Using a dummy small white pixel as base64 for test
    dummy_image = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII="
    visual_analysis = await mllm_service.analyze_visual(dummy_image, "Monitoring honeybee health")
    print(f"Result (Llava): {visual_analysis}\n")

    print("--- 🔬 TEST COMPLETE ---")

if __name__ == "__main__":
    asyncio.run(test_end_to_end_intelligence())
