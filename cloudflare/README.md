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

## 2. Model storage — R2 ⏳ (enable required)

Keeps the multi-GB YOLO weights out of the repo/image; lazy-downloaded on demand.

```bash
# 1. Dashboard → R2 → Enable (free tier).
# 2. npx wrangler r2 bucket create farmai-models
# 3. powershell .\cloudflare\upload_models_r2.ps1   # uploads ai_assets/**/best.pt|onnx
# 4. Connect a public domain to the bucket, then set in backend/.env:
#    R2_MODELS_BASE_URL=https://models.yourdomain.com
```
`backend/app/utils/model_fetch.py` downloads a weight from R2 if it is missing
locally (no-op when `R2_MODELS_BASE_URL` is empty).

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

## 4. Cloudflare MCP ✅ (configured)

`.mcp.json` registers three Cloudflare MCP servers (docs, bindings,
observability). On the next Claude Code session you'll be prompted to approve +
authenticate (OAuth). Lets the assistant manage Workers/Vectorize/R2/Pages and
read docs directly.
