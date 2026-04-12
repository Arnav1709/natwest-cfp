"""
Alerts router — GET /api/alerts, PUT /api/alerts/:id/dismiss
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.alert import Alert
from models.product import Product
from utils.auth import get_current_user
from schemas.alert import AlertResponse, AlertCounts, AlertListResponse
from cache import cache_get, cache_set, cache_invalidate

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=AlertListResponse)
def list_alerts(
    severity: Optional[str] = None,
    dismissed: Optional[bool] = Query(default=False),
    limit: int = Query(default=10, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List alerts for the current user, with optional severity/dismissed filters."""
    cache_params = dict(
        severity=severity or "",
        dismissed=str(dismissed) if dismissed is not None else "",
        limit=limit,
    )
    cached = cache_get(current_user.id, "alerts", **cache_params)
    if cached is not None:
        return cached

    query = db.query(Alert).filter(Alert.user_id == current_user.id)

    if severity:
        query = query.filter(Alert.severity == severity)
    if dismissed is not None:
        query = query.filter(Alert.dismissed == dismissed)

    alerts = query.order_by(Alert.created_at.desc()).limit(limit).all()

    # Get product names
    product_ids = {a.product_id for a in alerts if a.product_id}
    product_map = {}
    if product_ids:
        products = db.query(Product).filter(Product.id.in_(product_ids)).all()
        product_map = {p.id: p.name for p in products}

    # Build response
    alert_responses = []
    for a in alerts:
        alert_responses.append(AlertResponse(
            id=a.id,
            product_id=a.product_id,
            product_name=product_map.get(a.product_id),
            type=a.type,
            severity=a.severity or "info",
            title=a.title,
            message=a.message,
            dismissed=a.dismissed or False,
            sent_whatsapp=a.sent_whatsapp or False,
            created_at=a.created_at,
        ))

    # Count by severity (for all non-dismissed alerts)
    all_alerts = (
        db.query(Alert)
        .filter(Alert.user_id == current_user.id, Alert.dismissed == False)  # noqa: E712
        .all()
    )
    counts = AlertCounts(
        critical=sum(1 for a in all_alerts if a.severity == "critical"),
        warning=sum(1 for a in all_alerts if a.severity == "warning"),
        info=sum(1 for a in all_alerts if a.severity == "info"),
        total=len(all_alerts),
    )

    result = AlertListResponse(alerts=alert_responses, counts=counts)

    cache_set(current_user.id, "alerts", result, **cache_params)
    return result


@router.put("/{alert_id}/dismiss")
def dismiss_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Dismiss an alert by ID."""
    alert = (
        db.query(Alert)
        .filter(Alert.id == alert_id, Alert.user_id == current_user.id)
        .first()
    )
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.dismissed = True
    db.commit()

    # Invalidate alerts cache
    cache_invalidate(current_user.id, "alerts")

    return {"dismissed": True}
