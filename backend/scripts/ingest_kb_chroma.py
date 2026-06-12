"""Ingestion de la base agronomique souveraine dans ChromaDB.

Indexe les entrées de app/data/agri_knowledge.json (doc + métadonnées espèce)
dans la collection `sovereign_wisdom_v3` utilisée par RAGService.

Prérequis : serveur Chroma actif (chroma run --port 8001).
Usage : python scripts/ingest_kb_chroma.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.rag_service import RAGService, load_knowledge_base  # noqa: E402


def main():
    rag = RAGService()
    if not rag.is_active:
        print("ERREUR : serveur ChromaDB injoignable (chroma run --port 8001 ?)")
        sys.exit(1)

    entries = load_knowledge_base()
    print(f"{len(entries)} entrées à indexer dans '{rag.collection_name}'")

    rag.collection.upsert(
        documents=[e["doc"] for e in entries],
        metadatas=[{"species": e.get("species", "general"),
                    "topic": e.get("topic", ""),
                    "keywords": ", ".join(e.get("keywords", []))} for e in entries],
        ids=[e["id"] for e in entries],
    )
    print("Indexation terminée. Total collection :", rag.collection.count())


if __name__ == "__main__":
    main()
