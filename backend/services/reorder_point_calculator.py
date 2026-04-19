"""
Reorder Point Calculator — AI-Enhanced.

Statistical base:
  reorder_point = (avg_daily_demand × lead_time_days) + safety_stock
  safety_stock  = z_score × std_dev_daily × sqrt(lead_time_days)

AI Enhancement:
  Gemini analyzes product context (category, seasonality, expiry) to adjust
  z_score (service level) and add demand multipliers.
"""

import logging
import math
from datetime import date, timedelta
from typing import List, Dict, Optional

from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from models.product import Product
from models.sales import SalesHistory

logger = logging.getLogger(__name__)

# Z-scores for service levels
Z_SCORES = {
    0.90: 1.28,
    0.95: 1.65,
    0.97: 1.88,
    0.99: 2.33,
}
DEFAULT_SERVICE_LEVEL = 0.95
DEFAULT_Z = Z_SCORES[DEFAULT_SERVICE_LEVEL]


def _get_daily_sales_stats(
    db: Session, product_id: int, lookback_days: int = 90
) -> Dict:
    """
    Compute daily sales statistics for a product over the lookback window.
    Returns { avg_daily, std_daily, total_sold, days_with_sales, max_daily }.
    """
    cutoff = date.today() - timedelta(days=lookback_days)

    sales = (
        db.query(SalesHistory.date, sql_func.sum(SalesHistory.quantity).label("qty"))
        .filter(
            SalesHistory.product_id == product_id,
            SalesHistory.date >= cutoff,
        )
        .group_by(SalesHistory.date)
        .all()
    )

    if not sales:
        return {
            "avg_daily": 0, "std_daily": 0, "total_sold": 0,
            "days_with_sales": 0, "max_daily": 0,
        }

    daily_quantities = [float(row.qty or 0) for row in sales]
    total_sold = sum(daily_quantities)
    days_with_sales = len(daily_quantities)

    # Use the full lookback window for avg (including zero-sale days)
    actual_days = min(lookback_days, (date.today() - cutoff).days) or 1
    avg_daily = total_sold / actual_days

    # Standard deviation of daily sales (filling zero-sale days)
    all_days = [0.0] * actual_days
    date_to_idx = {}
    for i, row in enumerate(sales):
        day_offset = (row.date - cutoff).days
        if 0 <= day_offset < actual_days:
            all_days[day_offset] = float(row.qty or 0)

    if len(all_days) > 1:
        mean = sum(all_days) / len(all_days)
        variance = sum((x - mean) ** 2 for x in all_days) / (len(all_days) - 1)
        std_daily = math.sqrt(variance)
    else:
        std_daily = avg_daily * 0.3  # fallback: assume 30% CoV

    return {
        "avg_daily": round(avg_daily, 3),
        "std_daily": round(std_daily, 3),
        "total_sold": round(total_sold, 1),
        "days_with_sales": days_with_sales,
        "max_daily": max(daily_quantities) if daily_quantities else 0,
    }


def _statistical_reorder_point(
    avg_daily: float,
    std_daily: float,
    lead_time_days: int,
    z_score: float = DEFAULT_Z,
) -> Dict:
    """
    Calculate reorder point and safety stock using statistical formula.

    reorder_point = (avg_daily × lead_time) + safety_stock
    safety_stock  = z × std_daily × sqrt(lead_time)
    """
    if avg_daily <= 0:
        return {
            "reorder_point": 0,
            "safety_stock": 0,
            "lead_time_demand": 0,
            "service_level": DEFAULT_SERVICE_LEVEL,
        }

    lead_time_demand = avg_daily * lead_time_days
    safety_stock = z_score * std_daily * math.sqrt(lead_time_days)
    reorder_point = lead_time_demand + safety_stock

    return {
        "reorder_point": round(max(1, reorder_point)),
        "safety_stock": round(max(0, safety_stock)),
        "lead_time_demand": round(lead_time_demand, 1),
        "service_level": DEFAULT_SERVICE_LEVEL,
    }


def _ai_adjust_reorder_points(
    products_data: List[Dict],
) -> Optional[Dict]:
    """
    Use Gemini to analyze products and suggest adjusted service levels
    and demand multipliers based on context (category, expiry, criticality).

    Returns dict mapping product_id -> { z_score_override, demand_multiplier, reasoning }.
    """
    if not products_data:
        return None

    try:
        import json
        from services.ai_client import call_llm

        # Build concise product summary for AI
        product_lines = []
        for p in products_data[:30]:  # Limit to 30 products per AI call
            product_lines.append(
                f"- ID:{p['id']} \"{p['name']}\" cat:{p['category']} "
                f"avg_daily:{p['avg_daily']:.1f} std:{p['std_daily']:.1f} "
                f"lead_time:{p['lead_time']}d stock:{p['current_stock']} "
                f"has_expiry:{'yes' if p.get('has_expiry') else 'no'}"
            )

        prompt = f"""You are an inventory optimization AI. Analyze these products and suggest optimal service levels.

Products:
{chr(10).join(product_lines)}

For each product, determine:
1. **service_level**: 0.90 (low priority), 0.95 (normal), 0.97 (important), 0.99 (critical/life-saving)
2. **demand_multiplier**: 1.0 (normal), 1.1-1.3 (seasonal/trending up), 0.8-0.9 (declining)
3. Brief reasoning

Rules:
- Medicines / healthcare items → higher service level (0.97-0.99)
- Fast-moving (high avg_daily) → 0.95-0.97
- Items with expiry → be conservative (lower multiplier to avoid waste)
- Slow-moving items → 0.90

Return ONLY valid JSON (no markdown):
{{
  "adjustments": [
    {{
      "id": <product_id>,
      "service_level": <0.90|0.95|0.97|0.99>,
      "demand_multiplier": <float>,
      "reasoning": "<brief>"
    }}
  ]
}}"""

        response = call_llm(prompt)
        if not response:
            return None

        text = response.strip()
        # Clean markdown
        if text.startswith("```"):
            text = text.split("\n", 1)[1]
        if text.endswith("```"):
            text = text.rsplit("\n", 1)[0]
        if text.startswith("json"):
            text = text[4:].strip()

        result = json.loads(text)
        adjustments = {}
        for adj in result.get("adjustments", []):
            pid = adj.get("id")
            sl = float(adj.get("service_level", DEFAULT_SERVICE_LEVEL))
            # Clamp service level to valid values
            valid_levels = sorted(Z_SCORES.keys())
            sl = min(valid_levels, key=lambda x: abs(x - sl))
            adjustments[pid] = {
                "z_score": Z_SCORES[sl],
                "service_level": sl,
                "demand_multiplier": max(0.5, min(2.0, float(adj.get("demand_multiplier", 1.0)))),
                "reasoning": adj.get("reasoning", ""),
            }
        return adjustments

    except Exception as e:
        logger.warning("AI reorder point adjustment failed: %s", e)
        return None


def calculate_reorder_points(
    db: Session,
    user_id: int,
    use_ai: bool = True,
) -> Dict:
    """
    Calculate optimal reorder points for ALL products of a user.

    Pipeline:
    1. Load all products
    2. Compute daily sales stats for each (batch-friendly)
    3. Calculate statistical reorder point using formula
    4. (Optional) Use AI to adjust service levels per product
    5. Update products in DB
    6. Return summary

    Returns:
        {
          "updated": int,
          "skipped": int,
          "products": [ { id, name, old_reorder_point, new_reorder_point, safety_stock, reasoning } ],
          "ai_used": bool,
        }
    """
    products = db.query(Product).filter(Product.user_id == user_id).all()

    if not products:
        return {"updated": 0, "skipped": 0, "products": [], "ai_used": False}

    # Step 1: Compute stats for all products
    products_data = []
    stats_map = {}
    for p in products:
        stats = _get_daily_sales_stats(db, p.id, lookback_days=90)
        stats_map[p.id] = stats
        products_data.append({
            "id": p.id,
            "name": p.name,
            "category": p.category or "general",
            "avg_daily": stats["avg_daily"],
            "std_daily": stats["std_daily"],
            "lead_time": p.lead_time_days or 3,
            "current_stock": p.current_stock or 0,
            "has_expiry": p.expiry_date is not None,
        })

    # Step 2: Get AI adjustments
    ai_adjustments = None
    ai_used = False
    if use_ai:
        ai_adjustments = _ai_adjust_reorder_points(products_data)
        if ai_adjustments:
            ai_used = True
            logger.info("AI provided adjustments for %d products", len(ai_adjustments))

    # Step 3: Calculate and update
    results = []
    updated = 0
    skipped = 0

    for p in products:
        stats = stats_map[p.id]
        lead_time = p.lead_time_days or 3

        # Get AI adjustment or use defaults
        z_score = DEFAULT_Z
        demand_mult = 1.0
        reasoning = "Statistical calculation (95% service level)"

        if ai_adjustments and p.id in ai_adjustments:
            adj = ai_adjustments[p.id]
            z_score = adj["z_score"]
            demand_mult = adj["demand_multiplier"]
            reasoning = adj.get("reasoning", f"AI: {adj['service_level']*100:.0f}% service level")

        # Apply demand multiplier to average
        adjusted_avg = stats["avg_daily"] * demand_mult

        # Calculate
        calc = _statistical_reorder_point(
            avg_daily=adjusted_avg,
            std_daily=stats["std_daily"],
            lead_time_days=lead_time,
            z_score=z_score,
        )

        new_reorder_point = calc["reorder_point"]
        new_safety_stock = calc["safety_stock"]

        # Skip if no sales data and current reorder_point is already set
        if stats["avg_daily"] <= 0 and (p.reorder_point or 0) > 0:
            skipped += 1
            continue

        # Skip if no change
        old_rp = p.reorder_point or 0
        old_ss = p.safety_stock or 0
        if new_reorder_point == old_rp and new_safety_stock == old_ss:
            skipped += 1
            continue

        # Update product
        p.reorder_point = new_reorder_point
        p.safety_stock = new_safety_stock
        updated += 1

        results.append({
            "id": p.id,
            "name": p.name,
            "old_reorder_point": old_rp,
            "new_reorder_point": new_reorder_point,
            "old_safety_stock": old_ss,
            "new_safety_stock": new_safety_stock,
            "avg_daily_demand": round(stats["avg_daily"], 2),
            "lead_time_days": lead_time,
            "reasoning": reasoning,
        })

    if updated > 0:
        db.commit()
        logger.info("Updated reorder points for %d products (user %d)", updated, user_id)

    return {
        "updated": updated,
        "skipped": skipped,
        "products": results,
        "ai_used": ai_used,
    }
