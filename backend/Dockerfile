FROM python:3.11-slim

WORKDIR /app

# System deps: psycopg2, Pillow, OpenCV-headless
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc g++ libglib2.0-0 libsm6 libxext6 libxrender-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies.
# Use requirements.cloud.txt (no YOLO/torch/chromadb) for a lean cloud image.
# Swap to requirements.txt on a GPU VPS for the full AI-enabled image.
COPY requirements.cloud.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Non-root user — never run app code as root
RUN addgroup --system appgroup && adduser --system --ingroup appgroup appuser \
    && mkdir -p /data && chown appuser:appgroup /data

USER appuser

EXPOSE 8000

# 2 workers — enough for a small VPS; raise for higher traffic
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
