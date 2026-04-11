from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Farm AI"
    VERSION: str = "3.0.0-Enterprise"
    API_V1_STR: str = "/api/v1"

    # JWT
    SECRET_KEY: str = "dev_secret_key_change_in_production_use_32_chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # Database
    USE_SQLITE: bool = True  # Enabled for Lite Mode
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./smart_farm.db")

    # Sovereign Intelligence (v3.0)
    CHROMA_HOST: str = os.getenv("CHROMA_HOST", "localhost")
    CHROMA_PORT: int = int(os.getenv("CHROMA_PORT", 8001))
    OLLAMA_BASE_URL: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    VISION_MODEL: str = os.getenv("VISION_MODEL", "llava")
    DERJA_MODEL: str = os.getenv("DERJA_MODEL", "labess")
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
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # External APIs
    TREFLE_API_TOKEN: str = "your_placeholder_token_here_from_trefle_io"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
