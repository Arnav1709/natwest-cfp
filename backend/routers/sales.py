"""
Sales router — Record daily sales, upload sales CSV, view sales history.

POST   /api/sales/record       — Record one or more sales (manual or from verified CSV)
POST   /api/sales/upload-csv   — Upload a sales CSV for parsing
GET    /api/sales/history      — View sales history with filters
"""

from datetime import date as date_type, datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from database import get_db
from models.user import User
from models.product import Product
from models.sales import SalesHistory
from models.stock_movement import StockMovement
from models.alert import Alert
from services.alert_service import create_and_notify
from utils.auth import get_current_user
from utils.csv_parser import parse_csv
from schemas.sales import (
    SalesRecordRequest,
    SalesRecordResponse,
    SalesRecordResult,
    SalesCSVUploadResponse,
    SalesEntryItem,
    SalesHistoryItem,
    SalesHistoryResponse,
)
from cache import cache_get, cache_set, cache_invalidate

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.post("/record", response_model=SalesRecordResponse)
def record_sales(
    request: SalesRecordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Record one or more sales — BULK OPTIMIZED.
    1. Load all user products once (single query)
    2. Build an in-memory name→product lookup
    3. Process all entries against the lookup
    4. Bulk-add all records, single commit
    """
    results = []
    alerts_generated = 0
    successful = 0
    failed = 0

    # ── Single query: load ALL products for this user ──
    all_products = db.query(Product).filter(Product.user_id == current_user.id).all()
    product_map = {}
    for p in all_products:
        product_map[p.name.lower().strip()] = p

    # ── Collect bulk inserts ──
    bulk_sales = []
    bulk_movements = []
    alert_tasks = []  # deferred alert creation

    for entry in request.sales:
        # Parse sale date
        sale_date = date_type.today()
        if entry.date:
            try:
                sale_date = date_type.fromisoformat(entry.date)
            except ValueError:
                pass

        # Find product by name (case-insensitive)
        product = product_map.get(entry.product_name.lower().strip())

        if not product:
            results.append(SalesRecordResult(
                product_name=entry.product_name,
                quantity=entry.quantity,
                date=str(sale_date),
                status="product_not_found",
            ))
            failed += 1
            continue

        # Validate stock
        current_stock = product.current_stock or 0
        if entry.quantity > current_stock:
            results.append(SalesRecordResult(
                product_name=product.name,
                quantity=entry.quantity,
                date=str(sale_date),
                status="insufficient_stock",
                new_stock=current_stock,
                warning=f"Cannot sell {int(entry.quantity)} units — only {int(current_stock)} in stock.",
            ))
            failed += 1
            continue

        # Deduct stock in-memory (so subsequent entries for same product see updated stock)
        old_stock = current_stock
        product.current_stock = max(0, old_stock - entry.quantity)

        # Revenue
        unit_price = entry.price or product.unit_cost or 0
        revenue = entry.quantity * unit_price

        # Queue sales history record
        bulk_sales.append(SalesHistory(
            product_id=product.id,
            date=sale_date,
            quantity=entry.quantity,
            revenue=revenue,
        ))

        # Queue stock movement
        bulk_movements.append(StockMovement(
            product_id=product.id,
            type="sale",
            quantity=-entry.quantity,
            notes=f"Daily sale recorded on {sale_date}",
        ))

        # Check for alerts (defer actual creation)
        alert_type = None
        if product.current_stock <= 0:
            alert_tasks.append(dict(
                product=product, entry=entry, alert_type="stockout",
                severity="critical",
                title=f"OUT OF STOCK: {product.name}",
                message=f"{product.name} is now out of stock after selling {entry.quantity} units. Immediate reorder recommended.",
            ))
            alert_type = "stockout"
            alerts_generated += 1
        elif product.current_stock <= (product.reorder_point or 0):
            alert_tasks.append(dict(
                product=product, entry=entry, alert_type="low_stock",
                severity="warning",
                title=f"Low Stock: {product.name}",
                message=f"{product.name} dropped to {product.current_stock} units (reorder point: {product.reorder_point}). Consider reordering.",
            ))
            alert_type = "low_stock"
            alerts_generated += 1

        product.updated_at = datetime.utcnow()

        results.append(SalesRecordResult(
            product_name=product.name,
            quantity=entry.quantity,
            date=str(sale_date),
            status="success",
            new_stock=product.current_stock,
            alert=alert_type,
        ))
        successful += 1

    # ── Bulk insert + single commit ──
    if bulk_sales:
        db.add_all(bulk_sales)
    if bulk_movements:
        db.add_all(bulk_movements)

    # Create alerts (limited to avoid spam — max 20 alerts per batch)
    for task in alert_tasks[:20]:
        p = task["product"]
        create_and_notify(
            db=db,
            user_id=current_user.id,
            product_id=p.id,
            alert_type=task["alert_type"],
            severity=task["severity"],
            title=task["title"],
            message=task["message"],
            whatsapp_template_data={
                "product_name": p.name,
                "current_stock": p.current_stock,
                "reorder_point": p.reorder_point or 0,
                "days_remaining": "N/A",
                "reorder_qty": p.reorder_point or 0,
            },
        )

    db.commit()

    # Invalidate caches
    cache_invalidate(
        current_user.id,
        "inventory_list", "inventory_health", "inventory_expiring",
        "inventory_product", "forecast_all", "forecast_product",
        "reorder", "alerts", "sales_history",
    )

    # Auto-recalculate reorder points in background (non-blocking)
    try:
        from services.reorder_point_calculator import calculate_reorder_points
        calculate_reorder_points(db, current_user.id, use_ai=False)  # Fast statistical only
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Auto-reorder calculation failed: %s", e)

    return SalesRecordResponse(
        total_processed=len(request.sales),
        successful=successful,
        failed=failed,
        results=results,
        alerts_generated=alerts_generated,
    )


@router.post("/upload-csv", response_model=SalesCSVUploadResponse)
async def upload_sales_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a sales CSV file for parsing.
    Expected columns: product_name (or name), quantity (or qty/sold), date, price (optional)
    Returns parsed sales data for user verification before recording.
    """
    # Validate file type
    allowed = (".csv", ".xlsx", ".xls")
    if not file.filename or not any(file.filename.lower().endswith(ext) for ext in allowed):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file type. Allowed: {', '.join(allowed)}",
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="File is empty")

    # Reuse the existing CSV parser
    products, columns_detected = parse_csv(content, file.filename)

    if not products:
        raise HTTPException(
            status_code=400,
            detail="No valid data rows found in the file",
        )

    # Convert ParsedProduct → SalesEntryItem (skip rows with no quantity)
    sales_entries = []
    for p in products:
        qty = p.quantity or 0
        if qty <= 0:
            continue  # SalesEntryItem requires quantity > 0
        sales_entries.append(SalesEntryItem(
            product_name=p.name,
            quantity=qty,
            date=p.date,
            price=p.price,
        ))

    return SalesCSVUploadResponse(
        sales=sales_entries,
        rows_parsed=len(sales_entries),
        columns_detected=columns_detected,
        needs_verification=True,
    )


@router.get("/history", response_model=SalesHistoryResponse)
def get_sales_history(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    product_id: int = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Get paginated sales history for the current user."""
    cache_params = dict(page=page, per_page=per_page, product_id=product_id or "")
    cached = cache_get(current_user.id, "sales_history", **cache_params)
    if cached is not None:
        return cached

    # Get all product IDs belonging to this user
    user_product_ids = (
        db.query(Product.id)
        .filter(Product.user_id == current_user.id)
        .subquery()
    )

    query = db.query(SalesHistory).filter(
        SalesHistory.product_id.in_(user_product_ids)
    )

    if product_id:
        query = query.filter(SalesHistory.product_id == product_id)

    total = query.count()

    sales = (
        query
        .order_by(SalesHistory.date.desc(), SalesHistory.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    # Get product names
    product_ids = {s.product_id for s in sales}
    product_map = {}
    if product_ids:
        products = db.query(Product).filter(Product.id.in_(product_ids)).all()
        product_map = {p.id: p.name for p in products}

    result = SalesHistoryResponse(
        sales=[
            SalesHistoryItem(
                id=s.id,
                product_id=s.product_id,
                product_name=product_map.get(s.product_id, "Unknown"),
                quantity=s.quantity,
                revenue=s.revenue,
                date=s.date,
                created_at=s.created_at,
            )
            for s in sales
        ],
        total=total,
        page=page,
        per_page=per_page,
    )

    cache_set(current_user.id, "sales_history", result, **cache_params)
    return result
