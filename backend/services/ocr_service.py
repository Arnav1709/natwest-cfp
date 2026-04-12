"""
OCR Service — Handwritten ledger image processing using AI vision.

Extracts product entries from photographs of handwritten sales registers / ledgers,
handling mixed Hindi/English text, Hindi numerals, and varied date formats.

Uses the unified AI client (services/ai_client.py) which falls back through:
Ollama (local gemma4) → Gemini (cloud) → OpenRouter (cloud)
"""

import json
import logging
import re
from datetime import datetime
from typing import List, Optional

from schemas.upload import ParsedProduct
from services.ai_client import call_vision, call_llm

logger = logging.getLogger(__name__)

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
    """Extract JSON array from AI response text."""
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
        if isinstance(data, dict) and "items" in data:
            return data["items"]
    except json.JSONDecodeError:
        pass

    # Try to find JSON array in the text (AI often wraps in markdown)
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


def _parse_entry(entry: dict) -> ParsedProduct:
    """Convert a single AI response entry into a ParsedProduct."""
    name = entry.get("name", entry.get("product", entry.get("item", entry.get("product_name", ""))))
    date_str = entry.get("date", entry.get("Date", entry.get("sale_date", "")))
    quantity = entry.get("quantity", entry.get("qty", entry.get("Quantity", entry.get("units_sold", 0))))
    price = entry.get("price", entry.get("unit_price", entry.get("Price", entry.get("amount", 0))))
    category = entry.get("category", entry.get("Category", None))
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

    # Validate category against allowed values
    allowed_categories = {"Medicines", "Supplements", "Supplies", "Equipment", "Grocery", "Other"}
    if category and str(category).strip() not in allowed_categories:
        category = "Other"
    elif category:
        category = str(category).strip()

    return ParsedProduct(
        name=str(name).strip(),
        date=date_str,
        quantity=float(quantity) if quantity else 0,
        price=float(price) if price else 0,
        category=category,
        confidence=round(confidence, 2),
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def process_ledger_image(
    image_bytes: bytes,
    language: str = "en",
) -> dict:
    """
    Process a sales register / handwritten ledger image using AI vision.

    Steps:
    1. Send image to AI vision (Ollama → Gemini → OpenRouter)
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
        - error: Optional[str] — error message if OCR failed
    """

    # ── Build the OCR prompt ──
    lang_hint = ""
    if language == "hi":
        lang_hint = "\nThe ledger is likely in Hindi (Devanagari script). Pay close attention to Hindi text and numerals."
    elif language != "en":
        lang_hint = f"\nThe ledger may contain {language} text. Extract carefully."

    prompt = f"""You are an expert OCR system specialized in reading handwritten and printed sales registers, ledgers, and invoices from Indian businesses.

Analyze this image carefully and extract ALL product/sales entries you can find.{lang_hint}

Return a JSON array where each entry has these fields:
{{
  "name": "product name (preserve original language, transliterate Hindi to English if mixed)",
  "date": "date of sale/entry in YYYY-MM-DD format (if visible)",
  "quantity": numeric quantity sold or in stock (convert Hindi numerals if needed),
  "price": numeric unit price or total amount (remove ₹ symbol),
  "category": one of exactly these: "Medicines", "Supplements", "Supplies", "Equipment", "Grocery", "Other",
  "confidence": your confidence in this extraction from 0.0 to 1.0
}}

Category rules:
- Medicines: pharmaceutical drugs, OTC medicines, first aid items
- Supplements: vitamins, health drinks (Bournvita, Horlicks), protein powder
- Supplies: soaps, detergents, cleaning products, personal care, hygiene (toothpaste, shampoo, razors)
- Equipment: tools, devices, hardware
- Grocery: food items, snacks, beverages, cooking oil, spices, chips, biscuits, noodles, drinks
- Other: anything that doesn't fit above

Critical rules:
- Extract EVERY row/entry visible in the image, even partially readable ones.
- Handle mixed Hindi/English text. Keep product names readable.
- Convert Hindi/Devanagari numerals (०-९) to Arabic digits (0-9).
- Convert Hindi number words to digits: एक=1, दो=2, तीन=3, चार=4, पांच=5, छह=6, सात=7, आठ=8, नौ=9, दस=10, बारह=12, बीस=20, पचास=50, सौ=100
- Normalize ALL dates to ISO format YYYY-MM-DD. If only day/month visible, use current year.
- If handwriting is unclear, set confidence lower (0.3-0.6).
- If you're very confident, set 0.8-1.0.
- If the image shows a printed receipt/invoice, extract line items.
- If the image shows a handwritten register, extract each row.
- Return ONLY the JSON array, no other text or markdown formatting.
- If you cannot read the image at all, return an empty array [].
"""

    logger.info("Sending image to AI vision for OCR extraction...")
    response_text = call_vision(image_bytes, prompt)

    if response_text:
        logger.info("AI vision response received (%d chars)", len(response_text))
        logger.debug("Raw AI response: %s", response_text[:500])

        entries = _extract_json_from_response(response_text)
        if entries:
            extracted_data = [_parse_entry(entry) for entry in entries]
            # Filter out empty entries
            extracted_data = [p for p in extracted_data if p.name.strip()]

            overall = (
                sum(p.confidence for p in extracted_data) / len(extracted_data)
                if extracted_data else 0.0
            )

            logger.info(
                "OCR extraction complete: %d items extracted, avg confidence %.2f",
                len(extracted_data), overall,
            )

            return {
                "extracted_data": extracted_data,
                "overall_confidence": round(overall, 2),
            }
        else:
            logger.warning("AI returned text but no parseable JSON: %s", response_text[:200])

    logger.error("All OCR methods failed for this image")
    return {
        "extracted_data": [],
        "overall_confidence": 0.0,
        "error": "Could not extract data from this image. Please try a clearer photo with better lighting.",
    }


def enhance_ocr_with_context(
    raw_text: str,
    language: str = "en",
    business_type: str = "pharmacy",
) -> List[dict]:
    """
    Post-process raw OCR text using AI to improve accuracy.

    Steps:
    1. Send raw OCR output to AI with context (business type, language)
    2. AI corrects common OCR errors:
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

    result = call_llm(prompt)
    if result:
        entries = _extract_json_from_response(result)
        if entries:
            return entries

    return []
