from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os

# Project root: backend/app/core/config.py → ../../.. → project root
_BASE_DIR = Path(__file__).parent.parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Farm AI"
    VERSION: str = "3.0.0-Enterprise"
    API_V1_STR: str = "/api/v1"

    # JWT — override in production via environment variable SECRET_KEY
    SECRET_KEY: str = "change-me-in-production-set-SECRET_KEY-env-var"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    OTP_TTL_MINUTES: int = int(os.getenv("OTP_TTL_MINUTES", "5"))

    # Optional first-run bootstrap. No account is created unless both are set.
    BOOTSTRAP_ADMIN_USERNAME: str = os.getenv("BOOTSTRAP_ADMIN_USERNAME", "")
    BOOTSTRAP_ADMIN_PASSWORD: str = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "")
    BOOTSTRAP_ADMIN_EMAIL: str = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "")

    # Database
    USE_SQLITE: bool = False
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg2://admin:password@localhost:5432/smart_farm"
    ).strip()

    # Sovereign Intelligence (v3.0)
    CHROMA_HOST: str = os.getenv("CHROMA_HOST", "localhost")
    CHROMA_PORT: int = int(os.getenv("CHROMA_PORT", 8001))
    # Cloudflare RAG Worker (Workers AI + Vectorize). When set, used as the
    # primary retrieval backend — always-on, serverless, no ChromaDB/Ollama.
    RAG_WORKER_URL: str = os.getenv("RAG_WORKER_URL", "")
    # Cloudflare R2 public base URL for YOLO model weights (lazy-download if
    # the local .pt is missing). Empty = always use local files.
    R2_MODELS_BASE_URL: str = os.getenv("R2_MODELS_BASE_URL", "")
    # DeepForest microservice (isolated venv) for tree-crown detection.
    # Empty = fall back to the built-in OpenCV detector.
    DEEPFOREST_URL: str = os.getenv("DEEPFOREST_URL", "")
    # Satellite tile source for the orchard DETECTION mosaic: "google" (high-res,
    # z20-21 ≈ 0.12 m/px — best for crown detection, esp. with DeepForest) or
    # "esri" (z18 ≈ 0.48 m/px, licensed). Google is preferred where available.
    SAT_TILE_PROVIDER: str = os.getenv("SAT_TILE_PROVIDER", "google")
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    VISION_MODEL: str = os.getenv("VISION_MODEL", "llava:latest")
    DERJA_MODEL: str = os.getenv("DERJA_MODEL", "llama3.1:8b")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # Lite Mode
    LITE_MODE: bool = os.getenv("LITE_MODE", "false").lower() == "true"

    # MQTT
    MQTT_BROKER: str = "mosquitto"
    MQTT_PORT: int = 1883
    MQTT_TOPIC_PREFIX: str = "smart_farm"

    # IoT telemetry ingest rate limit (shared per source IP — raise if many sensors share a NAT)
    IOT_TELEMETRY_RATE_LIMIT: str = os.getenv("IOT_TELEMETRY_RATE_LIMIT", "60/minute")

    # CORS
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000")

    # External APIs
    TREFLE_API_TOKEN: str = "your_placeholder_token_here_from_trefle_io"
    WEATHER_API_URL: str = os.getenv("WEATHER_API_URL", "https://api.open-meteo.com/v1/forecast")

    # ── YOLO Model Paths ──────────────────────────────────────────
    # Defaults are relative to the project root; override via .env on any machine.
    YOLO_BEE_PATH: str = os.getenv(
        "YOLO_BEE_PATH",
        str(_BASE_DIR / "ai_assets" / "animal_weights" / "bee" / "final_export" / "best.pt")
    )
    YOLO_GOAT_PATH: str = os.getenv(
        "YOLO_GOAT_PATH",
        str(_BASE_DIR / "ai_assets" / "animal_weights" / "model goat cow" / "best.pt")
    )
    YOLO_COW_PATH: str = os.getenv(
        "YOLO_COW_PATH",
        str(_BASE_DIR / "ai_assets" / "animal_weights" / "model goat cow" / "best.pt")
    )
    YOLO_SHEEP_PATH: str = os.getenv(
        "YOLO_SHEEP_PATH",
        str(_BASE_DIR / "ai_assets" / "animal_weights" / "model goat cow" / "best.pt")
    )
    # Disease-specific models (new)
    YOLO_GOAT_DISEASE_PATH: str = os.getenv(
        "YOLO_GOAT_DISEASE_PATH",
        str(_BASE_DIR / "ai_assets" / "animal_weights" / "Model_goat_YOLOv11" / "best.pt")
    )
    YOLO_CHICKEN_DISEASE_PATH: str = os.getenv(
        "YOLO_CHICKEN_DISEASE_PATH",
        str(_BASE_DIR / "ai_assets" / "animal_weights" / "Model_chicken_YOLOv11" / "best.pt")
    )
    YOLO_CHICKEN_DETECT_PATH: str = os.getenv(
        "YOLO_CHICKEN_DETECT_PATH",
        str(_BASE_DIR / "ai_assets" / "animal_weights" / "Model_chicken_detection_YOLOv11" / "best.pt")
    )
    YOLO_RABBIT_PATH: str = os.getenv(
        "YOLO_RABBIT_PATH",
        str(_BASE_DIR / "ai_assets" / "animal_weights" / "Model_rabbit_YOLOv11" / "best.pt")
    )
    YOLO_COW_BEHAVIOR_PATH: str = os.getenv(
        "YOLO_COW_BEHAVIOR_PATH",
        str(_BASE_DIR / "ai_assets" / "animal_weights" / "Model_cow_behavior_YOLOv11" / "best.pt")
    )
    YOLO_LEAVES_PATH: str = os.getenv(
        "YOLO_LEAVES_PATH",
        str(_BASE_DIR / "ai_assets" / "plantations" / "Detection diseases Leaves" / "best.pt")
    )
    YOLO_OLIVE_PATH: str = os.getenv(
        "YOLO_OLIVE_PATH",
        str(_BASE_DIR / "ai_assets" / "plantations" / "model olive-tree-diseases" / "best.pt")
    )
    YOLO_INSECTS_PATH: str = os.getenv(
        "YOLO_INSECTS_PATH",
        str(_BASE_DIR / "ai_assets" / "plantations" / "model insects_final" / "best.pt")
    )
    YOLO_LEMON_PATH: str = os.getenv(
        "YOLO_LEMON_PATH",
        str(_BASE_DIR / "ai_assets" / "plantations" / "model lemon-leaf" / "best.pt")
    )
    YOLO_ORANGE_PATH: str = os.getenv(
        "YOLO_ORANGE_PATH",
        str(_BASE_DIR / "ai_assets" / "plantations" / "Model orange-leaf" / "best.pt")
    )
    YOLO_PLANTDOC_PATH: str = os.getenv(
        "YOLO_PLANTDOC_PATH",
        str(_BASE_DIR / "ai_assets" / "plantations" / "Model_plantdoc_YOLOv11" / "best.pt")
    )
    YOLO_FIRE_PATH: str = os.getenv(
        "YOLO_FIRE_PATH",
        str(_BASE_DIR / "ai_assets" / "Alert" / "model-fire-detection-and-smoke" / "best.pt")
    )
    # Classifieur santé colonie (varroa, reine manquante, pillage…) — YOLOv8-cls
    # entraîné sur BeeImage via mlops/train_varroa.py (top-1 = 97,9 %)
    YOLO_BEE_HEALTH_PATH: str = os.getenv(
        "YOLO_BEE_HEALTH_PATH",
        str(_BASE_DIR / "ai_assets" / "animal_weights" / "bee" / "bee_health_cls" / "best.pt")
    )
    # Classifieur PlantVillage 38 classes maladie×espèce — YOLOv8-cls
    # entraîné via mlops/train_plantvillage.py
    YOLO_PLANTVILLAGE_PATH: str = os.getenv(
        "YOLO_PLANTVILLAGE_PATH",
        str(_BASE_DIR / "ai_assets" / "plantations" / "plantvillage_cls" / "best.pt")
    )




    # ── Redis ─────────────────────────────────────────────────────
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    CACHE_TTL_SECONDS: int = int(os.getenv("CACHE_TTL_SECONDS", "300"))  # 5 min default

    # ── Push Notifications ────────────────────────────────────────
    FCM_SERVER_KEY:    str = os.getenv("FCM_SERVER_KEY",    "")   # FCM legacy
    VAPID_PRIVATE_KEY: str = os.getenv("VAPID_PRIVATE_KEY", "")   # never hardcode — set in .env
    VAPID_EMAIL:       str = os.getenv("VAPID_EMAIL",       "")

    # ── Stripe Billing ────────────────────────────────────────────
    STRIPE_SECRET_KEY: str      = os.getenv("STRIPE_SECRET_KEY", "")
    STRIPE_PUBLISHABLE_KEY: str = os.getenv("STRIPE_PUBLISHABLE_KEY", "")
    STRIPE_WEBHOOK_SECRET: str  = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    STRIPE_PRICE_PRO: str        = os.getenv("STRIPE_PRICE_PRO", "")        # Stripe Price ID
    STRIPE_PRICE_ENTERPRISE: str = os.getenv("STRIPE_PRICE_ENTERPRISE", "")

    # ── 2FA TOTP ──────────────────────────────────────────────────
    TOTP_ISSUER: str = os.getenv("TOTP_ISSUER", "SmartFarmAI")

    # ── APScheduler (auto-retraining) ─────────────────────────────
    RETRAIN_THRESHOLD: int  = int(os.getenv("RETRAIN_THRESHOLD", "50"))
    PSI_WARNING: float      = float(os.getenv("PSI_WARNING", "0.1"))
    PSI_CRITICAL: float     = float(os.getenv("PSI_CRITICAL", "0.2"))

    # ── OTP Channels ──────────────────────────────────────────────
    # Gmail SMTP (Email OTP)
    SMTP_EMAIL: str = os.getenv("SMTP_EMAIL", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")  # Gmail App Password
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "465"))  # 465=SSL, 587=TLS

    # WhatsApp Business Cloud API (Meta)
    WHATSAPP_TOKEN: str = os.getenv("WHATSAPP_TOKEN", "")
    WHATSAPP_PHONE_ID: str = os.getenv("WHATSAPP_PHONE_ID", "")
    WHATSAPP_API_VERSION: str = os.getenv("WHATSAPP_API_VERSION", "v25.0")

    # WhatsApp alert template (approved in Meta Business Manager). When set,
    # alerts are sent via this template (delivers outside the 24h window);
    # otherwise free-form text is used (24h window only).
    WHATSAPP_ALERT_TEMPLATE: str = os.getenv("WHATSAPP_ALERT_TEMPLATE", "")
    WHATSAPP_ALERT_TEMPLATE_LANG: str = os.getenv("WHATSAPP_ALERT_TEMPLATE_LANG", "fr")

    # Telegram Bot (optional secondary alert channel — no 24h window limit)
    TELEGRAM_BOT_TOKEN: str = os.getenv("TELEGRAM_BOT_TOKEN", "")
    TELEGRAM_CHAT_ID: str = os.getenv("TELEGRAM_CHAT_ID", "")  # default farm group/channel

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")


settings = Settings()
