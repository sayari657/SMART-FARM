"""
Ingest the sovereign agronomic knowledge base into the Cloudflare RAG Worker
(Workers AI embeddings → Vectorize).

Usage:
  python ingest.py --url https://farmai-rag.<subdomain>.workers.dev \
                   --token <INGEST_TOKEN>

Defaults: reads --url from RAG_WORKER_URL env, token from .ingest_token.local.
"""
import argparse
import json
import os
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[2]
KB = ROOT / "backend" / "app" / "data" / "agri_knowledge.json"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", default=os.getenv("RAG_WORKER_URL", ""))
    ap.add_argument("--token", default="")
    args = ap.parse_args()

    url = args.url.rstrip("/")
    token = args.token or os.getenv("INGEST_TOKEN", "")
    tok_file = Path(__file__).parent / ".ingest_token.local"
    if not token and tok_file.exists():
        token = tok_file.read_text(encoding="utf-8").strip()

    if not url:
        raise SystemExit("Provide --url (the deployed worker URL)")
    if not token:
        raise SystemExit("Provide --token or set INGEST_TOKEN / .ingest_token.local")

    data = json.loads(KB.read_text(encoding="utf-8"))
    docs = [
        {
            "id": e["id"],
            "text": e["doc"],
            "metadata": {
                "species": e.get("species", "general"),
                "category": e.get("category", "general"),
                "topic": e.get("topic", ""),
                "source": e.get("source", ""),
            },
        }
        for e in data.get("entries", [])
    ]
    print(f"Ingesting {len(docs)} docs → {url}/ingest")
    r = requests.post(
        f"{url}/ingest",
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json={"docs": docs},
        timeout=120,
    )
    print(r.status_code, r.text[:400])


if __name__ == "__main__":
    main()
