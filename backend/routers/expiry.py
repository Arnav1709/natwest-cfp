"""
Expiry router — batch-level expiry tracking + AI disposal advice.

GET    /api/expiry/batches         — all batches with expiry info
POST   /api/expiry/batches         — add a new batch
DELETE /api/expiry/batches/:id     — remove a batch
POST   /api/expiry/advice          — AI-generated disposal recommendations
"""

import json
import logging
from datetime import date, timedelta
from typing import Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models.user import User
from models.product import Product
from models.product_batch import ProductBatch
from utils.auth import get_current_user
from services.ai_client import call_llm

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/expiry", tags=["expiry"])


# ── Schemas ────────────────────────────────────────────────

class BatchCreate(BaseModel):
    product_id: int
    batch_number: Optional[str] = None
    quantity: float = Field(ge=0)
    expiry_date: date
    purchase_date: Optional[date] = None
    unit_cost: Optional[float] = Field(default=None, ge=0)
    notes: Optional[str] = None


class BatchResponse(BaseModel):
    id: int
    product_id: int
    product_name: str
    category: Optional[str] = None
    batch_number: Optional[str] = None
    quantity: float = 0
    expiry_date: date
    purchase_date: Optional[date] = None
    unit_cost: float = 0
    supplier_name: Optional[str] = None
    days_to_expiry: int = 0
    total_value: float = 0
    risk: str = "low"  # expired, critical, warning, safe
    notes: Optional[str] = None

    class Config:
        from_attributes = True


class BatchListResponse(BaseModel):
    batches: List[BatchResponse]
    summary: dict


class AdviceRequest(BaseModel):
    product_ids: Optional[List[int]] = None  # if None, advise on all expiring


class AdviceItem(BaseModel):
    product_name: str
    batch_number: Optional[str] = None
    expiry_date: str
    days_left: int
    stock: float
    value: float
    recommended_action: str
    action_label: str
    rationale: str
    estimated_recovery_pct: int = 0
    priority: str = "medium"


class AdviceResponse(BaseModel):
    advice: List[AdviceItem]
    ai_available: bool = True


# ── Helpers ────────────────────────────────────────────────

def _batch_risk(days_to_expiry: int) -> str:
    if days_to_expiry <= 0:
        return "expired"
    if days_to_expiry <= 30:
        return "critical"
    if days_to_expiry <= 90:
        return "warning"
    return "safe"


def _batch_to_response(batch: ProductBatch) -> BatchResponse:
    days = (batch.expiry_date - date.today()).days
    cost = batch.unit_cost if batch.unit_cost else (batch.product.unit_cost or 0)
    return BatchResponse(
        id=batch.id,
        product_id=batch.product_id,
        product_name=batch.product.name,
        category=batch.product.category,
        batch_number=batch.batch_number,
        quantity=batch.quantity,
        expiry_date=batch.expiry_date,
        purchase_date=batch.purchase_date,
        unit_cost=cost,
        supplier_name=batch.product.supplier_name,
        days_to_expiry=days,
        total_value=round(batch.quantity * cost, 2),
        risk=_batch_risk(days),
        notes=batch.notes,
    )


# ── Endpoints ──────────────────────────────────────────────

@router.get("/batches", response_model=BatchListResponse)
def list_batches(
    risk: Optional[str] = Query(default=None, description="Filter: expired, critical, warning, safe"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all product batches with expiry information."""
    batches = (
        db.query(ProductBatch)
        .join(Product)
        .filter(Product.user_id == current_user.id)
        .options(joinedload(ProductBatch.product))
        .order_by(ProductBatch.expiry_date.asc())
        .all()
    )

    results = [_batch_to_response(b) for b in batches if b.quantity > 0]

    # Apply risk filter
    if risk:
        results = [r for r in results if r.risk == risk]

    # Compute summary
    expired = sum(1 for r in results if r.risk == "expired")
    critical = sum(1 for r in results if r.risk == "critical")
    warning = sum(1 for r in results if r.risk == "warning")
    safe = sum(1 for r in results if r.risk == "safe")
    total_value_at_risk = sum(r.total_value for r in results if r.risk in ("expired", "critical", "warning"))

    return BatchListResponse(
        batches=results,
        summary={
            "expired": expired,
            "critical": critical,
            "warning": warning,
            "safe": safe,
            "total": len(results),
            "total_value_at_risk": round(total_value_at_risk, 2),
        },
    )


@router.post("/batches", response_model=BatchResponse)
def create_batch(
    request: BatchCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Add a new batch for a product."""
    product = (
        db.query(Product)
        .filter(Product.id == request.product_id, Product.user_id == current_user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    batch = ProductBatch(
        product_id=request.product_id,
        batch_number=request.batch_number,
        quantity=request.quantity,
        expiry_date=request.expiry_date,
        purchase_date=request.purchase_date,
        unit_cost=request.unit_cost if request.unit_cost is not None else product.unit_cost,
        notes=request.notes,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)

    # Eagerly load product for response
    batch.product = product
    return _batch_to_response(batch)


@router.delete("/batches/{batch_id}")
def delete_batch(
    batch_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete a batch."""
    batch = (
        db.query(ProductBatch)
        .join(Product)
        .filter(ProductBatch.id == batch_id, Product.user_id == current_user.id)
        .first()
    )
    if not batch:
        raise HTTPException(status_code=404, detail="Batch not found")

    db.delete(batch)
    db.commit()
    return {"detail": "Batch deleted"}


@router.post("/advice", response_model=AdviceResponse)
def get_expiry_advice(
    request: AdviceRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    AI-generated disposal recommendations for expiring batches.
    Uses Gemini / Ollama / OpenRouter via the unified AI client.
    """
    # Fetch expiring batches (expired + within 90 days)
    cutoff = date.today() + timedelta(days=90)
    query = (
        db.query(ProductBatch)
        .join(Product)
        .filter(
            Product.user_id == current_user.id,
            ProductBatch.expiry_date <= cutoff,
            ProductBatch.quantity > 0,
        )
        .options(joinedload(ProductBatch.product))
        .order_by(ProductBatch.expiry_date.asc())
    )

    if request.product_ids:
        query = query.filter(Product.id.in_(request.product_ids))

    batches = query.all()

    if not batches:
        return AdviceResponse(advice=[], ai_available=True)

    # Build product info for AI prompt
    rows = []
    batch_info = []
    for b in batches:
        days = (b.expiry_date - date.today()).days
        cost = b.unit_cost if b.unit_cost else (b.product.unit_cost or 0)
        value = round(b.quantity * cost, 2)
        rows.append(
            f"| {b.product.name} | {b.batch_number or 'N/A'} | {days} days | "
            f"{b.quantity} {b.product.unit or 'units'} | ₹{value} | "
            f"{b.product.supplier_name or 'Unknown'} |"
        )
        batch_info.append({
            "product_name": b.product.name,
            "batch_number": b.batch_number,
            "expiry_date": str(b.expiry_date),
            "days_left": days,
            "stock": b.quantity,
            "value": value,
            "supplier": b.product.supplier_name,
            "category": b.product.category,
        })

    # Get user's business type
    business_type = current_user.business_type or "pharmacy"

    table_rows = "\n".join(rows)
    prompt = f"""You are an inventory management expert for a {business_type} business in India.

The following product batches are expiring soon or already expired:

| Product | Batch | Days Left | Stock | Value (₹) | Supplier |
|---|---|---|---|---|---|
{table_rows}

For each product batch, recommend the BEST disposal strategy. Choose from:
1. **discount_sale** — Sell at reduced price before expiry (specify % discount)
2. **return_supplier** — Negotiate return or exchange with supplier
3. **bundle_promo** — Bundle with fast-moving products for combo deal
4. **donate** — Donate to local clinics/NGOs (provides tax benefit under Section 80G)
5. **write_off** — Accept loss and dispose safely per regulations

Consider CAREFULLY:
- Days remaining (expired items can ONLY be written off or returned)
- Stock quantity vs typical demand
- Product value (high-value items worth returning, low-value better to discount)
- Whether supplier typically accepts returns
- Medicines cannot be sold after expiry (legal requirement)

Return a JSON array with one entry per batch:
[{{
  "product_name": "exact product name",
  "batch_number": "batch number or null",
  "recommended_action": "one of: discount_sale, return_supplier, bundle_promo, donate, write_off",
  "action_label": "Human-readable label like 'Discount Sale (30% off)'",
  "rationale": "2-3 sentence explanation of why this action is best for this specific product",
  "estimated_recovery_pct": number 0-100 (% of value recoverable),
  "priority": "high, medium, or low"
}}]

Return ONLY the JSON array, no markdown formatting."""

    try:
        ai_response = call_llm(prompt)
        if ai_response:
            # Clean markdown fences if present
            cleaned = ai_response.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()

            ai_items = json.loads(cleaned)

            if isinstance(ai_items, list):
                advice = []
                for item in ai_items:
                    # Find matching batch info
                    match = next(
                        (b for b in batch_info if b["product_name"] == item.get("product_name")),
                        None,
                    )
                    advice.append(AdviceItem(
                        product_name=item.get("product_name", "Unknown"),
                        batch_number=item.get("batch_number"),
                        expiry_date=match["expiry_date"] if match else "",
                        days_left=match["days_left"] if match else 0,
                        stock=match["stock"] if match else 0,
                        value=match["value"] if match else 0,
                        recommended_action=item.get("recommended_action", "write_off"),
                        action_label=item.get("action_label", "Review Needed"),
                        rationale=item.get("rationale", ""),
                        estimated_recovery_pct=item.get("estimated_recovery_pct", 0),
                        priority=item.get("priority", "medium"),
                    ))

                return AdviceResponse(advice=advice, ai_available=True)

    except json.JSONDecodeError as e:
        logger.warning("AI returned invalid JSON for expiry advice: %s", e)
    except Exception as e:
        logger.warning("Expiry advice AI call failed: %s", e)

    # Fallback — basic rule-based advice if AI unavailable
    advice = []
    for b in batch_info:
        days = b["days_left"]
        if days <= 0:
            action = "write_off"
            label = "Write Off — Expired"
            rationale = "This batch has already expired. Dispose safely per pharmaceutical regulations."
            recovery = 0
            priority = "high"
        elif days <= 7:
            action = "return_supplier"
            label = "Return to Supplier"
            rationale = f"Only {days} days left. Contact {b['supplier'] or 'supplier'} for return or exchange."
            recovery = 50
            priority = "high"
        elif days <= 30:
            action = "discount_sale"
            label = "Discount Sale (40% off)"
            rationale = f"With {days} days remaining, a 40% discount could help clear stock quickly."
            recovery = 60
            priority = "high"
        elif days <= 60:
            action = "bundle_promo"
            label = "Bundle Promotion"
            rationale = f"{days} days is enough to run a bundle promotion with fast-moving products."
            recovery = 75
            priority = "medium"
        else:
            action = "discount_sale"
            label = "Early Discount (15% off)"
            rationale = f"Start moving stock early with a small discount. {days} days of runway remaining."
            recovery = 85
            priority = "low"

        advice.append(AdviceItem(
            product_name=b["product_name"],
            batch_number=b.get("batch_number"),
            expiry_date=b["expiry_date"],
            days_left=days,
            stock=b["stock"],
            value=b["value"],
            recommended_action=action,
            action_label=label,
            rationale=rationale,
            estimated_recovery_pct=recovery,
            priority=priority,
        ))

    return AdviceResponse(advice=advice, ai_available=False)
