"""
Anomaly model — maps to the `anomalies` table.
"""

from sqlalchemy import Column, Integer, Float, Text, Date, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    date = Column(Date, nullable=False)
    type = Column(Text)  # spike, drop, pattern
    z_score = Column(Float)
    explanation = Column(Text)
    dismissed = Column(Boolean, default=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    product = relationship("Product", back_populates="anomalies")
