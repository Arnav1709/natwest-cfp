"""
Reorder router — GET /api/reorder, GET /api/reorder/export
"""

import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import pandas as pd

from database import get_db
from models.user import User
from utils.auth import get_current_user
from schemas.reorder import ReorderResponse
from services.reorder_service import generate_reorder_list
from utils.pdf_generator import generate_reorder_pdf
from cache import cache_get, cache_set

router = APIRouter(prefix="/api/reorder", tags=["reorder"])


@router.get("", response_model=ReorderResponse)
def get_reorder_list(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get AI-generated reorder list.
    Products ranked by urgency, grouped by supplier.
    """
    cached = cache_get(current_user.id, "reorder")
    if cached is not None:
        return cached

    result = generate_reorder_list(db, current_user.id)

    cache_set(current_user.id, "reorder", result)
    return result


@router.get("/export")
def export_reorder(
    format: str = Query(default="csv", pattern="^(csv|pdf)$"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Export reorder list as CSV or PDF.
    """
    # Reuse cached reorder data if available
    reorder_data = cache_get(current_user.id, "reorder")
    if reorder_data is None:
        reorder_data = generate_reorder_list(db, current_user.id)
        cache_set(current_user.id, "reorder", reorder_data)

    if format == "csv":
        # Generate CSV
        rows = []
        for item in reorder_data.reorder_list:
            rows.append({
                "Product": item.product_name,
                "Current Stock": item.current_stock,
                "Forecast Demand": item.forecast_demand,
                "Reorder Qty": item.reorder_qty,
                "Urgency": item.urgency,
                "Days to Stockout": item.days_to_stockout,
                "Supplier": item.supplier_name or "N/A",
                "Supplier Contact": item.supplier_contact or "N/A",
                "Estimated Cost (₹)": item.estimated_cost,
            })

        df = pd.DataFrame(rows)
        buffer = io.StringIO()
        df.to_csv(buffer, index=False)

        return StreamingResponse(
            io.BytesIO(buffer.getvalue().encode("utf-8")),
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename=reorder_list_{date.today().isoformat()}.csv"
            },
        )

    elif format == "pdf":
        # Generate PDF
        reorder_dicts = [item.model_dump() for item in reorder_data.reorder_list]
        summary_dict = reorder_data.summary.model_dump()

        pdf_bytes = generate_reorder_pdf(
            reorder_list=reorder_dicts,
            summary=summary_dict,
            shop_name=current_user.shop_name,
        )

        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=reorder_list_{date.today().isoformat()}.pdf"
            },
        )
