"""
Reorder router — GET /api/reorder, GET /api/reorder/export, POST /api/reorder/send-order
"""

import io
import logging
from datetime import date
from typing import List, Optional

import httpx
from fastapi import APIRouter, Depends, Query, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
import pandas as pd

from config import settings
from database import get_db
from models.user import User
from utils.auth import get_current_user
from schemas.reorder import ReorderResponse
from services.reorder_service import generate_reorder_list
from utils.pdf_generator import generate_reorder_pdf
from cache import cache_get, cache_set

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/reorder", tags=["reorder"])


# ── Request / Response schemas for send-order ──

class SendOrderItem(BaseModel):
    product_name: str
    reorder_qty: float
    estimated_cost: float = 0.0


class SendOrderRequest(BaseModel):
    supplier_name: str
    supplier_contact: str  # phone number like "919876543210"
    items: List[SendOrderItem]


class SendOrderResponse(BaseModel):
    success: bool
    message: str = ""
    message_id: Optional[str] = None


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
    reorder_data = cache_get(current_user.id, "reorder")
    if reorder_data is None:
        reorder_data = generate_reorder_list(db, current_user.id)
        cache_set(current_user.id, "reorder", reorder_data)

    if format == "csv":
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


@router.post("/send-order", response_model=SendOrderResponse)
def send_reorder_via_whatsapp(
    body: SendOrderRequest,
    current_user: User = Depends(get_current_user),
):
    """
    Send a reorder message to a supplier via WhatsApp.
    Calls the WhatsApp bot sidecar POST /send endpoint.
    """
    if not body.supplier_contact:
        raise HTTPException(status_code=400, detail="Supplier contact number is required.")

    # Build a human-readable reorder message
    lines = [
        "📦 *StockSense Reorder Request*",
        "",
        f"Hi *{body.supplier_name}*,",
        "We need to reorder the following items:",
        "",
    ]
    total_cost = 0.0
    for idx, item in enumerate(body.items, 1):
        lines.append(f"{idx}. *{item.product_name}* — {int(item.reorder_qty)} units")
        total_cost += item.estimated_cost

    lines.append("")
    lines.append(f"💰 Estimated total: ₹{total_cost:,.0f}")
    lines.append("")
    lines.append("Please confirm availability and delivery date.")
    lines.append(f"— {current_user.shop_name or 'StockSense'} (Auto-Reorder)")

    message = "\n".join(lines)

    # Send via WhatsApp bot sidecar
    bot_url = settings.WHATSAPP_BOT_URL
    try:
        resp = httpx.post(
            f"{bot_url}/send",
            json={"phone": body.supplier_contact, "message": message},
            timeout=10.0,
        )
        data = resp.json()
        if resp.status_code == 200 and data.get("success"):
            logger.info(
                "Reorder message sent to %s (%s) by user %s",
                body.supplier_name, body.supplier_contact, current_user.id,
            )
            return SendOrderResponse(
                success=True,
                message="Order sent successfully via WhatsApp!",
                message_id=data.get("messageId"),
            )
        else:
            logger.warning("WhatsApp send failed for reorder: %s", data)
            return SendOrderResponse(
                success=False,
                message=data.get("error", "WhatsApp bot returned an error."),
            )
    except httpx.ConnectError:
        logger.warning("WhatsApp bot sidecar unreachable at %s", bot_url)
        return SendOrderResponse(
            success=False,
            message="WhatsApp bot is offline. Please connect WhatsApp first in Settings.",
        )
    except Exception as e:
        logger.error("Reorder send error: %s", e)
        return SendOrderResponse(
            success=False,
            message=f"Failed to send: {str(e)}",
        )
