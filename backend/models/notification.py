"""
NotificationPreference model — maps to the `notification_preferences` table.
"""

from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class NotificationPreference(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    stockout_alerts = Column(Boolean, default=True)
    low_stock_alerts = Column(Boolean, default=True)
    daily_briefing = Column(Boolean, default=True)
    daily_briefing_time = Column(Text, default="08:00")
    weekly_summary = Column(Boolean, default=True)
    weekly_summary_day = Column(Text, default="sunday")
    seasonal_warnings = Column(Boolean, default=True)
    seasonal_advance_days = Column(Integer, default=14)
    anomaly_alerts = Column(Boolean, default=True)
    channel_in_app = Column(Boolean, default=True)
    channel_whatsapp = Column(Boolean, default=True)
    channel_email = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="notification_preference")
