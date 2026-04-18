"""
TranslationCache model — caches AI-generated transliterations of product names.
"""

from sqlalchemy import Column, Integer, Text, DateTime, UniqueConstraint, func
from database import Base


class TranslationCache(Base):
    __tablename__ = "translation_cache"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_text = Column(Text, nullable=False)      # "Paracetamol"
    target_lang = Column(Text, nullable=False)       # "hi"
    translated = Column(Text, nullable=False)        # "पैरासिटामोल"
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        UniqueConstraint("source_text", "target_lang", name="uq_source_lang"),
    )
