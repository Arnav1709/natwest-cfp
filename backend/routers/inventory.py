"""
Inventory router — CRUD + /health + /expiring endpoints.
GET    /api/inventory
GET    /api/inventory/health
GET    /api/inventory/expiring
GET    /api/inventory/:id
POST   /api/inventory
PUT    /api/inventory/:id
"""

from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from database import get_db
from models.user import User
from models.product import Product
from models.stock_movement import StockMovement
from models.sales import SalesHistory
from models.alert import Alert
from services.alert_service import create_and_notify
from utils.auth import get_current_user
from schemas.inventory import (
    ProductCreate,
    ProductUpdate,
    ProductResponse,
    ProductListResponse,
    HealthMetrics,
    ExpiringProduct,
    ExpiringProductsResponse,
)
from cache import cache_get, cache_set, cache_invalidate

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


def _compute_status(product: Product) -> str:
    """Compute stock status based on current stock vs reorder/safety thresholds."""
    if product.current_stock <= 0:
        return "out_of_stock"
    if product.current_stock <= product.safety_stock:
        return "critical"
    if product.current_stock <= product.reorder_point:
        return "low_stock"
    return "healthy"


def _batch_avg_daily_sales(db: Session, product_ids: list[int]) -> dict[int, float]:
    """
    Compute avg daily sales for multiple products in ONE query
    instead of N+1 per-product queries.
    Returns { product_id: avg_daily_sales }.
    """
    if not product_ids:
        return {}

    thirty_days_ago = date.today() - timedelta(days=30)

    rows = (
        db.query(
            SalesHistory.product_id,
            sql_func.sum(SalesHistory.quantity).label("total_sold"),
        )
        .filter(
            SalesHistory.product_id.in_(product_ids),
            SalesHistory.date >= thirty_days_ago,
        )
        .group_by(SalesHistory.product_id)
        .all()
    )

    result = {}
    for row in rows:
        total = row.total_sold or 0
        if total > 0:
            result[row.product_id] = total / 30.0
    return result


def _compute_days_remaining_fast(product: Product, avg_daily: Optional[float]) -> Optional[float]:
    """Calculate days of stock remaining using pre-computed avg daily sales."""
    if product.current_stock <= 0:
        return 0.0
    if avg_daily is None or avg_daily <= 0:
        return None
    return round(product.current_stock / avg_daily, 1)


def _product_to_response(product: Product, avg_daily_map: dict[int, float]) -> ProductResponse:
    """Convert a Product ORM object to a ProductResponse with computed fields."""
    s = _compute_status(product)
    days_remaining = _compute_days_remaining_fast(product, avg_daily_map.get(product.id))

    return ProductResponse(
        id=product.id,
        name=product.name,
        category=product.category,
        unit=product.unit or "units",
        current_stock=product.current_stock or 0,
        reorder_point=product.reorder_point or 0,
        safety_stock=product.safety_stock or 0,
        unit_cost=product.unit_cost or 0,
        supplier_name=product.supplier_name,
        supplier_contact=product.supplier_contact,
        lead_time_days=product.lead_time_days or 3,
        expiry_date=product.expiry_date,
        status=s,
        days_remaining=days_remaining,
        updated_at=product.updated_at,
    )


@router.get("/health", response_model=HealthMetrics)
def get_health(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggregated inventory health KPIs for the dashboard."""
    # Check cache
    cached = cache_get(current_user.id, "inventory_health")
    if cached is not None:
        return cached

    products = db.query(Product).filter(Product.user_id == current_user.id).all()

    total = len(products)
    if total == 0:
        result = HealthMetrics()
        cache_set(current_user.id, "inventory_health", result)
        return result

    healthy = 0
    warning = 0
    critical = 0
    out_of_stock = 0
    below_reorder = 0
    stockout_risk = 0
    total_value = 0.0

    for p in products:
        s = _compute_status(p)
        total_value += (p.current_stock or 0) * (p.unit_cost or 0)

        if s == "healthy":
            healthy += 1
        elif s == "low_stock":
            warning += 1
            below_reorder += 1
        elif s == "critical":
            critical += 1
            stockout_risk += 1
            below_reorder += 1
        elif s == "out_of_stock":
            critical += 1
            out_of_stock += 1
            below_reorder += 1

    # Calculate average forecast accuracy
    from models.forecast import ForecastAccuracy
    accuracy_records = (
        db.query(ForecastAccuracy)
        .filter(ForecastAccuracy.product_id.in_([p.id for p in products]))
        .order_by(ForecastAccuracy.created_at.desc())
        .limit(50)
        .all()
    )
    avg_accuracy = 0.0
    if accuracy_records:
        mapes = [r.mape for r in accuracy_records if r.mape is not None]
        if mapes:
            avg_accuracy = round(100 - sum(mapes) / len(mapes), 1)

    result = HealthMetrics(
        total_skus=total,
        below_reorder=below_reorder,
        stockout_risk=stockout_risk,
        out_of_stock=out_of_stock,
        forecast_accuracy=avg_accuracy,
        total_inventory_value=round(total_value, 2),
        health_distribution={
            "healthy": healthy,
            "warning": warning,
            "critical": critical,
        },
        health_percentages={
            "healthy": round(healthy / total * 100, 1) if total else 0,
            "warning": round(warning / total * 100, 1) if total else 0,
            "critical": round(critical / total * 100, 1) if total else 0,
        },
    )

    cache_set(current_user.id, "inventory_health", result)
    return result


@router.get("/expiring", response_model=ExpiringProductsResponse)
def get_expiring(
    days: int = Query(default=7, ge=1, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Products expiring within N days."""
    cached = cache_get(current_user.id, "inventory_expiring", days=days)
    if cached is not None:
        return cached

    cutoff = date.today() + timedelta(days=days)

    products = (
        db.query(Product)
        .filter(
            Product.user_id == current_user.id,
            Product.expiry_date != None,  # noqa: E711
            Product.expiry_date <= cutoff,
            Product.current_stock > 0,
        )
        .order_by(Product.expiry_date.asc())
        .all()
    )

    # Batch compute avg daily sales
    product_ids = [p.id for p in products]
    avg_daily_map = _batch_avg_daily_sales(db, product_ids)

    result_items = []
    for p in products:
        days_to_expiry = (p.expiry_date - date.today()).days
        days_remaining = _compute_days_remaining_fast(p, avg_daily_map.get(p.id))
        forecast_demand = 0.0
        if days_remaining and days_remaining > 0:
            daily_rate = p.current_stock / days_remaining
            forecast_demand = daily_rate * days_to_expiry

        risk = "low"
        if p.current_stock > forecast_demand * 2:
            risk = "high"
        elif p.current_stock > forecast_demand * 1.3:
            risk = "medium"

        result_items.append(ExpiringProduct(
            id=p.id,
            name=p.name,
            expiry_date=p.expiry_date,
            current_stock=p.current_stock,
            forecast_demand=round(forecast_demand, 1),
            risk=risk,
        ))

    result = ExpiringProductsResponse(
        expiring_products=result_items,
        count=len(result_items),
    )

    cache_set(current_user.id, "inventory_expiring", result, days=days)
    return result


@router.get("", response_model=ProductListResponse)
def list_products(
    category: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all products with optional category/status filters and pagination."""
    # Check cache
    cache_params = dict(category=category or "", status=status or "", page=page, per_page=per_page)
    cached = cache_get(current_user.id, "inventory_list", **cache_params)
    if cached is not None:
        return cached

    query = db.query(Product).filter(Product.user_id == current_user.id)

    if category:
        query = query.filter(Product.category == category)

    # Get all matching products first (to compute status filter)
    all_products = query.order_by(Product.name.asc()).all()

    # Apply status filter on computed status
    if status:
        all_products = [p for p in all_products if _compute_status(p) == status]

    total = len(all_products)

    # Paginate
    start = (page - 1) * per_page
    end = start + per_page
    page_products = all_products[start:end]

    # Batch compute avg daily sales for page products (fixes N+1)
    product_ids = [p.id for p in page_products]
    avg_daily_map = _batch_avg_daily_sales(db, product_ids)

    result = ProductListResponse(
        products=[_product_to_response(p, avg_daily_map) for p in page_products],
        total=total,
        page=page,
        per_page=per_page,
    )

    cache_set(current_user.id, "inventory_list", result, **cache_params)
    return result


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get a single product by ID."""
    cached = cache_get(current_user.id, "inventory_product", product_id=product_id)
    if cached is not None:
        return cached

    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.user_id == current_user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    avg_daily_map = _batch_avg_daily_sales(db, [product.id])
    result = _product_to_response(product, avg_daily_map)

    cache_set(current_user.id, "inventory_product", result, product_id=product_id)
    return result


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    request: ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new product."""
    product = Product(
        user_id=current_user.id,
        name=request.name,
        category=request.category,
        unit=request.unit,
        current_stock=request.current_stock,
        reorder_point=request.reorder_point,
        safety_stock=request.safety_stock,
        unit_cost=request.unit_cost,
        supplier_name=request.supplier_name,
        supplier_contact=request.supplier_contact,
        lead_time_days=request.lead_time_days,
        expiry_date=request.expiry_date,
    )
    db.add(product)
    db.commit()
    db.refresh(product)

    # Record initial stock as a restock movement
    if request.current_stock > 0:
        movement = StockMovement(
            product_id=product.id,
            type="restock",
            quantity=request.current_stock,
            notes="Initial stock",
        )
        db.add(movement)
        db.commit()

    # Invalidate caches
    cache_invalidate(current_user.id, "inventory_list", "inventory_health", "inventory_expiring", "reorder")

    avg_daily_map = _batch_avg_daily_sales(db, [product.id])
    return _product_to_response(product, avg_daily_map)


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    request: ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a product. Optionally record a stock movement.

    If a movement is included:
    - Records the movement in stock_movements table
    - Updates current_stock accordingly
    - For 'sale' type: also creates a sales_history record
    - Checks for low stock / stockout and creates alerts
    """
    product = (
        db.query(Product)
        .filter(Product.id == product_id, Product.user_id == current_user.id)
        .first()
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    # Update basic fields
    update_data = request.model_dump(exclude_unset=True, exclude={"movement"})
    for field, value in update_data.items():
        setattr(product, field, value)

    # Handle stock movement
    if request.movement:
        mv = request.movement

        # Record movement
        movement = StockMovement(
            product_id=product.id,
            type=mv.type,
            quantity=mv.quantity,
            notes=mv.notes,
        )
        db.add(movement)

        # Update stock level
        if mv.type == "sale":
            product.current_stock = max(0, (product.current_stock or 0) + mv.quantity)  # quantity is negative for sales
            # Also record in sales_history
            sales_record = SalesHistory(
                product_id=product.id,
                date=date.today(),
                quantity=abs(mv.quantity),
                revenue=abs(mv.quantity) * (product.unit_cost or 0),
            )
            db.add(sales_record)
        elif mv.type == "restock":
            product.current_stock = (product.current_stock or 0) + abs(mv.quantity)
        elif mv.type == "return":
            product.current_stock = (product.current_stock or 0) + abs(mv.quantity)
        elif mv.type == "adjustment":
            product.current_stock = max(0, (product.current_stock or 0) + mv.quantity)

        # Check for alerts — create in DB + send WhatsApp via alert_service
        if product.current_stock <= 0:
            create_and_notify(
                db=db,
                user_id=current_user.id,
                product_id=product.id,
                alert_type="stockout",
                severity="critical",
                title=f"OUT OF STOCK: {product.name}",
                message=f"{product.name} is now out of stock. Immediate reorder recommended.",
                whatsapp_template_data={
                    "product_name": product.name,
                    "last_qty": abs(mv.quantity),
                    "reorder_qty": product.reorder_point or 0,
                    "supplier_name": product.supplier_name or "N/A",
                    "supplier_contact": product.supplier_contact or "N/A",
                },
            )
        elif product.current_stock <= (product.reorder_point or 0):
            create_and_notify(
                db=db,
                user_id=current_user.id,
                product_id=product.id,
                alert_type="low_stock",
                severity="warning",
                title=f"Low Stock: {product.name}",
                message=f"{product.name} is below reorder point ({product.reorder_point}). Current: {product.current_stock}.",
                whatsapp_template_data={
                    "product_name": product.name,
                    "current_stock": product.current_stock,
                    "reorder_point": product.reorder_point or 0,
                    "days_remaining": "N/A",
                    "reorder_qty": product.reorder_point or 0,
                },
            )

    product.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(product)

    # Invalidate caches
    cache_invalidate(
        current_user.id,
        "inventory_list", "inventory_health", "inventory_expiring",
        "inventory_product", "reorder", "alerts", "forecast_all", "forecast_product",
    )

    avg_daily_map = _batch_avg_daily_sales(db, [product.id])
    return _product_to_response(product, avg_daily_map)
