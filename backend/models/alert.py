"""
Alert model — maps to the `alerts` table.
"""

from sqlalchemy import Column, Integer, Text, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True)
    type = Column(Text, nullable=False)  # stockout, low_stock, anomaly, seasonal, expiry
    severity = Column(Text)  # critical, warning, info
    title = Column(Text, nullable=False)
    message = Column(Text, nullable=False)
    dismissed = Column(Boolean, default=False)
    sent_whatsapp = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="alerts")
    product = relationship("Product", back_populates="alerts")
