"""
Reorder schemas.
"""

from pydantic import BaseModel
from typing import Optional, List, Dict


class ReorderItem(BaseModel):
    """Single item in the reorder list."""
    product_id: int
    product_name: str
    current_stock: float = 0
    forecast_demand: float = 0
    reorder_qty: float = 0
    days_to_stockout: float = 0
    urgency: str = "low"  # low, medium, high
    supplier_name: Optional[str] = None
    supplier_contact: Optional[str] = None
    estimated_cost: float = 0.0


class ReorderSummary(BaseModel):
    """Reorder list summary metrics."""
    total_items: int = 0
    estimated_total_cost: float = 0.0
    most_urgent_product: str = ""
    most_urgent_days_remaining: float = 0.0


class ReorderResponse(BaseModel):
    """Full reorder list response."""
    summary: ReorderSummary
    reorder_list: List[ReorderItem]
    grouped_by_supplier: Dict[str, list] = {}
