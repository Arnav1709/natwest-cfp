"""
Reorder Service — Smart reorder list generation using AI forecast data.

Calculates optimal reorder quantities, urgency rankings, and supplier groupings
based on Prophet forecasts, safety stock levels, and lead times.
"""

import logging
from typing import List
from sqlalchemy.orm import Session

from models.product import Product
from models.forecast import Forecast
from models.sales import SalesHistory
from schemas.reorder import ReorderItem, ReorderSummary, ReorderResponse

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_forecast_weekly_demand(db: Session, product_id: int) -> float:
    """
    Get the next week's forecasted demand for a product.
    Falls back to average of stored forecasts, then to reorder point heuristic.
    """
    # Try the nearest future forecast
    from datetime import date
    forecasts = (
        db.query(Forecast)
        .filter(
            Forecast.product_id == product_id,
            Forecast.week_start >= date.today(),
        )
        .order_by(Forecast.week_start.asc())
        .limit(4)
        .all()
    )

    if forecasts:
        # Use average of next 4 weeks for smoother reorder calculation
        return sum(f.likely for f in forecasts) / len(forecasts)

    # Fallback: use any recent forecasts
    recent_forecasts = (
        db.query(Forecast)
        .filter(Forecast.product_id == product_id)
        .order_by(Forecast.week_start.desc())
        .limit(4)
        .all()
    )

    if recent_forecasts:
        return sum(f.likely for f in recent_forecasts) / len(recent_forecasts)

    # Final fallback: estimate from sales history
    from sqlalchemy import func as sql_func
    from datetime import timedelta

    cutoff = date.today() - timedelta(weeks=4)
    avg_sales = (
        db.query(sql_func.avg(SalesHistory.quantity))
        .filter(
            SalesHistory.product_id == product_id,
            SalesHistory.date >= cutoff,
        )
        .scalar()
    )

    if avg_sales and avg_sales > 0:
        # avg_sales is per-record; estimate weekly by summing
        total_sales = (
            db.query(sql_func.sum(SalesHistory.quantity))
            .filter(
                SalesHistory.product_id == product_id,
                SalesHistory.date >= cutoff,
            )
            .scalar()
        )
        weeks_count = max(1, (date.today() - cutoff).days / 7)
        return (total_sales or 0) / weeks_count

    return 0.0


def _calculate_single_reorder(
    product: Product,
    forecast_demand: float,
) -> dict:
    """
    Calculate reorder metrics for a single product.

    Formula: reorder_qty = (forecast_demand * lead_time_weeks) + safety_stock - current_stock
    Where: lead_time_weeks = lead_time_days / 7

    Returns dict with reorder calculations or None if no reorder needed.
    """
    current = product.current_stock or 0
    safety = product.safety_stock or 0
    lead_time = product.lead_time_days or 3
    unit_cost = product.unit_cost or 0
    reorder_point = product.reorder_point or 0

    # If forecast demand is 0, fall back to reorder point heuristic
    if forecast_demand <= 0:
        daily_demand = reorder_point / max(lead_time, 1)
        forecast_demand = daily_demand * 7

    # Daily demand from weekly forecast
    daily_demand = forecast_demand / 7.0 if forecast_demand > 0 else 0

    # Reorder quantity calculation
    # Need enough stock to cover lead time + safety buffer
    lead_time_demand = forecast_demand * (lead_time / 7.0)
    reorder_qty = lead_time_demand + safety - current
    reorder_qty = max(0, reorder_qty)

    # Days to stockout
    if daily_demand > 0:
        days_to_stockout = current / daily_demand
    else:
        days_to_stockout = float("inf") if current > 0 else 0

    # Urgency classification
    if days_to_stockout <= 0:
        urgency = "high"  # Already out of stock
    elif days_to_stockout < 3:
        urgency = "high"
    elif days_to_stockout < 7:
        urgency = "medium"
    else:
        urgency = "low"

    # Estimated cost
    estimated_cost = reorder_qty * unit_cost

    return {
        "reorder_qty": round(reorder_qty),
        "days_to_stockout": round(days_to_stockout, 1) if days_to_stockout != float("inf") else 999,
        "urgency": urgency,
        "estimated_cost": round(estimated_cost, 2),
        "forecast_demand": round(forecast_demand, 1),
        "daily_demand": round(daily_demand, 2),
    }


# ---------------------------------------------------------------------------
# Public API — matches Agent 2 stub signatures exactly
# ---------------------------------------------------------------------------

def generate_reorder_list(
    db: Session,
    user_id: int,
) -> ReorderResponse:
    """
    Generate an AI-powered reorder list.

    Steps:
    1. Query all products for the user
    2. For each product, get the latest forecast (next week's likely demand)
    3. Calculate reorder qty:
       reorder_qty = (forecast_demand × lead_time_days) + safety_stock − current_stock
    4. Filter: only include products where reorder_qty > 0
    5. Calculate days_to_stockout: current_stock / avg_daily_sales
    6. Rank by days_to_stockout (ascending = most urgent first)
    7. Group by supplier
    8. Calculate estimated cost: unit_cost × reorder_qty

    Args:
        db: Database session
        user_id: User whose reorder list to generate

    Returns:
        ReorderResponse with summary, ranked list, and supplier grouping
    """
    products = db.query(Product).filter(Product.user_id == user_id).all()

    if not products:
        return ReorderResponse(
            summary=ReorderSummary(),
            reorder_list=[],
            grouped_by_supplier={},
        )

    reorder_items: List[ReorderItem] = []

    for p in products:
        current = p.current_stock or 0
        reorder_point = p.reorder_point or 0

        # Get AI-forecasted demand
        forecast_demand = _get_forecast_weekly_demand(db, p.id)

        # Calculate reorder metrics
        calc = _calculate_single_reorder(p, forecast_demand)

        # Determine if reorder is needed
        needs_reorder = False
        if calc["reorder_qty"] > 0:
            needs_reorder = True
        elif current <= reorder_point:
            # Stock is below reorder point even if calculation says 0
            # Minimum reorder to get back to safety level
            min_reorder = max(p.safety_stock or 0, reorder_point) - current
            if min_reorder > 0:
                calc["reorder_qty"] = round(min_reorder)
                calc["estimated_cost"] = round(min_reorder * (p.unit_cost or 0), 2)
                needs_reorder = True

        if not needs_reorder:
            continue

        reorder_items.append(ReorderItem(
            product_id=p.id,
            product_name=p.name,
            current_stock=current,
            forecast_demand=calc["forecast_demand"],
            reorder_qty=calc["reorder_qty"],
            days_to_stockout=calc["days_to_stockout"],
            urgency=calc["urgency"],
            supplier_name=p.supplier_name,
            supplier_contact=p.supplier_contact,
            estimated_cost=calc["estimated_cost"],
        ))

    # Sort by urgency (high → medium → low) then by days_to_stockout
    urgency_order = {"high": 0, "medium": 1, "low": 2}
    reorder_items.sort(
        key=lambda x: (urgency_order.get(x.urgency, 3), x.days_to_stockout)
    )

    # Group by supplier
    supplier_groups = {}
    for item in reorder_items:
        supplier = item.supplier_name or "Unknown"
        if supplier not in supplier_groups:
            supplier_groups[supplier] = []
        supplier_groups[supplier].append({
            "product_id": item.product_id,
            "product_name": item.product_name,
            "reorder_qty": item.reorder_qty,
            "urgency": item.urgency,
            "estimated_cost": item.estimated_cost,
        })

    # Summary
    total_cost = sum(item.estimated_cost for item in reorder_items)
    most_urgent = reorder_items[0] if reorder_items else None

    summary = ReorderSummary(
        total_items=len(reorder_items),
        estimated_total_cost=round(total_cost, 2),
        most_urgent_product=most_urgent.product_name if most_urgent else "",
        most_urgent_days_remaining=most_urgent.days_to_stockout if most_urgent else 0,
    )

    return ReorderResponse(
        summary=summary,
        reorder_list=reorder_items,
        grouped_by_supplier=supplier_groups,
    )
