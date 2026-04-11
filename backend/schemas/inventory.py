"""
Inventory schemas — product CRUD, health metrics, expiring products.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class ProductCreate(BaseModel):
    """Request body for creating a new product."""
    name: str = Field(..., min_length=1, max_length=300)
    category: Optional[str] = None
    unit: str = Field(default="units")
    current_stock: float = Field(default=0, ge=0)
    reorder_point: float = Field(default=0, ge=0)
    safety_stock: float = Field(default=0, ge=0)
    unit_cost: float = Field(default=0, ge=0)
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    lead_time_days: int = Field(default=3, ge=0)
    expiry_date: Optional[date] = None


class StockMovementInput(BaseModel):
    """Embedded stock movement in product update."""
    type: str = Field(..., pattern="^(sale|restock|adjustment|return)$")
    quantity: float
    notes: Optional[str] = None


class ProductUpdate(BaseModel):
    """Request body for updating a product."""
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    current_stock: Optional[float] = None
    reorder_point: Optional[float] = None
    safety_stock: Optional[float] = None
    unit_cost: Optional[float] = None
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    lead_time_days: Optional[int] = None
    expiry_date: Optional[date] = None
    movement: Optional[StockMovementInput] = None


class ProductResponse(BaseModel):
    """Full product response with computed status and days remaining."""
    id: int
    name: str
    category: Optional[str] = None
    unit: str = "units"
    current_stock: float = 0
    reorder_point: float = 0
    safety_stock: float = 0
    unit_cost: float = 0
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    lead_time_days: int = 3
    expiry_date: Optional[date] = None
    status: str = "healthy"  # healthy, low_stock, critical, out_of_stock
    days_remaining: Optional[float] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ProductListResponse(BaseModel):
    """Paginated product list."""
    products: List[ProductResponse]
    total: int
    page: int
    per_page: int


class HealthMetrics(BaseModel):
    """Aggregated inventory health KPIs."""
    total_skus: int = 0
    below_reorder: int = 0
    stockout_risk: int = 0
    out_of_stock: int = 0
    forecast_accuracy: float = 0.0
    total_inventory_value: float = 0.0
    health_distribution: dict = {"healthy": 0, "warning": 0, "critical": 0}
    health_percentages: dict = {"healthy": 0.0, "warning": 0.0, "critical": 0.0}


class ExpiringProduct(BaseModel):
    """Product approaching expiry."""
    id: int
    name: str
    expiry_date: Optional[date] = None
    current_stock: float = 0
    forecast_demand: float = 0
    risk: str = "low"  # low, medium, high


class ExpiringProductsResponse(BaseModel):
    """List of products expiring within N days."""
    expiring_products: List[ExpiringProduct]
    count: int
