"""
Intelligence Service — Web Search + Gemini-powered external factor analysis.

Pipeline:
1. Serper API searches for real-time info (disease outbreaks, festivals, weather)
2. Gemini analyzes the search results and returns structured demand factors
3. Results cached daily to minimize API calls
4. Falls back to hardcoded JSON files if both APIs are unavailable

This replaces the static disease_seasons.json / festival_calendar.json / weather_heuristics.json
with dynamic, real-time intelligence grounded in actual web data.
"""

import json
import logging
import os
import requests
from datetime import date, datetime
from typing import Tuple, List, Optional

logger = logging.getLogger(__name__)

# ── Cache storage (in-memory, refreshed daily) ──────────────────
_intelligence_cache: dict = {}
_cache_date: Optional[date] = None


def _search_serper(query: str, num_results: int = 5) -> Optional[str]:
    """
    Search the web using Serper API.
    Returns concatenated snippets from search results, or None if unavailable.
    """
    try:
        from config import settings
        api_key = settings.SERPER_API_KEY
        if not api_key:
            return None

        response = requests.post(
            "https://google.serper.dev/search",
            headers={
                "X-API-KEY": api_key,
                "Content-Type": "application/json",
            },
            json={"q": query, "num": num_results},
            timeout=8,
        )
        response.raise_for_status()
        data = response.json()

        # Extract snippets from organic results
        snippets = []
        for item in data.get("organic", [])[:num_results]:
            title = item.get("title", "")
            snippet = item.get("snippet", "")
            if snippet:
                snippets.append(f"- {title}: {snippet}")

        # Also check answerBox if present
        answer_box = data.get("answerBox", {})
        if answer_box:
            ab_snippet = answer_box.get("snippet") or answer_box.get("answer", "")
            if ab_snippet:
                snippets.insert(0, f"- [Featured]: {ab_snippet}")

        return "\n".join(snippets) if snippets else None

    except Exception as e:
        logger.warning("Serper search failed for '%s': %s", query, e)
        return None


def _get_gemini_client():
    """Get Google Gemini client, or None if not configured."""
    try:
        from config import settings
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return None

        import google.generativeai as genai
        genai.configure(api_key=api_key)
        return genai.GenerativeModel("gemini-1.5-flash")
    except Exception as e:
        logger.warning("Gemini client init failed: %s", e)
        return None


def _search_and_analyze(
    product_name: str,
    category: str,
    city: str,
    state: str,
    business_type: str,
) -> Optional[dict]:
    """
    Two-step intelligence pipeline:
    1. Search web for real-time disease, festival, weather info
    2. Pass search results to Gemini for structured analysis

    Returns dict with boost_pct and drivers, or None if both APIs fail.
    """
    today = date.today()
    month_name = today.strftime("%B")
    year = today.year

    # ── Step 1: Web Search via Serper ──────────────────────────
    search_queries = [
        f"disease outbreak {city} {state} India {month_name} {year}",
        f"upcoming festivals {state} India {month_name} {year}",
        f"weather forecast {city} {month_name} {year}",
    ]

    web_context_parts = []
    for query in search_queries:
        result = _search_serper(query, num_results=3)
        if result:
            web_context_parts.append(f"### Search: {query}\n{result}")

    web_context = "\n\n".join(web_context_parts) if web_context_parts else ""

    if web_context:
        logger.info("Intelligence: Got web context from %d searches for %s",
                     len(web_context_parts), product_name)
    else:
        logger.info("Intelligence: No web search results, using Gemini knowledge only")

    # ── Step 2: Gemini Analysis ────────────────────────────────
    model = _get_gemini_client()
    if not model:
        return None

    # Build prompt with web search context
    web_section = ""
    if web_context:
        web_section = f"""

## Real-Time Web Intelligence (from Google Search, {today.isoformat()})
{web_context}

Use the above REAL-TIME web search results to ground your analysis. These are current facts, not training data."""

    prompt = f"""You are an AI demand forecasting assistant for a {business_type} in {city}, {state}, India.
Current date: {today.isoformat()} ({month_name} {year})
{web_section}

Based on the information above, analyze demand factors for the product "{product_name}" (category: {category}) for the next 4 weeks.

Consider:
1. **Active Disease Outbreaks**: Any diseases currently spreading that would increase demand for this product?
2. **Upcoming Festivals**: Any festivals in the next 4 weeks that affect buying patterns?
3. **Weather/Season Impact**: Current weather conditions and seasonal effects?
4. **Market Trends**: Any relevant demand trends?

IMPORTANT:
- Be specific to {city}, {state} and the current date {today.isoformat()}.
- Only include factors that would GENUINELY affect demand for "{product_name}".
- If no significant factors exist, return a small boost (0-5%).
- Base your analysis on the web search results when available.

Return ONLY valid JSON (no markdown, no code blocks):
{{
    "boost_pct": <number 0-50>,
    "drivers": [
        {{
            "name": "<short factor name>",
            "description": "<one line explanation with specific details>",
            "impact_pct": <number>
        }}
    ]
}}"""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Clean markdown code blocks if present
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text.rsplit("\n", 1)[0]
        if text.startswith("json"):
            text = text[4:].strip()

        result = json.loads(text)

        # Validate and clamp
        boost = float(result.get("boost_pct", 0))
        boost = max(0, min(50, boost))

        drivers = result.get("drivers", [])
        validated_drivers = []
        for d in drivers[:5]:
            validated_drivers.append({
                "name": str(d.get("name", "Unknown")),
                "description": str(d.get("description", "")),
                "impact_pct": float(d.get("impact_pct", 0)),
            })

        source = "gemini+serper" if web_context else "gemini"
        return {
            "boost_pct": boost,
            "drivers": validated_drivers,
            "source": source,
            "timestamp": datetime.now().isoformat(),
        }

    except json.JSONDecodeError as e:
        logger.warning("Gemini returned invalid JSON for %s: %s", product_name, e)
        return None
    except Exception as e:
        logger.warning("Gemini analysis failed for %s: %s", product_name, e)
        return None


def _fallback_hardcoded_factors(
    product_name: str,
    category: str,
    month: int,
    state: str,
) -> dict:
    """
    Fallback: use hardcoded JSON files when both Serper and Gemini are unavailable.
    """
    lookup_dir = os.path.join(os.path.dirname(__file__), "lookup_data")
    total_boost = 0.0
    drivers = []
    product_lower = product_name.lower()
    category_lower = (category or "").lower()

    def load_json(filename):
        try:
            with open(os.path.join(lookup_dir, filename), "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            return []

    # 1. Disease seasons
    for disease in load_json("disease_seasons.json"):
        start = disease.get("start_month", 0)
        end = disease.get("end_month", 0)
        in_season = (start <= month <= end) if start <= end else (month >= start or month <= end)
        if in_season:
            medicines = [m.lower() for m in disease.get("medicines", [])]
            if any(med in product_lower for med in medicines):
                boost = disease.get("boost_pct", 0)
                total_boost += boost
                drivers.append({
                    "name": f"{disease['disease']} Season",
                    "description": f"{disease['disease']} season active — increased demand",
                    "impact_pct": boost,
                })

    # 2. Festivals
    for festival in load_json("festival_calendar.json"):
        fmonth = festival.get("month", 0)
        if fmonth == month or fmonth == (month % 12) + 1:
            affected = [c.lower() for c in festival.get("affected_categories", [])]
            if any(cat in product_lower or cat in category_lower for cat in affected):
                mult = festival.get("demand_multiplier", 1.0)
                boost = (mult - 1.0) * 100
                total_boost += boost
                drivers.append({
                    "name": f"{festival['name']} Festival",
                    "description": f"{festival['name']} approaching — demand boost",
                    "impact_pct": boost,
                })

    # 3. Weather
    weather_data = load_json("weather_heuristics.json")
    if isinstance(weather_data, dict):
        for season_key, season_data in weather_data.get("seasons", {}).items():
            if month in season_data.get("months", []):
                for prod_info in season_data.get("products", []):
                    if prod_info["name"].lower() in product_lower:
                        boost = prod_info.get("boost_pct", 0)
                        total_boost += boost
                        drivers.append({
                            "name": f"{season_data['label']} Weather",
                            "description": f"Seasonal weather — {season_data['label']}",
                            "impact_pct": boost,
                        })
                        break

    return {
        "boost_pct": total_boost,
        "drivers": drivers,
        "source": "hardcoded",
        "timestamp": datetime.now().isoformat(),
    }


def get_external_factors(
    product_name: str,
    category: str,
    city: str = "",
    state: str = "",
    business_type: str = "pharmacy",
) -> Tuple[float, List[str], List[dict]]:
    """
    Get external demand factors for a product.

    Pipeline: Serper + Gemini → Gemini only → Hardcoded JSON fallback.

    Returns:
        - boost_multiplier: float (e.g., 1.30 for +30% boost)
        - driver_strings: list of readable driver descriptions
        - driver_details: list of dicts with name, description, impact_pct
    """
    global _intelligence_cache, _cache_date

    # Reset cache daily
    today = date.today()
    if _cache_date != today:
        _intelligence_cache = {}
        _cache_date = today

    # Check cache
    cache_key = f"{product_name}|{category}|{city}"
    if cache_key in _intelligence_cache:
        result = _intelligence_cache[cache_key]
    else:
        # Try Serper + Gemini pipeline
        result = _search_and_analyze(product_name, category, city, state, business_type)

        # Fallback to hardcoded
        if result is None:
            result = _fallback_hardcoded_factors(
                product_name, category, today.month, state
            )

        # Cache
        _intelligence_cache[cache_key] = result

    # Extract outputs
    boost_pct = result.get("boost_pct", 0)
    boost_multiplier = 1.0 + (boost_pct / 100.0)
    drivers = result.get("drivers", [])
    source = result.get("source", "unknown")

    driver_strings = []
    for d in drivers:
        pct = d.get("impact_pct", 0)
        driver_strings.append(f"{d['name']} (+{pct:.0f}%)")

    logger.info("Intelligence [%s]: %s — boost: +%.0f%% (%d drivers)",
                source, product_name, boost_pct, len(drivers))

    return boost_multiplier, driver_strings, drivers
