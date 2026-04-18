"""
Translation router — POST /api/translate
Transliterates product names to target language using AI + DB cache.
"""

import json
import logging
from typing import Dict, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.translation_cache import TranslationCache
from utils.auth import get_current_user
from services.ai_client import call_llm

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["translate"])

LANG_NAMES = {
    "hi": "Hindi (Devanagari script)",
    "ta": "Tamil (Tamil script)",
    "te": "Telugu (Telugu script)",
    "mr": "Marathi (Devanagari script)",
    "bn": "Bengali (Bengali script)",
    "gu": "Gujarati (Gujarati script)",
}


class TranslateRequest(BaseModel):
    texts: List[str]
    target_lang: str


class TranslateResponse(BaseModel):
    translations: Dict[str, str]


@router.post("/translate", response_model=TranslateResponse)
def translate_texts(
    request: TranslateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Transliterate a batch of texts to the target language script.
    Uses DB cache for previously translated texts, AI for new ones.
    If AI is unavailable, returns original text (graceful fallback).
    """
    target = request.target_lang.strip().lower()
    texts = [t.strip() for t in request.texts if t.strip()]

    # English = no-op
    if target == "en" or not texts:
        return TranslateResponse(translations={t: t for t in texts})

    result: Dict[str, str] = {}
    texts_to_translate: List[str] = []

    # 1. Check DB cache
    cached = (
        db.query(TranslationCache)
        .filter(
            TranslationCache.target_lang == target,
            TranslationCache.source_text.in_(texts),
        )
        .all()
    )
    cached_map = {c.source_text: c.translated for c in cached}

    for text in texts:
        if text in cached_map:
            result[text] = cached_map[text]
        else:
            texts_to_translate.append(text)

    # 2. If all cached, return immediately
    if not texts_to_translate:
        return TranslateResponse(translations=result)

    # 3. Call AI for uncached texts
    lang_name = LANG_NAMES.get(target, target)
    prompt = f"""Transliterate these English product/item names into {lang_name}.
Keep the meaning and transliterate to the native script. Do NOT translate generic words differently — transliterate them phonetically.

Return ONLY a valid JSON object mapping original name to transliterated name.
Example for Hindi: {{"Paracetamol": "पैरासिटामोल", "Cough Syrup": "कफ सिरप"}}

Products to transliterate:
{json.dumps(texts_to_translate, ensure_ascii=False)}

Return ONLY the JSON object, nothing else."""

    try:
        ai_response = call_llm(prompt)
        if ai_response:
            # Clean markdown fences if present
            cleaned = ai_response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()

            translations = json.loads(cleaned)

            if isinstance(translations, dict):
                for orig, translated in translations.items():
                    orig_stripped = orig.strip()
                    translated_stripped = str(translated).strip()
                    if orig_stripped in texts_to_translate:
                        result[orig_stripped] = translated_stripped
                        # Cache in DB
                        existing = (
                            db.query(TranslationCache)
                            .filter(
                                TranslationCache.source_text == orig_stripped,
                                TranslationCache.target_lang == target,
                            )
                            .first()
                        )
                        if not existing:
                            db.add(TranslationCache(
                                source_text=orig_stripped,
                                target_lang=target,
                                translated=translated_stripped,
                            ))

                db.commit()
                logger.info(
                    "Translated %d/%d texts to %s via AI",
                    len(translations), len(texts_to_translate), target,
                )
    except json.JSONDecodeError as e:
        logger.warning("AI returned invalid JSON for translation: %s", e)
    except Exception as e:
        logger.warning("Translation AI call failed: %s", e)

    # 4. Fill in any misses with original text (graceful fallback)
    for text in texts_to_translate:
        if text not in result:
            result[text] = text

    return TranslateResponse(translations=result)
