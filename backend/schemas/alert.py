"""
Alert schemas.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AlertResponse(BaseModel):
    """Single alert record."""
    id: int
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    type: str
    severity: str = "info"
    title: str
    message: str
    dismissed: bool = False
    sent_whatsapp: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AlertCounts(BaseModel):
    """Alert count breakdown by severity."""
    critical: int = 0
    warning: int = 0
    info: int = 0
    total: int = 0


class AlertListResponse(BaseModel):
    """Alert list response with counts."""
    alerts: List[AlertResponse]
    counts: AlertCounts
