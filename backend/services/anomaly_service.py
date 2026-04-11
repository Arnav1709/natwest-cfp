"""
Anomaly Detection Service — Z-score based anomaly detection on forecast residuals.

Detects demand spikes, drops, and recurring patterns using statistical analysis
on the difference between actual and predicted values.
"""

import logging
from datetime import date, datetime, timedelta
from typing import List, Optional

import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from models.product import Product
from models.sales import SalesHistory
from models.forecast import Forecast
from models.anomaly import Anomaly

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Core Z-score anomaly detection
# ---------------------------------------------------------------------------

def _compute_z_scores(actuals: List[float], predictions: List[float]) -> List[dict]:
    """
    Compute Z-scores from forecast residuals.

    Z = (residual - mean_residual) / std_residual
    where residual = actual - predicted
    """
    if len(actuals) != len(predictions) or len(actuals) < 3:
        return []

    residuals = np.array(actuals) - np.array(predictions)
    mean_r = np.mean(residuals)
    std_r = np.std(residuals)

    if std_r == 0:
        return []

    z_scores = (residuals - mean_r) / std_r

    results = []
    for i, z in enumerate(z_scores):
        results.append({
            "index": i,
            "z_score": round(float(z), 2),
            "residual": round(float(residuals[i]), 2),
            "actual": actuals[i],
            "predicted": predictions[i],
        })
    return results


def _classify_anomalies(
    z_score_results: List[dict],
    threshold: float = 2.0,
) -> List[dict]:
    """
    Classify Z-score results into anomaly types.

    - |z| > threshold → anomaly
    - z > threshold → "spike" (actual >> predicted)
    - z < -threshold → "drop" (actual << predicted)
    """
    anomalies = []
    for item in z_score_results:
        z = item["z_score"]
        if abs(z) > threshold:
            anomalies.append({
                "index": item["index"],
                "z_score": z,
                "type": "spike" if z > 0 else "drop",
                "actual": item["actual"],
                "predicted": item["predicted"],
                "residual": item["residual"],
            })
    return anomalies


def _detect_patterns(
    z_score_results: List[dict],
    consecutive_weeks: int = 3,
) -> List[dict]:
    """
    Detect pattern anomalies: 3+ consecutive weeks of same-direction deviation.

    Even if individual Z-scores are below the threshold, a consistent trend
    in one direction indicates a structural shift.
    """
    if len(z_score_results) < consecutive_weeks:
        return []

    patterns = []
    i = 0
    while i < len(z_score_results) - consecutive_weeks + 1:
        # Check for consecutive positive deviations
        window = z_score_results[i:i + consecutive_weeks]
        all_positive = all(item["z_score"] > 0.5 for item in window)
        all_negative = all(item["z_score"] < -0.5 for item in window)

        if all_positive or all_negative:
            direction = "spike" if all_positive else "drop"
            avg_z = sum(item["z_score"] for item in window) / len(window)
            patterns.append({
                "start_index": window[0]["index"],
                "end_index": window[-1]["index"],
                "type": "pattern",
                "direction": direction,
                "avg_z_score": round(avg_z, 2),
                "consecutive_weeks": len(window),
            })
            i += consecutive_weeks  # Skip past the detected pattern
        else:
            i += 1

    return patterns


def _generate_anomaly_explanation(
    product_name: str,
    anomaly_type: str,
    z_score: float,
    actual: float = 0,
    predicted: float = 0,
) -> str:
    """Generate a plain-language explanation for an anomaly."""
    ratio = actual / predicted if predicted > 0 else 0

    if anomaly_type == "spike":
        if ratio > 2:
            return (
                f"Demand for {product_name} is {ratio:.0f}× normal this week "
                f"(expected {predicted:.0f}, actual {actual:.0f}). "
                f"Possible causes: local outbreak, event, or bulk purchase. "
                f"Consider restocking immediately."
            )
        return (
            f"{product_name} demand is {((ratio - 1) * 100):.0f}% above forecast "
            f"(expected {predicted:.0f}, actual {actual:.0f}). "
            f"Monitor closely and prepare for reorder."
        )
    elif anomaly_type == "drop":
        drop_pct = ((1 - ratio) * 100) if ratio < 1 else 0
        return (
            f"{product_name} demand dropped {drop_pct:.0f}% vs forecast "
            f"(expected {predicted:.0f}, actual {actual:.0f}). "
            f"Check for competitor price cuts, supply issues, or seasonal shift."
        )
    elif anomaly_type == "pattern":
        direction = "above" if z_score > 0 else "below"
        return (
            f"{product_name} has been consistently {direction} forecast for "
            f"3+ consecutive weeks. This suggests a structural demand shift — "
            f"reforecast recommended."
        )
    return f"Anomaly detected for {product_name} (Z-score: {z_score:.1f})"


# ---------------------------------------------------------------------------
# Public API — matches Agent 2 stub signatures exactly
# ---------------------------------------------------------------------------

def detect_anomalies(
    db: Session,
    product_id: int,
    residuals: Optional[List[float]] = None,
    threshold: float = 2.0,
) -> List[dict]:
    """
    Detect anomalies in a product's demand pattern using Z-score analysis.

    Steps:
    1. If residuals provided, compute Z-scores: z = (value - mean) / std
    2. Flag values where |Z| > threshold (default 2.0)
    3. Classify: z > 2.0 → "spike", z < -2.0 → "drop"
    4. Check for "pattern" anomalies: 3+ consecutive weeks of consistent deviation
    5. Generate plain-language explanation via Gemini API
    6. Store anomalies in database

    Args:
        db: Database session
        product_id: Product to analyze
        residuals: Optional list of forecast residuals (actual - predicted)
        threshold: Z-score threshold for anomaly detection (default 2.0)

    Returns:
        List of anomaly dicts: [{date, type, z_score, explanation}]
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    product_name = product.name if product else "Unknown"

    # If residuals provided directly, use them
    if residuals is not None and len(residuals) >= 3:
        # Treat residuals as (actual - predicted), predictions unknown
        mean_r = np.mean(residuals)
        std_r = np.std(residuals)
        if std_r == 0:
            return []

        z_scores = [(r - mean_r) / std_r for r in residuals]
        result_anomalies = []

        for i, z in enumerate(z_scores):
            if abs(z) > threshold:
                anomaly_type = "spike" if z > 0 else "drop"
                explanation = _generate_anomaly_explanation(
                    product_name, anomaly_type, z
                )
                anom_date = date.today() - timedelta(weeks=len(residuals) - i - 1)
                result_anomalies.append({
                    "product_id": product_id,
                    "date": str(anom_date),
                    "type": anomaly_type,
                    "z_score": round(z, 2),
                    "explanation": explanation,
                })

        # Store in DB
        _store_anomalies(db, product_id, result_anomalies)
        return result_anomalies

    # Otherwise, compute from historical data vs forecasts
    # Fetch recent sales and matching forecasts
    sales = (
        db.query(SalesHistory)
        .filter(SalesHistory.product_id == product_id)
        .order_by(SalesHistory.date.asc())
        .all()
    )

    if len(sales) < 3:
        return []

    # Aggregate weekly actuals
    weekly_actuals = {}
    for s in sales:
        # Get Monday of the week
        d = s.date
        if isinstance(d, datetime):
            d = d.date()
        monday = d - timedelta(days=d.weekday())
        weekly_actuals[monday] = weekly_actuals.get(monday, 0) + s.quantity

    # Get matching forecast predictions
    sorted_weeks = sorted(weekly_actuals.keys())
    actuals_list = []
    predictions_list = []
    dates_list = []

    for week_start in sorted_weeks:
        forecast_record = (
            db.query(Forecast)
            .filter(
                Forecast.product_id == product_id,
                Forecast.week_start == week_start,
            )
            .first()
        )
        if forecast_record:
            actuals_list.append(weekly_actuals[week_start])
            predictions_list.append(forecast_record.likely)
            dates_list.append(week_start)

    # If we don't have enough matched pairs, use a simpler approach:
    # compare each week's sales to the rolling average
    if len(actuals_list) < 3:
        all_actuals = [weekly_actuals[w] for w in sorted_weeks]
        if len(all_actuals) < 4:
            return []

        # Use rolling average as pseudo-predictions
        window = min(4, len(all_actuals) - 1)
        predictions_list = []
        actuals_list = []
        dates_list = []
        for i in range(window, len(all_actuals)):
            avg = sum(all_actuals[i-window:i]) / window
            predictions_list.append(avg)
            actuals_list.append(all_actuals[i])
            dates_list.append(sorted_weeks[i])

    if len(actuals_list) < 3:
        return []

    # Compute Z-scores
    z_results = _compute_z_scores(actuals_list, predictions_list)

    # Classify point anomalies
    point_anomalies = _classify_anomalies(z_results, threshold)

    # Detect patterns
    patterns = _detect_patterns(z_results, consecutive_weeks=3)

    # Build result list
    result_anomalies = []

    for anom in point_anomalies:
        idx = anom["index"]
        anom_date = dates_list[idx] if idx < len(dates_list) else date.today()
        explanation = _generate_anomaly_explanation(
            product_name, anom["type"], anom["z_score"],
            anom["actual"], anom["predicted"],
        )
        result_anomalies.append({
            "product_id": product_id,
            "date": str(anom_date),
            "type": anom["type"],
            "z_score": anom["z_score"],
            "explanation": explanation,
        })

    for pattern in patterns:
        start_idx = pattern["start_index"]
        anom_date = dates_list[start_idx] if start_idx < len(dates_list) else date.today()
        explanation = _generate_anomaly_explanation(
            product_name, "pattern", pattern["avg_z_score"]
        )
        result_anomalies.append({
            "product_id": product_id,
            "date": str(anom_date),
            "type": "pattern",
            "z_score": pattern["avg_z_score"],
            "explanation": explanation,
        })

    # Store in DB
    _store_anomalies(db, product_id, result_anomalies)

    return result_anomalies


def _store_anomalies(db: Session, product_id: int, anomalies: List[dict]):
    """Store detected anomalies in the database."""
    try:
        for anom in anomalies:
            anom_date = datetime.strptime(anom["date"], "%Y-%m-%d").date()
            # Avoid duplicates: check if same product+date+type already exists
            existing = (
                db.query(Anomaly)
                .filter(
                    Anomaly.product_id == product_id,
                    Anomaly.date == anom_date,
                    Anomaly.type == anom["type"],
                )
                .first()
            )
            if not existing:
                db.add(Anomaly(
                    product_id=product_id,
                    date=anom_date,
                    type=anom["type"],
                    z_score=anom["z_score"],
                    explanation=anom["explanation"],
                ))
        db.commit()
    except Exception as e:
        logger.error("Failed to store anomalies: %s", e)
        db.rollback()


def get_active_anomalies(
    db: Session,
    user_id: int,
    dismissed: bool = False,
) -> List[dict]:
    """
    Get all active (non-dismissed) anomalies for all products of a user.

    Steps:
    1. Query products for the user
    2. Query anomalies table for those product IDs
    3. Filter by dismissed flag
    4. Return sorted by severity/date

    Args:
        db: Database session
        user_id: User whose anomalies to fetch
        dismissed: Whether to include dismissed anomalies

    Returns:
        List of anomaly dicts with product names included
    """
    products = db.query(Product).filter(Product.user_id == user_id).all()
    product_ids = [p.id for p in products]
    product_map = {p.id: p.name for p in products}

    if not product_ids:
        return []

    anomalies = (
        db.query(Anomaly)
        .filter(
            Anomaly.product_id.in_(product_ids),
            Anomaly.dismissed == dismissed,
        )
        .order_by(Anomaly.created_at.desc())
        .all()
    )

    return [
        {
            "id": a.id,
            "product_id": a.product_id,
            "product_name": product_map.get(a.product_id, ""),
            "date": str(a.date),
            "type": a.type,
            "z_score": a.z_score,
            "explanation": a.explanation,
            "dismissed": a.dismissed,
            "created_at": a.created_at,
        }
        for a in anomalies
    ]


def check_pattern_anomaly(
    db: Session,
    product_id: int,
    window_weeks: int = 3,
) -> Optional[dict]:
    """
    Check for pattern anomalies: consistent deviation for N consecutive weeks.

    Example:
    "For 3 consecutive Fridays, Eggs sold 2× weekly average.
     Consider increasing Friday stock."

    Steps:
    1. Fetch last N weeks of sales data
    2. Group by day-of-week
    3. Check if any day consistently deviates > 50% from weekly average
    4. If pattern found, create anomaly record

    Args:
        db: Database session
        product_id: Product to analyze
        window_weeks: Number of consecutive weeks to check (default 3)

    Returns:
        Pattern anomaly dict if detected, None otherwise
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return None

    # Fetch recent sales
    cutoff = date.today() - timedelta(weeks=window_weeks + 1)
    sales = (
        db.query(SalesHistory)
        .filter(
            SalesHistory.product_id == product_id,
            SalesHistory.date >= cutoff,
        )
        .order_by(SalesHistory.date.asc())
        .all()
    )

    if len(sales) < window_weeks * 2:
        return None

    # Group sales by day of week
    day_of_week_sales = {}  # {0: [qty, qty, ...], 1: [...], ...}
    total_weekly_avg = 0
    weekly_totals = {}

    for s in sales:
        d = s.date
        if isinstance(d, datetime):
            d = d.date()
        dow = d.weekday()  # 0=Monday, 6=Sunday

        if dow not in day_of_week_sales:
            day_of_week_sales[dow] = []
        day_of_week_sales[dow].append(s.quantity)

        # Track weekly totals
        monday = d - timedelta(days=d.weekday())
        weekly_totals[monday] = weekly_totals.get(monday, 0) + s.quantity

    if not weekly_totals:
        return None

    overall_daily_avg = sum(weekly_totals.values()) / (len(weekly_totals) * 7)
    if overall_daily_avg == 0:
        return None

    # Check each day-of-week for consistent deviation
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

    for dow, quantities in day_of_week_sales.items():
        if len(quantities) < window_weeks:
            continue

        recent = quantities[-window_weeks:]
        avg_on_day = sum(recent) / len(recent)

        # Check if consistently > 50% above daily average
        if avg_on_day > overall_daily_avg * 1.5:
            ratio = avg_on_day / overall_daily_avg
            explanation = (
                f"For {window_weeks} consecutive {day_names[dow]}s, "
                f"{product.name} sold {ratio:.1f}× the daily average. "
                f"Consider increasing {day_names[dow]} stock."
            )

            pattern_anomaly = {
                "product_id": product_id,
                "date": str(date.today()),
                "type": "pattern",
                "z_score": round(ratio, 2),
                "explanation": explanation,
            }

            # Store in DB
            _store_anomalies(db, product_id, [pattern_anomaly])
            return pattern_anomaly

    return None
