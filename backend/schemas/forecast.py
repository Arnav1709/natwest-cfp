"""
Forecast schemas — forecast response, scenario request/response.
"""

from pydantic import BaseModel
from typing import Optional, List


class ForecastWeek(BaseModel):
    """Single week forecast entry."""
    week: str  # e.g. "2026-W16"
    week_start: str  # e.g. "2026-04-13"
    low: float
    likely: float
    high: float


class ForecastAccuracyInfo(BaseModel):
    """Forecast accuracy metrics."""
    mape: float = 0.0
    accuracy_pct: float = 0.0
    trend: str = "stable"  # improving, declining, stable


class DriverDetail(BaseModel):
    """Individual demand driver from intelligence layer."""
    name: str
    description: str = ""
    impact_pct: float = 0.0


class ForecastResponse(BaseModel):
    """Full forecast response for a single product."""
    model_config = {"protected_namespaces": ()}

    product_id: int
    product_name: str
    forecast: List[ForecastWeek]
    baseline: List[float]
    drivers: str = ""
    driver_details: List[DriverDetail] = []
    accuracy: ForecastAccuracyInfo = ForecastAccuracyInfo()
    data_quality: str = "sufficient"  # sufficient, limited, insufficient
    model_used: str = "prophet"  # prophet, sma, stub


class ForecastSummaryItem(BaseModel):
    """Summary forecast for one product (used in forecast/all)."""
    product_id: int
    product_name: str
    next_week_likely: float = 0.0
    trend: str = "stable"  # rising, falling, stable
    has_anomaly: bool = False
    accuracy_pct: float = 0.0


class ForecastAllResponse(BaseModel):
    """Response for GET /api/forecast/all."""
    forecasts: List[ForecastSummaryItem]
    total: int
    average_accuracy: float = 0.0


class ScenarioRequest(BaseModel):
    """Request body for what-if scenario."""
    product_id: int
    scenario_type: str  # discount, demand_surge, supplier_delay, custom
    value: float  # percentage or days


class ScenarioDelta(BaseModel):
    """Delta between original and scenario forecast for one week."""
    week: str
    change_pct: float
    additional_units: float


class ScenarioResponse(BaseModel):
    """Response for POST /api/forecast/scenario."""
    original_forecast: List[ForecastWeek]
    scenario_forecast: List[ForecastWeek]
    delta: List[ScenarioDelta]
    revised_reorder_qty: float = 0
    original_reorder_qty: float = 0
