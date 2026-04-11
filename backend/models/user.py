"""
User model — maps to the `users` table.
"""

from sqlalchemy import Column, Integer, Text, DateTime, func
from sqlalchemy.orm import relationship
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    shop_name = Column(Text, nullable=False)
    business_type = Column(Text, nullable=False)  # pharmacy, grocery, retail, other
    city = Column(Text)
    state = Column(Text)
    language = Column(Text, default="en")
    phone = Column(Text, unique=True)
    email = Column(Text)
    password_hash = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    # Relationships
    products = relationship("Product", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")
    notification_preference = relationship(
        "NotificationPreference", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
