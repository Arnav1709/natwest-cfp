"""
Alert Service — Centralized alert creation + WhatsApp notification delivery.

This service bridges the gap between:
- Alert creation (DB insert)
- WhatsApp delivery (POST to bot sidecar /send/template)
- Notification preferences (user toggles per alert type + channel)

Also contains scheduled job functions:
- run_daily_briefing()
- run_anomaly_scan()
- run_seasonal_check()
- run_weekly_summary()
"""

import logging
from datetime import date, datetime, timedelta
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from config import settings
from database import SessionLocal
from models.alert import Alert
from models.product import Product
from models.user import User
from models.notification import NotificationPreference
from models.sales import SalesHistory

logger = logging.getLogger(__name__)

# ── Template name mapping (alert type → WhatsApp template key) ──
ALERT_TYPE_TO_TEMPLATE = {
    "stockout": "stockout_alert",
    "low_stock": "low_stock_warning",
    "anomaly": "anomaly_alert",
    "seasonal": "seasonal_warning",
}

# ── Notification preference field mapping ──
ALERT_TYPE_TO_PREF = {
    "stockout": "stockout_alerts",
    "low_stock": "low_stock_alerts",
    "anomaly": "anomaly_alerts",
    "seasonal": "seasonal_warnings",
}


def create_and_notify(
    db: Session,
    user_id: int,
    product_id: Optional[int],
    alert_type: str,
    severity: str,
    title: str,
    message: str,
    whatsapp_template_data: Optional[dict] = None,
) -> Alert:
    """
    Create an alert in the DB and optionally send a WhatsApp notification.

    Args:
        db: Database session
        user_id: Owner of the alert
        product_id: Related product (nullable)
        alert_type: stockout, low_stock, anomaly, seasonal, expiry
        severity: critical, warning, info
        title: Short headline
        message: Detailed description
        whatsapp_template_data: Data dict to pass to the WhatsApp template formatter.
                                If None, WhatsApp notification is skipped.

    Returns:
        The created Alert object
    """
    # 1. Create alert in DB
    alert = Alert(
        user_id=user_id,
        product_id=product_id,
        type=alert_type,
        severity=severity,
        title=title,
        message=message,
    )
    db.add(alert)

    # 2. Check notification preferences
    prefs = (
        db.query(NotificationPreference)
        .filter(NotificationPreference.user_id == user_id)
        .first()
    )

    should_send_whatsapp = False
    if prefs and prefs.channel_whatsapp:
        # Check if this specific alert type is enabled
        pref_field = ALERT_TYPE_TO_PREF.get(alert_type)
        if pref_field and getattr(prefs, pref_field, True):
            should_send_whatsapp = True

    # 3. Send WhatsApp notification if enabled
    if should_send_whatsapp and whatsapp_template_data is not None:
        template_name = ALERT_TYPE_TO_TEMPLATE.get(alert_type)
        if template_name:
            # Get user's phone number
            user = db.query(User).filter(User.id == user_id).first()
            if user and user.phone:
                sent = _send_whatsapp_template(
                    phone=user.phone,
                    template=template_name,
                    data=whatsapp_template_data,
                )
                if sent:
                    alert.sent_whatsapp = True

    return alert


def _send_whatsapp_template(phone: str, template: str, data: dict) -> bool:
    """
    Send a templated WhatsApp message via the bot sidecar.

    POST http://whatsapp-bot:3001/send/template
    Body: { "phone": "...", "template": "stockout_alert", "data": {...} }
    """
    bot_url = settings.WHATSAPP_BOT_URL
    try:
        resp = httpx.post(
            f"{bot_url}/send/template",
            json={"phone": phone, "template": template, "data": data},
            timeout=10.0,
        )
        if resp.status_code == 200 and resp.json().get("success"):
            logger.info("WhatsApp template '%s' sent to %s", template, phone)
            return True
        else:
            logger.warning(
                "WhatsApp send failed: %s %s",
                resp.status_code,
                resp.text[:200],
            )
            return False
    except httpx.ConnectError:
        logger.warning("WhatsApp bot sidecar unreachable at %s", bot_url)
        return False
    except Exception as e:
        logger.error("WhatsApp send error: %s", e)
        return False


def _send_whatsapp_message(phone: str, message: str) -> bool:
    """
    Send a plain text WhatsApp message via the bot sidecar.

    POST http://whatsapp-bot:3001/send
    Body: { "phone": "...", "message": "..." }
    """
    bot_url = settings.WHATSAPP_BOT_URL
    try:
        resp = httpx.post(
            f"{bot_url}/send",
            json={"phone": phone, "message": message},
            timeout=10.0,
        )
        if resp.status_code == 200 and resp.json().get("success"):
            logger.info("WhatsApp message sent to %s", phone)
            return True
        else:
            logger.warning("WhatsApp plain send failed: %s", resp.status_code)
            return False
    except Exception as e:
        logger.warning("WhatsApp plain send error: %s", e)
        return False


# ═══════════════════════════════════════════════════════════════
# Scheduled Job Functions
# ═══════════════════════════════════════════════════════════════


def run_daily_briefing():
    """
    Daily 8 AM job: send a morning inventory health summary to each user
    who has daily_briefing enabled.
    """
    logger.info("[SCHEDULER] Running daily briefing...")
    db = SessionLocal()
    try:
        users_with_prefs = (
            db.query(User, NotificationPreference)
            .join(NotificationPreference, NotificationPreference.user_id == User.id)
            .filter(
                NotificationPreference.daily_briefing == True,  # noqa: E712
                NotificationPreference.channel_whatsapp == True,  # noqa: E712
            )
            .all()
        )

        for user, prefs in users_with_prefs:
            if not user.phone:
                continue

            products = db.query(Product).filter(Product.user_id == user.id).all()
            if not products:
                continue

            healthy = sum(1 for p in products if (p.current_stock or 0) > (p.reorder_point or 0))
            warning = sum(1 for p in products if 0 < (p.current_stock or 0) <= (p.reorder_point or 0))
            critical = sum(1 for p in products if (p.current_stock or 0) <= 0)

            # Find top action
            top_action = ""
            if critical > 0:
                out_products = [p.name for p in products if (p.current_stock or 0) <= 0]
                top_action = f"🚨 Reorder now: {', '.join(out_products[:3])}"
            elif warning > 0:
                low_products = [p.name for p in products if 0 < (p.current_stock or 0) <= (p.reorder_point or 0)]
                top_action = f"⚠️ Check stock: {', '.join(low_products[:3])}"

            template_data = {
                "date": date.today().strftime("%d %B %Y"),
                "healthy_count": healthy,
                "warning_count": warning,
                "critical_count": critical,
                "intelligence_items": "",
                "top_action": top_action,
            }

            _send_whatsapp_template(
                phone=user.phone,
                template="daily_briefing",
                data=template_data,
            )

        logger.info("[SCHEDULER] Daily briefing completed for %d users", len(users_with_prefs))
    except Exception as e:
        logger.error("[SCHEDULER] Daily briefing failed: %s", e)
    finally:
        db.close()


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

                    # Build WhatsApp data
                    multiplier = round(anom.get("z_score", 0), 1)
                    wa_data = None
                    if anomaly_alerts_enabled and prefs and prefs.channel_whatsapp and user.phone:
                        wa_data = {
                            "product_name": product.name,
                            "multiplier": f"{abs(multiplier)}",
                            "z_score": f"{anom.get('z_score', 0):.1f}",
                            "explanation": anom.get("explanation", ""),
                            "current_stock": product.current_stock or 0,
                            "days_remaining": "N/A",
                            "reorder_qty": product.reorder_point or 0,
                        }

                    create_and_notify(
                        db=db,
                        user_id=user.id,
                        product_id=product.id,
                        alert_type="anomaly",
                        severity="warning",
                        title=f"Anomaly Detected: {product.name}",
                        message=anom.get("explanation", f"Unusual demand pattern detected for {product.name}"),
                        whatsapp_template_data=wa_data,
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
                    medicine_list = product.name

                    wa_data = None
                    if prefs and prefs.channel_whatsapp and user.phone:
                        wa_data = {
                            "disease_name": driver_text,
                            "months": date.today().strftime("%B"),
                            "boost_pct": boost_pct,
                            "medicine_list": medicine_list,
                            "peak_week": (date.today() + timedelta(days=14)).isocalendar()[1],
                        }

                    create_and_notify(
                        db=db,
                        user_id=user.id,
                        product_id=product.id,
                        alert_type="seasonal",
                        severity="info",
                        title=f"Seasonal Alert: {product.name}",
                        message=f"Demand for {product.name} may increase by {boost_pct}% due to: {driver_text}. Consider stocking up.",
                        whatsapp_template_data=wa_data,
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


def run_weekly_summary():
    """
    Sunday 7 PM job: send a weekly performance summary to each user
    who has weekly_summary enabled.
    """
    logger.info("[SCHEDULER] Running weekly summary...")
    db = SessionLocal()
    try:
        from models.forecast import ForecastAccuracy

        users_with_prefs = (
            db.query(User, NotificationPreference)
            .join(NotificationPreference, NotificationPreference.user_id == User.id)
            .filter(
                NotificationPreference.weekly_summary == True,  # noqa: E712
                NotificationPreference.channel_whatsapp == True,  # noqa: E712
            )
            .all()
        )

        for user, prefs in users_with_prefs:
            if not user.phone:
                continue

            products = db.query(Product).filter(Product.user_id == user.id).all()
            product_ids = [p.id for p in products]
            if not product_ids:
                continue

            # Calculate week range
            today = date.today()
            week_start = today - timedelta(days=today.weekday() + 7)
            week_end = week_start + timedelta(days=6)

            # Forecast accuracy
            accuracy_records = (
                db.query(ForecastAccuracy)
                .filter(ForecastAccuracy.product_id.in_(product_ids))
                .order_by(ForecastAccuracy.created_at.desc())
                .limit(20)
                .all()
            )
            avg_accuracy = 85.0  # default
            if accuracy_records:
                mapes = [r.mape for r in accuracy_records if r.mape is not None]
                if mapes:
                    avg_accuracy = round(100 - sum(mapes) / len(mapes), 1)

            # Stockouts prevented (alerts that were dismissed = acted upon)
            prevented = (
                db.query(Alert)
                .filter(
                    Alert.user_id == user.id,
                    Alert.type.in_(["low_stock", "stockout"]),
                    Alert.dismissed == True,  # noqa: E712
                    Alert.created_at >= datetime.combine(week_start, datetime.min.time()),
                )
                .count()
            )

            # Weekly sales revenue
            from sqlalchemy import func as sql_func
            weekly_revenue = (
                db.query(sql_func.sum(SalesHistory.revenue))
                .filter(
                    SalesHistory.product_id.in_(product_ids),
                    SalesHistory.date >= week_start,
                    SalesHistory.date <= week_end,
                )
                .scalar()
            ) or 0

            # Top movers
            top_sales = (
                db.query(
                    SalesHistory.product_id,
                    sql_func.sum(SalesHistory.quantity).label("total_qty"),
                )
                .filter(
                    SalesHistory.product_id.in_(product_ids),
                    SalesHistory.date >= week_start,
                )
                .group_by(SalesHistory.product_id)
                .order_by(sql_func.sum(SalesHistory.quantity).desc())
                .limit(3)
                .all()
            )
            product_map = {p.id: p.name for p in products}
            top_movers = "\n".join(
                f"  📦 {product_map.get(s.product_id, '?')} — {s.total_qty} units"
                for s in top_sales
            )

            template_data = {
                "week_range": f"{week_start.strftime('%d %b')} – {week_end.strftime('%d %b %Y')}",
                "accuracy": avg_accuracy,
                "prevented": prevented,
                "saved": f"{weekly_revenue:,.0f}",
                "top_movers": top_movers or "No sales recorded this week",
                "next_week_warnings": "",
            }

            _send_whatsapp_template(
                phone=user.phone,
                template="weekly_summary",
                data=template_data,
            )

        logger.info("[SCHEDULER] Weekly summary completed for %d users", len(users_with_prefs))
    except Exception as e:
        logger.error("[SCHEDULER] Weekly summary failed: %s", e)
    finally:
        db.close()
