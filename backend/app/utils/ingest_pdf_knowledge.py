import os
import asyncio
import logging
from pypdf import PdfReader
from app.services.rag_service import rag_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

KNOWLEDGE_DIR = "./knowledge_base"

async def ingest_pdfs():
    """Scan knowledge_base folder and ingest all PDFs into RAG."""
    if not os.path.exists(KNOWLEDGE_DIR):
        os.makedirs(KNOWLEDGE_DIR)
        logger.info(f"Created {KNOWLEDGE_DIR}. Please drop your Tunisian agricultural PDFs there.")
        return

    logger.info(f"Scanning {KNOWLEDGE_DIR} for expert guides...")
    
    for filename in os.listdir(KNOWLEDGE_DIR):
        if filename.endswith(".pdf"):
            file_path = os.path.join(KNOWLEDGE_DIR, filename)
            logger.info(f"Processing: {filename}")
            
            try:
                reader = PdfReader(file_path)
                text = ""
                for page in reader.pages:
                    text += page.extract_text() + "\n"
                
                # Simple chunking by paragraph
                chunks = [c.strip() for c in text.split("\n\n") if len(c.strip()) > 100]
                
                # Determine species from filename
                species = "bee" if "bee" in filename.lower() or "nahl" in filename.lower() else \
                          "poultry" if "poultry" in filename.lower() or "dajaj" in filename.lower() else \
                          "sheep" if "sheep" in filename.lower() or "ghanam" in filename.lower() else \
                          "rabbit" if "rabbit" in filename.lower() or "arneb" in filename.lower() else None
                
                if chunks:
                    ids = [f"{filename}-{i}" for i in range(len(chunks))]
                    metadatas = [{"source": filename, "species": species, "type": "pdf_ingestion"} for _ in chunks]
                    
                    await rag_service.add_knowledge_pack(
                        documents=chunks,
                        metadatas=metadatas,
                        ids=ids
                    )
                    logger.info(f"Successfully ingested {len(chunks)} knowledge snippets from {filename}")
            
            except Exception as e:
                logger.error(f"Error processing {filename}: {str(e)}")

if __name__ == "__main__":
    asyncio.run(ingest_pdfs())
