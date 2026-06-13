# Smart Farm AI — Cloudflare Edge Stack

Four upgrades that make the platform serverless and always-on.

## 1. Sovereign RAG — Workers AI + Vectorize ✅ (deployed, 1 step left)

Replaces the local ChromaDB/Ollama dependency with an always-on, edge RAG.

- **Index**: `farmai-knowledge` (1024-d, cosine) — created.
- **Worker**: `cloudflare/rag-worker/` — deployed with `AI` + `VECTORIZE` bindings.
  Routes: `/query` (semantic search), `/chat` (RAG + Llama 3.1), `/ingest`, `/health`.
- **Backend**: set `RAG_WORKER_URL` → `rag_service` uses it first, falls back to
  the local JSON knowledge base if unreachable.

**Finish (1 click + 2 commands):**
```bash
# 1. Register a workers.dev subdomain (one-time):
#    https://dash.cloudflare.com/<account>/workers/onboarding
# 2. Re-deploy to get the public URL:
cd cloudflare/rag-worker && npx wrangler deploy
# 3. Ingest the 23 knowledge docs (embeddings → Vectorize):
python ingest.py --url https://farmai-rag.<subdomain>.workers.dev
# 4. Point the backend at it:
#    RAG_WORKER_URL=https://farmai-rag.<subdomain>.workers.dev   (in backend/.env)
```

## 2. Model storage — FREE, no credit card (Hugging Face) ⭐

The 24 YOLO weights total only ~113 MB. Cheapest path = **Hugging Face Hub**
(free, no card, preserves the ai_assets/ layout). The same
`backend/app/utils/model_fetch.py` helper works — it lazy-downloads a weight
from `R2_MODELS_BASE_URL/<path>` when missing locally.

```bash
# 1. Free account + model repo at https://huggingface.co  (no card)
# 2. Write token: https://huggingface.co/settings/tokens
# 3. pip install huggingface_hub
# 4. python mlops/upload_models_hf.py --repo <user>/smart-farm-models --token hf_xxx
# 5. backend/.env:
#    R2_MODELS_BASE_URL=https://huggingface.co/<user>/smart-farm-models/resolve/main
```

Alternative (also free): Cloudflare R2 (10 GB) — but enabling it requires a card
on file even on the $0 tier. Use `cloudflare/upload_models_r2.ps1` if you prefer R2.

## 3. Telegram alerts ✅ (code ready, token required)

Lifts the WhatsApp 24h-window limitation. Alerts broadcast to a farm group.

```bash
# 1. Create a bot with @BotFather → token
# 2. Add the bot to a farm group; get the chat id
# 3. backend/.env:
#    TELEGRAM_BOT_TOKEN=123456:ABC...
#    TELEGRAM_CHAT_ID=-1001234567890
```
`/alerts/notify` now also broadcasts to Telegram (in addition to WhatsApp + push).

## 4. Cloudflare MCP ✅ (configured — FREE, no payment)

`.mcp.json` registers three Cloudflare MCP servers (docs, bindings,
observability). These are **free** — the "approve + OAuth" is a one-time
consent click (not a paid step) the next time Claude Code starts. Lets the
assistant manage Workers/Vectorize/R2/Pages and read docs directly.
