"""
Sales schemas — manual entry, CSV upload, sales history responses.
"""

from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime


class SalesEntryItem(BaseModel):
    """A single sales entry — either from manual input or CSV."""
    product_name: str = Field(..., min_length=1)
    quantity: float = Field(..., gt=0)
    date: Optional[str] = None  # ISO date string, defaults to today
    price: Optional[float] = None  # sale price per unit


class SalesRecordRequest(BaseModel):
    """Batch request to record one or more sales."""
    sales: List[SalesEntryItem]


class SalesRecordResult(BaseModel):
    """Result for a single sale entry."""
    product_name: str
    quantity: float
    date: str
    status: str  # "success", "product_not_found", "insufficient_stock"
    new_stock: Optional[float] = None
    alert: Optional[str] = None  # "low_stock", "stockout" if triggered
    warning: Optional[str] = None  # Human-readable warning message


class SalesRecordResponse(BaseModel):
    """Response after recording sales."""
    total_processed: int
    successful: int
    failed: int
    results: List[SalesRecordResult]
    alerts_generated: int = 0


class SalesHistoryItem(BaseModel):
    """A single sales history record."""
    id: int
    product_id: int
    product_name: str
    quantity: float
    revenue: Optional[float] = None
    date: date
    created_at: Optional[datetime] = None


class SalesHistoryResponse(BaseModel):
    """Paginated sales history list."""
    sales: List[SalesHistoryItem]
    total: int
    page: int
    per_page: int


class SalesCSVUploadResponse(BaseModel):
    """Response after parsing a sales CSV."""
    sales: List[SalesEntryItem]
    rows_parsed: int
    columns_detected: List[str]
    needs_verification: bool = True
