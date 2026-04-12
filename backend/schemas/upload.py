"""
Upload schemas — CSV parse response, image OCR response, verification.
"""

from pydantic import BaseModel, Field
from typing import Optional, List


class ParsedProduct(BaseModel):
    """A single product row parsed from CSV or OCR."""
    name: str
    date: Optional[str] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    category: Optional[str] = None
    confidence: float = 1.0


class CSVUploadResponse(BaseModel):
    """Response after CSV/Excel parsing."""
    products: List[ParsedProduct]
    rows_parsed: int
    columns_detected: List[str]
    needs_verification: bool = True


class ImageUploadResponse(BaseModel):
    """Response after OCR processing of a handwritten ledger image."""
    extracted_data: List[ParsedProduct]
    overall_confidence: float = 0.0
    needs_verification: bool = True


class VerifiedDataItem(BaseModel):
    """A single verified/corrected data item from the user."""
    name: str = Field(..., min_length=1)
    date: Optional[str] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    category: Optional[str] = None
    unit: Optional[str] = "units"
    current_stock: Optional[float] = None
    reorder_point: Optional[float] = None
    supplier_name: Optional[str] = None


class VerifyRequest(BaseModel):
    """Request body for data verification step."""
    verified_data: List[VerifiedDataItem]


class VerifyResponse(BaseModel):
    """Response after data verification and insertion."""
    products_created: int
    sales_records_created: int
    inventory_updated: bool = True
    forecast_triggered: bool = True
