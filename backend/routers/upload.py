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

    # Track upload in history
    upload_record = UploadHistory(
        user_id=current_user.id,
        filename=file.filename,
        upload_type="csv",
        records=len(products),
        status="pending",
    )
    db.add(upload_record)
    db.commit()

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

    # Track upload in history
    upload_record = UploadHistory(
        user_id=current_user.id,
        filename=image.filename,
        upload_type="image",
        records=len(result["extracted_data"]),
        status="pending",
    )
    db.add(upload_record)
    db.commit()

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

    # Mark the most recent pending upload for this user as verified
    pending_upload = (
        db.query(UploadHistory)
        .filter(
            UploadHistory.user_id == current_user.id,
            UploadHistory.status == "pending",
        )
        .order_by(UploadHistory.created_at.desc())
        .first()
    )
    if pending_upload:
        pending_upload.status = "verified"
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
    CSV sales history import —
      • Match each row to an EXISTING product (fuzzy name match)
      • Create SalesHistory records only
      • NEVER create new products or modify current_stock
    """
    # Load all user's products once for fuzzy matching
    user_products = db.query(Product).filter(Product.user_id == user.id).all()

    sales_created = 0
    products_matched = 0
    products_skipped = 0
    matched_ids = set()

    for item in request.verified_data:
        if not item.name or not item.name.strip():
            products_skipped += 1
            continue

        # Try exact match first, then fuzzy
        product = (
            db.query(Product)
            .filter(Product.user_id == user.id, Product.name == item.name)
            .first()
        )

        if not product:
            product = _fuzzy_match_product(item.name, user_products)

        if not product:
            products_skipped += 1
            continue

        # Track unique matched products
        if product.id not in matched_ids:
            matched_ids.add(product.id)
            products_matched += 1

        # Create sales history record if date and quantity provided
        if item.quantity and item.quantity > 0:
            try:
                sale_date = date.fromisoformat(item.date) if item.date else date.today()
            except ValueError:
                sale_date = date.today()

            sales_record = SalesHistory(
                product_id=product.id,
                date=sale_date,
                quantity=item.quantity,
                revenue=(item.quantity * item.price) if item.price else None,
            )
            db.add(sales_record)
            sales_created += 1

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
    Image/OCR inventory import —
      • Create or update products with stock levels from OCR
      • Do NOT create sales records (inventory snapshot ≠ a sale)
      • Auto-create ProductBatch if expiry_date is provided
    """
    from models.product_batch import ProductBatch

    products_created = 0

    for item in request.verified_data:
        if not item.name or not item.name.strip():
            continue

        # Parse expiry_date if provided
        expiry = None
        if item.expiry_date:
            try:
                expiry = date.fromisoformat(item.expiry_date)
            except ValueError:
                pass

        existing = (
            db.query(Product)
            .filter(Product.user_id == user.id, Product.name == item.name)
            .first()
        )

        if existing:
            # Update stock and price from OCR
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
                # Create a new batch for the updated stock
                stock = item.current_stock or item.quantity or 0
                if stock > 0:
                    batch = ProductBatch(
                        product_id=existing.id,
                        batch_number=f"BATCH-{existing.name[:3].upper()}-{db.query(ProductBatch).filter(ProductBatch.product_id == existing.id).count() + 1:03d}",
                        quantity=stock,
                        expiry_date=expiry,
                        purchase_date=date.today(),
                        unit_cost=existing.unit_cost or 0,
                    )
                    db.add(batch)
        else:
            product = Product(
                user_id=user.id,
                name=item.name,
                category=item.category,
                unit=item.unit or "units",
                current_stock=item.current_stock or item.quantity or 0,
                reorder_point=item.reorder_point or 0,
                unit_cost=item.price or 0,
                supplier_name=item.supplier_name,
                expiry_date=expiry,
            )
            db.add(product)
            db.commit()
            db.refresh(product)
            products_created += 1

            # Auto-create batch if expiry_date provided
            stock = product.current_stock or 0
            if expiry and stock > 0:
                batch = ProductBatch(
                    product_id=product.id,
                    batch_number=f"BATCH-{product.name[:3].upper()}-001",
                    quantity=stock,
                    expiry_date=expiry,
                    purchase_date=date.today(),
                    unit_cost=product.unit_cost or 0,
                )
                db.add(batch)

    db.commit()

    return VerifyResponse(
        products_created=products_created,
        sales_records_created=0,
        inventory_updated=True,
        forecast_triggered=False,
    )


def _handle_manual_import(request: VerifyRequest, user: User, db: Session) -> VerifyResponse:
    """
    Manual / legacy import — keeps backwards compatibility.
    Creates products AND sales records (original behavior).
    Auto-creates ProductBatch if expiry_date is provided.
    """
    from models.product_batch import ProductBatch

    products_created = 0
    sales_created = 0

    for item in request.verified_data:
        # Parse expiry_date if provided
        expiry = None
        if item.expiry_date:
            try:
                expiry = date.fromisoformat(item.expiry_date)
            except ValueError:
                pass

        existing = (
            db.query(Product)
            .filter(Product.user_id == user.id, Product.name == item.name)
            .first()
        )

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
                # Also create a batch for existing products with expiry
                stock = item.current_stock or item.quantity or 0
                if stock > 0:
                    batch = ProductBatch(
                        product_id=product.id,
                        batch_number=f"BATCH-{product.name[:3].upper()}-{db.query(ProductBatch).filter(ProductBatch.product_id == product.id).count() + 1:03d}",
                        quantity=stock,
                        expiry_date=expiry,
                        purchase_date=date.today(),
                        unit_cost=product.unit_cost or 0,
                    )
                    db.add(batch)
        else:
            product = Product(
                user_id=user.id,
                name=item.name,
                category=item.category,
                unit=item.unit or "units",
                current_stock=item.current_stock or item.quantity or 0,
                reorder_point=item.reorder_point or 0,
                unit_cost=item.price or 0,
                supplier_name=item.supplier_name,
                expiry_date=expiry,
            )
            db.add(product)
            db.commit()
            db.refresh(product)
            products_created += 1

            # Auto-create batch if expiry_date provided
            stock = product.current_stock or 0
            if expiry and stock > 0:
                batch = ProductBatch(
                    product_id=product.id,
                    batch_number=f"BATCH-{product.name[:3].upper()}-001",
                    quantity=stock,
                    expiry_date=expiry,
                    purchase_date=date.today(),
                    unit_cost=product.unit_cost or 0,
                )
                db.add(batch)

        if item.date and item.quantity:
            try:
                sale_date = date.fromisoformat(item.date)
            except ValueError:
                sale_date = date.today()

            sales_record = SalesHistory(
                product_id=product.id,
                date=sale_date,
                quantity=item.quantity,
                revenue=(item.quantity * item.price) if item.price else None,
            )
            db.add(sales_record)
            sales_created += 1

    db.commit()

    return VerifyResponse(
        products_created=products_created,
        sales_records_created=sales_created,
        inventory_updated=True,
        forecast_triggered=True,
    )
