"""
SupplySense Database Configuration
SQLAlchemy engine, session factory, and Base declarative class.
Supports both SQLite (local dev) and PostgreSQL (Supabase cloud).
"""

import logging

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

logger = logging.getLogger(__name__)

_is_sqlite = settings.DATABASE_URL.startswith("sqlite")

# Build engine with appropriate settings
_connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=_connect_args,
    echo=settings.DEBUG,
    pool_pre_ping=True,  # Ensures stale connections are recycled (important for cloud PG)
)


# SQLite-only: enable foreign key enforcement and WAL mode
if _is_sqlite:
    @event.listens_for(engine, "connect")
    def set_sqlite_pragma(dbapi_connection, connection_record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """
    FastAPI dependency that provides a database session.
    Automatically closes the session after the request.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Create all database tables.
    Called on application startup.
    """
    import os
    db_url = settings.DATABASE_URL

    if db_url.startswith("sqlite"):
        # Ensure the data directory exists for SQLite
        db_path = db_url.replace("sqlite:///", "")
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    # Import all models so they register with Base.metadata
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized: %s", "PostgreSQL (Supabase)" if not _is_sqlite else "SQLite (local)")
