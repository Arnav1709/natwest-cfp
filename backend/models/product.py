"""
Product model — maps to the `products` table.
"""

from sqlalchemy import Column, Integer, Text, Float, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(Text, nullable=False)
    category = Column(Text)
    unit = Column(Text, default="units")
    current_stock = Column(Float, default=0)
    reorder_point = Column(Float, default=0)
    safety_stock = Column(Float, default=0)
    unit_cost = Column(Float, default=0)
    supplier_name = Column(Text)
    supplier_contact = Column(Text)
    lead_time_days = Column(Integer, default=3)
    expiry_date = Column(Date)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="products")
    sales_history = relationship("SalesHistory", back_populates="product", cascade="all, delete-orphan")
    forecasts = relationship("Forecast", back_populates="product", cascade="all, delete-orphan")
    forecast_accuracy = relationship("ForecastAccuracy", back_populates="product", cascade="all, delete-orphan")
    anomalies = relationship("Anomaly", back_populates="product", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="product", cascade="all, delete-orphan")
    stock_movements = relationship("StockMovement", back_populates="product", cascade="all, delete-orphan")
    batches = relationship("ProductBatch", back_populates="product", cascade="all, delete-orphan")
