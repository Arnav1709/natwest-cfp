"""
StockSense Configuration
Loads settings from environment variables / .env file.
"""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database (uses data/ subdir for Docker volume compatibility)
    DATABASE_URL: str = "sqlite:///./data/stocksense.db"

    # JWT Auth
    SECRET_KEY: str = "stocksense-super-secret-key-change-in-production-2026"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Gemini API
    GEMINI_API_KEY: Optional[str] = None

    # OpenRouter Fallback
    OPENROUTER_API_KEY: Optional[str] = None

    # WhatsApp Bot Sidecar
    WHATSAPP_BOT_URL: str = "http://localhost:3001"

    # App
    APP_NAME: str = "StockSense"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
