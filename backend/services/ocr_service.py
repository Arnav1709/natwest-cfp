"""
OCR Service — Handwritten ledger image processing using Gemini Vision API.

Extracts product entries from photographs of handwritten ledgers,
handling mixed Hindi/English text, Hindi numerals, and varied date formats.
"""

import json
import logging
import os
import re
import time
from datetime import datetime
from typing import List, Optional

from schemas.upload import ParsedProduct

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Gemini Vision setup
# ---------------------------------------------------------------------------

_gemini_client = None
_gemini_available = None
_using_new_sdk = False


def _init_gemini_vision():
    """Initialize Gemini client for vision tasks."""
    global _gemini_client, _gemini_available, _using_new_sdk

    if _gemini_available is False:
        return None
    if _gemini_client is not None:
        return _gemini_client

    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set — OCR service unavailable")
        _gemini_available = False
        return None

    # Try new google.genai SDK first
    try:
        from google import genai
        _gemini_client = genai.Client(api_key=api_key)
        _gemini_available = True
        _using_new_sdk = True
        return _gemini_client
    except ImportError:
        pass
    except Exception as e:
        logger.warning("New google.genai SDK failed: %s — trying legacy", e)

    # Fallback to deprecated google.generativeai
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_client = genai.GenerativeModel("gemini-2.0-flash")
        _gemini_available = True
        _using_new_sdk = False
        return _gemini_client
    except Exception as e:
        logger.error("Failed to initialize Gemini Vision: %s", e)
        _gemini_available = False
        return None


def _call_gemini_vision(image_bytes: bytes, prompt: str, max_retries: int = 3) -> Optional[str]:
    """
    Send image to Gemini Vision API with retry logic.
    Returns the response text or None on failure.
    """
    client = _init_gemini_vision()
    if client is None:
        return None

    # Create image part
    image_part = {
        "mime_type": "image/jpeg",
        "data": image_bytes,
    }

    for attempt in range(max_retries):
        try:
            if _using_new_sdk:
                from google.genai import types
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=[prompt, types.Part.from_bytes(data=image_bytes, mime_type="image/jpeg")],
                )
                return response.text
            else:
                response = client.generate_content([prompt, image_part])
                return response.text
        except Exception as e:
            wait = 2 ** attempt
            logger.warning(
                "Gemini Vision call failed (attempt %d/%d): %s. Retrying in %ds...",
                attempt + 1, max_retries, e, wait,
            )
            time.sleep(wait)

    return None


# ---------------------------------------------------------------------------
# Hindi numeral conversion
# ---------------------------------------------------------------------------

_HINDI_DIGITS = {
    '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
    '५': '5', '६': '6', '७': '7', '८': '8', '९': '9',
}

_HINDI_WORD_NUMBERS = {
    'शून्य': 0, 'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4,
    'पांच': 5, 'पाँच': 5, 'छह': 6, 'छ:': 6, 'सात': 7,
    'आठ': 8, 'नौ': 9, 'दस': 10, 'ग्यारह': 11, 'बारह': 12,
    'तेरह': 13, 'चौदह': 14, 'पंद्रह': 15, 'सोलह': 16,
    'सत्रह': 17, 'अठारह': 18, 'उन्नीस': 19, 'बीस': 20,
    'तीस': 30, 'चालीस': 40, 'पचास': 50, 'साठ': 60,
    'सत्तर': 70, 'अस्सी': 80, 'नब्बे': 90, 'सौ': 100,
    'हज़ार': 1000, 'हजार': 1000, 'लाख': 100000,
}


def _convert_hindi_numerals(text: str) -> str:
    """Convert Hindi digits (०-९) to Arabic digits (0-9)."""
    for hindi, arabic in _HINDI_DIGITS.items():
        text = text.replace(hindi, arabic)
    return text


def _parse_hindi_number_word(word: str) -> Optional[float]:
    """Try to parse a Hindi number word into a numeric value."""
    word = word.strip().lower()
    if word in _HINDI_WORD_NUMBERS:
        return float(_HINDI_WORD_NUMBERS[word])
    return None


# ---------------------------------------------------------------------------
# Date normalization
# ---------------------------------------------------------------------------

_DATE_FORMATS = [
    "%Y-%m-%d",
    "%d-%m-%Y",
    "%d/%m/%Y",
    "%d/%m/%y",
    "%d %b %Y",
    "%d %b %y",
    "%d %B %Y",
    "%d %B %y",
    "%b %d, %Y",
    "%b %d %Y",
    "%B %d, %Y",
    "%d-%b-%Y",
    "%d-%b-%y",
    "%d.%m.%Y",
    "%d.%m.%y",
    "%Y/%m/%d",
    "%m/%d/%Y",
]


def _normalize_date(date_str: str) -> str:
    """
    Normalize various date formats to ISO format (YYYY-MM-DD).
    Handles: 12 Jan, 12/1, Jan 12, 2026-03-12, etc.
    """
    if not date_str:
        return ""

    date_str = date_str.strip()
    date_str = _convert_hindi_numerals(date_str)

    for fmt in _DATE_FORMATS:
        try:
            dt = datetime.strptime(date_str, fmt)
            # If year is missing or < 2000, assume current year
            if dt.year < 2000:
                dt = dt.replace(year=datetime.now().year)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    # Try partial formats (e.g., "12 Jan" without year)
    for fmt in ["%d %b", "%d %B", "%b %d", "%B %d"]:
        try:
            dt = datetime.strptime(date_str, fmt)
            dt = dt.replace(year=datetime.now().year)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue

    return date_str  # Return as-is if unable to parse


# ---------------------------------------------------------------------------
# Response parsing
# ---------------------------------------------------------------------------

def _extract_json_from_response(text: str) -> Optional[list]:
    """Extract JSON array from Gemini's response text."""
    if not text:
        return None

    # Try direct JSON parse
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return data
        if isinstance(data, dict) and "entries" in data:
            return data["entries"]
        if isinstance(data, dict) and "products" in data:
            return data["products"]
    except json.JSONDecodeError:
        pass

    # Try to find JSON array in the text (Gemini often wraps in markdown)
    json_match = re.search(r'\[[\s\S]*\]', text)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass

    # Try to find JSON within code blocks
    code_block = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if code_block:
        try:
            return json.loads(code_block.group(1))
        except json.JSONDecodeError:
            pass

    return None


def _parse_gemini_entry(entry: dict) -> ParsedProduct:
    """Convert a single Gemini response entry into a ParsedProduct."""
    name = entry.get("name", entry.get("product", entry.get("item", "")))
    date_str = entry.get("date", entry.get("Date", ""))
    quantity = entry.get("quantity", entry.get("qty", entry.get("Quantity", 0)))
    price = entry.get("price", entry.get("unit_price", entry.get("Price", 0)))
    confidence = entry.get("confidence", entry.get("Confidence", 0.8))

    # Handle Hindi number words in quantity
    if isinstance(quantity, str):
        quantity = _convert_hindi_numerals(quantity)
        hindi_num = _parse_hindi_number_word(quantity)
        if hindi_num is not None:
            quantity = hindi_num
        else:
            try:
                quantity = float(quantity)
            except (ValueError, TypeError):
                quantity = 0

    # Handle price
    if isinstance(price, str):
        price = _convert_hindi_numerals(price)
        # Remove currency symbols
        price = re.sub(r'[₹$€£]', '', price).strip()
        try:
            price = float(price)
        except (ValueError, TypeError):
            price = 0

    # Normalize date
    if isinstance(date_str, str):
        date_str = _normalize_date(date_str)

    # Ensure confidence is a float between 0 and 1
    if isinstance(confidence, (int, float)):
        if confidence > 1:
            confidence = confidence / 100.0
        confidence = max(0.0, min(1.0, confidence))
    else:
        confidence = 0.8

    return ParsedProduct(
        name=str(name).strip(),
        date=date_str,
        quantity=float(quantity) if quantity else 0,
        price=float(price) if price else 0,
        confidence=round(confidence, 2),
    )


# ---------------------------------------------------------------------------
# Public API — matches Agent 2 stub signatures exactly
# ---------------------------------------------------------------------------

def process_ledger_image(
    image_bytes: bytes,
    language: str = "en",
) -> dict:
    """
    Process a handwritten ledger image using Gemini Vision API.

    Steps:
    1. Send image to Gemini Vision with OCR prompt
    2. Prompt instructs: extract product names, quantities, dates, prices
    3. Handle mixed Hindi/English text
    4. Parse Hindi numerals (e.g., बारह = 12)
    5. Parse varied date formats (12 Jan, 12/1, Jan 12)
    6. Assign confidence scores per cell (0.0 - 1.0)
    7. Return structured data ready for verification

    Args:
        image_bytes: Raw bytes of the uploaded image (JPEG/PNG)
        language: User's preferred language code (e.g., 'en', 'hi')

    Returns:
        Dict with keys:
        - extracted_data: List[ParsedProduct] — extracted rows
        - overall_confidence: float — average confidence across all cells
    """
    prompt = """You are an expert OCR system specialized in reading handwritten business ledgers from India.

Analyze this image of a handwritten ledger page and extract ALL product entries you can find.

Return a JSON array where each entry has these fields:
{
  "name": "product name (preserve original language, transliterate if needed)",
  "date": "date of entry (normalize to YYYY-MM-DD if possible)",
  "quantity": numeric quantity (convert Hindi numerals: बारह=12, पांच=5, etc.),
  "price": numeric unit price (remove ₹ symbol),
  "confidence": your confidence in this extraction from 0.0 to 1.0
}

Important rules:
- Handle mixed Hindi/English text. Keep product names in their original language.
- Convert Hindi numerals (Devanagari digits ०-९) to Arabic digits (0-9).
- Convert Hindi number words to digits: एक=1, दो=2, तीन=3, चार=4, पांच=5, छह=6, सात=7, आठ=8, नौ=9, दस=10, बारह=12, बीस=20, तीस=30, पचास=50, सौ=100
- Normalize ALL dates to ISO format YYYY-MM-DD.
- If handwriting is unclear, set confidence lower (0.3-0.6).
- If you're very confident, set 0.9-1.0.
- Return ONLY the JSON array, no other text.
- If you cannot read the image at all, return an empty array [].
"""

    response_text = _call_gemini_vision(image_bytes, prompt)

    if response_text:
        entries = _extract_json_from_response(response_text)
        if entries:
            extracted_data = [_parse_gemini_entry(entry) for entry in entries]
            # Filter out empty entries
            extracted_data = [p for p in extracted_data if p.name.strip()]

            overall = (
                sum(p.confidence for p in extracted_data) / len(extracted_data)
                if extracted_data else 0.0
            )

            return {
                "extracted_data": extracted_data,
                "overall_confidence": round(overall, 2),
            }

    # Fallback: return empty result with message
    logger.warning("Gemini Vision OCR failed or returned no parseable data")
    return {
        "extracted_data": [],
        "overall_confidence": 0.0,
    }


def enhance_ocr_with_context(
    raw_text: str,
    language: str = "en",
    business_type: str = "pharmacy",
) -> List[dict]:
    """
    Post-process raw OCR text using Gemini to improve accuracy.

    Steps:
    1. Send raw OCR output to Gemini with context (business type, language)
    2. Gemini corrects common OCR errors:
       - Number/letter confusion (0/O, 1/l)
       - Hindi word boundaries
       - Product name normalization (match known product database)
    3. Re-assign confidence scores based on correction certainty

    Args:
        raw_text: Raw OCR text output
        language: User's language code
        business_type: Business type for product name context

    Returns:
        List of corrected data dicts with updated confidence scores
    """
    if not raw_text or not raw_text.strip():
        return []

    # Build context-aware prompt
    context_hints = {
        "pharmacy": "Common items: Paracetamol, ORS, Cough Syrup, Antibiotics, Vitamins, Bandages, Eye drops, Antacids",
        "grocery": "Common items: Rice, Wheat, Dal, Oil, Sugar, Salt, Spices, Soap, Detergent",
        "retail": "Common items: Clothing, Electronics, Stationery, Cosmetics, Household items",
    }
    hints = context_hints.get(business_type, "General retail products")

    prompt = f"""You are an OCR post-processing expert for Indian {business_type} business ledgers.

The following raw text was extracted from a handwritten ledger. It may contain errors.

Raw OCR text:
---
{raw_text}
---

Context: This is a {business_type} shop. {hints}

Tasks:
1. Fix common OCR errors (0/O confusion, 1/l confusion, broken words)
2. Identify product names and normalize spelling
3. Extract quantities and prices
4. Fix Hindi word boundaries if applicable

Return a JSON array where each corrected entry has:
{{
  "name": "corrected product name",
  "date": "YYYY-MM-DD if found",
  "quantity": numeric,
  "price": numeric,
  "confidence": 0.0-1.0 (higher if you're confident in the correction),
  "original_text": "the raw text this came from",
  "corrections_made": ["list of corrections applied"]
}}

Return ONLY the JSON array."""

    # Try Gemini via shared helper
    client = _init_gemini_vision()
    if client:
        for attempt in range(3):
            try:
                if _using_new_sdk:
                    response = client.models.generate_content(
                        model="gemini-2.0-flash",
                        contents=prompt,
                    )
                else:
                    response = client.generate_content(prompt)
                entries = _extract_json_from_response(response.text)
                if entries:
                    return entries
            except Exception as e:
                time.sleep(2 ** attempt)
                logger.warning("OCR enhancement failed (attempt %d): %s", attempt + 1, e)

    # Try OpenRouter fallback
    try:
        openrouter_key = os.getenv("OPENROUTER_API_KEY")
        if openrouter_key:
            import requests
            resp = requests.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={"Authorization": f"Bearer {openrouter_key}"},
                json={
                    "model": "meta-llama/llama-3-8b-instruct:free",
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=30,
            )
            if resp.status_code == 200:
                text = resp.json()["choices"][0]["message"]["content"]
                entries = _extract_json_from_response(text)
                if entries:
                    return entries
    except Exception as e:
        logger.error("OpenRouter OCR enhancement failed: %s", e)

    return []
