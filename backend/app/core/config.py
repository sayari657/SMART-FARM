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
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        f"sqlite:///{os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), 'smart_farm.db')}"
    )

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
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://localhost:3000,http://127.0.0.1:3000")

    # External APIs
    TREFLE_API_TOKEN: str = "your_placeholder_token_here_from_trefle_io"
    WEATHER_API_URL: str = os.getenv("WEATHER_API_URL", "https://api.open-meteo.com/v1/forecast")

    # ── YOLO Model Paths ──────────────────────────────────────────
    # Modèle Abeilles (entraîné sur dataset Kaggle)
    YOLO_BEE_PATH: str = os.getenv(
        "YOLO_BEE_PATH",
        r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\animal_weights\bee\final_export\best.pt"
    )
    # Modèle Chèvre / Vache / Mouton (modèle partagé multi-espèces)
    YOLO_GOAT_PATH: str = os.getenv(
        "YOLO_GOAT_PATH",
        r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\animal_weights\model goat cow\best.pt"
    )
    YOLO_COW_PATH: str = os.getenv(
        "YOLO_COW_PATH",
        r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\animal_weights\model goat cow\best.pt"
    )
    YOLO_SHEEP_PATH: str = os.getenv(
        "YOLO_SHEEP_PATH",
        r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\animal_weights\model goat cow\best.pt"
    )
    # Modele Maladies des Feuilles (12 classes: Beans, Strawberry, Tomato)
    YOLO_LEAVES_PATH: str = os.getenv(
        "YOLO_LEAVES_PATH",
        r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\plantations\Detection diseases Leaves\best.pt"
    )
    # Modele Maladies Olivier (5 classes: Anthracnose, BlackScale, OlivePeacockSpot, Psyllid, Tuberculosis)
    YOLO_OLIVE_PATH: str = os.getenv(
        "YOLO_OLIVE_PATH",
        r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\plantations\model olive-tree-diseases\best.pt"
    )
    # Modele Insects (10 classes: Army worm, Legume beetle, Rice pests...)
    YOLO_INSECTS_PATH: str = os.getenv(
        "YOLO_INSECTS_PATH",
        r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\plantations\model insects_final\best.pt"
    )
    # Modele Lemon Disease (Placeholder)
    YOLO_LEMON_PATH: str = os.getenv(
        "YOLO_LEMON_PATH",
        r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\plantations\Detection diseases Leaves\best.pt"
    )
    # Modele Orange Disease (Placeholder)
    YOLO_ORANGE_PATH: str = os.getenv(
        "YOLO_ORANGE_PATH",
        r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\plantations\Detection diseases Leaves\best.pt"
    )
    # Modele Feu & Fumée
    YOLO_FIRE_PATH: str = os.getenv(
        "YOLO_FIRE_PATH",
        r"C:\Users\Mohamed\Desktop\FARM AI\ai_assets\Alert\model-fire-detection-and-smoke\best.pt"
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

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
