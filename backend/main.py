"""
StockSense Backend — FastAPI Application Entry Point.

Run with: uvicorn main:app --reload --port 8000
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db

# Import all routers
from routers import auth, upload, inventory, forecast, anomalies, reorder, alerts, settings as settings_router, whatsapp, sales


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize DB on startup."""
    init_db()
    print("✅ Database tables created/verified")
    yield
    print("👋 StockSense shutting down")


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
