"""
StockSense Configuration
Loads settings from environment variables / .env file.
"""

from pydantic import field_validator
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database (uses data/ subdir for Docker volume compatibility)
    DATABASE_URL: str = "sqlite:///./data/stocksense.db"

    @field_validator("DATABASE_URL")
    @classmethod
    def _normalize_db_url(cls, v: str) -> str:
        # Render/Supabase/Heroku hand out "postgres://" URLs, but
        # SQLAlchemy 2.x + psycopg2 require the "postgresql://" scheme.
        if v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return v

    # JWT Auth
    SECRET_KEY: str = "stocksense-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Gemini API
    GEMINI_API_KEY: Optional[str] = None

    # OpenRouter Fallback
    OPENROUTER_API_KEY: Optional[str] = None

    # Ollama (Local AI — fallback provider)
    OLLAMA_BASE_URL: str = "http://host.docker.internal:11434"
    OLLAMA_MODEL: str = "gemma3:4b"
    OLLAMA_TIMEOUT: int = 300  # seconds for text generation
    OLLAMA_VISION_TIMEOUT: int = 600  # seconds for image/vision (much slower)

    # Serper Web Search (for intelligence layer)
    SERPER_API_KEY: Optional[str] = None

    # CORS — comma-separated list of allowed frontend origins for production
    # e.g. "https://stocksense.vercel.app,https://www.mydomain.com"
    CORS_ORIGINS: str = ""
    # Optional regex to allow dynamic preview deploys, e.g. r"https://.*\.vercel\.app"
    CORS_ORIGIN_REGEX: Optional[str] = None

    # App
    APP_NAME: str = "StockSense"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    @property
    def cors_origins_list(self) -> list[str]:
        """Parse the comma-separated CORS_ORIGINS env value into a list."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def is_default_secret(self) -> bool:
        return self.SECRET_KEY == "stocksense-super-secret-key-change-in-production-2026"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
