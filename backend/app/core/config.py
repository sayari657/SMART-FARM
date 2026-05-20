from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path
import os

# Project root: backend/app/core/config.py → ../../.. → project root
_BASE_DIR = Path(__file__).parent.parent.parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Farm AI"
    VERSION: str = "3.0.0-Enterprise"
    API_V1_STR: str = "/api/v1"

    # JWT — must be set in .env (no insecure default)
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # Database
    USE_SQLITE: bool = False  
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+psycopg2://admin:password@localhost:5432/smart_farm"
    ).strip()

    # Sovereign Intelligence (v3.0)
    CHROMA_HOST: str = os.getenv("CHROMA_HOST", "localhost")
    CHROMA_PORT: int = int(os.getenv("CHROMA_PORT", 8001))
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    VISION_MODEL: str = os.getenv("VISION_MODEL", "llava")
    DERJA_MODEL: str = os.getenv("DERJA_MODEL", "wghezaiel/labess-7b-chat")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # Lite Mode
    LITE_MODE: bool = os.getenv("LITE_MODE", "false").lower() == "true"

    # MQTT
    MQTT_BROKER: str = "mosquitto"
    MQTT_PORT: int = 1883
    MQTT_TOPIC_PREFIX: str = "smart_farm"

    # Redis
    REDIS_URL: str = "redis://redis:6379/0"

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
    YOLO_FIRE_PATH: str = os.getenv(
        "YOLO_FIRE_PATH",
        str(_BASE_DIR / "ai_assets" / "Alert" / "model-fire-detection-and-smoke" / "best.pt")
    )




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

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)


settings = Settings()
