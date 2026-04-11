"""
Anomalies router — GET /api/anomalies, GET /api/anomalies/:product_id
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.product import Product
from models.anomaly import Anomaly
from utils.auth import get_current_user
from schemas.anomaly import AnomalyResponse, AnomalyListResponse

router = APIRouter(prefix="/api/anomalies", tags=["anomalies"])


@router.get("", response_model=AnomalyListResponse)
def list_anomalies(
    severity: Optional[str] = None,
    dismissed: Optional[bool] = Query(default=False),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List all active anomalies for the current user's products.
    """
    # Get user's product IDs
    product_ids = [
        p.id for p in db.query(Product.id).filter(Product.user_id == current_user.id).all()
    ]

    query = db.query(Anomaly).filter(Anomaly.product_id.in_(product_ids))

    if dismissed is not None:
        query = query.filter(Anomaly.dismissed == dismissed)

    anomalies = query.order_by(Anomaly.created_at.desc()).all()

    # Build response with product names
    product_map = {
        p.id: p.name
        for p in db.query(Product).filter(Product.id.in_(product_ids)).all()
    }

    result = []
    for a in anomalies:
        result.append(AnomalyResponse(
            id=a.id,
            product_id=a.product_id,
            product_name=product_map.get(a.product_id, ""),
            date=str(a.date),
            type=a.type or "spike",
            z_score=a.z_score or 0.0,
            explanation=a.explanation or "",
            dismissed=a.dismissed or False,
            created_at=a.created_at,
        ))

    return AnomalyListResponse(anomalies=result, count=len(result))


@router.get("/{product_id}", response_model=AnomalyListResponse)
def get_product_anomalies(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get anomalies for a specific product."""
    # Verify product belongs to user
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.user_id == current_user.id)
        .first()
    )

    if not product:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Product not found")

    anomalies = (
        db.query(Anomaly)
        .filter(Anomaly.product_id == product_id, Anomaly.dismissed == False)  # noqa: E712
        .order_by(Anomaly.created_at.desc())
        .all()
    )

    result = [
        AnomalyResponse(
            id=a.id,
            product_id=a.product_id,
            product_name=product.name,
            date=str(a.date),
            type=a.type or "spike",
            z_score=a.z_score or 0.0,
            explanation=a.explanation or "",
            dismissed=a.dismissed or False,
            created_at=a.created_at,
        )
        for a in anomalies
    ]

    return AnomalyListResponse(anomalies=result, count=len(result))
