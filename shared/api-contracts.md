# StockSense — API Contracts

> Single source of truth for all REST API endpoints.
> Frontend (Agent 1) consumes these. Backend (Agent 2) implements these.

**Base URL:** `http://localhost:8000/api`
**Auth:** JWT Bearer token in `Authorization` header (except register/login)
**Content-Type:** `application/json` (except file uploads)

---

## 1. Authentication

### POST /api/auth/register

**Request:**
```json
{
  "shop_name": "Priya Medical Store",
  "business_type": "pharmacy",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "language": "ta",
  "phone": "+919876543210",
  "email": "priya@example.com",
  "password": "securepassword"
}
```
**Response (201):**
```json
{
  "user": {
    "id": 1,
    "shop_name": "Priya Medical Store",
    "business_type": "pharmacy",
    "city": "Chennai",
    "state": "Tamil Nadu",
    "language": "ta",
    "phone": "+919876543210"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### POST /api/auth/login

**Request:**
```json
{
  "phone": "+919876543210",
  "password": "securepassword"
}
```
**Response (200):** Same as register response.

---

## 2. Data Upload

### POST /api/upload/csv
**Content-Type:** `multipart/form-data`
**Body:** `file` (CSV/Excel)

**Response (200):**
```json
{
  "products": [
    {"name": "Paracetamol", "date": "2026-03-01", "quantity": 50, "price": 12.5, "confidence": 1.0},
    {"name": "ORS Sachets", "date": "2026-03-01", "quantity": 30, "price": 8.0, "confidence": 1.0}
  ],
  "rows_parsed": 150,
  "columns_detected": ["product_name", "date", "quantity", "unit_price"],
  "needs_verification": true
}
```

### POST /api/upload/image
**Content-Type:** `multipart/form-data`
**Body:** `image` (JPEG/PNG)

**Response (200):**
```json
{
  "extracted_data": [
    {"name": "पेरासिटामोल", "date": "12 Mar", "quantity": 50, "price": 12.5, "confidence": 0.92},
    {"name": "ORS", "date": "12/3", "quantity": 30, "price": null, "confidence": 0.65}
  ],
  "overall_confidence": 0.87,
  "needs_verification": true
}
```

### POST /api/upload/verify

**Request:**
```json
{
  "verified_data": [
    {"name": "Paracetamol 500mg", "date": "2026-03-12", "quantity": 50, "price": 12.5, "category": "medicines"},
    {"name": "ORS Sachets", "date": "2026-03-12", "quantity": 30, "price": 8.0, "category": "medicines"}
  ]
}
```
**Response (200):**
```json
{
  "products_created": 2,
  "sales_records_created": 2,
  "inventory_updated": true,
  "forecast_triggered": true
}
```

---

## 3. Inventory

### GET /api/inventory
**Query:** `?category=medicines&status=low_stock&page=1&per_page=20`

**Response (200):**
```json
{
  "products": [
    {
      "id": 1,
      "name": "Paracetamol 500mg",
      "category": "medicines",
      "unit": "strips",
      "current_stock": 45,
      "reorder_point": 100,
      "safety_stock": 30,
      "unit_cost": 12.5,
      "supplier_name": "Mehta Pharma",
      "supplier_contact": "+919800000001",
      "lead_time_days": 3,
      "expiry_date": "2027-06-15",
      "status": "low_stock",
      "days_remaining": 4.5,
      "updated_at": "2026-04-11T10:30:00Z"
    }
  ],
  "total": 52,
  "page": 1,
  "per_page": 20
}
```

### GET /api/inventory/:id
**Response:** Single product object (same shape as above).

### POST /api/inventory
**Request:** Product creation object (name, category, unit, current_stock, reorder_point, etc.)
**Response (201):** Created product object.

### PUT /api/inventory/:id
**Request:** Partial update fields + optional stock movement:
```json
{
  "current_stock": 35,
  "movement": {
    "type": "sale",
    "quantity": -10,
    "notes": "Walk-in customer"
  }
}
```
**Response (200):** Updated product object + any triggered alerts.

### GET /api/inventory/health
**Response (200):**
```json
{
  "total_skus": 52,
  "below_reorder": 8,
  "stockout_risk": 3,
  "out_of_stock": 1,
  "forecast_accuracy": 89.2,
  "total_inventory_value": 245600.00,
  "health_distribution": {
    "healthy": 41,
    "warning": 8,
    "critical": 3
  },
  "health_percentages": {
    "healthy": 78.8,
    "warning": 15.4,
    "critical": 5.8
  }
}
```

### GET /api/inventory/expiring?days=7
**Response (200):**
```json
{
  "expiring_products": [
    {"id": 5, "name": "Cough Syrup", "expiry_date": "2026-04-18", "current_stock": 120, "forecast_demand": 30, "risk": "high"}
  ],
  "count": 1
}
```

---

## 4. Forecasting

### GET /api/forecast/:product_id
**Response (200):**
```json
{
  "product_id": 1,
  "product_name": "Paracetamol 500mg",
  "forecast": [
    {"week": "2026-W16", "week_start": "2026-04-13", "low": 60, "likely": 85, "high": 120},
    {"week": "2026-W17", "week_start": "2026-04-20", "low": 55, "likely": 80, "high": 110},
    {"week": "2026-W18", "week_start": "2026-04-27", "low": 70, "likely": 100, "high": 145},
    {"week": "2026-W19", "week_start": "2026-05-04", "low": 65, "likely": 90, "high": 130},
    {"week": "2026-W20", "week_start": "2026-05-11", "low": 60, "likely": 85, "high": 120},
    {"week": "2026-W21", "week_start": "2026-05-18", "low": 58, "likely": 82, "high": 115}
  ],
  "baseline": [75, 75, 75, 75, 75, 75],
  "drivers": "Dengue season active (+25%), Monsoon approaching (+10%), Upward sales trend (+8%)",
  "accuracy": {
    "mape": 11.2,
    "accuracy_pct": 88.8,
    "trend": "improving"
  },
  "data_quality": "sufficient",
  "model_used": "prophet"
}
```

### GET /api/forecast/all
**Response (200):**
```json
{
  "forecasts": [
    {
      "product_id": 1,
      "product_name": "Paracetamol 500mg",
      "next_week_likely": 85,
      "trend": "rising",
      "has_anomaly": false,
      "accuracy_pct": 88.8
    }
  ],
  "total": 52,
  "average_accuracy": 86.5
}
```

### POST /api/forecast/scenario
**Request:**
```json
{
  "product_id": 1,
  "scenario_type": "discount",
  "value": 20
}
```
**Response (200):**
```json
{
  "original_forecast": [
    {"week": "2026-W16", "low": 60, "likely": 85, "high": 120}
  ],
  "scenario_forecast": [
    {"week": "2026-W16", "low": 72, "likely": 102, "high": 144}
  ],
  "delta": [
    {"week": "2026-W16", "change_pct": 20.0, "additional_units": 17}
  ],
  "revised_reorder_qty": 240,
  "original_reorder_qty": 200
}
```

---

## 5. Anomalies

### GET /api/anomalies
**Query:** `?severity=critical&dismissed=false`

**Response (200):**
```json
{
  "anomalies": [
    {
      "id": 1,
      "product_id": 1,
      "product_name": "Paracetamol 500mg",
      "date": "2026-04-10",
      "type": "spike",
      "z_score": 2.8,
      "explanation": "Demand is 3× normal this week — possible local illness outbreak.",
      "dismissed": false,
      "created_at": "2026-04-10T14:30:00Z"
    }
  ],
  "count": 1
}
```

### GET /api/anomalies/:product_id
**Response:** Same shape, filtered to product.

---

## 6. Reorder

### GET /api/reorder
**Response (200):**
```json
{
  "summary": {
    "total_items": 8,
    "estimated_total_cost": 12450.00,
    "most_urgent_product": "Paracetamol 500mg",
    "most_urgent_days_remaining": 1.5
  },
  "reorder_list": [
    {
      "product_id": 1,
      "product_name": "Paracetamol 500mg",
      "current_stock": 15,
      "forecast_demand": 85,
      "reorder_qty": 200,
      "days_to_stockout": 1.5,
      "urgency": "high",
      "supplier_name": "Mehta Pharma",
      "supplier_contact": "+919800000001",
      "estimated_cost": 2500.00
    }
  ],
  "grouped_by_supplier": {
    "Mehta Pharma": [{"product_id": 1, "reorder_qty": 200}],
    "Singh Distributors": [{"product_id": 3, "reorder_qty": 50}]
  }
}
```

### GET /api/reorder/export?format=csv
**Response:** CSV file download

### GET /api/reorder/export?format=pdf
**Response:** PDF file download

---

## 7. Alerts

### GET /api/alerts
**Query:** `?severity=critical&dismissed=false&limit=10`

**Response (200):**
```json
{
  "alerts": [
    {
      "id": 1,
      "product_id": 1,
      "product_name": "Paracetamol 500mg",
      "type": "stockout",
      "severity": "critical",
      "title": "OUT OF STOCK: Paracetamol 500mg",
      "message": "Your last 3 units were sold today. Dengue season is currently active.",
      "dismissed": false,
      "sent_whatsapp": true,
      "created_at": "2026-04-11T09:15:00Z"
    }
  ],
  "counts": {
    "critical": 2,
    "warning": 5,
    "info": 3,
    "total": 10
  }
}
```

### PUT /api/alerts/:id/dismiss
**Response (200):** `{ "dismissed": true }`

---

## 8. Settings

### GET /api/notifications/settings
**Response (200):**
```json
{
  "stockout_alerts": true,
  "low_stock_alerts": true,
  "daily_briefing": true,
  "daily_briefing_time": "08:00",
  "weekly_summary": true,
  "weekly_summary_day": "sunday",
  "seasonal_warnings": true,
  "seasonal_advance_days": 14,
  "anomaly_alerts": true,
  "channel_in_app": true,
  "channel_whatsapp": true,
  "channel_email": false
}
```

### PUT /api/notifications/settings
**Request:** Partial update of above fields.
**Response (200):** Updated settings object.

---

## 9. WhatsApp

### POST /api/whatsapp/connect
**Response (200):**
```json
{
  "status": "waiting_for_scan",
  "qr_code": "data:image/png;base64,..."
}
```

### GET /api/whatsapp/status
**Response (200):**
```json
{
  "connected": true,
  "phone_number": "+919876543210",
  "last_activity": "2026-04-11T08:00:00Z"
}
```

### POST /api/whatsapp/webhook (called by WhatsApp bot sidecar)
**Request:**
```json
{
  "from": "+919876543210",
  "command": "REORDER",
  "raw_message": "REORDER"
}
```
**Response (200):**
```json
{
  "reply": "📦 Reorder List:\n1. Paracetamol 200 units\n2. ORS 150 units..."
}
```
