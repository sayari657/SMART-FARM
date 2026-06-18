---
title: Smart Farm AI Backend
emoji: 🌿
colorFrom: green
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
short_description: Smart Farm AI backend (FastAPI + YOLO)
---

# Smart Farm AI — Backend

FastAPI backend (MQTT/IoT, YOLO vision, RAG, alerts) for the Smart Farm AI app.
Built from the public repo `sayari657/SMART-FARM` at image-build time.

- Frontend: https://farmai-7ye.pages.dev
- Health check: `/health`
- API base: `/api/v1`

## Required Space secrets (Settings → Variables and secrets)

| Key | Value |
|---|---|
| `SECRET_KEY` | a long random string (JWT signing) |
| `CORS_ORIGINS` | `https://farmai-7ye.pages.dev,http://localhost:5173` |

## Optional secrets (enable extra features)

`GROQ_API_KEY`, `SMTP_EMAIL`, `SMTP_PASSWORD`, `WHATSAPP_TOKEN`,
`WHATSAPP_PHONE_ID`, `DATABASE_URL` (e.g. a free Neon Postgres for persistence;
without it, `USE_SQLITE=true` is used and data resets on rebuild).
