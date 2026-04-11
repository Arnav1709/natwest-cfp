# StockSense — Sequence Diagrams

> **Detailed interaction flows for all major system operations.**
> Companion to the [High-Level Design (HLD)](./HLD.md)

---

## Table of Contents

1. [User Onboarding](#1-user-onboarding)
2. [CSV Data Upload & Verification](#2-csv-data-upload--verification)
3. [Handwritten Ledger OCR Flow](#3-handwritten-ledger-ocr-flow)
4. [Forecast Generation](#4-forecast-generation)
5. [Dashboard Load (Overview)](#5-dashboard-load-overview)
6. [Anomaly Detection & Alert Dispatch](#6-anomaly-detection--alert-dispatch)
7. [Scenario Planning (What-If)](#7-scenario-planning-what-if)
8. [Reorder List Generation & Export](#8-reorder-list-generation--export)
9. [WhatsApp Daily Briefing (Scheduled)](#9-whatsapp-daily-briefing-scheduled)
10. [WhatsApp Inbound Command](#10-whatsapp-inbound-command)
11. [Stock Movement Update](#11-stock-movement-update)
12. [Forecast Accuracy Tracking](#12-forecast-accuracy-tracking)

---

## 1. User Onboarding

```
┌────────┐          ┌──────────┐          ┌──────────┐          ┌──────────┐
│ User   │          │ React UI │          │ FastAPI  │          │ Database │
│(Browser)│          │          │          │          │          │          │
└───┬────┘          └────┬─────┘          └────┬─────┘          └────┬─────┘
    │                    │                     │                     │
    │  1. Open /onboarding                     │                     │
    │───────────────────>│                     │                     │
    │                    │                     │                     │
    │  2. Select language (e.g. Hindi)         │                     │
    │───────────────────>│                     │                     │
    │                    │  3. Save to context │                     │
    │                    │─ ─ ─ ─ (local) ─ ─>│                     │
    │                    │                     │                     │
    │  4. Select business type (Pharmacy)      │                     │
    │───────────────────>│                     │                     │
    │                    │                     │                     │
    │  5. Enter shop name, city, state         │                     │
    │───────────────────>│                     │                     │
    │                    │                     │                     │
    │  6. Submit          │                     │                     │
    │───────────────────>│                     │                     │
    │                    │  7. POST /api/auth/register              │
    │                    │────────────────────>│                     │
    │                    │                     │  8. INSERT users    │
    │                    │                     │────────────────────>│
    │                    │                     │                     │
    │                    │                     │  9. Return user_id  │
    │                    │                     │<────────────────────│
    │                    │                     │                     │
    │                    │                     │  10. Seed lookup    │
    │                    │                     │      tables if      │
    │                    │                     │      business_type  │
    │                    │                     │      = pharmacy     │
    │                    │                     │────────────────────>│
    │                    │                     │                     │
    │                    │  11. JWT token +    │                     │
    │                    │      user profile   │                     │
    │                    │<────────────────────│                     │
    │                    │                     │                     │
    │  12. Redirect to   │                     │                     │
    │      /upload       │                     │                     │
    │<───────────────────│                     │                     │
    │                    │                     │                     │
```

---

## 2. CSV Data Upload & Verification

```
┌────────┐          ┌──────────┐          ┌──────────┐          ┌──────────┐
│ User   │          │ React UI │          │ FastAPI  │          │ Database │
└───┬────┘          └────┬─────┘          └────┬─────┘          └────┬─────┘
    │                    │                     │                     │
    │  1. Select CSV file│                     │                     │
    │───────────────────>│                     │                     │
    │                    │                     │                     │
    │                    │  2. POST /api/upload/csv                 │
    │                    │     (multipart/form-data)                │
    │                    │────────────────────>│                     │
    │                    │                     │                     │
    │                    │                     │  3. Parse CSV       │
    │                    │                     │     (csv_parser.py) │
    │                    │                     │                     │
    │                    │                     │  4. Auto-detect     │
    │                    │                     │     columns:        │
    │                    │                     │     product, date,  │
    │                    │                     │     quantity, price │
    │                    │                     │                     │
    │                    │                     │  5. Store in temp   │
    │                    │                     │     staging table   │
    │                    │                     │────────────────────>│
    │                    │                     │                     │
    │                    │  6. Return parsed   │                     │
    │                    │     data preview    │                     │
    │                    │     + column mapping│                     │
    │                    │     + needs_verify  │                     │
    │                    │<────────────────────│                     │
    │                    │                     │                     │
    │  7. Show editable  │                     │                     │
    │     verification   │                     │                     │
    │     table          │                     │                     │
    │<───────────────────│                     │                     │
    │                    │                     │                     │
    │  8. User reviews,  │                     │                     │
    │     corrects rows, │                     │                     │
    │     confirms       │                     │                     │
    │───────────────────>│                     │                     │
    │                    │                     │                     │
    │                    │  9. POST /api/upload/verify              │
    │                    │     { verified_data, corrections }       │
    │                    │────────────────────>│                     │
    │                    │                     │                     │
    │                    │                     │  10. INSERT products│
    │                    │                     │      & sales_history│
    │                    │                     │────────────────────>│
    │                    │                     │                     │
    │                    │                     │  11. Trigger        │
    │                    │                     │      forecast       │
    │                    │                     │      recalculation  │
    │                    │                     │      (background)   │
    │                    │                     │── ─ ─ ─ ─ ─ ─ ─ ─>│
    │                    │                     │     (async task)    │
    │                    │                     │                     │
    │                    │  12. { products_    │                     │
    │                    │       created: 25,  │                     │
    │                    │       inventory_    │                     │
    │                    │       updated: true}│                     │
    │                    │<────────────────────│                     │
    │                    │                     │                     │
    │  13. Redirect to   │                     │                     │
    │      /dashboard    │                     │                     │
    │<───────────────────│                     │                     │
```

---

## 3. Handwritten Ledger OCR Flow

```
┌────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ User   │     │ React UI │     │ FastAPI  │     │ Gemini   │     │ Database │
└───┬────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
    │               │                │                 │                │
    │  1. Take photo│                │                 │                │
    │  of ledger    │                │                 │                │
    │──────────────>│                │                 │                │
    │               │                │                 │                │
    │               │  2. POST /api/upload/image       │                │
    │               │     (multipart/form-data)        │                │
    │               │───────────────>│                 │                │
    │               │                │                 │                │
    │               │  3. Show       │                 │                │
    │               │     loading    │                 │                │
    │               │     spinner    │                 │                │
    │<──────────────│                │                 │                │
    │               │                │                 │                │
    │               │                │  4. Send image  │                │
    │               │                │     to Gemini   │                │
    │               │                │     Vision API  │                │
    │               │                │────────────────>│                │
    │               │                │                 │                │
    │               │                │                 │  5. OCR:       │
    │               │                │                 │  Extract text  │
    │               │                │                 │  Handle mixed  │
    │               │                │                 │  Hindi/English │
    │               │                │                 │  Parse numbers │
    │               │                │                 │  (बारह = 12)   │
    │               │                │                 │  Parse dates   │
    │               │                │                 │  (12/1, Jan 12)│
    │               │                │                 │                │
    │               │                │  6. Return      │                │
    │               │                │     structured  │                │
    │               │                │     JSON table  │                │
    │               │                │     + confidence│                │
    │               │                │<────────────────│                │
    │               │                │                 │                │
    │               │                │  7. Low-conf    │                │
    │               │                │     cells       │                │
    │               │                │     highlighted │                │
    │               │                │                 │                │
    │               │  8. Return     │                 │                │
    │               │     extracted_ │                 │                │
    │               │     data +     │                 │                │
    │               │     confidence │                 │                │
    │               │     scores     │                 │                │
    │               │<───────────────│                 │                │
    │               │                │                 │                │
    │  9. Show      │                │                 │                │
    │     editable  │                │                 │                │
    │     table     │                │                 │                │
    │     with low- │                │                 │                │
    │     confidence│                │                 │                │
    │     cells     │                │                 │                │
    │     highlighted                │                 │                │
    │<──────────────│                │                 │                │
    │               │                │                 │                │
    │  10. User     │                │                 │                │
    │  corrects &   │                │                 │                │
    │  confirms     │                │                 │                │
    │──────────────>│                │                 │                │
    │               │                │                 │                │
    │               │  11. POST /api/upload/verify     │                │
    │               │───────────────>│                 │                │
    │               │                │                 │                │
    │               │                │  12. INSERT     │                │
    │               │                │      products   │                │
    │               │                │      & sales    │                │
    │               │                │────────────────────────────────>│
    │               │                │                 │                │
    │               │                │  13. Trigger    │                │
    │               │                │      forecast   │                │
    │               │                │      (async)    │                │
    │               │                │                 │                │
    │               │  14. Success   │                 │                │
    │               │<───────────────│                 │                │
    │               │                │                 │                │
    │  15. Redirect │                │                 │                │
    │  to /dashboard│                │                 │                │
    │<──────────────│                │                 │                │
```

---

## 4. Forecast Generation

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Trigger  │     │ FastAPI  │     │ Prophet  │     │ Gemini   │     │ Database │
│ (API/    │     │ Forecast │     │ Engine   │     │ (NLP)    │     │          │
│  Task)   │     │ Service  │     │ (Local)  │     │          │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                 │                │
     │  1. Trigger    │                │                 │                │
     │  recalculate   │                │                 │                │
     │  (product_id)  │                │                 │                │
     │───────────────>│                │                 │                │
     │                │                │                 │                │
     │                │  2. Fetch sales_history          │                │
     │                │     for product_id               │                │
     │                │─────────────────────────────────────────────────>│
     │                │                │                 │                │
     │                │  3. Return sales records         │                │
     │                │<─────────────────────────────────────────────────│
     │                │                │                 │                │
     │                │  4. Check data │                 │                │
     │                │     sufficiency│                 │                │
     │                │     (>= 8 wks?)│                 │                │
     │                │                │                 │                │
     │         ┌──────┴──────┐         │                 │                │
     │         │ >= 8 weeks  │         │                 │                │
     │         └──────┬──────┘         │                 │                │
     │                │                │                 │                │
     │                │  5. Fit Prophet│                 │                │
     │                │     model +   │                 │                │
     │                │     predict   │                 │                │
     │                │     6 weeks   │                 │                │
     │                │───────────────>│                 │                │
     │                │                │                 │                │
     │                │                │  6. Return:     │                │
     │                │                │  yhat, yhat_    │                │
     │                │                │  lower, yhat_   │                │
     │                │                │  upper,         │                │
     │                │                │  residuals      │                │
     │                │<───────────────│                 │                │
     │                │                │                 │                │
     │                │  7. Compute naive baseline       │                │
     │                │     (same as last period)        │                │
     │                │                │                 │                │
     │                │  8. Fetch external factors       │                │
     │                │     (disease_seasons,            │                │
     │                │      festival_calendar)          │                │
     │                │─────────────────────────────────────────────────>│
     │                │                │                 │                │
     │                │  9. Return lookup data           │                │
     │                │<─────────────────────────────────────────────────│
     │                │                │                 │                │
     │                │  10. Apply     │                 │                │
     │                │      boosts:   │                 │                │
     │                │      disease   │                 │                │
     │                │      season,   │                 │                │
     │                │      festival, │                 │                │
     │                │      weather   │                 │                │
     │                │                │                 │                │
     │                │  11. Z-score   │                 │                │
     │                │      anomaly   │                 │                │
     │                │      detection │                 │                │
     │                │      on        │                 │                │
     │                │      residuals │                 │                │
     │                │                │                 │                │
     │                │  12. Generate  │                 │                │
     │                │      explanation                 │                │
     │                │      prompt    │                 │                │
     │                │────────────────────────────────>│                │
     │                │                │                 │                │
     │                │                │                 │  13. NLP:     │
     │                │                │                 │  "Demand for  │
     │                │                │                 │  Paracetamol  │
     │                │                │                 │  expected to  │
     │                │                │                 │  rise 40%..." │
     │                │                │                 │                │
     │                │  14. Return    │                 │                │
     │                │      explanation                 │                │
     │                │<────────────────────────────────│                │
     │                │                │                 │                │
     │                │  15. Store forecasts, anomalies  │                │
     │                │─────────────────────────────────────────────────>│
     │                │                │                 │                │
     │                │  16. Trigger alerts if needed    │                │
     │                │      (stockout risk, anomaly)    │                │
     │                │─────────────────────────────────────────────────>│
     │                │                │                 │                │
     │                │  17. Invalidate cache            │                │
     │                │                │                 │                │
     │  18. Done      │                │                 │                │
     │<───────────────│                │                 │                │
```

### 4a. Forecast Fallback (< 8 weeks data)

```
     │         ┌─────────────┐         │                 │                │
     │         │ < 8 weeks   │         │                 │                │
     │         └──────┬──────┘         │                 │                │
     │                │                │                 │                │
     │                │  Alt: Simple Moving Average      │                │
     │                │  - Use last N weeks avg          │                │
     │                │  - Wider confidence bands        │                │
     │                │  - Label: "Limited data —        │                │
     │                │    forecast is approximate"      │                │
     │                │                │                 │                │
     │                │  Continue from step 7...         │                │
```

---

## 5. Dashboard Load (Overview)

```
┌────────┐          ┌──────────┐          ┌──────────┐          ┌──────────┐
│ User   │          │ React UI │          │ FastAPI  │          │ Redis /  │
│(Browser)│          │          │          │          │          │ Database │
└───┬────┘          └────┬─────┘          └────┬─────┘          └────┬─────┘
    │                    │                     │                     │
    │  1. Navigate to    │                     │                     │
    │     /dashboard     │                     │                     │
    │───────────────────>│                     │                     │
    │                    │                     │                     │
    │                    │  ┌─ PARALLEL REQUESTS ───────────────┐    │
    │                    │  │                                   │    │
    │                    │  2a. GET /api/inventory/health       │    │
    │                    │─────────────────────>│               │    │
    │                    │                      │  Check cache  │    │
    │                    │                      │──────────────>│    │
    │                    │                      │  Cache HIT    │    │
    │                    │                      │<──────────────│    │
    │                    │  KPI cards data      │               │    │
    │                    │<─────────────────────│               │    │
    │                    │                      │               │    │
    │                    │  2b. GET /api/alerts (last 5)        │    │
    │                    │─────────────────────>│               │    │
    │                    │                      │  Query DB     │    │
    │                    │                      │──────────────>│    │
    │                    │  Alert feed          │               │    │
    │                    │<─────────────────────│               │    │
    │                    │                      │               │    │
    │                    │  2c. GET /api/forecast/all (summary) │    │
    │                    │─────────────────────>│               │    │
    │                    │                      │  Check cache  │    │
    │                    │                      │──────────────>│    │
    │                    │  Forecast summary    │               │    │
    │                    │<─────────────────────│               │    │
    │                    │  │                                   │    │
    │                    │  └───────────────────────────────────┘    │
    │                    │                     │                     │
    │  3. Render:        │                     │                     │
    │  - KPI cards       │                     │                     │
    │  - Health donut    │                     │                     │
    │  - Alert feed      │                     │                     │
    │  - Quick actions   │                     │                     │
    │  - Intelligence    │                     │                     │
    │    banner          │                     │                     │
    │<───────────────────│                     │                     │
    │                    │                     │                     │
    │  4. (Optional)     │                     │                     │
    │  Click product     │                     │                     │
    │  in alert →        │                     │                     │
    │  /forecast/:id     │                     │                     │
    │───────────────────>│                     │                     │
    │                    │  5. GET /api/forecast/:id                │
    │                    │─────────────────────>│                     │
    │                    │                     │                     │
    │                    │  6. Forecast chart   │                     │
    │                    │     data (low,       │                     │
    │                    │     likely, high,    │                     │
    │                    │     baseline,        │                     │
    │                    │     drivers,         │                     │
    │                    │     accuracy)        │                     │
    │                    │<─────────────────────│                     │
    │                    │                     │                     │
    │  7. Render Plotly   │                     │                     │
    │     forecast chart  │                     │                     │
    │<───────────────────│                     │                     │
```

---

## 6. Anomaly Detection & Alert Dispatch

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Forecast │     │ Anomaly  │     │ Alert    │     │ WhatsApp │     │ Database │
│ Service  │     │ Service  │     │ Service  │     │ Service  │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                 │                │
     │  1. New forecast                │                 │                │
     │     generated   │                │                 │                │
     │     with        │                │                 │                │
     │     residuals   │                │                 │                │
     │───────────────>│                │                 │                │
     │                │                │                 │                │
     │                │  2. Calculate  │                 │                │
     │                │     Z-scores:  │                 │                │
     │                │     z = (actual│                 │                │
     │                │     - predicted│                 │                │
     │                │     ) / σ      │                 │                │
     │                │                │                 │                │
     │                │  3. Check      │                 │                │
     │                │     thresholds:│                 │                │
     │                │     |z| > 2.0? │                 │                │
     │                │                │                 │                │
     │         ┌──────┴──────┐         │                 │                │
     │         │ Anomaly     │         │                 │                │
     │         │ Detected!   │         │                 │                │
     │         └──────┬──────┘         │                 │                │
     │                │                │                 │                │
     │                │  4. Classify:  │                 │                │
     │                │     spike      │                 │                │
     │                │     (z > 2) or │                 │                │
     │                │     drop       │                 │                │
     │                │     (z < -2)   │                 │                │
     │                │                │                 │                │
     │                │  5. Store      │                 │                │
     │                │     anomaly    │                 │                │
     │                │────────────────────────────────────────────────>│
     │                │                │                 │                │
     │                │  6. Create     │                 │                │
     │                │     alert      │                 │                │
     │                │───────────────>│                 │                │
     │                │                │                 │                │
     │                │                │  7. Determine   │                │
     │                │                │     severity:   │                │
     │                │                │     critical /  │                │
     │                │                │     warning /   │                │
     │                │                │     info        │                │
     │                │                │                 │                │
     │                │                │  8. Check user  │                │
     │                │                │     notification│                │
     │                │                │     preferences │                │
     │                │                │────────────────────────────────>│
     │                │                │                 │                │
     │                │                │  9. Store alert │                │
     │                │                │────────────────────────────────>│
     │                │                │                 │                │
     │                │                │  10. Dispatch   │                │
     │                │                │      to WhatsApp│                │
     │                │                │      (if enabled)               │
     │                │                │────────────────>│                │
     │                │                │                 │                │
     │                │                │                 │  11. Format   │
     │                │                │                 │  message      │
     │                │                │                 │  template     │
     │                │                │                 │               │
     │                │                │                 │  12. Send via │
     │                │                │                 │  whatsapp-    │
     │                │                │                 │  web.js       │
     │                │                │                 │  sidecar      │
     │                │                │                 │               │
     │                │                │  13. Mark       │                │
     │                │                │      sent_      │                │
     │                │                │      whatsapp   │                │
     │                │                │      = true     │                │
     │                │                │────────────────────────────────>│
     │                │                │                 │                │
```

---

## 7. Scenario Planning (What-If)

```
┌────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ User   │     │ React UI │     │ FastAPI  │     │ Prophet  │     │ Database │
└───┬────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
    │               │                │                 │                │
    │  1. Click     │                │                 │                │
    │  "Test a      │                │                 │                │
    │   Scenario"   │                │                 │                │
    │──────────────>│                │                 │                │
    │               │                │                 │                │
    │  2. Select:   │                │                 │                │
    │  Type=discount│                │                 │                │
    │  Value=20%    │                │                 │                │
    │  Product=     │                │                 │                │
    │  Paracetamol  │                │                 │                │
    │──────────────>│                │                 │                │
    │               │                │                 │                │
    │               │  3. POST /api/forecast/scenario  │                │
    │               │     { product_id: 42,            │                │
    │               │       scenario_type: "discount", │                │
    │               │       value: 20 }                │                │
    │               │───────────────>│                 │                │
    │               │                │                 │                │
    │               │                │  4. Fetch       │                │
    │               │                │     original    │                │
    │               │                │     forecast    │                │
    │               │                │────────────────────────────────>│
    │               │                │                 │                │
    │               │                │  5. Apply       │                │
    │               │                │     scenario    │                │
    │               │                │     multiplier: │                │
    │               │                │     demand *=   │                │
    │               │                │     1.2 (20%    │                │
    │               │                │     discount    │                │
    │               │                │     → ~20% more │                │
    │               │                │     demand)     │                │
    │               │                │                 │                │
    │               │                │  6. Optionally  │                │
    │               │                │     re-run      │                │
    │               │                │     Prophet     │                │
    │               │                │     with        │                │
    │               │                │     adjusted    │                │
    │               │                │     regressors  │                │
    │               │                │────────────────>│                │
    │               │                │                 │                │
    │               │                │  7. Return      │                │
    │               │                │     scenario    │                │
    │               │                │     forecast    │                │
    │               │                │<────────────────│                │
    │               │                │                 │                │
    │               │                │  8. Recalculate │                │
    │               │                │     reorder qty │                │
    │               │                │     for scenario│                │
    │               │                │                 │                │
    │               │  9. Return:    │                 │                │
    │               │     original_  │                 │                │
    │               │     forecast,  │                 │                │
    │               │     scenario_  │                 │                │
    │               │     forecast,  │                 │                │
    │               │     delta      │                 │                │
    │               │<───────────────│                 │                │
    │               │                │                 │                │
    │  10. Render   │                │                 │                │
    │  side-by-side │                │                 │                │
    │  comparison:  │                │                 │                │
    │  "Current"    │                │                 │                │
    │  vs "Scenario"│                │                 │                │
    │  with delta   │                │                 │                │
    │  highlighted  │                │                 │                │
    │<──────────────│                │                 │                │
```

---

## 8. Reorder List Generation & Export

```
┌────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ User   │     │ React UI │     │ FastAPI  │     │ Reorder  │     │ Database │
│        │     │          │     │ Router   │     │ Service  │     │          │
└───┬────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
    │               │                │                 │                │
    │  1. Navigate  │                │                 │                │
    │  to /reorder  │                │                 │                │
    │──────────────>│                │                 │                │
    │               │                │                 │                │
    │               │  2. GET /api/reorder             │                │
    │               │───────────────>│                 │                │
    │               │                │                 │                │
    │               │                │  3. Get all     │                │
    │               │                │     products +  │                │
    │               │                │     forecasts   │                │
    │               │                │────────────────>│                │
    │               │                │                 │                │
    │               │                │                 │  4. Query:     │
    │               │                │                 │  products +    │
    │               │                │                 │  latest        │
    │               │                │                 │  forecasts +   │
    │               │                │                 │  stock levels  │
    │               │                │                 │──────────────>│
    │               │                │                 │               │
    │               │                │                 │  5. Calculate │
    │               │                │                 │  per product: │
    │               │                │                 │  reorder_qty =│
    │               │                │                 │  forecast_    │
    │               │                │                 │  demand *     │
    │               │                │                 │  lead_time +  │
    │               │                │                 │  safety_stock │
    │               │                │                 │  - current_   │
    │               │                │                 │  stock        │
    │               │                │                 │               │
    │               │                │                 │  6. Rank by   │
    │               │                │                 │  days-to-     │
    │               │                │                 │  stockout     │
    │               │                │                 │  (ascending)  │
    │               │                │                 │               │
    │               │                │                 │  7. Group by  │
    │               │                │                 │  supplier     │
    │               │                │                 │               │
    │               │                │  8. Return      │                │
    │               │                │     reorder list│                │
    │               │                │<────────────────│                │
    │               │                │                 │                │
    │               │  9. Return list│                 │                │
    │               │<───────────────│                 │                │
    │               │                │                 │                │
    │  10. Show     │                │                 │                │
    │  reorder list │                │                 │                │
    │  grouped by   │                │                 │                │
    │  supplier     │                │                 │                │
    │<──────────────│                │                 │                │
    │               │                │                 │                │
    │  11. Click    │                │                 │                │
    │  "Export CSV" │                │                 │                │
    │──────────────>│                │                 │                │
    │               │                │                 │                │
    │               │  12. GET /api/ │                 │                │
    │               │  reorder/export│                 │                │
    │               │  ?format=csv   │                 │                │
    │               │───────────────>│                 │                │
    │               │                │                 │                │
    │               │                │  13. Generate   │                │
    │               │                │  CSV via pandas │                │
    │               │                │                 │                │
    │               │  14. Return    │                 │                │
    │               │  CSV file      │                 │                │
    │               │  (download)    │                 │                │
    │               │<───────────────│                 │                │
    │               │                │                 │                │
    │  15. File     │                │                 │                │
    │  downloaded   │                │                 │                │
    │<──────────────│                │                 │                │
```

---

## 9. WhatsApp Daily Briefing (Scheduled)

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Scheduler│     │ FastAPI  │     │ Gemini   │     │ WhatsApp │     │ Database │
│ (Cron /  │     │ Task     │     │ (NLP)    │     │ Bot      │     │          │
│  Celery) │     │ Worker   │     │          │     │ (Node)   │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                 │                │
     │  1. 8:00 AM    │                │                 │                │
     │  trigger daily │                │                 │                │
     │  briefing task │                │                 │                │
     │───────────────>│                │                 │                │
     │                │                │                 │                │
     │                │  2. Fetch all users             │                │
     │                │     with daily briefing enabled │                │
     │                │─────────────────────────────────────────────────>│
     │                │                │                 │                │
     │                │  3. For EACH user:              │                │
     │                │  ┌──────────────────────────────────────────┐   │
     │                │  │                                          │   │
     │                │  │  4. Fetch inventory health               │   │
     │                │  │─────────────────────────────────────────>│   │
     │                │  │                                          │   │
     │                │  │  5. Fetch active anomalies               │   │
     │                │  │─────────────────────────────────────────>│   │
     │                │  │                                          │   │
     │                │  │  6. Fetch upcoming festivals / diseases  │   │
     │                │  │─────────────────────────────────────────>│   │
     │                │  │                                          │   │
     │                │  │  7. Compose briefing prompt              │   │
     │                │  │     in user's language                   │   │
     │                │  │────────────────>│                        │   │
     │                │  │                 │                        │   │
     │                │  │                 │  8. Generate           │   │
     │                │  │                 │  localized briefing    │   │
     │                │  │                 │  message               │   │
     │                │  │                 │                        │   │
     │                │  │  9. Return      │                        │   │
     │                │  │  formatted msg  │                        │   │
     │                │  │<────────────────│                        │   │
     │                │  │                 │                        │   │
     │                │  │  10. Send via   │                        │   │
     │                │  │  WhatsApp       │                        │   │
     │                │  │────────────────────────>│                │   │
     │                │  │                 │       │                │   │
     │                │  │                 │       │  11. Deliver   │   │
     │                │  │                 │       │  to user's     │   │
     │                │  │                 │       │  WhatsApp      │   │
     │                │  │                 │       │                │   │
     │                │  │  12. Log sent   │       │                │   │
     │                │  │─────────────────────────────────────────>│   │
     │                │  │                                          │   │
     │                │  └──────────────────────────────────────────┘   │
     │                │                │                 │                │
     │  13. Task      │                │                 │                │
     │  complete      │                │                 │                │
     │<───────────────│                │                 │                │
```

---

## 10. WhatsApp Inbound Command

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ User     │     │ WhatsApp │     │ FastAPI  │     │ Service  │     │ Database │
│(WhatsApp)│     │ Bot      │     │ Webhook  │     │ Layer    │     │          │
│          │     │ (Node)   │     │          │     │          │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                 │                │
     │  1. User sends │                │                 │                │
     │  "REORDER"     │                │                 │                │
     │───────────────>│                │                 │                │
     │                │                │                 │                │
     │                │  2. Parse      │                 │                │
     │                │  command       │                 │                │
     │                │                │                 │                │
     │                │  3. POST       │                 │                │
     │                │  /api/whatsapp/│                 │                │
     │                │  webhook       │                 │                │
     │                │  { from: phone,│                 │                │
     │                │    command:    │                 │                │
     │                │    "REORDER" } │                 │                │
     │                │───────────────>│                 │                │
     │                │                │                 │                │
     │                │                │  4. Identify    │                │
     │                │                │     user by     │                │
     │                │                │     phone       │                │
     │                │                │────────────────────────────────>│
     │                │                │                 │                │
     │                │                │  5. Route to    │                │
     │                │                │     ReorderSvc  │                │
     │                │                │────────────────>│                │
     │                │                │                 │                │
     │                │                │                 │  6. Generate  │
     │                │                │                 │  reorder list │
     │                │                │                 │──────────────>│
     │                │                │                 │               │
     │                │                │                 │  7. Format    │
     │                │                │                 │  as WhatsApp  │
     │                │                │                 │  message      │
     │                │                │                 │               │
     │                │                │  8. Return      │                │
     │                │                │  formatted msg  │                │
     │                │                │<────────────────│                │
     │                │                │                 │                │
     │                │  9. Return     │                 │                │
     │                │  response msg  │                 │                │
     │                │<───────────────│                 │                │
     │                │                │                 │                │
     │  10. Deliver   │                │                 │                │
     │  reorder list: │                │                 │                │
     │                │                │                 │                │
     │  📦 Reorder    │                │                 │                │
     │  List:         │                │                 │                │
     │  1. Paracetamol│                │                 │                │
     │     200 units  │                │                 │                │
     │  2. ORS 150 u  │                │                 │                │
     │  ...           │                │                 │                │
     │<───────────────│                │                 │                │
```

---

## 11. Stock Movement Update

```
┌────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ User   │     │ React UI │     │ FastAPI  │     │ Inventory│     │ Database │
│        │     │          │     │          │     │ Service  │     │          │
└───┬────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
    │               │                │                 │                │
    │  1. Record    │                │                 │                │
    │  sale: -10    │                │                 │                │
    │  units of     │                │                 │                │
    │  Paracetamol  │                │                 │                │
    │──────────────>│                │                 │                │
    │               │                │                 │                │
    │               │  2. PUT /api/  │                 │                │
    │               │  inventory/42  │                 │                │
    │               │  {type: "sale",│                 │                │
    │               │   quantity:-10}│                 │                │
    │               │───────────────>│                 │                │
    │               │                │                 │                │
    │               │                │  3. Delegate    │                │
    │               │                │────────────────>│                │
    │               │                │                 │                │
    │               │                │                 │  4. INSERT     │
    │               │                │                 │  stock_movement│
    │               │                │                 │──────────────>│
    │               │                │                 │               │
    │               │                │                 │  5. UPDATE    │
    │               │                │                 │  product      │
    │               │                │                 │  current_stock│
    │               │                │                 │  -= 10        │
    │               │                │                 │──────────────>│
    │               │                │                 │               │
    │               │                │                 │  6. INSERT    │
    │               │                │                 │  sales_history│
    │               │                │                 │  (date, qty)  │
    │               │                │                 │──────────────>│
    │               │                │                 │               │
    │               │                │                 │  7. Check:    │
    │               │                │                 │  stock <=     │
    │               │                │                 │  reorder_     │
    │               │                │                 │  point?       │
    │               │                │                 │               │
    │               │                │                 │  8. If yes:   │
    │               │                │                 │  Create low   │
    │               │                │                 │  stock alert  │
    │               │                │                 │──────────────>│
    │               │                │                 │               │
    │               │                │                 │  9. If stock  │
    │               │                │                 │  == 0:        │
    │               │                │                 │  Create       │
    │               │                │                 │  stockout     │
    │               │                │                 │  alert        │
    │               │                │                 │  (CRITICAL)   │
    │               │                │                 │──────────────>│
    │               │                │                 │               │
    │               │                │                 │  10. Trigger  │
    │               │                │                 │  forecast     │
    │               │                │                 │  recalc       │
    │               │                │                 │  (background) │
    │               │                │                 │               │
    │               │                │                 │  11. Invalidate
    │               │                │                 │  cache        │
    │               │                │                 │               │
    │               │                │  12. Return     │                │
    │               │                │  updated product│                │
    │               │                │<────────────────│                │
    │               │                │                 │                │
    │               │  13. Response  │                 │                │
    │               │<───────────────│                 │                │
    │               │                │                 │                │
    │  14. UI       │                │                 │                │
    │  refreshes    │                │                 │                │
    │  stock level  │                │                 │                │
    │  + any new    │                │                 │                │
    │  alerts       │                │                 │                │
    │<──────────────│                │                 │                │
```

---

## 12. Forecast Accuracy Tracking

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Scheduler│     │ Forecast │     │ Accuracy │     │ Database │
│ (Weekly) │     │ Service  │     │ Tracker  │     │          │
└────┬─────┘     └────┬─────┘     └────┬─────┘     └────┬─────┘
     │                │                │                 │
     │  1. Weekly     │                │                 │
     │  accuracy      │                │                 │
     │  check trigger │                │                 │
     │───────────────>│                │                 │
     │                │                │                 │
     │                │  2. For each   │                 │
     │                │  product:      │                 │
     │                │  Fetch last    │                 │
     │                │  week's        │                 │
     │                │  forecast      │                 │
     │                │  (predicted_   │                 │
     │                │  likely)       │                 │
     │                │─────────────────────────────────>│
     │                │                │                 │
     │                │  3. Fetch      │                 │
     │                │  actual sales  │                 │
     │                │  for same week │                 │
     │                │─────────────────────────────────>│
     │                │                │                 │
     │                │  4. Calculate  │                 │
     │                │     accuracy   │                 │
     │                │───────────────>│                 │
     │                │                │                 │
     │                │                │  5. MAPE =      │
     │                │                │  |actual -      │
     │                │                │  predicted|     │
     │                │                │  / actual       │
     │                │                │  × 100          │
     │                │                │                 │
     │                │                │  6. Accuracy =  │
     │                │                │  100 - MAPE     │
     │                │                │                 │
     │                │                │  7. INSERT      │
     │                │                │  forecast_      │
     │                │                │  accuracy       │
     │                │                │────────────────>│
     │                │                │                 │
     │                │                │  8. Update      │
     │                │                │  rolling avg    │
     │                │                │  accuracy for   │
     │                │                │  dashboard      │
     │                │                │  display        │
     │                │                │                 │
     │                │  9. Check if   │                 │
     │                │  accuracy is   │                 │
     │                │  declining     │                 │
     │                │  trend →       │                 │
     │                │  flag for      │                 │
     │                │  review        │                 │
     │                │                │                 │
     │  10. Done      │                │                 │
     │<───────────────│                │                 │
```

---

## Summary of Key Interaction Patterns

| Pattern | Description | Used In |
|---|---|---|
| **Request-Response** | Synchronous API call → compute → return | Dashboard load, inventory CRUD |
| **Fire-and-Forget** | API returns immediately, work continues in background | Forecast recalculation after data upload |
| **Scheduled Cron** | Time-triggered tasks (daily, weekly) | WhatsApp briefing, accuracy tracking |
| **Event-Driven** | One action triggers cascading side effects | Stock movement → alert → WhatsApp |
| **Human-in-the-Loop** | System pauses for user verification | OCR → verification → commit |
| **Cache-Aside** | Check cache first, fallback to DB, populate cache | Dashboard KPIs, forecast results |
| **Sidecar** | Node.js WhatsApp bot runs alongside Python backend | All WhatsApp interactions |

---

> **Reference:** [HLD.md](./HLD.md) · [PRD.md](../PRD.md)
