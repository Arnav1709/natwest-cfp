"""
Lookup models — DiseaseSeason and FestivalCalendar tables.
"""

from sqlalchemy import Column, Integer, Float, Text
from database import Base


class DiseaseSeason(Base):
    __tablename__ = "disease_seasons"

    id = Column(Integer, primary_key=True, autoincrement=True)
    disease = Column(Text, nullable=False)
    start_month = Column(Integer, nullable=False)
    end_month = Column(Integer, nullable=False)
    medicines = Column(Text, nullable=False)  # Comma-separated medicine names
    boost_pct = Column(Float, default=40)


class FestivalCalendar(Base):
    __tablename__ = "festival_calendar"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(Text, nullable=False)
    month = Column(Integer, nullable=False)
    affected_categories = Column(Text, nullable=False)  # Comma-separated categories
    demand_multiplier = Column(Float, default=1.5)
