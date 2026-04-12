"""
Unified AI Client — Single entry point for all AI/LLM calls in StockSense.

Fallback chain: Gemini (cloud) → Ollama (local) → OpenRouter (cloud)

Supports:
- call_llm(prompt) → text generation
- call_vision(image_bytes, prompt) → multimodal (image + text)
- get_provider_status() → health/availability info

Gemini is primary when API key is configured (fast, accurate).
Ollama is local fallback (slower but private). OpenRouter is last resort.
"""

import base64
import json
import logging
import os
import time
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Provider availability cache
# ---------------------------------------------------------------------------
_provider_cache = {
    "ollama": {"available": None, "checked_at": 0},
    "gemini": {"available": None, "checked_at": 0},
    "openrouter": {"available": None, "checked_at": 0},
}
_CACHE_TTL = 60  # seconds — re-check provider availability every 60s

# ---------------------------------------------------------------------------
# Gemini SDK state (shared across calls)
# ---------------------------------------------------------------------------
_gemini_client = None
_gemini_available = None
_using_new_sdk = False


# ═══════════════════════════════════════════════════════════════════════════
# OLLAMA — Local LLM via REST API
# ═══════════════════════════════════════════════════════════════════════════

def _get_ollama_config():
    """Get Ollama configuration from environment."""
    return {
        "base_url": os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434"),
        "model": os.getenv("OLLAMA_MODEL", "gemma3:4b"),
        "timeout": int(os.getenv("OLLAMA_TIMEOUT", "300")),
        "vision_timeout": int(os.getenv("OLLAMA_VISION_TIMEOUT", "600")),
    }


def _check_ollama_available() -> bool:
    """Check if Ollama is reachable (cached for _CACHE_TTL seconds)."""
    now = time.time()
    cache = _provider_cache["ollama"]

    if cache["available"] is not None and (now - cache["checked_at"]) < _CACHE_TTL:
        return cache["available"]

    config = _get_ollama_config()
    try:
        import requests
        resp = requests.get(f"{config['base_url']}/api/tags", timeout=5)
        available = resp.status_code == 200
        if available:
            # Verify our model is actually loaded
            models = resp.json().get("models", [])
            model_names = [m.get("name", "") for m in models]
            model_base = config["model"].split(":")[0]
            available = any(model_base in name for name in model_names)
            if available:
                logger.info("✅ Ollama available — model '%s' found", config["model"])
            else:
                logger.warning(
                    "Ollama running but model '%s' not found. Available: %s",
                    config["model"], model_names,
                )
        cache["available"] = available
        cache["checked_at"] = now
        return available
    except Exception as e:
        logger.debug("Ollama not reachable: %s", e)
        cache["available"] = False
        cache["checked_at"] = now
        return False


def _call_ollama_text(prompt: str, timeout: Optional[int] = None) -> Optional[str]:
    """Call Ollama for text generation via REST API."""
    if not _check_ollama_available():
        return None

    config = _get_ollama_config()
    timeout = timeout or config["timeout"]

    try:
        import requests
        resp = requests.post(
            f"{config['base_url']}/api/generate",
            json={
                "model": config["model"],
                "prompt": prompt,
                "stream": False,
            },
            timeout=timeout,
        )
        if resp.status_code == 200:
            result = resp.json().get("response", "")
            logger.info("Ollama text response received (%d chars)", len(result))
            return result
        else:
            logger.warning("Ollama returned status %d: %s", resp.status_code, resp.text[:200])
            return None
    except Exception as e:
        logger.warning("Ollama text call failed: %s", e)
        # Invalidate cache so we re-check next time
        _provider_cache["ollama"]["available"] = None
        return None


def _call_ollama_vision(image_bytes: bytes, prompt: str, timeout: Optional[int] = None) -> Optional[str]:
    """Call Ollama for vision/multimodal generation — gemma4 supports images natively."""
    if not _check_ollama_available():
        return None

    config = _get_ollama_config()
    timeout = timeout or config["vision_timeout"]  # Vision needs more time than text

    try:
        import requests
        b64_image = base64.b64encode(image_bytes).decode("utf-8")

        resp = requests.post(
            f"{config['base_url']}/api/generate",
            json={
                "model": config["model"],
                "prompt": prompt,
                "images": [b64_image],
                "stream": False,
            },
            timeout=timeout,
        )
        if resp.status_code == 200:
            result = resp.json().get("response", "")
            logger.info("Ollama vision response received (%d chars)", len(result))
            return result
        else:
            logger.warning("Ollama vision returned status %d: %s", resp.status_code, resp.text[:200])
            return None
    except Exception as e:
        logger.warning("Ollama vision call failed: %s", e)
        _provider_cache["ollama"]["available"] = None
        return None


# ═══════════════════════════════════════════════════════════════════════════
# GEMINI — Google Cloud AI (fallback #1)
# ═══════════════════════════════════════════════════════════════════════════

def _init_gemini():
    """Initialize Gemini client; returns client object or None."""
    global _gemini_client, _gemini_available, _using_new_sdk

    if _gemini_available is False:
        return None
    if _gemini_client is not None:
        return _gemini_client

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key in ("your-gemini-api-key-here", ""):
        logger.debug("GEMINI_API_KEY not set — Gemini unavailable")
        _gemini_available = False
        return None

    # Try new google.genai SDK first
    try:
        from google import genai
        _gemini_client = genai.Client(api_key=api_key)
        _gemini_available = True
        _using_new_sdk = True
        logger.info("✅ Gemini initialized (google.genai SDK)")
        return _gemini_client
    except ImportError:
        pass
    except Exception as e:
        logger.warning("New google.genai SDK failed: %s — trying legacy", e)

    # Fallback to deprecated google.generativeai
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_client = genai.GenerativeModel("gemini-2.5-flash")
        _gemini_available = True
        _using_new_sdk = False
        logger.info("✅ Gemini initialized (legacy google.generativeai SDK)")
        return _gemini_client
    except Exception as e:
        logger.error("Failed to initialize Gemini: %s", e)
        _gemini_available = False
        return None


def _call_gemini_text(prompt: str, max_retries: int = 3) -> Optional[str]:
    """Call Gemini API for text generation with retry logic."""
    client = _init_gemini()
    if client is None:
        return None

    for attempt in range(max_retries):
        try:
            if _using_new_sdk:
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                )
                return response.text
            else:
                response = client.generate_content(prompt)
                return response.text
        except Exception as e:
            wait = 2 ** attempt
            logger.warning(
                "Gemini text call failed (attempt %d/%d): %s. Retrying in %ds...",
                attempt + 1, max_retries, e, wait,
            )
            time.sleep(wait)
    return None


def _call_gemini_vision(image_bytes: bytes, prompt: str, max_retries: int = 3) -> Optional[str]:
    """Call Gemini Vision API with retry logic."""
    client = _init_gemini()
    if client is None:
        return None

    for attempt in range(max_retries):
        try:
            if _using_new_sdk:
                from google.genai import types
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=[prompt, types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")],
                )
                return response.text
            else:
                image_part = {
                    "mime_type": "image/jpeg",
                    "data": image_bytes,
                }
                response = client.generate_content([prompt, image_part])
                return response.text
        except Exception as e:
            wait = 2 ** attempt
            logger.warning(
                "Gemini vision call failed (attempt %d/%d): %s. Retrying in %ds...",
                attempt + 1, max_retries, e, wait,
            )
            time.sleep(wait)
    return None


# ═══════════════════════════════════════════════════════════════════════════
# OPENROUTER — Cloud fallback #2
# ═══════════════════════════════════════════════════════════════════════════

def _call_openrouter_text(prompt: str) -> Optional[str]:
    """Call OpenRouter free tier API for text generation."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or api_key in ("your-openrouter-key-here", ""):
        return None

    try:
        import requests
        response = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "meta-llama/llama-3-8b-instruct:free",
                "messages": [{"role": "user", "content": prompt}],
            },
            timeout=30,
        )
        if response.status_code == 200:
            return response.json()["choices"][0]["message"]["content"]
        else:
            logger.warning("OpenRouter returned %d: %s", response.status_code, response.text[:200])
            return None
    except Exception as e:
        logger.error("OpenRouter text call failed: %s", e)
        return None


def _call_openrouter_vision(image_bytes: bytes, prompt: str) -> Optional[str]:
    """Call OpenRouter with a vision-capable model for image analysis."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key or api_key in ("your-openrouter-key-here", ""):
        return None

    try:
        import requests
        b64_image = base64.b64encode(image_bytes).decode("utf-8")

        resp = requests.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={"Authorization": f"Bearer {api_key}"},
            json={
                "model": "google/gemini-2.0-flash-exp:free",
                "messages": [
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{b64_image}",
                                },
                            },
                        ],
                    }
                ],
            },
            timeout=60,
        )

        if resp.status_code == 200:
            return resp.json()["choices"][0]["message"]["content"]
        else:
            logger.warning("OpenRouter vision returned %d: %s", resp.status_code, resp.text[:200])
            return None
    except Exception as e:
        logger.error("OpenRouter vision call failed: %s", e)
        return None


# ═══════════════════════════════════════════════════════════════════════════
# PUBLIC API — These are the ONLY functions other services should call
# ═══════════════════════════════════════════════════════════════════════════

def call_llm(prompt: str) -> Optional[str]:
    """
    Generate text from a prompt using the best available provider.

    Fallback chain: Gemini → Ollama → OpenRouter

    Args:
        prompt: The text prompt to send

    Returns:
        Response text, or None if all providers fail
    """
    # 1. Try Gemini (cloud — fast, accurate)
    result = _call_gemini_text(prompt)
    if result:
        logger.debug("AI provider: gemini (text)")
        return result

    # 2. Try Ollama (local fallback)
    result = _call_ollama_text(prompt)
    if result:
        logger.debug("AI provider: ollama (text)")
        return result

    # 3. Try OpenRouter (cloud)
    result = _call_openrouter_text(prompt)
    if result:
        logger.debug("AI provider: openrouter (text)")
        return result

    logger.warning("All AI providers failed for text generation")
    return None


def call_vision(image_bytes: bytes, prompt: str) -> Optional[str]:
    """
    Analyze an image with a text prompt using the best available provider.

    Fallback chain: Gemini → Ollama → OpenRouter

    Args:
        image_bytes: Raw image bytes (JPEG/PNG)
        prompt: The text prompt describing what to extract/analyze

    Returns:
        Response text, or None if all providers fail
    """
    # 1. Try Gemini Vision (cloud — fast, accurate)
    result = _call_gemini_vision(image_bytes, prompt)
    if result:
        logger.debug("AI provider: gemini (vision)")
        return result

    # 2. Try Ollama (local fallback)
    result = _call_ollama_vision(image_bytes, prompt)
    if result:
        logger.debug("AI provider: ollama (vision)")
        return result

    # 3. Try OpenRouter Vision (cloud)
    result = _call_openrouter_vision(image_bytes, prompt)
    if result:
        logger.debug("AI provider: openrouter (vision)")
        return result

    logger.warning("All AI providers failed for vision generation")
    return None


def get_provider_status() -> dict:
    """
    Get the availability status of all AI providers.
    Useful for health checks and debugging.
    """
    ollama_config = _get_ollama_config()
    ollama_available = _check_ollama_available()

    gemini_key = os.getenv("GEMINI_API_KEY", "")
    gemini_configured = bool(gemini_key and gemini_key not in ("your-gemini-api-key-here", ""))

    openrouter_key = os.getenv("OPENROUTER_API_KEY", "")
    openrouter_configured = bool(openrouter_key and openrouter_key not in ("your-openrouter-key-here", ""))

    return {
        "primary": {
            "provider": "gemini",
            "configured": gemini_configured,
            "available": _gemini_available,
        },
        "fallback_1": {
            "provider": "ollama",
            "model": ollama_config["model"],
            "url": ollama_config["base_url"],
            "available": ollama_available,
        },
        "fallback_2": {
            "provider": "openrouter",
            "configured": openrouter_configured,
        },
        "active_provider": (
            "gemini" if gemini_configured
            else "ollama" if ollama_available
            else "openrouter" if openrouter_configured
            else "none"
        ),
    }
