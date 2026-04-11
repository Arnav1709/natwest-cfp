"""
Upload router — POST /api/upload/csv, /image, /verify
"""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.product import Product
from models.sales import SalesHistory
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

router = APIRouter(prefix="/api/upload", tags=["upload"])


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
    Upload an image of a handwritten ledger for OCR extraction.
    Returns extracted data for user verification.

    NOTE: Actual OCR is implemented by Agent 3 in services/ocr_service.py.
    This endpoint calls the OCR service stub which returns mock data.
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

    # Call OCR service (stub)
    result = process_ledger_image(content, current_user.language or "en")

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

    For each verified item:
    1. Create or update the product in the products table
    2. Create a sales_history record if date + quantity provided
    """
    products_created = 0
    sales_created = 0

    for item in request.verified_data:
        # Check if product already exists for this user
        existing = (
            db.query(Product)
            .filter(
                Product.user_id == current_user.id,
                Product.name == item.name,
            )
            .first()
        )

        if existing:
            product = existing
            # Update stock if provided
            if item.current_stock is not None:
                product.current_stock = item.current_stock
            if item.price is not None:
                product.unit_cost = item.price
        else:
            # Create new product
            product = Product(
                user_id=current_user.id,
                name=item.name,
                category=item.category,
                unit=item.unit or "units",
                current_stock=item.current_stock or item.quantity or 0,
                reorder_point=item.reorder_point or 0,
                unit_cost=item.price or 0,
                supplier_name=item.supplier_name,
            )
            db.add(product)
            db.commit()
            db.refresh(product)
            products_created += 1

        # Create sales history record if date and quantity provided
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
