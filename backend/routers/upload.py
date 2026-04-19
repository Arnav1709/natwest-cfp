"""
Upload router — POST /api/upload/csv, /image, /verify, GET /api/upload/history
"""

import json
import logging
from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from pydantic import BaseModel

from database import get_db
from models.user import User
from models.product import Product
from models.sales import SalesHistory
from models.upload_history import UploadHistory
from utils.auth import get_current_user
from utils.csv_parser import parse_csv
from schemas.upload import (
    CSVUploadResponse,
    ImageUploadResponse,
    ParsedProduct,
    VerifyRequest,
    VerifyResponse,
)
from services.ocr_service import process_ledger_image
from services.ai_client import call_llm

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/upload", tags=["upload"])

# Valid categories that the system supports
_VALID_CATEGORIES = {
    "medicines", "supplements", "supplies", "equipment", "grocery", "other",
}


def _ai_categorise_products(products: List[ParsedProduct]) -> List[ParsedProduct]:
    """
    Use AI to assign a category to each product based on its name.
    Sends unique names in a single batch prompt for efficiency.
    Falls back to 'Other' if the AI call fails.
    """
    # Collect unique product names that need a category
    unique_names = list({p.name for p in products if p.name and not p.category})
    if not unique_names:
        return products

    prompt = (
        "You are a product categoriser for a pharmacy / grocery inventory system.\n"
        "Valid categories are EXACTLY: Medicines, Supplements, Supplies, Equipment, Grocery, Other.\n\n"
        "For each product name below, return a JSON object mapping the product name to its category.\n"
        "Return ONLY valid JSON, no markdown, no explanation.\n\n"
        "Example output:\n"
        '{"Paracetamol 500mg": "Medicines", "Rice 5kg": "Grocery", "Surgical Gloves": "Supplies"}\n\n'
        "Product names:\n"
        + "\n".join(f"- {name}" for name in unique_names)
    )

    try:
        response = call_llm(prompt)
        if not response:
            logger.warning("AI category inference returned empty — keeping 'Other'")
            return products

        # Strip markdown fences if present
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        category_map = json.loads(cleaned)
        logger.info("AI categorised %d products: %s", len(category_map), category_map)

        # Apply categories back
        for product in products:
            if product.category:
                continue
            ai_cat = category_map.get(product.name, "Other")
            # Validate against our allowed categories
            if ai_cat.lower() in _VALID_CATEGORIES:
                product.category = ai_cat
            else:
                product.category = "Other"

    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.warning("Failed to parse AI category response: %s", e)
    except Exception as e:
        logger.warning("AI categorisation failed: %s", e)

    return products


# ── Response schema for upload history ──
class UploadHistoryItem(BaseModel):
    id: int
    filename: str
    upload_type: str
    records: int
    status: str
    created_at: Optional[str] = None

class UploadHistoryResponse(BaseModel):
    uploads: List[UploadHistoryItem]
    total: int


@router.post("/csv", response_model=CSVUploadResponse)
async def upload_csv(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload a CSV or Excel file for parsing.
    Returns parsed products for user verification before insertion.
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

    # Parse file
    products, columns_detected = parse_csv(content, file.filename)

    if not products:
        raise HTTPException(
            status_code=400,
            detail="No valid data rows found in the file",
        )

    # NOTE: upload history is only created after verification (in the /verify endpoint),
    # so failed or cancelled uploads do not appear in the history.

    # ── AI-powered category inference ──
    # If no category column was found in the CSV, use LLM to classify
    # products by name so the user doesn't see "Other" for everything.
    if "category" not in columns_detected:
        products = _ai_categorise_products(products)

    return CSVUploadResponse(
        products=products,
        rows_parsed=len(products),
        columns_detected=columns_detected,
        needs_verification=True,
    )


@router.post("/image", response_model=ImageUploadResponse)
async def upload_image(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload an image of a sales register or handwritten ledger for OCR extraction.
    Uses AI vision (Ollama local → Gemini → OpenRouter fallback) to extract product entries.
    Returns extracted data for user verification before database insertion.
    """
    # Validate image type
    allowed = (".jpg", ".jpeg", ".png", ".webp")
    if not image.filename or not any(image.filename.lower().endswith(ext) for ext in allowed):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid image type. Allowed: {', '.join(allowed)}",
        )

    content = await image.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Image is empty")

    # Max 10 MB
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Image too large. Maximum size is 10 MB.")

    # Call Google Gemini Vision OCR
    result = process_ledger_image(content, current_user.language or "en")

    # If OCR returned an error (e.g., missing API key), propagate it
    if result.get("error"):
        raise HTTPException(status_code=422, detail=result["error"])

    # NOTE: upload history is only created after verification (in the /verify endpoint),
    # so failed or cancelled uploads do not appear in the history.

    return ImageUploadResponse(
        extracted_data=result["extracted_data"],
        overall_confidence=result["overall_confidence"],
        needs_verification=True,
    )


@router.post("/verify", response_model=VerifyResponse)
def verify_data(
    request: VerifyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Verify and import user-confirmed data into the database.

    Behavior depends on the source of the data:
    - "image" (inventory upload): Create/update products with stock levels. No sales records.
    - "csv" (sales history): Only create SalesHistory for EXISTING products. No new products.
    - "manual" / None: Legacy behavior — create products + sales records.
    """
    source = (request.source or "manual").lower()

    if source == "csv":
        result = _handle_csv_sales_import(request, current_user, db)
    elif source == "image":
        result = _handle_image_inventory_import(request, current_user, db)
    else:
        result = _handle_manual_import(request, current_user, db)

    # Create upload history record — only on successful verification
    records_count = result.products_created + result.sales_records_created + result.products_matched
    upload_record = UploadHistory(
        user_id=current_user.id,
        filename="upload",
        upload_type=source,
        records=records_count,
        status="verified",
    )
    db.add(upload_record)
    db.commit()

    return result


@router.get("/history", response_model=UploadHistoryResponse)
def get_upload_history(
    limit: int = Query(default=10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get recent upload history for the current user.
    """
    total = (
        db.query(UploadHistory)
        .filter(UploadHistory.user_id == current_user.id)
        .count()
    )

    uploads = (
        db.query(UploadHistory)
        .filter(UploadHistory.user_id == current_user.id)
        .order_by(UploadHistory.created_at.desc())
        .limit(limit)
        .all()
    )

    return UploadHistoryResponse(
        uploads=[
            UploadHistoryItem(
                id=u.id,
                filename=u.filename,
                upload_type=u.upload_type,
                records=u.records,
                status=u.status,
                created_at=u.created_at.isoformat() if u.created_at else None,
            )
            for u in uploads
        ],
        total=total,
    )


def _fuzzy_match_product(name: str, products: list[Product], threshold: float = 0.6) -> Product | None:
    """
    Find the best matching product by name using difflib SequenceMatcher.
    Returns the matching product if similarity >= threshold, else None.
    """
    from difflib import SequenceMatcher

    name_lower = name.lower().strip()
    best_match = None
    best_ratio = 0.0

    for product in products:
        ratio = SequenceMatcher(None, name_lower, product.name.lower().strip()).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = product

    if best_ratio >= threshold:
        return best_match
    return None


def _handle_csv_sales_import(request: VerifyRequest, user: User, db: Session) -> VerifyResponse:
    """
    CSV sales history import — BULK OPTIMIZED.
      • Load all products once, build name→product dict
      • Bulk-add SalesHistory, single commit
    """
    user_products = db.query(Product).filter(Product.user_id == user.id).all()
    product_by_name = {p.name.lower().strip(): p for p in user_products}

    sales_created = 0
    products_matched = 0
    products_skipped = 0
    matched_ids = set()
    bulk_sales = []

    for item in request.verified_data:
        if not item.name or not item.name.strip():
            products_skipped += 1
            continue

        product = product_by_name.get(item.name.lower().strip())
        if not product:
            product = _fuzzy_match_product(item.name, user_products)

        if not product:
            products_skipped += 1
            continue

        if product.id not in matched_ids:
            matched_ids.add(product.id)
            products_matched += 1

        if item.quantity and item.quantity > 0:
            try:
                sale_date = date.fromisoformat(item.date) if item.date else date.today()
            except ValueError:
                sale_date = date.today()

            bulk_sales.append(SalesHistory(
                product_id=product.id,
                date=sale_date,
                quantity=item.quantity,
                revenue=(item.quantity * item.price) if item.price else None,
            ))
            sales_created += 1

    if bulk_sales:
        db.add_all(bulk_sales)
    db.commit()

    return VerifyResponse(
        products_created=0,
        sales_records_created=sales_created,
        products_matched=products_matched,
        products_skipped=products_skipped,
        inventory_updated=False,
        forecast_triggered=sales_created > 0,
    )


def _handle_image_inventory_import(request: VerifyRequest, user: User, db: Session) -> VerifyResponse:
    """
    Image/OCR inventory import — BULK OPTIMIZED.
      • Load all products + batch counts in 2 queries
      • Single commit at end
    """
    from models.product_batch import ProductBatch
    from sqlalchemy import func as sql_func

    user_products = db.query(Product).filter(Product.user_id == user.id).all()
    product_by_name = {p.name.lower().strip(): p for p in user_products}

    # Pre-load batch counts in one query
    pid_list = [p.id for p in user_products]
    batch_counts = {}
    if pid_list:
        for pid, cnt in db.query(ProductBatch.product_id, sql_func.count(ProductBatch.id)).filter(ProductBatch.product_id.in_(pid_list)).group_by(ProductBatch.product_id).all():
            batch_counts[pid] = cnt

    products_created = 0
    new_products = []

    for item in request.verified_data:
        if not item.name or not item.name.strip():
            continue

        expiry = None
        if item.expiry_date:
            try:
                expiry = date.fromisoformat(item.expiry_date)
            except ValueError:
                pass

        existing = product_by_name.get(item.name.lower().strip())

        if existing:
            if item.current_stock is not None:
                existing.current_stock = item.current_stock
            elif item.quantity is not None:
                existing.current_stock = item.quantity
            if item.price is not None:
                existing.unit_cost = item.price
            if item.category:
                existing.category = item.category
            if expiry:
                existing.expiry_date = expiry
                stock = item.current_stock or item.quantity or 0
                if stock > 0:
                    cnt = batch_counts.get(existing.id, 0) + 1
                    batch_counts[existing.id] = cnt
                    db.add(ProductBatch(
                        product_id=existing.id,
                        batch_number=f"BATCH-{existing.name[:3].upper()}-{cnt:03d}",
                        quantity=stock, expiry_date=expiry,
                        purchase_date=date.today(), unit_cost=existing.unit_cost or 0,
                    ))
        else:
            product = Product(
                user_id=user.id, name=item.name, category=item.category,
                unit=item.unit or "units",
                current_stock=item.current_stock or item.quantity or 0,
                reorder_point=item.reorder_point or 0,
                unit_cost=item.price or 0,
                supplier_name=item.supplier_name, expiry_date=expiry,
            )
            db.add(product)
            new_products.append((product, item, expiry))
            products_created += 1
            product_by_name[item.name.lower().strip()] = product

    # Flush to get IDs for new products
    if new_products:
        db.flush()
        for product, item, expiry in new_products:
            stock = product.current_stock or 0
            if expiry and stock > 0:
                db.add(ProductBatch(
                    product_id=product.id,
                    batch_number=f"BATCH-{product.name[:3].upper()}-001",
                    quantity=stock, expiry_date=expiry,
                    purchase_date=date.today(), unit_cost=product.unit_cost or 0,
                ))

    db.commit()

    return VerifyResponse(
        products_created=products_created,
        sales_records_created=0,
        inventory_updated=True,
        forecast_triggered=False,
    )


def _handle_manual_import(request: VerifyRequest, user: User, db: Session) -> VerifyResponse:
    """
    Manual / legacy import — BULK OPTIMIZED.
    Creates products AND sales records.
    """
    from models.product_batch import ProductBatch
    from sqlalchemy import func as sql_func

    user_products = db.query(Product).filter(Product.user_id == user.id).all()
    product_by_name = {p.name.lower().strip(): p for p in user_products}

    pid_list = [p.id for p in user_products]
    batch_counts = {}
    if pid_list:
        for pid, cnt in db.query(ProductBatch.product_id, sql_func.count(ProductBatch.id)).filter(ProductBatch.product_id.in_(pid_list)).group_by(ProductBatch.product_id).all():
            batch_counts[pid] = cnt

    products_created = 0
    sales_created = 0
    new_products = []
    bulk_sales = []

    for item in request.verified_data:
        expiry = None
        if item.expiry_date:
            try:
                expiry = date.fromisoformat(item.expiry_date)
            except ValueError:
                pass

        existing = product_by_name.get((item.name or "").lower().strip())

        if existing:
            product = existing
            if item.current_stock is not None:
                product.current_stock = item.current_stock
            elif item.quantity is not None:
                product.current_stock = item.quantity
            if item.price is not None:
                product.unit_cost = item.price
            if item.category:
                product.category = item.category
            if expiry:
                product.expiry_date = expiry
                stock = item.current_stock or item.quantity or 0
                if stock > 0:
                    cnt = batch_counts.get(product.id, 0) + 1
                    batch_counts[product.id] = cnt
                    db.add(ProductBatch(
                        product_id=product.id,
                        batch_number=f"BATCH-{product.name[:3].upper()}-{cnt:03d}",
                        quantity=stock, expiry_date=expiry,
                        purchase_date=date.today(), unit_cost=product.unit_cost or 0,
                    ))
        else:
            product = Product(
                user_id=user.id, name=item.name, category=item.category,
                unit=item.unit or "units",
                current_stock=item.current_stock or item.quantity or 0,
                reorder_point=item.reorder_point or 0,
                unit_cost=item.price or 0,
                supplier_name=item.supplier_name, expiry_date=expiry,
            )
            db.add(product)
            new_products.append((product, item, expiry))
            products_created += 1
            product_by_name[(item.name or "").lower().strip()] = product

        if item.date and item.quantity:
            try:
                sale_date = date.fromisoformat(item.date)
            except ValueError:
                sale_date = date.today()
            bulk_sales.append((product, sale_date, item.quantity, item.price))
            sales_created += 1

    # Flush to get IDs for new products
    if new_products:
        db.flush()
        for product, item, expiry in new_products:
            stock = product.current_stock or 0
            if expiry and stock > 0:
                db.add(ProductBatch(
                    product_id=product.id,
                    batch_number=f"BATCH-{product.name[:3].upper()}-001",
                    quantity=stock, expiry_date=expiry,
                    purchase_date=date.today(), unit_cost=product.unit_cost or 0,
                ))

    # Bulk-add sales
    for product, sale_date, qty, price in bulk_sales:
        db.add(SalesHistory(
            product_id=product.id, date=sale_date,
            quantity=qty, revenue=(qty * price) if price else None,
        ))

    db.commit()

    return VerifyResponse(
        products_created=products_created,
        sales_records_created=sales_created,
        inventory_updated=True,
        forecast_triggered=True,
    )
