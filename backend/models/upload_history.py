"""
UploadHistory model — tracks file uploads (CSV, image, manual) per user.
"""

from sqlalchemy import Column, Integer, Text, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from database import Base


class UploadHistory(Base):
    __tablename__ = "upload_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    filename = Column(Text, nullable=False)       # "march_sales.csv"
    upload_type = Column(Text, nullable=False)     # "csv", "image", "manual"
    records = Column(Integer, default=0)           # number of rows parsed
    status = Column(Text, default="pending")       # "pending", "verified", "failed"
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="upload_history")
