from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Farm AI"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"

    # JWT
    SECRET_KEY: str = "dev_secret_key_change_in_production_use_32_chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week

    # Database
    USE_SQLITE: bool = True
    DATABASE_URL: str = "sqlite:///./smart_farm.db"

    # MQTT
    MQTT_BROKER: str = "broker.hivemq.com"
    MQTT_PORT: int = 1883
    MQTT_TOPIC_PREFIX: str = "smart_farm"

    # Redis (optional, for caching/pub-sub)
    REDIS_URL: str = "redis://localhost:6379/0"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # External APIs
    TREFLE_API_TOKEN: str = "your_placeholder_token_here_from_trefle_io"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
