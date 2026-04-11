"""
Anomaly schemas.
"""

from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class AnomalyResponse(BaseModel):
    """Single anomaly record."""
    id: int
    product_id: int
    product_name: str = ""
    date: str
    type: str  # spike, drop, pattern
    z_score: float = 0.0
    explanation: str = ""
    dismissed: bool = False
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AnomalyListResponse(BaseModel):
    """List of anomalies."""
    anomalies: List[AnomalyResponse]
    count: int
