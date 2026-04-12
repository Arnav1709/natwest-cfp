"""
Forecast router — GET /api/forecast/:product_id, GET /api/forecast/all, POST /api/forecast/scenario
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.product import Product
from utils.auth import get_current_user
from schemas.forecast import (
    ForecastResponse,
    ForecastAllResponse,
    ScenarioRequest,
    ScenarioResponse,
)
from services.forecast_service import (
    generate_forecast,
    get_all_forecasts_summary,
    run_scenario,
)
from cache import cache_get, cache_set, cache_invalidate

router = APIRouter(prefix="/api/forecast", tags=["forecast"])


@router.get("/all", response_model=ForecastAllResponse)
def get_all_forecasts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get forecast summaries for all products.
    Used by the dashboard overview.
    """
    cached = cache_get(current_user.id, "forecast_all")
    if cached is not None:
        return cached

    result = get_all_forecasts_summary(db, current_user.id)

    cache_set(current_user.id, "forecast_all", result)
    return result


@router.get("/{product_id}", response_model=ForecastResponse)
def get_forecast(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the full forecast for a single product.
    Includes forecast bands, baseline, drivers, accuracy.
    """
    cached = cache_get(current_user.id, "forecast_product", product_id=product_id)
    if cached is not None:
        return cached

    # Verify product belongs to user
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.user_id == current_user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    result = generate_forecast(db, product_id)

    cache_set(current_user.id, "forecast_product", result, product_id=product_id)
    return result


@router.post("/scenario", response_model=ScenarioResponse)
def run_forecast_scenario(
    request: ScenarioRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Run a what-if scenario on a product's forecast.
    Supports: discount, demand_surge, supplier_delay, custom.
    """
    # Verify product belongs to user
    product = (
        db.query(Product)
        .filter(Product.id == request.product_id, Product.user_id == current_user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    return run_scenario(db, request.product_id, request.scenario_type, request.value)
