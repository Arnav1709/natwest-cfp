"""
Forecast Service — AI demand forecasting engine.

Uses Facebook Prophet for time-series forecasting with external factor adjustments,
falling back to Simple Moving Average (SMA) when data is insufficient.
"""

import json
import logging
import os
from datetime import date, datetime, timedelta
from typing import Optional, List, Tuple

import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from models.product import Product
from models.sales import SalesHistory
from models.forecast import Forecast, ForecastAccuracy
from models.user import User
from schemas.forecast import (
    ForecastResponse,
    ForecastWeek,
    ForecastAccuracyInfo,
    ForecastAllResponse,
    ForecastSummaryItem,
    ScenarioResponse,
    ScenarioDelta,
)

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lookup data paths (relative to this file)
# ---------------------------------------------------------------------------
_LOOKUP_DIR = os.path.join(os.path.dirname(__file__), "lookup_data")


def _load_lookup_json(filename: str) -> list | dict:
    """Safely load a JSON lookup file; return empty list/dict on error."""
    path = os.path.join(_LOOKUP_DIR, filename)
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        logger.warning("Could not load lookup file: %s", filename)
        return []


# Cache lookup data at module level
_DISEASE_SEASONS: list = []
_FESTIVAL_CALENDAR: list = []
_WEATHER_HEURISTICS: dict = {}


def _ensure_lookups_loaded():
    """Lazy-load lookup data on first use."""
    global _DISEASE_SEASONS, _FESTIVAL_CALENDAR, _WEATHER_HEURISTICS
    if not _DISEASE_SEASONS:
        _DISEASE_SEASONS = _load_lookup_json("disease_seasons.json")
    if not _FESTIVAL_CALENDAR:
        _FESTIVAL_CALENDAR = _load_lookup_json("festival_calendar.json")
    if not _WEATHER_HEURISTICS:
        _WEATHER_HEURISTICS = _load_lookup_json("weather_heuristics.json")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

MIN_WEEKS_FOR_PROPHET = 8  # Below this, use SMA fallback
WINDOW_WEEKS = 8             # Sliding window: only use last N weeks for Prophet


def _aggregate_weekly_sales(sales_records) -> pd.DataFrame:
    """
    Convert daily/irregular sales records into a weekly time series.
    Returns DataFrame with columns ['ds', 'y'] suitable for Prophet.
    """
    if not sales_records:
        return pd.DataFrame(columns=["ds", "y"])

    data = [{"ds": pd.Timestamp(s.date), "y": float(s.quantity)} for s in sales_records]
    df = pd.DataFrame(data)

    # Aggregate to weekly frequency (Monday start)
    df = df.set_index("ds").resample("W-MON").sum().reset_index()
    df.columns = ["ds", "y"]
    # Fill any zero weeks as 0 (they truly had no sales)
    df["y"] = df["y"].fillna(0)
    return df


def _fit_prophet(df: pd.DataFrame, weeks: int) -> pd.DataFrame:
    """
    Fit a Prophet model on the weekly data and return forecast.
    Returns DataFrame with columns ['ds', 'yhat', 'yhat_lower', 'yhat_upper'].
    """
    try:
        from prophet import Prophet
    except ImportError:
        logger.error("Prophet not installed — falling back to SMA")
        return pd.DataFrame()

    # Configure Prophet based on data window size
    n_points = len(df)
    model = Prophet(
        yearly_seasonality=(n_points >= 52),  # Need ~1 year for yearly patterns
        weekly_seasonality=False,  # Not meaningful for weekly-aggregated data
        daily_seasonality=False,
        interval_width=0.80,
        changepoint_prior_scale=0.15,  # More responsive to recent trends
        n_changepoints=min(10, max(3, n_points // 2)),  # Scale with data size
    )
    model.fit(df)

    future = model.make_future_dataframe(periods=weeks, freq="W-MON")
    forecast = model.predict(future)

    # Return only the future periods (after training data)
    result = forecast[["ds", "yhat", "yhat_lower", "yhat_upper"]].tail(weeks)
    return result


def _sma_forecast(df: pd.DataFrame, weeks: int) -> List[dict]:
    """
    Simple Moving Average fallback when data is insufficient for Prophet.
    Uses the last 4 available weeks (or fewer) to compute the average.
    """
    recent = df.tail(4)
    avg = recent["y"].mean() if len(recent) > 0 else 0

    results = []
    last_date = df["ds"].max() if len(df) > 0 else pd.Timestamp(date.today())
    for i in range(1, weeks + 1):
        week_date = last_date + timedelta(weeks=i)
        results.append({
            "ds": week_date,
            "yhat": avg,
            "yhat_lower": avg * 0.7,
            "yhat_upper": avg * 1.4,
        })
    return results


def _compute_baseline(df: pd.DataFrame, weeks: int) -> List[float]:
    """
    Compute a naive baseline: average of the last `weeks` actual data points.
    This is the 'same as last period' comparison line.
    """
    recent = df.tail(weeks)
    if len(recent) == 0:
        return [0.0] * weeks
    avg = float(recent["y"].mean())  # Convert numpy to native Python float
    return [round(avg, 1)] * weeks


def _get_external_factor_boost(product_name: str, category: str, month: int, state: str = "") -> Tuple[float, List[str]]:
    """
    Calculate an external factor boost multiplier for a product based on
    disease seasons, festivals, and weather heuristics.

    Returns: (boost_multiplier, list_of_driver_strings)
    """
    _ensure_lookups_loaded()
    total_boost = 0.0
    drivers = []
    product_lower = product_name.lower()
    category_lower = (category or "").lower()

    # 1. Disease season boost
    for disease in _DISEASE_SEASONS:
        start = disease.get("start_month", 0)
        end = disease.get("end_month", 0)
        # Handle wrap-around (e.g., Dec-Feb → start=12, end=2)
        in_season = False
        if start <= end:
            in_season = start <= month <= end
        else:
            in_season = month >= start or month <= end

        if in_season:
            medicines = [m.lower() for m in disease.get("medicines", [])]
            if any(med in product_lower for med in medicines):
                boost = disease.get("boost_pct", 0)
                total_boost += boost
                drivers.append(f"{disease['disease']} season active (+{boost}%)")

    # 2. Festival boost
    for festival in _FESTIVAL_CALENDAR:
        fmonth = festival.get("month", 0)
        if fmonth == month or fmonth == (month % 12) + 1:  # current or next month
            categories = [c.lower() for c in festival.get("affected_categories", [])]
            if any(cat in product_lower or cat in category_lower for cat in categories):
                multiplier = festival.get("demand_multiplier", 1.0)
                boost = (multiplier - 1.0) * 100
                total_boost += boost
                drivers.append(f"{festival['name']} approaching (+{boost:.0f}%)")

    # 3. Weather/season boost
    seasons = _WEATHER_HEURISTICS.get("seasons", {})
    for season_key, season_data in seasons.items():
        if month in season_data.get("months", []):
            for prod_info in season_data.get("products", []):
                if prod_info["name"].lower() in product_lower:
                    boost = prod_info.get("boost_pct", 0)
                    # Apply regional adjustment
                    regional = _WEATHER_HEURISTICS.get("regional_adjustments", {})
                    region_data = regional.get(state, regional.get("default", {}))
                    intensity_key = f"{season_key}_intensity"
                    intensity = region_data.get(intensity_key, 1.0)
                    adjusted_boost = boost * intensity
                    total_boost += adjusted_boost
                    drivers.append(f"{season_data['label']} weather (+{adjusted_boost:.0f}%)")
                    break

    boost_multiplier = 1.0 + (total_boost / 100.0)
    return boost_multiplier, drivers


def _week_label(dt) -> str:
    """Convert a datetime to ISO week label like '2026-W16'."""
    if isinstance(dt, pd.Timestamp):
        dt = dt.to_pydatetime()
    iso_year, iso_week, _ = dt.isocalendar()
    return f"{iso_year}-W{iso_week:02d}"


def _compute_accuracy(db: Session, product_id: int) -> ForecastAccuracyInfo:
    """Compute forecast accuracy from stored forecast_accuracy records."""
    records = (
        db.query(ForecastAccuracy)
        .filter(ForecastAccuracy.product_id == product_id)
        .order_by(ForecastAccuracy.week_start.desc())
        .limit(12)
        .all()
    )

    if not records:
        return ForecastAccuracyInfo(mape=0.0, accuracy_pct=0.0, trend="stable")

    mapes = [r.mape for r in records if r.mape is not None]
    if not mapes:
        return ForecastAccuracyInfo(mape=0.0, accuracy_pct=0.0, trend="stable")

    avg_mape = sum(mapes) / len(mapes)
    accuracy_pct = max(0, 100 - avg_mape)

    # Determine trend: compare first half vs second half of mapes
    trend = "stable"
    if len(mapes) >= 4:
        mid = len(mapes) // 2
        older = sum(mapes[:mid]) / mid
        newer = sum(mapes[mid:]) / (len(mapes) - mid)
        if newer < older - 2:
            trend = "improving"
        elif newer > older + 2:
            trend = "declining"

    return ForecastAccuracyInfo(
        mape=round(avg_mape, 1),
        accuracy_pct=round(accuracy_pct, 1),
        trend=trend,
    )


# ---------------------------------------------------------------------------
# Public API — matches Agent 2 stub signatures exactly
# ---------------------------------------------------------------------------

def generate_forecast(
    db: Session,
    product_id: int,
    weeks: int = 6,
) -> ForecastResponse:
    """
    Generate a demand forecast for a product using Prophet.

    Steps:
    1. Fetch sales_history for the product from DB
    2. If >= 8 weeks of data: fit Prophet model, predict `weeks` ahead
    3. If < 8 weeks: fallback to Simple Moving Average with wider bands
    4. Compute naive baseline (same as last period)
    5. Apply external factor boosts (disease season, festival, weather)
    6. Run Z-score anomaly detection on residuals
    7. Generate explanation via Gemini NLP in user's language
    8. Return low/likely/high/baseline for each week

    Args:
        db: Database session
        product_id: Product to forecast
        weeks: Number of weeks to forecast (default 6)

    Returns:
        ForecastResponse with forecast bands, baseline, drivers, accuracy
    """
    # 1. Get product info
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        return ForecastResponse(
            product_id=product_id,
            product_name=f"Product #{product_id}",
            forecast=[],
            baseline=[],
            drivers="Product not found",
            data_quality="insufficient",
            model_used="none",
        )

    product_name = product.name
    category = product.category or ""

    # Get user info for regional context
    user = db.query(User).filter(User.id == product.user_id).first()
    state = user.state if user else ""
    language = user.language if user else "en"

    # 2. Fetch sales history
    sales_records = (
        db.query(SalesHistory)
        .filter(SalesHistory.product_id == product_id)
        .order_by(SalesHistory.date.asc())
        .all()
    )

    # 3. Aggregate to weekly + apply sliding window
    df_all = _aggregate_weekly_sales(sales_records)
    # Sliding window: only use last WINDOW_WEEKS for training
    df = df_all.tail(WINDOW_WEEKS) if len(df_all) > WINDOW_WEEKS else df_all
    num_weeks_data = len(df)
    logger.info("Forecast %s: %d total weeks, using %d (sliding window=%d)",
                product_name, len(df_all), num_weeks_data, WINDOW_WEEKS)

    # 4. Choose model
    model_used = "prophet"
    data_quality = "sufficient"
    forecast_rows = []

    if num_weeks_data == 0:
        # No data at all → return empty with message
        return ForecastResponse(
            product_id=product_id,
            product_name=product_name,
            forecast=[],
            baseline=[],
            drivers="No sales history available. Upload data to generate forecast.",
            data_quality="insufficient",
            model_used="none",
        )
    elif num_weeks_data < MIN_WEEKS_FOR_PROPHET:
        # Insufficient for Prophet → SMA fallback
        model_used = "sma"
        data_quality = "limited_data"
        sma_results = _sma_forecast(df, weeks)
        forecast_rows = sma_results
    else:
        # Enough data → fit Prophet
        try:
            prophet_result = _fit_prophet(df, weeks)
            if prophet_result.empty:
                # Prophet import failed → SMA fallback
                model_used = "sma"
                data_quality = "limited_data"
                forecast_rows = _sma_forecast(df, weeks)
            else:
                forecast_rows = prophet_result.to_dict("records")
        except Exception as e:
            logger.error("Prophet fitting failed for product %d: %s", product_id, e)
            model_used = "sma"
            data_quality = "limited_data"
            forecast_rows = _sma_forecast(df, weeks)

    # 5. Compute baseline
    baseline = _compute_baseline(df, weeks)

    # 6. Apply external factor boosts via Gemini Intelligence
    from services.intelligence_service import get_external_factors
    city = user.city if user else ""
    business_type = user.business_type if user else "pharmacy"
    boost_multiplier, driver_strings, driver_details = get_external_factors(
        product_name, category, city, state, business_type
    )

    # Determine trend from data
    if num_weeks_data >= 4:
        recent_4 = df.tail(4)["y"].mean()
        older_4 = df.tail(8).head(4)["y"].mean() if num_weeks_data >= 8 else df.head(min(4, num_weeks_data))["y"].mean()
        if older_4 > 0:
            trend_pct = ((recent_4 - older_4) / older_4) * 100
            if trend_pct > 5:
                driver_strings.append(f"Upward sales trend (+{trend_pct:.0f}%)")
                driver_details.append({"name": "Sales Trend", "description": f"Upward trend detected", "impact_pct": trend_pct})
            elif trend_pct < -5:
                driver_strings.append(f"Declining sales trend ({trend_pct:.0f}%)")
                driver_details.append({"name": "Sales Trend", "description": f"Declining trend detected", "impact_pct": trend_pct})
    else:
        trend_pct = 0

    # 7. Build forecast weeks with boost applied
    forecast_weeks: List[ForecastWeek] = []
    for row in forecast_rows:
        ds = row["ds"]
        yhat = max(0, row["yhat"] * boost_multiplier)
        yhat_lower = max(0, row["yhat_lower"] * boost_multiplier)
        yhat_upper = max(0, row["yhat_upper"] * boost_multiplier)

        week_str = _week_label(ds)
        if isinstance(ds, pd.Timestamp):
            week_start_str = ds.strftime("%Y-%m-%d")
        else:
            week_start_str = ds.strftime("%Y-%m-%d") if hasattr(ds, "strftime") else str(ds)

        forecast_weeks.append(ForecastWeek(
            week=week_str,
            week_start=week_start_str,
            low=round(yhat_lower, 1),
            likely=round(yhat, 1),
            high=round(yhat_upper, 1),
        ))

    # 8. Compute accuracy
    accuracy = _compute_accuracy(db, product_id)

    # Build drivers string
    drivers_text = ", ".join(driver_strings) if driver_strings else "Historical trend analysis"

    # 9. Store forecasts in DB for future reference
    try:
        for fw in forecast_weeks:
            week_start_date = datetime.strptime(fw.week_start, "%Y-%m-%d").date()
            # Upsert: delete old forecast for same product+week, then insert
            db.query(Forecast).filter(
                Forecast.product_id == product_id,
                Forecast.week_start == week_start_date,
            ).delete()
            db.add(Forecast(
                product_id=product_id,
                week_start=week_start_date,
                low=fw.low,
                likely=fw.likely,
                high=fw.high,
                baseline=baseline[0] if baseline else 0,
                drivers=drivers_text,
            ))
        db.commit()
    except Exception as e:
        logger.error("Failed to store forecasts: %s", e)
        db.rollback()

    return ForecastResponse(
        product_id=product_id,
        product_name=product_name,
        forecast=forecast_weeks,
        baseline=baseline,
        drivers=drivers_text,
        driver_details=driver_details,
        accuracy=accuracy,
        data_quality=data_quality,
        model_used=model_used,
    )


def get_all_forecasts_summary(
    db: Session,
    user_id: int,
) -> ForecastAllResponse:
    """
    Get forecast summaries for all products belonging to a user.

    Steps:
    1. Query all products for the user
    2. For each product, get the latest forecast (or generate if stale)
    3. Compute summary: next_week_likely, trend, anomaly flag, accuracy
    4. Compute overall average accuracy

    Args:
        db: Database session
        user_id: The user whose products to forecast

    Returns:
        ForecastAllResponse with per-product summaries and overall accuracy
    """
    products = db.query(Product).filter(Product.user_id == user_id).all()

    if not products:
        return ForecastAllResponse(forecasts=[], total=0, average_accuracy=0.0)

    summaries = []
    for product in products:
        # Try to get latest stored forecast
        latest_forecast = (
            db.query(Forecast)
            .filter(Forecast.product_id == product.id)
            .order_by(Forecast.week_start.asc())
            .first()
        )

        if latest_forecast:
            next_week_likely = latest_forecast.likely

            # Determine trend from forecast data
            all_forecasts = (
                db.query(Forecast)
                .filter(Forecast.product_id == product.id)
                .order_by(Forecast.week_start.asc())
                .all()
            )
            if len(all_forecasts) >= 2:
                first_half = sum(f.likely for f in all_forecasts[:len(all_forecasts)//2]) / max(1, len(all_forecasts)//2)
                second_half = sum(f.likely for f in all_forecasts[len(all_forecasts)//2:]) / max(1, len(all_forecasts) - len(all_forecasts)//2)
                if second_half > first_half * 1.05:
                    trend = "rising"
                elif second_half < first_half * 0.95:
                    trend = "falling"
                else:
                    trend = "stable"
            else:
                trend = "stable"

            # Check for anomalies
            from models.anomaly import Anomaly
            has_anomaly = (
                db.query(Anomaly)
                .filter(
                    Anomaly.product_id == product.id,
                    Anomaly.dismissed == False,
                )
                .first() is not None
            )

            accuracy = _compute_accuracy(db, product.id)
        else:
            # Generate a forecast on the fly
            try:
                fc = generate_forecast(db, product.id, weeks=6)
                next_week_likely = fc.forecast[0].likely if fc.forecast else 0
                trend = "stable"
                has_anomaly = False
                accuracy = fc.accuracy
            except Exception:
                next_week_likely = 0
                trend = "stable"
                has_anomaly = False
                accuracy = ForecastAccuracyInfo()

        summaries.append(ForecastSummaryItem(
            product_id=product.id,
            product_name=product.name,
            next_week_likely=round(next_week_likely, 1),
            trend=trend,
            has_anomaly=has_anomaly,
            accuracy_pct=accuracy.accuracy_pct,
        ))

    avg_accuracy = (
        sum(s.accuracy_pct for s in summaries) / len(summaries) if summaries else 0.0
    )

    return ForecastAllResponse(
        forecasts=summaries,
        total=len(summaries),
        average_accuracy=round(avg_accuracy, 1),
    )


def run_scenario(
    db: Session,
    product_id: int,
    scenario_type: str,
    value: float,
) -> ScenarioResponse:
    """
    Run a what-if scenario on a product's forecast.

    Supported scenario_type values:
    - "discount": value = discount percentage → demand increases by same %
    - "demand_surge": value = extra demand percentage
    - "supplier_delay": value = additional delay days → higher stockout risk
    - "custom": value = custom growth/decline percentage

    Steps:
    1. Fetch the current forecast for the product
    2. Apply the scenario multiplier to the forecast
    3. Recalculate reorder quantities for the adjusted forecast
    4. Compute delta (change_pct, additional_units) per week

    Args:
        db: Database session
        product_id: Product to run scenario on
        scenario_type: Type of scenario (discount, demand_surge, supplier_delay, custom)
        value: Scenario parameter (percentage or days)

    Returns:
        ScenarioResponse with original, scenario, and delta forecasts
    """
    # Get the original forecast
    original = generate_forecast(db, product_id)

    # Calculate multiplier based on scenario type
    if scenario_type == "discount":
        multiplier = 1.0 + (value / 100.0)  # 20% discount → 1.2x demand
    elif scenario_type == "demand_surge":
        multiplier = 1.0 + (value / 100.0)
    elif scenario_type == "supplier_delay":
        multiplier = 1.0  # Demand doesn't change, but urgency increases
    elif scenario_type == "custom":
        multiplier = 1.0 + (value / 100.0)
    else:
        multiplier = 1.0

    # Apply multiplier to each week
    scenario_forecast = []
    deltas = []
    for week in original.forecast:
        new_low = round(week.low * multiplier)
        new_likely = round(week.likely * multiplier)
        new_high = round(week.high * multiplier)
        scenario_forecast.append(ForecastWeek(
            week=week.week,
            week_start=week.week_start,
            low=new_low,
            likely=new_likely,
            high=new_high,
        ))
        change_pct = round((new_likely - week.likely) / week.likely * 100, 1) if week.likely else 0
        deltas.append(ScenarioDelta(
            week=week.week,
            change_pct=change_pct,
            additional_units=new_likely - week.likely,
        ))

    # Calculate reorder quantities
    original_total = sum(w.likely for w in original.forecast)
    scenario_total = sum(w.likely for w in scenario_forecast)

    return ScenarioResponse(
        original_forecast=original.forecast,
        scenario_forecast=scenario_forecast,
        delta=deltas,
        revised_reorder_qty=round(scenario_total),
        original_reorder_qty=round(original_total),
    )
