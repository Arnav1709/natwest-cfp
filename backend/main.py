"""
StockSense Backend — FastAPI Application Entry Point.

Run with: uvicorn main:app --reload --port 8000
"""

import logging
from contextlib import asynccontextmanager
from datetime import date

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db, SessionLocal

# ── Logging setup ─────────────────────────────────────────────
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s [%(name)s] %(message)s")
# Suppress noisy SQLAlchemy logs (keep only WARNING+)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Import all routers
from routers import auth, upload, inventory, forecast, anomalies, reorder, alerts, settings as settings_router, whatsapp, sales, translate, expiry


def _ensure_product_batches():
    """
    Auto-migration: if product_batches table is empty but products have
    expiry_date values, create batch records from existing product data.
    This handles databases seeded before the batch feature was added.
    """
    import random
    from datetime import timedelta
    from models.product import Product
    from models.product_batch import ProductBatch

    db = SessionLocal()
    try:
        batch_count = db.query(ProductBatch).count()
        if batch_count > 0:
            return  # Already has batches

        products_with_expiry = (
            db.query(Product)
            .filter(Product.expiry_date != None)  # noqa: E711
            .filter(Product.current_stock > 0)
            .all()
        )
        if not products_with_expiry:
            return

        today = date.today()
        created = 0
        for i, p in enumerate(products_with_expiry):
            # Create 2-3 batches per product with staggered expiry dates
            if i % 3 == 0:
                configs = [(-3, 0.15, "A"), (8, 0.35, "B"), (200, 0.5, "C")]
            elif i % 3 == 1:
                configs = [(25, 0.4, "B"), (180, 0.6, "C")]
            else:
                configs = [(5, 0.2, "A"), (45, 0.3, "B"), (150, 0.5, "C")]

            for (days_off, qty_frac, suffix) in configs:
                qty = max(1, int(p.current_stock * qty_frac))
                batch = ProductBatch(
                    product_id=p.id,
                    batch_number=f"BATCH-{p.name[:3].upper()}-{suffix}",
                    quantity=qty,
                    expiry_date=today + timedelta(days=days_off),
                    purchase_date=today - timedelta(days=random.randint(30, 180)),
                    unit_cost=p.unit_cost,
                )
                db.add(batch)
                created += 1

        db.commit()
        logger.info("Auto-created %d product batches from existing products", created)
    except Exception as e:
        db.rollback()
        logger.warning("Failed to auto-create product batches: %s", e)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB and start background scheduler."""
    init_db()
    logger.info("Database tables created/verified")

    # Auto-populate product_batches if empty
    _ensure_product_batches()

    # ── Start background scheduler for alert jobs ──
    from apscheduler.schedulers.background import BackgroundScheduler
    from services.alert_service import (
        run_daily_briefing,
        run_anomaly_scan,
        run_seasonal_check,
        run_weekly_summary,
    )

    scheduler = BackgroundScheduler()
    # Daily briefing at 8:00 AM
    scheduler.add_job(run_daily_briefing, "cron", hour=8, minute=0, id="daily_briefing")
    # Anomaly scan at 8:30 AM
    scheduler.add_job(run_anomaly_scan, "cron", hour=8, minute=30, id="anomaly_scan")
    # Seasonal check every Monday at 9:00 AM
    scheduler.add_job(run_seasonal_check, "cron", day_of_week="mon", hour=9, minute=0, id="seasonal_check")
    # Weekly summary every Sunday at 7:00 PM
    scheduler.add_job(run_weekly_summary, "cron", day_of_week="sun", hour=19, minute=0, id="weekly_summary")

    scheduler.start()
    logger.info("Background scheduler started with 4 alert jobs")

    yield

    scheduler.shutdown(wait=False)
    logger.info("StockSense shutting down")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Inventory Management & Demand Forecasting API",
    lifespan=lifespan,
)

# CORS — allow frontend at localhost:5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://localhost:80",
        "http://localhost",
        "http://frontend:5173",   # Docker internal
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(upload.router)
app.include_router(inventory.router)
app.include_router(forecast.router)
app.include_router(anomalies.router)
app.include_router(reorder.router)
app.include_router(alerts.router)
app.include_router(settings_router.router)
app.include_router(whatsapp.router)
app.include_router(sales.router)
app.include_router(translate.router)
app.include_router(expiry.router)


@app.get("/")
def root():
    """Health check / root endpoint."""
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "status": "running",
        "docs": "/docs",
    }


@app.get("/api/health")
def health_check():
    """API health check endpoint."""
    return {"status": "healthy", "app": settings.APP_NAME}


@app.get("/api/ai-status")
def ai_status():
    """Check AI provider availability (Ollama → Gemini → OpenRouter)."""
    from services.ai_client import get_provider_status
    return get_provider_status()
