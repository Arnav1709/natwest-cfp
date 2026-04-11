"""
Settings schemas — notification preferences.
"""

from pydantic import BaseModel
from typing import Optional


class NotificationSettingsResponse(BaseModel):
    """Current notification preferences."""
    stockout_alerts: bool = True
    low_stock_alerts: bool = True
    daily_briefing: bool = True
    daily_briefing_time: str = "08:00"
    weekly_summary: bool = True
    weekly_summary_day: str = "sunday"
    seasonal_warnings: bool = True
    seasonal_advance_days: int = 14
    anomaly_alerts: bool = True
    channel_in_app: bool = True
    channel_whatsapp: bool = True
    channel_email: bool = False

    class Config:
        from_attributes = True


class NotificationSettingsUpdate(BaseModel):
    """Partial update of notification settings."""
    stockout_alerts: Optional[bool] = None
    low_stock_alerts: Optional[bool] = None
    daily_briefing: Optional[bool] = None
    daily_briefing_time: Optional[str] = None
    weekly_summary: Optional[bool] = None
    weekly_summary_day: Optional[str] = None
    seasonal_warnings: Optional[bool] = None
    seasonal_advance_days: Optional[int] = None
    anomaly_alerts: Optional[bool] = None
    channel_in_app: Optional[bool] = None
    channel_whatsapp: Optional[bool] = None
    channel_email: Optional[bool] = None
