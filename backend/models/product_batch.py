"""
ProductBatch model — tracks multiple batches per product with individual expiry dates.
"""

from sqlalchemy import Column, Integer, Text, Float, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class ProductBatch(Base):
    __tablename__ = "product_batches"

    id = Column(Integer, primary_key=True, autoincrement=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    batch_number = Column(Text)                      # e.g. "BATCH-2026-001"
    quantity = Column(Float, default=0)               # stock in this batch
    expiry_date = Column(Date, nullable=False)        # when this batch expires
    purchase_date = Column(Date)                      # when batch was purchased
    unit_cost = Column(Float, default=0)              # cost per unit for this batch
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    product = relationship("Product", back_populates="batches")
