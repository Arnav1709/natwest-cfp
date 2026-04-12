"""
StockSense Database Configuration
SQLAlchemy engine, session factory, and Base declarative class.
"""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base
from config import settings

# SQLite-specific: enable WAL mode and foreign keys
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=settings.DEBUG,
)


# Enable foreign key enforcement for SQLite
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
    # Ensure the data directory exists (for both local and Docker)
    import os
    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite"):
        # Extract path from sqlite:///./data/stocksense.db
        db_path = db_url.replace("sqlite:///", "")
        db_dir = os.path.dirname(db_path)
        if db_dir:
            os.makedirs(db_dir, exist_ok=True)

    # Import all models so they register with Base.metadata
    import models  # noqa: F401
    Base.metadata.create_all(bind=engine)
