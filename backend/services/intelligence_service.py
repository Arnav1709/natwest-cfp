"""
Intelligence Service — AI NLP integration for forecast explanations,
combined stocking intelligence, and translation.

Includes:
- Disease season, festival, and weather factor queries (from DB + lookup files)
- AI text generation for natural language reports
- Template-based final fallback when AI is unavailable

Uses the unified AI client (services/ai_client.py) which falls back through:
Ollama (local gemma4) → Gemini (cloud) → OpenRouter (cloud)
"""

import json
import logging
import os
from datetime import date, datetime, timedelta
from typing import List, Optional

from sqlalchemy.orm import Session

from models.product import Product
from models.user import User
from models.lookup import DiseaseSeason, FestivalCalendar
from services.ai_client import call_llm

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lookup data (JSON files)
# ---------------------------------------------------------------------------
_LOOKUP_DIR = os.path.join(os.path.dirname(__file__), "lookup_data")


def _load_json(filename: str):
    path = os.path.join(_LOOKUP_DIR, filename)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return [] if filename.endswith("s.json") else {}


_WEATHER_DATA = None


def _get_weather_data():
    global _WEATHER_DATA
    if _WEATHER_DATA is None:
        _WEATHER_DATA = _load_json("weather_heuristics.json")
    return _WEATHER_DATA


# ---------------------------------------------------------------------------
# Public API — matches Agent 2 stub signatures exactly
# ---------------------------------------------------------------------------

def get_disease_season_boost(
    db: Session,
    month: Optional[int] = None,
) -> List[dict]:
    """
    Get active disease seasons for the current month and their medicine boost percentages.

    Steps:
    1. Query disease_seasons where start_month <= current_month <= end_month
    2. For each active disease, return: disease name, affected medicines, boost_pct
    3. This data is used by the forecast service to adjust predictions upward

    Args:
        db: Database session
        month: Month to check (1-12). Defaults to current month.

    Returns:
        List of dicts: [{disease, medicines, boost_pct, start_month, end_month}]
    """
    if month is None:
        month = date.today().month

    # First try DB lookup table
    active = (
        db.query(DiseaseSeason)
        .filter(
            DiseaseSeason.start_month <= month,
            DiseaseSeason.end_month >= month,
        )
        .all()
    )

    if active:
        return [
            {
                "disease": d.disease,
                "medicines": [m.strip() for m in d.medicines.split(",")] if d.medicines else [],
                "boost_pct": d.boost_pct,
                "start_month": d.start_month,
                "end_month": d.end_month,
            }
            for d in active
        ]

    # Fallback to JSON lookup file
    disease_data = _load_json("disease_seasons.json")
    results = []
    for disease in disease_data:
        start = disease.get("start_month", 0)
        end = disease.get("end_month", 0)
        # Handle wrap-around months
        if start <= end:
            in_season = start <= month <= end
        else:
            in_season = month >= start or month <= end

        if in_season:
            results.append({
                "disease": disease["disease"],
                "medicines": disease.get("medicines", []),
                "boost_pct": disease.get("boost_pct", 0),
                "start_month": start,
                "end_month": end,
            })

    return results


def get_upcoming_festivals(
    db: Session,
    days_ahead: int = 14,
) -> List[dict]:
    """
    Get upcoming festivals/events within the next N days.

    Steps:
    1. Check festival_calendar for the current and next month
    2. Filter to events within days_ahead window
    3. Return: festival name, affected categories, demand_multiplier

    Args:
        db: Database session
        days_ahead: Number of days to look ahead (default 14)

    Returns:
        List of dicts: [{name, month, affected_categories, demand_multiplier}]
    """
    current_month = date.today().month
    next_month = (current_month % 12) + 1

    # First try DB
    festivals = (
        db.query(FestivalCalendar)
        .filter(FestivalCalendar.month.in_([current_month, next_month]))
        .all()
    )

    if festivals:
        return [
            {
                "name": f.name,
                "month": f.month,
                "affected_categories": [c.strip() for c in f.affected_categories.split(",")] if f.affected_categories else [],
                "demand_multiplier": f.demand_multiplier,
            }
            for f in festivals
        ]

    # Fallback to JSON
    festival_data = _load_json("festival_calendar.json")
    return [
        {
            "name": f["name"],
            "month": f["month"],
            "affected_categories": f.get("affected_categories", []),
            "demand_multiplier": f.get("demand_multiplier", 1.0),
        }
        for f in festival_data
        if f.get("month") in [current_month, next_month]
    ]


def get_weather_triggers(
    state: Optional[str] = None,
    month: Optional[int] = None,
) -> List[dict]:
    """
    Get weather-based demand triggers for a region and month.

    Steps:
    1. Map month to season (Summer Apr-Jun, Monsoon Jul-Sep, Winter Nov-Jan)
    2. Return affected product categories and boost factors
    3. Adjust for regional patterns (e.g., Kerala monsoon differs from Rajasthan)

    Args:
        state: User's state for regional adjustment
        month: Month to check (1-12). Defaults to current month.

    Returns:
        List of dicts: [{condition, affected_products, boost_pct}]
    """
    if month is None:
        month = date.today().month

    weather_data = _get_weather_data()
    seasons = weather_data.get("seasons", {})
    regional = weather_data.get("regional_adjustments", {})

    # Find which season this month belongs to
    results = []
    for season_key, season_info in seasons.items():
        if month in season_info.get("months", []):
            products = season_info.get("products", [])
            label = season_info.get("label", season_key.capitalize())

            # Apply regional adjustment
            region_data = regional.get(state, regional.get("default", {}))
            intensity_key = f"{season_key}_intensity"
            intensity = region_data.get(intensity_key, 1.0)

            affected = []
            avg_boost = 0
            for p in products:
                adjusted_boost = p.get("boost_pct", 0) * intensity
                affected.append(p["name"])
                avg_boost += adjusted_boost

            avg_boost = avg_boost / max(len(products), 1)

            results.append({
                "condition": label,
                "affected_products": affected,
                "boost_pct": round(avg_boost),
                "regional_intensity": intensity,
            })

    if not results:
        results.append({"condition": "Transition", "affected_products": [], "boost_pct": 0})

    return results


def generate_forecast_explanation(
    product_name: str,
    forecast_data: dict,
    factors: List[str],
    language: str = "en",
) -> str:
    """
    Generate a plain-language explanation of forecast drivers using AI.

    Args:
        product_name: Name of the product
        forecast_data: Dict with forecast details (low, likely, high)
        factors: List of factor strings (e.g., "Dengue season active (+25%)")
        language: Target language code

    Returns:
        Plain-language explanation string
    """
    lang_names = {
        "en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
        "mr": "Marathi", "bn": "Bengali", "gu": "Gujarati",
    }
    lang_name = lang_names.get(language, "English")

    factors_text = "\n".join(f"- {f}" for f in factors) if factors else "- Historical trend analysis"

    prompt = f"""You are a retail inventory advisor for Indian small businesses.
Generate a brief, clear demand forecast explanation for a shopkeeper.

Product: {product_name}
Forecast (next week): Low={forecast_data.get('low', 0)}, Likely={forecast_data.get('likely', 0)}, High={forecast_data.get('high', 0)}
Key factors:
{factors_text}

Write the explanation in {lang_name}. Keep it under 3 sentences. Be actionable.
Use simple language a shopkeeper would understand. Include specific numbers.
Do NOT use markdown formatting or bullet points — just plain text."""

    result = call_llm(prompt)

    if not result:
        # Template fallback
        if factors:
            return f"Forecast for {product_name}: Expected demand is {forecast_data.get('likely', 0)} units next week. Key drivers: {', '.join(factors)}."
        return f"Forecast for {product_name}: Expected demand is {forecast_data.get('likely', 0)} units next week based on historical trends."

    return result.strip()


def compose_stocking_intelligence(
    db: Session,
    user_id: int,
    products: List[dict],
    factors: List[dict],
    language: str = "en",
) -> str:
    """
    Generate a combined weekly stocking recommendation using AI.

    Args:
        db: Database session
        user_id: User for personalization
        products: List of product dicts with forecast info
        factors: Combined list of active factors
        language: Target language code

    Returns:
        Formatted markdown stocking intelligence text
    """
    lang_names = {
        "en": "English", "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
        "mr": "Marathi", "bn": "Bengali", "gu": "Gujarati",
    }
    lang_name = lang_names.get(language, "English")

    # Build product summaries
    product_lines = []
    for p in products[:10]:  # Limit to top 10
        product_lines.append(
            f"- {p.get('name', 'Product')}: current stock {p.get('stock', 0)}, "
            f"forecast demand {p.get('likely', 0)}, "
            f"days remaining {p.get('days_remaining', '?')}"
        )

    # Build factor summaries
    factor_lines = [f"- {f.get('description', str(f))}" for f in factors[:8]]

    prompt = f"""You are StockSense, an AI inventory advisor for Indian businesses.
Generate this week's stocking intelligence report.

Products needing attention:
{chr(10).join(product_lines)}

Active factors:
{chr(10).join(factor_lines)}

Write in {lang_name}. Format as a brief action list with emoji bullets.
Start with "📋 **This week's stocking intelligence**"
List each product recommendation on its own line starting with "- **Product Name** —"
Keep it practical and actionable. Max 6 bullet points."""

    result = call_llm(prompt)

    if not result:
        # Template fallback
        lines = ["📋 **This week's stocking intelligence**"]
        for p in products[:5]:
            name = p.get("name", "Product")
            days = p.get("days_remaining", "?")
            likely = p.get("likely", 0)
            if isinstance(days, (int, float)) and days < 7:
                lines.append(f"- **{name}** — reorder now. Stock will last ~{days:.0f} days at forecasted demand of {likely:.0f} units/week.")
            else:
                lines.append(f"- **{name}** — forecast demand: {likely:.0f} units/week. Stock levels adequate.")

        for f in factors[:3]:
            desc = f.get("description", "")
            if desc:
                lines.append(f"- {desc}")

        return "\n".join(lines)

    return result.strip()


def translate_text(
    text: str,
    target_language: str,
) -> str:
    """
    Translate text to target language using AI.

    Args:
        text: Text to translate
        target_language: Target language code (e.g., 'hi', 'ta')

    Returns:
        Translated text (or original if translation fails)
    """
    if target_language == "en":
        return text

    lang_names = {
        "hi": "Hindi", "ta": "Tamil", "te": "Telugu",
        "mr": "Marathi", "bn": "Bengali", "gu": "Gujarati",
    }
    lang_name = lang_names.get(target_language, target_language)

    prompt = f"""Translate the following text to {lang_name}.
Keep any numbers, brand names, and technical terms as-is.
Return ONLY the translation, nothing else.

Text to translate:
{text}"""

    result = call_llm(prompt)
    return result.strip() if result else text


def generate_combined_intelligence(
    db: Session,
    user_id: int,
    language: str = "en",
) -> str:
    """
    Generate a combined stocking intelligence summary.

    Steps:
    1. Fetch active disease seasons
    2. Fetch upcoming festivals/events
    3. Fetch weather triggers
    4. Fetch historical anomaly memory (same week last year)
    5. Combine all factors into a single AI prompt
    6. Generate plain-language recommendation in user's language
    7. Return formatted intelligence text

    Args:
        db: Database session
        user_id: User for personalization
        language: Language code (e.g., 'en', 'hi', 'ta')

    Returns:
        Formatted intelligence text (markdown)
    """
    # Get user info
    user = db.query(User).filter(User.id == user_id).first()
    state = user.state if user else ""

    # 1. Disease seasons
    diseases = get_disease_season_boost(db)

    # 2. Upcoming festivals
    festivals = get_upcoming_festivals(db)

    # 3. Weather triggers
    weather = get_weather_triggers(state=state)

    # 4. Get user's products with stock info
    products = db.query(Product).filter(Product.user_id == user_id).all()

    product_info = []
    for p in products:
        current = p.current_stock or 0
        # Estimate daily demand from reorder point
        daily_demand = (p.reorder_point or 0) / max(p.lead_time_days or 3, 1)
        days_remaining = current / daily_demand if daily_demand > 0 else 999
        product_info.append({
            "name": p.name,
            "stock": current,
            "likely": daily_demand * 7,  # weekly demand estimate
            "days_remaining": round(days_remaining, 1),
            "category": p.category or "",
        })

    # Sort by urgency (days remaining ascending)
    product_info.sort(key=lambda x: x["days_remaining"])

    # 5. Build combined factors list
    factors = []
    for d in diseases:
        factors.append({
            "description": f"🦟 {d['disease']} season active ({_month_range(d['start_month'], d['end_month'])}). "
                          f"Affects: {', '.join(d['medicines'][:3])}. Boost: +{d['boost_pct']}%"
        })

    for f in festivals:
        factors.append({
            "description": f"🛕 {f['name']} approaching. "
                          f"Stock up: {', '.join(f['affected_categories'][:4])}. "
                          f"Expected {f['demand_multiplier']:.1f}× demand"
        })

    for w in weather:
        if w.get("boost_pct", 0) > 0:
            factors.append({
                "description": f"🌤️ {w['condition']}: {', '.join(w['affected_products'][:4])} demand up ~{w['boost_pct']}%"
            })

    # 6. Generate intelligence via LLM
    result = compose_stocking_intelligence(
        db, user_id,
        products=product_info[:10],
        factors=factors,
        language=language,
    )

    # If we got a good LLM response and language is not English, translate
    if result and language != "en":
        result = translate_text(result, language)

    return result


def _month_range(start: int, end: int) -> str:
    """Convert month numbers to a readable range string."""
    month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                   "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    s = month_names[start] if 1 <= start <= 12 else str(start)
    e = month_names[end] if 1 <= end <= 12 else str(end)
    return f"{s}–{e}"
