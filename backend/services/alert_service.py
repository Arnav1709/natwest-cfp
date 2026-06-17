"""
Alert Service — Centralized in-app alert creation.

This service handles:
- Alert creation (DB insert)
- Notification preferences (user toggles per alert type)

Also contains scheduled job functions:
- run_anomaly_scan()
- run_seasonal_check()
"""

import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from database import SessionLocal
from models.alert import Alert
from models.product import Product
from models.user import User
from models.notification import NotificationPreference

logger = logging.getLogger(__name__)


def create_and_notify(
    db: Session,
    user_id: int,
    product_id: Optional[int],
    alert_type: str,
    severity: str,
    title: str,
    message: str,
) -> Alert:
    """
    Create an in-app alert in the DB.

    Args:
        db: Database session
        user_id: Owner of the alert
        product_id: Related product (nullable)
        alert_type: stockout, low_stock, anomaly, seasonal, expiry
        severity: critical, warning, info
        title: Short headline
        message: Detailed description

    Returns:
        The created Alert object
    """
    alert = Alert(
        user_id=user_id,
        product_id=product_id,
        type=alert_type,
        severity=severity,
        title=title,
        message=message,
    )
    db.add(alert)
    return alert


# ═══════════════════════════════════════════════════════════════
# Scheduled Job Functions
# ═══════════════════════════════════════════════════════════════


def run_anomaly_scan():
    """
    Daily 8:30 AM job: run anomaly detection for all users' products
    and create alert records for new anomalies.
    """
    logger.info("[SCHEDULER] Running anomaly scan...")
    db = SessionLocal()
    try:
        from services.anomaly_service import detect_anomalies

        users = db.query(User).all()
        total_anomalies = 0

        for user in users:
            products = db.query(Product).filter(Product.user_id == user.id).all()

            # Check notification prefs
            prefs = (
                db.query(NotificationPreference)
                .filter(NotificationPreference.user_id == user.id)
                .first()
            )
            anomaly_alerts_enabled = prefs.anomaly_alerts if prefs else True
            if not anomaly_alerts_enabled:
                continue

            for product in products:
                anomalies = detect_anomalies(db, product.id)

                for anom in anomalies:
                    # Check if we already created an alert for this anomaly recently
                    existing = (
                        db.query(Alert)
                        .filter(
                            Alert.user_id == user.id,
                            Alert.product_id == product.id,
                            Alert.type == "anomaly",
                            Alert.created_at >= datetime.utcnow() - timedelta(days=1),
                        )
                        .first()
                    )
                    if existing:
                        continue

                    create_and_notify(
                        db=db,
                        user_id=user.id,
                        product_id=product.id,
                        alert_type="anomaly",
                        severity="warning",
                        title=f"Anomaly Detected: {product.name}",
                        message=anom.get("explanation", f"Unusual demand pattern detected for {product.name}"),
                    )
                    total_anomalies += 1

            db.commit()

        logger.info("[SCHEDULER] Anomaly scan complete: %d new anomalies found", total_anomalies)
    except Exception as e:
        logger.error("[SCHEDULER] Anomaly scan failed: %s", e)
        db.rollback()
    finally:
        db.close()


def run_seasonal_check():
    """
    Weekly Monday 9 AM job: check for upcoming seasonal demand spikes
    using the intelligence service and create alerts.
    """
    logger.info("[SCHEDULER] Running seasonal check...")
    db = SessionLocal()
    try:
        from services.intelligence_service import get_external_factors

        users = db.query(User).all()
        total_alerts = 0

        for user in users:
            prefs = (
                db.query(NotificationPreference)
                .filter(NotificationPreference.user_id == user.id)
                .first()
            )
            if prefs and not prefs.seasonal_warnings:
                continue

            products = db.query(Product).filter(Product.user_id == user.id).all()

            for product in products:
                try:
                    boost_mult, driver_strings, drivers = get_external_factors(
                        product_name=product.name,
                        category=product.category or "",
                        city="",
                        state="",
                        business_type="pharmacy",
                    )

                    # Only alert if boost > 15%
                    if boost_mult < 1.15:
                        continue

                    boost_pct = round((boost_mult - 1.0) * 100)

                    # Avoid duplicate seasonal alerts within the same week
                    existing = (
                        db.query(Alert)
                        .filter(
                            Alert.user_id == user.id,
                            Alert.product_id == product.id,
                            Alert.type == "seasonal",
                            Alert.created_at >= datetime.utcnow() - timedelta(days=7),
                        )
                        .first()
                    )
                    if existing:
                        continue

                    driver_text = ", ".join(driver_strings) if driver_strings else "Seasonal factors"

                    create_and_notify(
                        db=db,
                        user_id=user.id,
                        product_id=product.id,
                        alert_type="seasonal",
                        severity="info",
                        title=f"Seasonal Alert: {product.name}",
                        message=f"Demand for {product.name} may increase by {boost_pct}% due to: {driver_text}. Consider stocking up.",
                    )
                    total_alerts += 1

                except Exception as e:
                    logger.warning("Seasonal check failed for product %s: %s", product.name, e)

            db.commit()

        logger.info("[SCHEDULER] Seasonal check complete: %d alerts created", total_alerts)
    except Exception as e:
        logger.error("[SCHEDULER] Seasonal check failed: %s", e)
        db.rollback()
    finally:
        db.close()
