"""
Forecast and ForecastAccuracy models.
"""

from sqlalchemy import Column, Integer, Float, Text, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class Forecast(Base):
    __tablename__ = "forecasts"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    week_start = Column(Date, nullable=False)
    low = Column(Float, nullable=False)
    likely = Column(Float, nullable=False)
    high = Column(Float, nullable=False)
    baseline = Column(Float, nullable=False)
    drivers = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    product = relationship("Product", back_populates="forecasts")


class ForecastAccuracy(Base):
    __tablename__ = "forecast_accuracy"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    week_start = Column(Date, nullable=False)
    predicted_likely = Column(Float, nullable=False)
    actual = Column(Float, nullable=False)
    mape = Column(Float)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    product = relationship("Product", back_populates="forecast_accuracy")
