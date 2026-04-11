"""
WhatsApp router — POST /api/whatsapp/connect, GET /api/whatsapp/status, POST /api/whatsapp/webhook
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from models.notification import NotificationPreference
from utils.auth import get_current_user
from services.reorder_service import generate_reorder_list

router = APIRouter(prefix="/api/whatsapp", tags=["whatsapp"])

# In-memory WhatsApp connection state (for demo/hackathon)
_whatsapp_state = {
    "connected": False,
    "phone_number": None,
    "last_activity": None,
}


class WhatsAppConnectResponse(BaseModel):
    status: str
    qr_code: str = ""


class WhatsAppStatusResponse(BaseModel):
    connected: bool = False
    phone_number: Optional[str] = None
    last_activity: Optional[str] = None


class WebhookRequest(BaseModel):
    """Inbound webhook from WhatsApp bot sidecar."""
    from_number: str  # renamed from 'from' since it's a Python keyword
    command: str
    raw_message: str = ""


class WebhookResponse(BaseModel):
    reply: str


@router.post("/connect", response_model=WhatsAppConnectResponse)
def connect_whatsapp(
    current_user: User = Depends(get_current_user),
):
    """
    Initiate WhatsApp QR code pairing.
    In production, this would call the WhatsApp bot sidecar to generate a QR code.
    For the hackathon demo, returns a stub response.
    """
    # TODO: Call WhatsApp bot sidecar at WHATSAPP_BOT_URL/generate-qr
    return WhatsAppConnectResponse(
        status="waiting_for_scan",
        qr_code="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    )


@router.get("/status", response_model=WhatsAppStatusResponse)
def get_whatsapp_status(
    current_user: User = Depends(get_current_user),
):
    """Get current WhatsApp connection status."""
    return WhatsAppStatusResponse(**_whatsapp_state)


@router.post("/webhook", response_model=WebhookResponse)
def whatsapp_webhook(
    request: WebhookRequest,
    db: Session = Depends(get_db),
):
    """
    Handle inbound WhatsApp commands from the bot sidecar.
    Supports: REORDER, LIST, REPORT, STATUS, STOP, HELP
    """
    command = request.command.upper().strip()

    # Find user by phone number
    user = db.query(User).filter(User.phone == request.from_number).first()
    if not user:
        return WebhookResponse(reply="❌ User not found. Please register on StockSense first.")

    if command == "REORDER":
        reorder_data = generate_reorder_list(db, user.id)
        if not reorder_data.reorder_list:
            return WebhookResponse(reply="✅ No items need reordering right now!")

        lines = ["📦 *StockSense Reorder List*\n"]
        for idx, item in enumerate(reorder_data.reorder_list, 1):
            lines.append(
                f"{idx}. *{item.product_name}* — {int(item.reorder_qty)} units"
                f" ({item.urgency.upper()})"
            )
        lines.append(f"\n💰 Estimated total: ₹{reorder_data.summary.estimated_total_cost:,.0f}")
        return WebhookResponse(reply="\n".join(lines))

    elif command == "LIST" or command == "STATUS":
        from models.product import Product
        products = db.query(Product).filter(Product.user_id == user.id).all()
        if not products:
            return WebhookResponse(reply="📋 No products in inventory yet.")

        healthy = sum(1 for p in products if (p.current_stock or 0) > (p.reorder_point or 0))
        low = sum(1 for p in products if 0 < (p.current_stock or 0) <= (p.reorder_point or 0))
        out = sum(1 for p in products if (p.current_stock or 0) <= 0)

        reply = (
            f"📋 *StockSense Status*\n\n"
            f"✅ {healthy} products — Healthy\n"
            f"🟡 {low} products — Low Stock\n"
            f"🔴 {out} products — Out of Stock\n\n"
            f"Total SKUs: {len(products)}"
        )
        return WebhookResponse(reply=reply)

    elif command == "REPORT":
        return WebhookResponse(
            reply=(
                "📊 *StockSense Forecast Report*\n\n"
                "Visit your dashboard for detailed forecasts:\n"
                "🔗 http://localhost:5173/dashboard/forecasting\n\n"
                "Reply REORDER for reorder list."
            )
        )

    elif command == "STOP":
        prefs = (
            db.query(NotificationPreference)
            .filter(NotificationPreference.user_id == user.id)
            .first()
        )
        if prefs:
            prefs.channel_whatsapp = False
            db.commit()
        return WebhookResponse(reply="🔇 WhatsApp notifications paused. Send START to resume.")

    elif command == "HELP":
        return WebhookResponse(
            reply=(
                "🤖 *StockSense Commands*\n\n"
                "REORDER — Get reorder list\n"
                "LIST — Inventory status\n"
                "STATUS — Stock health summary\n"
                "REPORT — Forecast report link\n"
                "STOP — Pause notifications\n"
                "HELP — Show this message"
            )
        )

    else:
        return WebhookResponse(
            reply=f"❓ Unknown command: {command}\n\nSend HELP to see available commands."
        )
