# Smart Farm AI — backend on Hugging Face Spaces (Docker SDK, free CPU · 16 GB).
# The Space repo only holds this Dockerfile + README; the backend code and the
# YOLO models are pulled from the public GitHub repo at build time (sparse
# checkout of backend/ + ai_assets/ only — never the heavy frontend assets).

FROM python:3.11-slim

# System libs OpenCV / Pillow need at runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
      git libgl1 libglib2.0-0 curl \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 1. Pull backend + models (sparse → keeps the image lean)
ARG REPO=https://github.com/sayari657/SMART-FARM
RUN git clone --no-checkout --depth 1 "$REPO" /src \
 && cd /src \
 && git sparse-checkout init --cone \
 && git sparse-checkout set backend ai_assets \
 && git checkout \
 && cp -r /src/backend/. /app/ \
 && cp -r /src/ai_assets /app/ai_assets \
 && rm -rf /src /app/.git

# 2. CPU-only torch first (avoids the multi-GB CUDA build), then the rest
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu \
 && pip install --no-cache-dir -r requirements.txt

# 3. Runtime config (override secrets in the Space → Settings → Secrets)
ENV USE_SQLITE=true \
    LITE_MODE=false \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/.cache/huggingface

# HF Spaces routes traffic to app_port (7860). Writable dirs for SQLite + cache.
RUN mkdir -p /app/.cache && chmod -R 777 /app/.cache
EXPOSE 7860

# HF sets $PORT; default to 7860. One worker keeps the 16 GB headroom for models.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
