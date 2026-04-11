# StockSense — High-Level Design (HLD)

> **AI-Powered Inventory Management & Demand Forecasting**
> *NatWest Hackathon — AI Predictive Forecasting Track*

---

## Table of Contents

1. [Design Goals & Principles](#1-design-goals--principles)
2. [System Context](#2-system-context)
3. [Architecture Overview](#3-architecture-overview)
4. [Component Breakdown](#4-component-breakdown)
5. [Data Flow](#5-data-flow)
6. [Database Design](#6-database-design)
7. [Scalability Strategy](#7-scalability-strategy)
8. [Integration Architecture](#8-integration-architecture)
9. [Security Considerations](#9-security-considerations)
10. [Deployment Topology](#10-deployment-topology)
11. [Non-Functional Requirements](#11-non-functional-requirements)

---

## 1. Design Goals & Principles

| Principle | Description |
|---|---|
| **Scalability-first** | Architecture supports horizontal scaling from day-1 demo to 10 K+ concurrent users without redesign. |
| **Free & Open Source** | Every component is 100% free — no paid APIs, no trial limits. |
| **Loose Coupling** | Backend services are modular; each domain (inventory, forecast, alerts) is a separate service layer communicating via well-defined interfaces. |
| **Async by Default** | Heavy workloads (OCR, forecast generation, WhatsApp dispatch) are offloaded to background task queues to keep API latency < 200 ms for UI calls. |
| **Data Trust** | Human-in-the-loop verification before any AI-ingested data enters the forecast pipeline. |
| **Multi-Tenancy Ready** | Schema and middleware isolate tenant data from day one. |

---

## 2. System Context

```
                         ┌──────────────────────┐
                         │    External Actors    │
                         └──────────┬───────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              │                     │                     │
     ┌────────▼──────┐   ┌─────────▼────────┐   ┌───────▼────────┐
     │  Shop Owner   │   │   WhatsApp User  │   │   Admin /       │
     │  (Web App)    │   │   (Messaging)    │   │   Distributor   │
     └────────┬──────┘   └─────────┬────────┘   └───────┬────────┘
              │                     │                     │
              └─────────────────────┼─────────────────────┘
                                    │
                       ┌────────────▼────────────┐
                       │     StockSense System   │
                       │  ┌──────────────────┐   │
                       │  │  React Frontend  │   │
                       │  └────────┬─────────┘   │
                       │  ┌────────▼─────────┐   │
                       │  │  FastAPI Backend  │   │
                       │  └────────┬─────────┘   │
                       │  ┌────────▼─────────┐   │
                       │  │    Database       │   │
                       │  └──────────────────┘   │
                       └──────────┬──────────────┘
                                  │
              ┌───────────────────┼───────────────────┐
              │                   │                   │
     ┌────────▼──────┐  ┌────────▼──────┐  ┌────────▼──────┐
     │ Gemini API    │  │ Prophet       │  │ WhatsApp      │
     │ (OCR + NLP)   │  │ (Local)       │  │ (Bot)         │
     └───────────────┘  └───────────────┘  └───────────────┘
```

---

## 3. Architecture Overview

StockSense follows a **modular monolith** architecture internally — logically separated service layers running in a single deployable backend process — with the escape hatch to split into microservices if scale demands it.

### 3.1 Logical Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                    │
│  ┌───────────────────┐   ┌──────────────────┐   ┌──────────────────┐   │
│  │  React SPA        │   │  WhatsApp Bot    │   │  Export/PDF      │   │
│  │  (Vite + Plotly)  │   │  (whatsapp-web.js│   │  Consumer        │   │
│  └────────┬──────────┘   └────────┬─────────┘   └──────┬───────────┘   │
│           │                       │                     │               │
│           └───────────────────────┼─────────────────────┘               │
│                                   │                                     │
│                          ┌────────▼────────┐                            │
│                          │  API Gateway /   │                            │
│                          │  Reverse Proxy   │                            │
│                          │  (Nginx/Caddy)   │                            │
│                          └────────┬────────┘                            │
└───────────────────────────────────┼─────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼─────────────────────────────────────┐
│                         BACKEND (FastAPI)                               │
│                                   │                                     │
│  ┌────────────────────────────────▼──────────────────────────────────┐  │
│  │                        API LAYER (Routers)                        │  │
│  │  /auth  /upload  /inventory  /forecast  /anomalies  /reorder     │  │
│  │  /alerts  /settings  /whatsapp                                    │  │
│  └──────────────────────────────┬────────────────────────────────────┘  │
│                                 │                                       │
│  ┌──────────────────────────────▼────────────────────────────────────┐  │
│  │                      SERVICE LAYER                                │  │
│  │  ┌─────────────┐ ┌──────────────┐ ┌────────────┐ ┌────────────┐  │  │
│  │  │ Inventory   │ │ Forecast     │ │ Anomaly    │ │ Reorder    │  │  │
│  │  │ Service     │ │ Service      │ │ Service    │ │ Service    │  │  │
│  │  └──────┬──────┘ └──────┬───────┘ └──────┬─────┘ └──────┬─────┘  │  │
│  │  ┌──────┴──────┐ ┌──────┴───────┐ ┌──────┴─────┐ ┌──────┴─────┐  │  │
│  │  │ Alert       │ │ OCR          │ │ I18n       │ │ WhatsApp   │  │  │
│  │  │ Service     │ │ Service      │ │ Service    │ │ Service    │  │  │
│  │  └─────────────┘ └──────────────┘ └────────────┘ └────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                 │                                       │
│  ┌──────────────────────────────▼────────────────────────────────────┐  │
│  │                     INFRASTRUCTURE LAYER                          │  │
│  │  ┌──────────┐ ┌──────────────┐ ┌───────────┐ ┌────────────────┐  │  │
│  │  │ Database │ │ Task Queue   │ │ Cache     │ │ File Storage   │  │  │
│  │  │ (PG/     │ │ (Celery +    │ │ (Redis)   │ │ (Local FS /    │  │  │
│  │  │ SQLite)  │ │ Redis)       │ │           │ │ S3-compat.)    │  │  │
│  │  └──────────┘ └──────────────┘ └───────────┘ └────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              │                  │                  │
     ┌────────▼──────┐  ┌───────▼────────┐  ┌─────▼──────────┐
     │ Google Gemini │  │ FB Prophet     │  │ whatsapp-web.js│
     │ (Free Tier)   │  │ (Local Engine) │  │ (Node.js svc)  │
     └───────────────┘  └────────────────┘  └────────────────┘
```

### 3.2 Technology Mapping (All Free)

| Layer | Hackathon | Production-Ready Scale-Up |
|---|---|---|
| **Frontend** | React (Vite) + Plotly.js | Same — static SPA behind CDN |
| **API Server** | FastAPI (single process, uvicorn) | FastAPI + Gunicorn (N workers) behind Nginx |
| **Task Queue** | In-process `BackgroundTasks` | Celery + Redis (horizontal workers) |
| **Cache** | In-memory dict / `cachetools` | Redis (free tier or self-hosted) |
| **Database** | SQLite (file-based) | PostgreSQL (Supabase free / Neon free / self-hosted) |
| **File Storage** | Local filesystem | MinIO (S3-compatible, self-hosted, free) |
| **AI / LLM** | Google Gemini 2.0 Flash (free 1 M tokens/day) | Same + OpenRouter free tier fallback |
| **Forecasting** | Facebook Prophet (local) | Same — Prophet scales per-worker |
| **WhatsApp** | whatsapp-web.js (Node sidecar) | Same / Meta Business API (free sandbox) |
| **Hosting** | Local dev / Render free tier | Railway free / Fly.io free / Self-hosted VPS |

---

## 4. Component Breakdown

### 4.1 Frontend Components

```
src/
├── components/
│   ├── common/           # Reusable UI primitives
│   │   ├── KPICard.jsx
│   │   ├── AlertBadge.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── LanguageSwitcher.jsx
│   │   └── DarkModeToggle.jsx
│   ├── upload/
│   │   ├── CSVUploader.jsx
│   │   ├── ImageUploader.jsx
│   │   ├── ManualEntryForm.jsx
│   │   └── VerificationTable.jsx       # Editable table for OCR corrections
│   ├── dashboard/
│   │   ├── OverviewDashboard.jsx
│   │   ├── ForecastDashboard.jsx
│   │   ├── InventoryHealthDashboard.jsx
│   │   └── ScenarioPanel.jsx
│   ├── charts/
│   │   ├── ForecastChart.jsx            # Line + confidence ribbon
│   │   ├── StockHeatmap.jsx
│   │   ├── DaysRemainingBar.jsx
│   │   ├── HealthDonut.jsx
│   │   └── AccuracyOverlay.jsx
│   ├── products/
│   │   ├── ProductList.jsx
│   │   ├── ProductDetail.jsx
│   │   └── AddProductForm.jsx
│   ├── reorder/
│   │   ├── ReorderList.jsx
│   │   └── ExportButton.jsx
│   └── settings/
│       ├── NotificationPrefs.jsx
│       ├── ProfileSettings.jsx
│       └── WhatsAppConnect.jsx
├── pages/                # Route-level page components
├── hooks/                # Custom React hooks (useForecast, useInventory, etc.)
├── services/             # API client layer (axios/fetch wrappers)
├── i18n/                 # Translation JSON files (en, hi, ta, te, mr, bn, gu)
├── context/              # React context (AuthContext, LanguageContext, ThemeContext)
└── utils/                # Helpers (date formatting, number formatting, etc.)
```

### 4.2 Backend Service Modules

```
backend/
├── app/
│   ├── main.py                # FastAPI app factory, middleware, CORS
│   ├── config.py              # Settings via pydantic-settings (env vars)
│   ├── routers/               # API route definitions
│   │   ├── auth.py
│   │   ├── upload.py
│   │   ├── inventory.py
│   │   ├── forecast.py
│   │   ├── anomalies.py
│   │   ├── reorder.py
│   │   ├── alerts.py
│   │   ├── settings.py
│   │   └── whatsapp.py
│   ├── services/              # Business logic (no HTTP concerns)
│   │   ├── inventory_service.py
│   │   ├── forecast_service.py
│   │   ├── anomaly_service.py
│   │   ├── reorder_service.py
│   │   ├── alert_service.py
│   │   ├── ocr_service.py
│   │   ├── i18n_service.py
│   │   └── whatsapp_service.py
│   ├── models/                # SQLAlchemy / SQLModel ORM models
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── sales.py
│   │   ├── forecast.py
│   │   ├── anomaly.py
│   │   ├── alert.py
│   │   └── lookups.py         # disease_seasons, festival_calendar
│   ├── schemas/               # Pydantic request/response models
│   ├── tasks/                 # Background / async task definitions
│   │   ├── forecast_tasks.py
│   │   ├── alert_tasks.py
│   │   ├── whatsapp_tasks.py
│   │   └── ocr_tasks.py
│   ├── integrations/          # External service adapters
│   │   ├── gemini_client.py
│   │   ├── prophet_engine.py
│   │   └── openrouter_client.py
│   ├── middleware/
│   │   ├── tenant.py          # Multi-tenant isolation
│   │   ├── rate_limiter.py
│   │   └── i18n.py            # Accept-Language middleware
│   └── utils/
│       ├── csv_parser.py
│       ├── export.py          # CSV + PDF generation
│       ├── z_score.py
│       └── date_helpers.py
├── whatsapp_bot/              # Node.js sidecar process
│   ├── index.js
│   ├── handlers/
│   │   ├── commands.js        # REORDER, LIST, REPORT, STATUS, etc.
│   │   └── message_builder.js
│   └── package.json
├── migrations/                # Alembic database migrations
├── seed/                      # Seed data (lookup tables, demo dataset)
└── tests/
```

### 4.3 Service Responsibility Matrix

| Service | Responsibilities | Dependencies |
|---|---|---|
| **InventoryService** | CRUD products, stock movements, health metrics, expiry tracking | DB |
| **ForecastService** | Run Prophet, generate 3-band forecasts, manage accuracy tracking | Prophet, DB, GeminiClient |
| **AnomalyService** | Z-score detection on residuals, pattern detection, alert generation | ForecastService, DB |
| **ReorderService** | Calculate optimal reorder qty, urgency ranking, supplier grouping | InventoryService, ForecastService |
| **AlertService** | Create, dispatch, dismiss alerts across channels | All services, WhatsAppService |
| **OCRService** | Image → Gemini Vision → structured table → verification staging | GeminiClient |
| **I18nService** | Static label translation + Gemini dynamic translation | GeminiClient, translation JSONs |
| **WhatsAppService** | Send messages, handle inbound commands, manage connection | Node sidecar (IPC/HTTP) |

---

## 5. Data Flow

### 5.1 Data Ingestion Pipeline

```
┌──────────┐     ┌──────────┐     ┌──────────────┐     ┌──────────────┐
│ CSV /    │     │ Gemini   │     │ Verification │     │  Database    │
│ Image /  │────▶│ Parser / │────▶│ Stage        │────▶│  (Products + │
│ Manual   │     │ OCR      │     │ (User edits) │     │  Sales Hist) │
└──────────┘     └──────────┘     └──────────────┘     └──────┬───────┘
                                                              │
                                                    ┌─────────▼─────────┐
                                                    │ Trigger: Forecast │
                                                    │ Recalculation     │
                                                    └─────────┬─────────┘
                                                              │
                              ┌────────────────────────────────┼────────┐
                              │                                │        │
                    ┌─────────▼────────┐            ┌──────────▼──────┐ │
                    │ Prophet Engine   │            │ Anomaly Detect  │ │
                    │ (per-product)    │            │ (Z-score)       │ │
                    └─────────┬────────┘            └──────────┬──────┘ │
                              │                                │        │
                    ┌─────────▼────────┐            ┌──────────▼──────┐ │
                    │ Gemini NLP       │            │ Alert Engine    │ │
                    │ (Explanations)   │            │ (Multi-channel) │ │
                    └─────────┬────────┘            └──────────┬──────┘ │
                              │                                │        │
                              └────────────────┬───────────────┘        │
                                               │                        │
                                    ┌──────────▼──────────┐             │
                                    │  Dashboard / API    │             │
                                    │  Response           │             │
                                    └─────────────────────┘             │
```

### 5.2 Forecast Generation Pipeline (Detail)

```
Input: product_id, sales_history[]

  1. Fetch sales_history for product  (DB query)
  2. Check data sufficiency:
     ├── >= 8 weeks → run Prophet
     └── < 8 weeks  → fallback to Simple Moving Average (SMA)

  3. Prophet fit & predict:
     ├── Fit model on historical data
     ├── Predict next 6 weeks
     └── Extract: yhat (likely), yhat_lower (low), yhat_upper (high)

  4. Compute naive baseline:
     └── Same quantity as equivalent week last period

  5. Enrich with external factors:
     ├── Disease season boost (pharmacy only)
     ├── Festival calendar multiplier
     ├── Weather/climate heuristic
     └── Historical anomaly memory

  6. Anomaly detection:
     ├── Calculate residuals = actual - predicted
     ├── Compute Z-scores
     └── Flag |Z| > 2.0

  7. Gemini NLP explanation:
     ├── Combine all driver factors into single prompt
     ├── Generate plain-language explanation in user's language
     └── Output: "Demand for X expected to rise Y% — reason1, reason2..."

  8. Store results:
     ├── forecasts table (low, likely, high, baseline, drivers)
     ├── anomalies table (type, z_score, explanation)
     └── forecast_accuracy table (when actual data arrives)

  9. Trigger alerts (if applicable):
     └── Stockout risk, anomaly spike, seasonal warning → AlertService
```

### 5.3 Request-Response Flow (API Call)

```
Client (React)
    │
    ├── GET /api/forecast/42
    │
    ▼
Nginx (Reverse Proxy)
    │
    ▼
FastAPI Router (/forecast)
    │
    ├── Auth middleware: validate JWT / session
    ├── Tenant middleware: scope to user's data
    │
    ▼
ForecastService.get_forecast(product_id=42)
    │
    ├── Cache hit? → return cached forecast (Redis / in-memory)
    │
    ├── Cache miss:
    │   ├── DB query: latest forecast + accuracy
    │   ├── DB query: latest anomalies
    │   ├── Compose response DTO
    │   ├── Cache result (TTL = 15 min)
    │   └── Return
    │
    ▼
JSON Response → Client
```

---

## 6. Database Design

### 6.1 Database Choice Strategy

| Scale | Database | Rationale |
|---|---|---|
| **Hackathon (1–5 users)** | SQLite | Zero config, file-based, no server needed |
| **Early Production (100–1K users)** | PostgreSQL (Neon/Supabase free tier) | ACID, full SQL, JSON support, free hosted |
| **Growth (1K–50K users)** | PostgreSQL (dedicated) + read replicas | Proven scale, partitioning, extensions |

### 6.2 Schema Highlights for Scale

The schema from the PRD is used as-is with the following additions for scalability:

#### Indexing Strategy

```sql
-- High-frequency query indexes
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_sales_product_date ON sales_history(product_id, date DESC);
CREATE INDEX idx_forecasts_product_week ON forecasts(product_id, week_start DESC);
CREATE INDEX idx_anomalies_product_date ON anomalies(product_id, date DESC);
CREATE INDEX idx_alerts_user_dismissed ON alerts(user_id, dismissed, created_at DESC);
CREATE INDEX idx_stock_movements_product ON stock_movements(product_id, created_at DESC);

-- Partial indexes for active data
CREATE INDEX idx_alerts_active ON alerts(user_id, created_at DESC) WHERE dismissed = FALSE;
CREATE INDEX idx_anomalies_active ON anomalies(product_id, date DESC) WHERE dismissed = FALSE;
```

#### Partitioning Strategy (PostgreSQL, when scaling)

```sql
-- Partition sales_history by month for large datasets
CREATE TABLE sales_history (
    id          BIGSERIAL,
    product_id  INTEGER NOT NULL,
    date        DATE NOT NULL,
    quantity    REAL NOT NULL,
    revenue     REAL,
    created_at  TIMESTAMPTZ DEFAULT NOW()
) PARTITION BY RANGE (date);

-- Create monthly partitions
CREATE TABLE sales_history_2026_01 PARTITION OF sales_history
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
-- ... additional months auto-created via cron/script
```

#### Soft Deletes & Audit

```sql
-- Add to all core tables for production
ALTER TABLE products ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE products ADD COLUMN updated_by INTEGER;
```

### 6.3 Entity-Relationship Overview

```
┌──────────┐       ┌──────────────┐       ┌──────────────┐
│  users   │───1:N─│  products    │───1:N─│ sales_history│
└──────────┘       └──────┬───────┘       └──────────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
      ┌───────▼──┐ ┌──────▼────┐ ┌───▼──────────┐
      │forecasts │ │ anomalies │ │stock_movements│
      └──────────┘ └───────────┘ └──────────────┘
              │
      ┌───────▼──────────┐
      │forecast_accuracy │
      └──────────────────┘

┌──────────┐       ┌──────────────┐
│  users   │───1:N─│   alerts     │
└──────────┘       └──────────────┘

┌─────────────────┐   ┌──────────────────┐
│ disease_seasons │   │ festival_calendar│   (Lookup tables — no FK)
└─────────────────┘   └──────────────────┘
```

---

## 7. Scalability Strategy

### 7.1 Horizontal Scaling Plan

```
                     ┌─────────────────────────┐
                     │       Load Balancer      │
                     │     (Nginx / Caddy)      │
                     └──────────┬──────────────┘
                                │
               ┌────────────────┼────────────────┐
               │                │                │
      ┌────────▼──────┐ ┌──────▼────────┐ ┌─────▼───────┐
      │ FastAPI       │ │ FastAPI       │ │ FastAPI     │
      │ Worker 1      │ │ Worker 2      │ │ Worker N    │
      └────────┬──────┘ └──────┬────────┘ └─────┬───────┘
               │                │                │
               └────────────────┼────────────────┘
                                │
                       ┌────────▼────────┐
                       │   PostgreSQL    │
                       │   + Redis       │
                       └─────────────────┘
```

### 7.2 Per-Layer Scaling Strategies

| Layer | Strategy | Free Tools |
|---|---|---|
| **API Servers** | Run multiple Gunicorn workers (CPU cores × 2 + 1). Add more containers behind Nginx. | Gunicorn, Nginx (free) |
| **Forecast Computation** | Offload to Celery workers. Each worker runs Prophet independently. Scale workers horizontally. | Celery + Redis (free) |
| **Database** | Connection pooling (PgBouncer). Read replicas for dashboard queries. Partitioning for sales_history. | PgBouncer, PostgreSQL (free) |
| **Cache** | Redis for forecast cache (TTL 15 min), session store, rate limiting. | Redis (free, self-hosted) |
| **File Storage** | MinIO for uploaded images/CSVs. S3-compatible API. | MinIO (free, self-hosted) |
| **OCR/AI** | Rate-limit Gemini calls. Queue OCR requests. Batch translations. | Celery task queue |
| **WhatsApp** | Message queue for outbound. Batch digest messages instead of per-item alerts. | Redis queue + whatsapp-web.js |

### 7.3 Caching Strategy

| Data | Cache Location | TTL | Invalidation |
|---|---|---|---|
| Forecast results | Redis | 15 min | On new sales data entry |
| Inventory health KPIs | Redis | 5 min | On stock movement |
| Disease/festival lookups | In-memory (app startup) | ∞ (static) | App restart |
| Translation strings | In-memory (i18n loader) | ∞ (static) | App restart |
| User session | Redis | 24 hours | On logout |

### 7.4 Background Task Architecture

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  API Server  │────▶│  Redis Broker    │────▶│  Celery Workers  │
│  (enqueue)   │     │  (task queue)    │     │  (execute)       │
└──────────────┘     └──────────────────┘     └──────────────────┘

Tasks:
  ├── forecast_tasks.recalculate_forecast(product_id)   — ~2-5 sec
  ├── ocr_tasks.process_image(image_path)               — ~3-8 sec
  ├── alert_tasks.dispatch_alerts(user_id)              — ~1-2 sec
  ├── whatsapp_tasks.send_daily_briefing()             — cron @ 8 AM
  ├── whatsapp_tasks.send_weekly_summary()             — cron @ Sun 7 PM
  └── forecast_tasks.batch_recalculate(user_id)        — all products
```

> **Hackathon shortcut:** Use FastAPI's built-in `BackgroundTasks` instead of Celery. Same interface, runs in-process. Switch to Celery when moving to production by changing the task decorator — zero business logic changes.

### 7.5 Data Volume Estimates & Capacity Planning

| Entity | Per User | 1K Users | 10K Users |
|---|---|---|---|
| Products | ~500 | 500 K | 5 M |
| Sales records/month | ~15 K | 15 M | 150 M |
| Forecasts (6 wk × products) | ~3 K | 3 M | 30 M |
| Anomalies/month | ~50 | 50 K | 500 K |
| Alerts/month | ~200 | 200 K | 2 M |

At 10 K users, the `sales_history` table grows ~150 M rows/month → **monthly partitioning** and **archival strategy** become critical. Indexes + partitions keep query time < 100 ms.

---

## 8. Integration Architecture

### 8.1 Gemini API Integration

```
┌──────────────────────────────────────────────────┐
│                  GeminiClient                     │
│                                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ OCR Engine  │  │ NLP Engine   │  │ Translate │ │
│  │             │  │              │  │ Engine    │ │
│  │ Image →     │  │ Factors →    │  │ Text →    │ │
│  │ Structured  │  │ Explanation  │  │ Localized │ │
│  │ Table       │  │ in language  │  │ Text      │ │
│  └──────┬──────┘  └──────┬───────┘  └─────┬────┘ │
│         │                │                │       │
│         └────────────────┼────────────────┘       │
│                          │                        │
│  Rate Limiter: max 15 req/min, daily budget track │
│  Retry: exponential backoff, 3 attempts           │
│  Fallback: OpenRouter free tier                   │
│  Circuit Breaker: after 5 consecutive failures    │
└──────────────────────────────────────────────────┘
```

**Prompt templates** are version-controlled and parameterized:

```
/prompts/
├── ocr_extract.txt          # Image → structured product table
├── forecast_explain.txt     # Factors → plain-language summary
├── anomaly_explain.txt      # Anomaly → user-friendly alert
├── weekly_summary.txt       # Metrics → narrative summary
└── stocking_intelligence.txt  # Combined factors → ranked recommendations
```

### 8.2 Prophet Integration

```python
# Simplified interface
class ProphetEngine:
    def fit_and_predict(
        self,
        sales_history: List[SalesRecord],
        horizon_weeks: int = 6,
        external_regressors: Optional[Dict] = None  # festivals, disease seasons
    ) -> ForecastResult:
        """
        Returns ForecastResult with:
          - predictions: [{week, low, likely, high}]
          - baseline: [{week, naive_value}]
          - residuals: [float]  # for anomaly detection
          - model_params: dict  # for explainability
        """
```

**Scalability note:** Prophet is CPU-bound (~2–5 sec per product). At scale, forecast recalculation is dispatched to Celery workers. Each worker handles one product independently → embarrassingly parallel.

### 8.3 WhatsApp Integration

```
┌──────────────────────────────────────────────────┐
│                StockSense Backend                 │
│                                                   │
│  WhatsAppService (Python)                         │
│    │                                              │
│    ├── send_message(phone, text) ──────┐          │
│    ├── send_daily_briefing(user_id) ──┐│          │
│    └── handle_inbound(message) ◄─────┐││          │
│                                      │││          │
└──────────────────────────────────────┼┼┼──────────┘
                                       │││
                          HTTP API     │││
                       (localhost:3001)│││
                                       │││
┌──────────────────────────────────────┼┼┼──────────┐
│          WhatsApp Bot (Node.js)      │││          │
│                                      │││          │
│  whatsapp-web.js                     │││          │
│    │                                 │││          │
│    ├── QR Code Pairing ──────────────┘││          │
│    ├── Outbound Messages ◄────────────┘│          │
│    └── Inbound Listener ──────────────┘           │
│         │                                         │
│         └── POST /webhook → FastAPI               │
│                                                   │
└───────────────────────────────────────────────────┘
```

**Communication:** The Node.js WhatsApp bot runs as a sidecar and exposes a simple HTTP API on `localhost:3001`. The Python backend sends messages via HTTP calls to this sidecar. Inbound messages from users are forwarded via webhook to the FastAPI backend.

---

## 9. Security Considerations

| Area | Strategy |
|---|---|
| **Authentication** | JWT-based stateless auth. Tokens stored in HttpOnly cookies. Refresh token rotation. |
| **Authorization** | Tenant isolation via middleware — every DB query scoped to `user_id`. |
| **Data at Rest** | SQLite: file-system permissions. PostgreSQL: encrypted connections (SSL). |
| **Data in Transit** | HTTPS everywhere (Let's Encrypt free certs via Caddy). |
| **API Rate Limiting** | `slowapi` middleware — 100 req/min per user, 15 req/min for AI endpoints. |
| **File Uploads** | File type validation, size limits (10 MB), virus scan optional. Stored outside webroot. |
| **Gemini API Key** | Server-side only — never exposed to frontend. Environment variable. |
| **WhatsApp** | Session stored encrypted on disk. QR re-auth required on session expiry. |
| **Input Validation** | Pydantic schemas validate all request bodies. SQL injection prevention via ORM. |
| **CORS** | Strict origin whitelist: only the frontend URL. |

---

## 10. Deployment Topology

### 10.1 Hackathon (Single Machine)

```
┌─────────────────────────────────────────────────┐
│              Local Machine / Render              │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  Frontend: npm run dev (port 5173)         │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │  Backend: uvicorn (port 8000)              │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │  WhatsApp Bot: node index.js (port 3001)   │  │
│  └────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────┐  │
│  │  SQLite: ./stocksense.db                   │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

### 10.2 Production (Containerized)

```
┌─────────────────────────────────────────────────────────────────┐
│                    Docker Compose / K8s Cluster                  │
│                                                                  │
│  ┌────────────┐  ┌────────────┐  ┌──────────┐  ┌────────────┐  │
│  │ Nginx      │  │ FastAPI    │  │ Celery   │  │ WhatsApp   │  │
│  │ (reverse   │  │ (N        │  │ Worker   │  │ Bot        │  │
│  │  proxy +   │  │  replicas) │  │ (N       │  │ (1 replica)│  │
│  │  static)   │  │            │  │  replicas)│  │            │  │
│  └─────┬──────┘  └─────┬──────┘  └────┬─────┘  └─────┬──────┘  │
│        │               │              │               │          │
│        └───────────────┼──────────────┼───────────────┘          │
│                        │              │                          │
│               ┌────────▼──────┐ ┌─────▼──────┐                  │
│               │  PostgreSQL   │ │   Redis    │                  │
│               │  (persistent) │ │   (cache + │                  │
│               │               │ │    broker) │                  │
│               └───────────────┘ └────────────┘                  │
│                                                                  │
│               ┌───────────────┐                                  │
│               │    MinIO      │                                  │
│               │  (file store) │                                  │
│               └───────────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. Non-Functional Requirements

| Category | Requirement | Target |
|---|---|---|
| **Latency** | Dashboard API response | < 200 ms (cached), < 500 ms (cold) |
| **Latency** | Forecast generation (per product) | < 5 sec |
| **Latency** | OCR processing | < 10 sec |
| **Throughput** | Concurrent API requests | 500 req/sec (with 4 workers) |
| **Availability** | Uptime target | 99.5% (production) |
| **Data Retention** | Sales history | 24 months rolling |
| **Data Retention** | Forecasts | 6 months |
| **Data Retention** | Alerts | 3 months |
| **Backup** | Database | Daily automated (pg_dump) |
| **Recovery** | RPO / RTO | 1 hour / 4 hours |
| **Localization** | Languages supported | 7 (en, hi, ta, te, mr, bn, gu) |
| **Accessibility** | Standard | WCAG 2.1 AA |
| **Mobile** | Minimum viewport | 360px width |
| **Browser** | Support | Chrome 90+, Safari 14+, Firefox 88+ |

---

> **Next:** See [sequence_diagrams.md](./sequence_diagrams.md) for detailed interaction flows.
