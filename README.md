<div align="center">

# 🧠 StockSense

### AI-Powered Inventory Management & Demand Forecasting

**From notebook to forecast in 60 seconds.**

[![NatWest Hackathon](https://img.shields.io/badge/NatWest-AI%20Predictive%20Forecasting-6366F1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyTDEgMTJoM3Y5aDZ2LTZoNHY2aDZ2LTloM0wxMiAyeiIvPjwvc3ZnPg==)](https://natwest.com)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Prophet](https://img.shields.io/badge/Prophet-ML-FF6F00?style=for-the-badge&logo=meta&logoColor=white)](https://facebook.github.io/prophet/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://docker.com)
[![License](https://img.shields.io/badge/License-MIT-10B981?style=for-the-badge)](LICENSE)

<br/>

> **60% of India's 12M+ kirana stores still track inventory on paper notebooks.**
> StockSense bridges the gap between handwritten ledgers and AI-powered demand intelligence — via the interface they already use every day: **WhatsApp**.

<br/>

[🚀 Quick Start](#-quick-start) · [✨ Features](#-features) · [🏗️ Architecture](#️-system-architecture) · [📊 AI Pipeline](#-ai--ml-pipeline) · [📱 WhatsApp Bot](#-whatsapp-first-interface) · [🎨 Design](#-design-system) · [📖 API Reference](#-api-reference)

</div>

---

## 🎯 The Problem

Small Indian businesses — pharmacies, kirana stores, distributors — face a brutal reality:

| Pain Point | Impact |
|:---|:---|
| 📓 **Paper-based tracking** | No visibility into stock levels until it's too late |
| 📉 **Stockouts during disease outbreaks** | Lost revenue during peak demand (dengue, monsoon) |
| 🔮 **Zero demand forecasting** | Over-ordering perishables → waste; under-ordering essentials → lost sales |
| 💬 **No proactive alerts** | Owner discovers stockout when customer walks away empty-handed |
| 🌐 **Language barriers** | Most tools are English-only; shopkeepers need Hindi, Tamil, Telugu |

**StockSense solves all of this** — with AI that speaks your language, reads your handwriting, and alerts you via WhatsApp before problems happen.

---

## 🏆 Key Differentiators

<div align="center">

| | Feature | Description |
|:---:|:---|:---|
| 📷 | **Handwriting OCR** | Photograph your ledger → AI extracts product data in Hindi/English/Tamil |
| 🦠 | **Disease Intelligence** | Real-time outbreak tracking → auto-boost medicine forecasts |
| 📱 | **WhatsApp-First** | Daily briefings, reorder commands, alerts — no app install needed |
| 🎯 | **Explainable AI** | "Paracetamol demand +25% because dengue season is active" |
| 🆓 | **100% Free Stack** | Prophet + Gemini Flash + SQLite — ₹0 infrastructure cost |
| 🌍 | **7 Indian Languages** | English, हिंदी, தமிழ், తెలుగు, मराठी, বাংলা, ગુજરાતી |

</div>

---

## ✨ Features

### 📷 Handwriting OCR — "Notebook to Database in 60 Seconds"
Upload a photo of your handwritten sales register. StockSense's AI vision pipeline:
- Reads **mixed Hindi/English** text using Gemini 2.5 Flash multimodal
- Converts **Hindi numerals** (१, २, ३ → 1, 2, 3) and number words (बारह → 12)
- Parses **20+ date formats** (12 Jan, 12/3, १२-०३-२०२६)
- Assigns **per-cell confidence scores** (0.0–1.0)
- Routes through a mandatory **verification step** before any data enters the forecast engine

### 📈 Prophet-Powered Demand Forecasting
6-week rolling demand forecasts using Facebook Prophet with external factor overlays:
- **Confidence bands** (low / likely / high) with 80% interval width
- **Baseline comparison** — naive "same as last period" dotted line
- **Sliding window training** — last 8 weeks for fresh, responsive models
- **SMA fallback** — Simple Moving Average when < 8 weeks of data
- **Scenario planning** — "What if I run a 20% discount?" / "What if supplier delays 5 days?"

### 🦠 Real-Time Disease Intelligence
A 3-stage intelligence pipeline powers context-aware forecasts:
1. **Serper Web Search** → live disease outbreak data for your city/state
2. **Gemini Analysis** → structured demand impact assessment
3. **Hardcoded Fallback** → curated JSON lookup tables (disease seasons, festivals, weather)

Covered signals: **dengue, malaria, monsoon flu, Diwali/Holi buying patterns, heat waves, cold waves**

### 🔍 Z-Score Anomaly Detection
Statistical anomaly detection on forecast residuals:
- **Spike detection**: Z > 2.0 → "Demand is 3× normal this week — possible outbreak"
- **Drop detection**: Z < -2.0 → "Sales dropped 40% — check competitor pricing"
- **Pattern detection**: 3+ consecutive weeks of same-direction deviation → structural shift alert
- Plain-language explanations generated per anomaly

### 📦 Smart Reorder Engine
AI-calculated reorder lists ranked by urgency:
```
reorder_qty = (forecast_demand × lead_time_days) + safety_stock − current_stock
```
- **Urgency tiers**: 🔴 High (< 3 days) · 🟡 Medium (3–7 days) · 🟢 Low (7+ days)
- **Supplier grouping**: Orders batched by supplier for efficient procurement
- **Export**: CSV and PDF download for WhatsApp/email forwarding
- **Days-to-stockout**: Real-time countdown per product

### 📱 WhatsApp-First Interface
Zero-install voice of the system — daily briefings and two-way commands:

| Command | Response |
|:---|:---|
| *(automatic 8 AM)* | 📊 Daily briefing: stock health, top alerts, reorder reminders |
| `REORDER` | 📦 Full reorder list with quantities, suppliers, urgency |
| `LIST` | 📋 Top 5 low-stock items with days remaining |
| `REPORT` | 📈 Weekly performance summary |
| `STATUS` | 🔄 Connection and system health check |
| `HELP` | 📖 List all available commands |

### 🌐 Multilingual Support
Full i18n with `react-i18next` across all 16 screens:
- **7 languages**: English, Hindi, Tamil, Telugu, Marathi, Bengali, Gujarati
- **Bilingual onboarding**: Language selection with native script display
- **OCR language hints**: AI adapts extraction based on user's language preference

---

## 🏗️ System Architecture

### High-Level Design

```mermaid
graph TB
    subgraph "Client Layer"
        WEB["🖥️ React SPA<br/>(Vite + Plotly.js)"]
        WA["📱 WhatsApp<br/>(whatsapp-web.js)"]
    end

    subgraph "Reverse Proxy"
        NGX["🌐 Nginx<br/>:80"]
    end

    subgraph "Application Layer"
        API["⚙️ FastAPI<br/>:8000"]
        BOT["📱 WhatsApp Bot<br/>Node.js :3001"]
    end

    subgraph "AI / ML Services"
        PROPHET["📈 Facebook Prophet<br/>Time-Series Forecasting"]
        ANOMALY["🔍 Z-Score Engine<br/>Anomaly Detection"]
        OCR["📷 Vision OCR<br/>Handwriting Extraction"]
        INTEL["🦠 Intelligence<br/>Disease + Festival + Weather"]
        REORDER["📦 Reorder Engine<br/>Smart Procurement"]
    end

    subgraph "AI Providers (Fallback Chain)"
        GEMINI["☁️ Gemini 2.5 Flash<br/>(Primary)"]
        OLLAMA["🏠 Ollama / Gemma<br/>(Local Fallback)"]
        OPENROUTER["☁️ OpenRouter<br/>(Cloud Fallback)"]
    end

    subgraph "External Intelligence"
        SERPER["🔍 Serper API<br/>Web Search"]
    end

    subgraph "Data Layer"
        DB[("💾 SQLite<br/>stocksense.db")]
        LOOKUP["📁 Lookup JSONs<br/>diseases · festivals · weather"]
    end

    WEB --> NGX --> API
    WA --> BOT --> API
    NGX --> WEB

    API --> PROPHET
    API --> ANOMALY
    API --> OCR
    API --> INTEL
    API --> REORDER
    API --> DB

    OCR --> GEMINI
    INTEL --> SERPER
    INTEL --> GEMINI
    OCR -.-> OLLAMA
    OCR -.-> OPENROUTER
    INTEL -.-> LOOKUP

    PROPHET --> DB
    ANOMALY --> DB
    REORDER --> DB

    classDef primary fill:#0D9488,stroke:#0F766E,color:#fff
    classDef ai fill:#6366F1,stroke:#4F46E5,color:#fff
    classDef external fill:#F59E0B,stroke:#D97706,color:#000
    classDef data fill:#1E293B,stroke:#334155,color:#F8FAFC

    class API,BOT primary
    class PROPHET,ANOMALY,OCR,INTEL,REORDER ai
    class GEMINI,OLLAMA,OPENROUTER,SERPER external
    class DB,LOOKUP data
```

### Logical Architecture — Modular Monolith

```mermaid
graph LR
    subgraph "FastAPI Backend"
        direction TB

        subgraph "Routers (API Layer)"
            R_AUTH["auth.py"]
            R_UPLOAD["upload.py"]
            R_INV["inventory.py"]
            R_FC["forecast.py"]
            R_ANOM["anomalies.py"]
            R_REORD["reorder.py"]
            R_ALERT["alerts.py"]
            R_SET["settings.py"]
            R_WA["whatsapp.py"]
            R_SALES["sales.py"]
        end

        subgraph "Services (Business Logic)"
            S_FC["forecast_service.py<br/>Prophet + SMA"]
            S_ANOM["anomaly_service.py<br/>Z-Score Engine"]
            S_INTEL["intelligence_service.py<br/>Serper + Gemini"]
            S_OCR["ocr_service.py<br/>Vision OCR"]
            S_REORD["reorder_service.py<br/>Smart Procurement"]
            S_AI["ai_client.py<br/>Unified AI Gateway"]
        end

        subgraph "Models (SQLAlchemy ORM)"
            M_USER["User"]
            M_PROD["Product"]
            M_SALES["SalesHistory"]
            M_FC["Forecast"]
            M_ANOM["Anomaly"]
            M_ALERT["Alert"]
        end
    end

    R_FC --> S_FC
    R_ANOM --> S_ANOM
    R_UPLOAD --> S_OCR
    S_FC --> S_INTEL
    S_OCR --> S_AI
    S_INTEL --> S_AI
    S_FC --> M_FC
    S_ANOM --> M_ANOM
    S_REORD --> M_PROD

    classDef router fill:#0D9488,stroke:#0F766E,color:#fff
    classDef service fill:#6366F1,stroke:#4F46E5,color:#fff
    classDef model fill:#1E293B,stroke:#334155,color:#F8FAFC

    class R_AUTH,R_UPLOAD,R_INV,R_FC,R_ANOM,R_REORD,R_ALERT,R_SET,R_WA,R_SALES router
    class S_FC,S_ANOM,S_INTEL,S_OCR,S_REORD,S_AI service
    class M_USER,M_PROD,M_SALES,M_FC,M_ANOM,M_ALERT model
```

---

## 📊 AI / ML Pipeline

### Forecast Generation Flow

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 User
    participant FE as 🖥️ React Frontend
    participant API as ⚙️ FastAPI
    participant FC as 📈 Forecast Service
    participant INTEL as 🦠 Intelligence Service
    participant SERPER as 🔍 Serper API
    participant GEMINI as ☁️ Gemini 2.5 Flash
    participant PROPHET as 📊 Facebook Prophet
    participant DB as 💾 SQLite

    U->>FE: View product forecast
    FE->>API: GET /api/forecast/{product_id}
    API->>FC: generate_forecast(product_id)

    FC->>DB: Fetch sales_history
    DB-->>FC: 8+ weeks of weekly data

    alt Sufficient Data (≥8 weeks)
        FC->>PROPHET: Fit model (sliding window)
        PROPHET-->>FC: yhat, yhat_lower, yhat_upper
    else Insufficient Data (<8 weeks)
        FC->>FC: SMA fallback (4-week average)
    end

    FC->>FC: Compute naive baseline

    FC->>INTEL: get_external_factors(product, city, state)
    INTEL->>SERPER: Search "disease outbreak {city} April 2026"
    SERPER-->>INTEL: Live web snippets
    INTEL->>GEMINI: Analyze search results for demand impact
    GEMINI-->>INTEL: {boost_pct: 25, drivers: [...]}
    INTEL-->>FC: boost_multiplier=1.25, drivers

    FC->>FC: Apply boost to forecast bands
    FC->>FC: Detect sales trend (↑/↓)
    FC->>DB: Store forecast records ( upsert)

    FC-->>API: ForecastResponse
    API-->>FE: JSON with confidence bands + drivers
    FE->>U: Render Plotly chart + driver explanation
```

### AI Provider Fallback Chain

```mermaid
graph TD
    REQ["🔄 AI Request<br/>(Text or Vision)"] --> GEMINI{"☁️ Gemini 2.5 Flash<br/>API Key configured?"}

    GEMINI -->|"✅ Success"| RES["✅ Response"]
    GEMINI -->|"❌ Failed / No Key"| OLLAMA{"🏠 Ollama (Local)<br/>gemma4 model running?"}

    OLLAMA -->|"✅ Success"| RES
    OLLAMA -->|"❌ Failed / Offline"| OPENROUTER{"☁️ OpenRouter<br/>API Key configured?"}

    OPENROUTER -->|"✅ Success"| RES
    OPENROUTER -->|"❌ All Failed"| FAIL["⚠️ Graceful Degradation<br/>Hardcoded JSON fallback"]

    classDef success fill:#10B981,stroke:#059669,color:#fff
    classDef fail fill:#EF4444,stroke:#DC2626,color:#fff
    classDef provider fill:#6366F1,stroke:#4F46E5,color:#fff

    class RES success
    class FAIL fail
    class GEMINI,OLLAMA,OPENROUTER provider
```

### OCR Data Ingestion Pipeline

```mermaid
sequenceDiagram
    autonumber
    participant U as 👤 Shopkeeper
    participant FE as 🖥️ Upload Page
    participant API as ⚙️ FastAPI
    participant OCR as 📷 OCR Service
    participant AI as ☁️ AI Vision
    participant DB as 💾 SQLite

    U->>FE: 📸 Photograph handwritten ledger
    FE->>API: POST /api/upload/image (multipart)
    API->>OCR: process_ledger_image(bytes, language)

    OCR->>AI: call_vision(image, OCR prompt)
    Note over AI: Extracts: names, dates,<br/>quantities, prices,<br/>Hindi numerals, confidence

    AI-->>OCR: JSON array of entries

    OCR->>OCR: Convert Hindi numerals (०→0)
    OCR->>OCR: Normalize dates (20+ formats)
    OCR->>OCR: Validate categories
    OCR->>OCR: Assign confidence scores

    OCR-->>API: {extracted_data, overall_confidence}
    API-->>FE: Parsed rows with confidence

    FE->>U: 📝 Verification screen<br/>(edit low-confidence cells)

    U->>FE: ✅ "I've reviewed and confirmed"
    FE->>API: POST /api/upload/verify
    API->>DB: Create products + sales records
    API->>API: Trigger forecast generation
    API-->>FE: {products_created, forecast_triggered}
```

---

## 📱 WhatsApp-First Interface

### Architecture

```mermaid
graph LR
    subgraph "User's Phone"
        WA_APP["📱 WhatsApp App"]
    end

    subgraph "StockSense — Node.js Sidecar"
        EXPRESS["Express :3001"]
        WWEBJS["whatsapp-web.js<br/>(Puppeteer + Chromium)"]
        HANDLER["Message Handler<br/>Command Parser"]
        TEMPLATES["Message Templates<br/>Formatted Responses"]
    end

    subgraph "StockSense — Python Backend"
        API["FastAPI :8000"]
        WEBHOOK["/api/whatsapp/webhook"]
    end

    WA_APP <-->|"WhatsApp Web Protocol"| WWEBJS
    WWEBJS --> HANDLER
    HANDLER --> TEMPLATES
    HANDLER -->|"POST command"| WEBHOOK
    WEBHOOK -->|"reply text"| HANDLER
    API -->|"POST /send-message"| EXPRESS
    EXPRESS --> WWEBJS

    classDef phone fill:#25D366,stroke:#128C7E,color:#fff
    classDef node fill:#68A063,stroke:#3C873A,color:#fff
    classDef python fill:#0D9488,stroke:#0F766E,color:#fff

    class WA_APP phone
    class EXPRESS,WWEBJS,HANDLER,TEMPLATES node
    class API,WEBHOOK python
```

### Supported Commands

| Command | Description | Example Response |
|:---|:---|:---|
| `REORDER` | Full AI reorder list | 📦 **Reorder List (8 items)**<br/>1. Paracetamol — 200 units (🔴 HIGH)<br/>2. ORS Sachets — 150 units (🟡 MED) |
| `LIST` | Top 5 low-stock items | 📋 **Low Stock Alert**<br/>⚠️ Paracetamol: 15 left (1.5 days) |
| `REPORT` | Weekly performance | 📊 **Weekly Report**<br/>Sales: ₹24,500 · Accuracy: 89% |
| `FULL` | Detailed report | Extended version with charts |
| `STATUS` | System health | ✅ All systems operational |
| `STOP` | Pause notifications | 🔕 Notifications paused |
| `HELP` | Command reference | 📖 Available commands list |

---

## 🎨 Design System

### Brand Identity

| Token | Value | Usage |
|:---|:---|:---|
| **Primary** | `#0D9488` → `#10B981` | CTAs, active states, healthy stock |
| **Warning** | `#F59E0B` (Amber) | Low stock, approaching reorder |
| **Danger** | `#EF4444` (Red) | Critical alerts, stockouts, expiry |
| **Info** | `#3B82F6` (Blue) | Informational badges, tips |
| **Background** | `#0F172A` → `#1E293B` | Dark mode default (deep navy) |
| **Surface** | `rgba(255,255,255,0.05)` | Glassmorphism cards |
| **Typography** | Inter (Google Fonts) | Clean, modern, highly legible |
| **Border Radius** | `12px` cards · `8px` inputs · `24px` buttons | Rounded, friendly aesthetic |

### Design Principles

| Principle | Implementation |
|:---|:---|
| **Mobile-first** | Every screen designed at 360px first, scales up |
| **Minimal cognitive load** | Max 3 actions per screen, plain language |
| **Visual-first** | Charts, color-coding, icons over text tables |
| **Dark mode default** | Deep navy background with high-contrast text |
| **Accessibility** | WCAG 2.1 AA, 44px touch targets, high contrast |

### Screen Inventory — 16 Screens

| # | Screen | Route | Purpose |
|:---:|:---|:---|:---|
| 1 | Landing Page | `/` | Hero, value prop, CTAs |
| 2 | Language Selection | `/onboarding/language` | Choose from 7 languages |
| 3 | Business Type | `/onboarding/business-type` | Pharmacy / Kirana / Retail / Other |
| 4 | Shop Setup | `/onboarding/setup` | Name, city, state, phone |
| 5 | Data Upload | `/upload` | CSV / Image / Manual entry |
| 6 | Data Verification | `/upload/verify` | OCR trust layer — edit & confirm |
| 7 | Overview Dashboard | `/dashboard/overview` | KPIs, health donut, alert feed |
| 8 | Forecasting Dashboard | `/dashboard/forecasting` | Per-product forecast with confidence bands |
| 9 | Inventory Health | `/dashboard/inventory` | Heatmap, expiry timeline, slow-movers |
| 10 | Scenario Planning | `/dashboard/scenarios` | What-if simulations (discount, surge, delay) |
| 11 | Product Catalog | `/products` | Full inventory listing with filters |
| 12 | Product Detail | `/products/:id` | Single product deep-dive + forecast |
| 13 | Smart Reorder | `/reorder` | AI reorder list grouped by supplier |
| 14 | Alert Center | `/alerts` | Severity-filtered active alerts |
| 15 | Settings | `/settings` | Profile, notifications, WhatsApp |
| 16 | WhatsApp Demo | *(mobile mockup)* | Bot interaction showcase |

---

## 🗄️ Database Schema

```mermaid
erDiagram
    users ||--o{ products : "owns"
    users ||--o{ alerts : "receives"
    users ||--|| notification_preferences : "configures"
    products ||--o{ sales_history : "tracks"
    products ||--o{ forecasts : "generates"
    products ||--o{ anomalies : "detects"
    products ||--o{ stock_movements : "logs"
    products ||--o{ forecast_accuracy : "measures"

    users {
        int id PK
        text shop_name
        text business_type
        text city
        text state
        text language
        text phone
        text password_hash
    }

    products {
        int id PK
        int user_id FK
        text name
        text category
        real current_stock
        real reorder_point
        real safety_stock
        real unit_cost
        text supplier_name
        int lead_time_days
        date expiry_date
    }

    sales_history {
        int id PK
        int product_id FK
        date date
        real quantity
        real revenue
    }

    forecasts {
        int id PK
        int product_id FK
        date week_start
        real low
        real likely
        real high
        real baseline
        text drivers
    }

    anomalies {
        int id PK
        int product_id FK
        date date
        text type
        real z_score
        text explanation
        bool dismissed
    }

    alerts {
        int id PK
        int user_id FK
        int product_id FK
        text type
        text severity
        text title
        text message
        bool sent_whatsapp
    }

    disease_seasons {
        int id PK
        text disease
        int start_month
        int end_month
        text medicines
        real boost_pct
    }

    festival_calendar {
        int id PK
        text name
        int month
        text affected_categories
        real demand_multiplier
    }
```

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technology | Purpose |
|:---|:---|:---|
| **Frontend** | React 18 + Vite | SPA with HMR, fast builds |
| **Charts** | Plotly.js / react-plotly.js | Interactive forecast visualization |
| **i18n** | react-i18next | 7-language multilingual support |
| **Routing** | react-router-dom v6 | Client-side navigation |
| **Backend** | FastAPI (Python 3.11) | Async REST API with auto-docs |
| **ORM** | SQLAlchemy 2.0 | Database models + migrations |
| **Validation** | Pydantic v2 | Request/response schema validation |
| **Auth** | python-jose + passlib | JWT tokens + bcrypt password hashing |
| **Forecasting** | Facebook Prophet | Time-series demand prediction |
| **Intelligence** | Google Gemini 2.5 Flash | OCR, NLP analysis, demand factors |
| **Web Search** | Serper API | Real-time disease/festival/weather data |
| **Anomaly Detection** | NumPy / SciPy (Z-score) | Statistical outlier detection |
| **WhatsApp** | whatsapp-web.js + Express | Node.js sidecar for messaging |
| **Database** | SQLite (dev) / PostgreSQL (prod) | Zero-config local, scalable cloud |
| **Reverse Proxy** | Nginx | Unified access on port 80 |
| **Containerization** | Docker Compose | One-command deployment |
| **Local AI** | Ollama (Gemma 4) | Privacy-first local inference fallback |

</div>

---

## 🚀 Quick Start

### Prerequisites

| Tool | Version | Check |
|:---|:---|:---|
| Docker & Docker Compose | v24+ | `docker --version` |
| Node.js *(optional, for local dev)* | v18+ | `node --version` |
| Python *(optional, for local dev)* | 3.11+ | `python3 --version` |

### Option 1: Docker Compose (Recommended)

```bash
# 1. Clone the repository
git clone https://github.com/your-org/stocksense.git
cd stocksense

# 2. Configure environment
cp .env.example backend/.env
# Edit backend/.env with your API keys (see below)

# 3. Launch everything
chmod +x start.sh
./start.sh
```

**That's it.** Access the app:

| Service | URL |
|:---|:---|
| 🖥️ Frontend | http://localhost:5173 |
| ⚙️ Backend API | http://localhost:8000 |
| 📖 API Docs (Swagger) | http://localhost:8000/docs |
| 📱 WhatsApp Bot | http://localhost:3001 |
| 🌐 Unified (Nginx) | http://localhost:80 |

### Option 2: Local Development

```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed_data.py          # Seed demo data
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                  # → http://localhost:5173

# WhatsApp Bot (separate terminal)
cd whatsapp-bot
npm install
node index.js                # → http://localhost:3001
```

### Environment Variables

```bash
# ─── Required ──────────────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key      # Primary AI (free: aistudio.google.com)
SECRET_KEY=your-jwt-secret              # JWT signing key

# ─── Optional — Enhanced Intelligence ─────────────────────
SERPER_API_KEY=your-serper-key          # Web search for live disease data
OPENROUTER_API_KEY=your-openrouter-key  # Cloud AI fallback

# ─── Optional — Local AI ──────────────────────────────────
OLLAMA_BASE_URL=http://localhost:11434  # Local Ollama instance
OLLAMA_MODEL=gemma4:latest             # Model for local inference
```

> **💡 Minimum viable setup**: Only `GEMINI_API_KEY` is required. Everything else has sensible defaults or graceful fallbacks.

---

## 📖 API Reference

### Authentication

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/auth/register` | Create account (shop_name, business_type, phone, password) |
| `POST` | `/api/auth/login` | Login → JWT token |

### Data Ingestion

| Method | Endpoint | Description |
|:---|:---|:---|
| `POST` | `/api/upload/csv` | Upload CSV/Excel sales data |
| `POST` | `/api/upload/image` | Upload ledger photo → OCR extraction |
| `POST` | `/api/upload/verify` | Confirm verified data → trigger forecast |

### Inventory

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/inventory` | List products (filter by category, status) |
| `GET` | `/api/inventory/:id` | Single product details |
| `POST` | `/api/inventory` | Create product |
| `PUT` | `/api/inventory/:id` | Update stock + record movement |
| `GET` | `/api/inventory/health` | Health summary (total SKUs, below reorder, stockout risk) |
| `GET` | `/api/inventory/expiring?days=7` | Products expiring within N days |

### Forecasting

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/forecast/:product_id` | 6-week forecast with confidence bands + drivers |
| `GET` | `/api/forecast/all` | Summary for all products |
| `POST` | `/api/forecast/scenario` | What-if simulation (discount, surge, delay) |

### Anomalies & Alerts

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/anomalies` | Active anomalies (filter by severity) |
| `GET` | `/api/alerts` | Alert feed (critical/warning/info) |
| `PUT` | `/api/alerts/:id/dismiss` | Dismiss an alert |

### Reorder

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/reorder` | AI reorder list (ranked by urgency, grouped by supplier) |
| `GET` | `/api/reorder/export?format=csv` | Export as CSV |
| `GET` | `/api/reorder/export?format=pdf` | Export as PDF |

### System

| Method | Endpoint | Description |
|:---|:---|:---|
| `GET` | `/api/health` | Backend health check |
| `GET` | `/api/ai-status` | AI provider availability (Gemini/Ollama/OpenRouter) |

> 📖 **Full interactive docs**: Visit `http://localhost:8000/docs` for Swagger UI with request/response schemas.

---

## 📁 Project Structure

```
stocksense/
├── 📄 AGENTS.md                   # Multi-agent coordination protocol
├── 📄 PRD.md                      # Product requirements document
├── 📄 docker-compose.yml          # One-command deployment
├── 📄 start.sh                    # Launch script
├── 📄 .env.example                # Environment variable template
│
├── 📁 docs/                       # Architecture documentation
│   ├── HLD.md                     # High-level design document
│   ├── HLD_mermaid.md             # Mermaid architecture diagrams
│   ├── sequence_diagrams.md       # Interaction flow specs
│   └── sequence_diagrams_mermaid.md
│
├── 📁 design/                     # UI/UX specifications
│   ├── DESIGN_DOC.md              # 16-screen design document
│   └── screens/                   # PNG mockups (16 screens)
│
├── 📁 shared/                     # Cross-agent contracts
│   ├── api-contracts.md           # REST API specifications
│   ├── schema.sql                 # Database DDL
│   └── design-tokens.css          # CSS custom properties
│
├── 📁 data/                       # Sample datasets
│   ├── sales_8weeks.csv           # 8-week sales history (pharmacy)
│   └── inventory.png              # Sample handwritten ledger
│
├── 📁 backend/                    # ⚙️ Python FastAPI
│   ├── main.py                    # App entry point + CORS + routers
│   ├── config.py                  # Environment configuration
│   ├── database.py                # SQLAlchemy engine + sessions
│   ├── seed_data.py               # Demo data seeder
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── routers/                   # API endpoint handlers
│   │   ├── auth.py                # JWT authentication
│   │   ├── upload.py              # CSV + OCR upload
│   │   ├── inventory.py           # CRUD + health + expiry
│   │   ├── forecast.py            # Prophet forecasting
│   │   ├── anomalies.py           # Z-score detection
│   │   ├── reorder.py             # Smart procurement
│   │   ├── alerts.py              # Alert management
│   │   ├── sales.py               # Sales recording
│   │   ├── settings.py            # User preferences
│   │   └── whatsapp.py            # Bot webhook
│   ├── models/                    # SQLAlchemy ORM models
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── sales.py
│   │   ├── forecast.py
│   │   ├── anomaly.py
│   │   ├── alert.py
│   │   ├── stock_movement.py
│   │   ├── notification.py
│   │   └── lookup.py
│   ├── schemas/                   # Pydantic request/response models
│   └── services/                  # Business logic + AI
│       ├── ai_client.py           # Unified AI gateway (3-provider fallback)
│       ├── forecast_service.py    # Prophet + SMA + external factors
│       ├── anomaly_service.py     # Z-score anomaly detection
│       ├── intelligence_service.py # Serper + Gemini intelligence
│       ├── ocr_service.py         # Handwriting OCR pipeline
│       ├── reorder_service.py     # Smart reorder calculation
│       └── lookup_data/           # Curated intelligence JSONs
│           ├── disease_seasons.json
│           ├── festival_calendar.json
│           └── weather_heuristics.json
│
├── 📁 frontend/                   # 🖥️ React + Vite
│   ├── src/
│   │   ├── App.jsx                # Router + layout
│   │   ├── pages/                 # 16 page components
│   │   │   ├── Landing.jsx
│   │   │   ├── onboarding/        # Language, BusinessType, ShopSetup
│   │   │   ├── upload/            # Upload, Verify
│   │   │   ├── dashboard/         # Overview, Forecasting, InventoryHealth, Scenarios
│   │   │   ├── products/          # ProductCatalog, ProductDetail
│   │   │   ├── sales/             # RecordSales
│   │   │   ├── Reorder.jsx
│   │   │   ├── Alerts.jsx
│   │   │   └── Settings.jsx
│   │   ├── components/            # Reusable UI components
│   │   │   ├── Layout/            # Sidebar, Header, Footer
│   │   │   └── PlotChart.jsx      # Plotly.js wrapper
│   │   ├── services/              # API client layer
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── i18n/                  # Translation JSON files (7 languages)
│   │   ├── styles/                # CSS files
│   │   └── utils/                 # Helper functions
│   ├── Dockerfile
│   └── vite.config.js
│
├── 📁 whatsapp-bot/               # 📱 Node.js Sidecar
│   ├── index.js                   # Express + WWebJS setup
│   ├── whatsapp-client.js         # Connection + QR management
│   ├── message-handler.js         # Command routing
│   ├── message-templates.js       # Formatted response builders
│   ├── config.js                  # Environment configuration
│   ├── Dockerfile
│   └── package.json
│
└── 📁 nginx/                      # 🌐 Reverse Proxy
    └── nginx.conf                 # Route :80 → frontend/backend
```

---

## 🔮 Roadmap

### Phase 1 — Foundation ✅
- [x] Backend API (FastAPI + SQLAlchemy + JWT auth)
- [x] Frontend SPA (React 18 + Vite + Plotly.js)
- [x] Database schema + seed data
- [x] 16-screen UI implementation
- [x] Docker Compose deployment

### Phase 2 — AI Core ✅
- [x] Prophet-based demand forecasting
- [x] Z-score anomaly detection (spike/drop/pattern)
- [x] Handwriting OCR (Gemini Vision + Hindi support)
- [x] Intelligence service (Serper + Gemini + JSON fallback)
- [x] Smart reorder engine
- [x] 3-provider AI fallback (Gemini → Ollama → OpenRouter)

### Phase 3 — WhatsApp Integration ✅
- [x] Node.js sidecar with whatsapp-web.js
- [x] Daily briefing templates
- [x] Two-way command handling (REORDER, LIST, REPORT)
- [x] Backend webhook integration

### Phase 4 — Intelligence Layer ✅
- [x] Real-time web search (Serper API)
- [x] Gemini-powered demand analysis with web context
- [x] Disease season boost (dengue, malaria, monsoon flu)
- [x] Festival calendar integration (Diwali, Holi, regional)
- [x] Weather heuristics (monsoon, heat wave, cold wave)

### Phase 5 — Future Enhancements 🔜
- [ ] Meta Business API migration (production WhatsApp)
- [ ] PostgreSQL + Redis (production data layer)
- [ ] Voice input via WhatsApp audio messages
- [ ] Supplier marketplace integration
- [ ] Multi-store chain management
- [ ] Barcode/QR scanning for inventory
- [ ] Push notifications (PWA)
- [ ] Automated purchase order generation

---

## 🏆 Hackathon Criteria Alignment

| NatWest Criteria | StockSense Implementation |
|:---|:---|
| **AI-powered forecasting** | Prophet + external factor overlays (disease, festival, weather) |
| **Uncertainty quantification** | Confidence bands (low/likely/high) with 80% interval |
| **Anomaly detection** | Z-score analysis on forecast residuals (spike/drop/pattern) |
| **Baseline comparison** | Naive "same as last period" dotted line overlay |
| **Explainability** | Plain-language driver text: "Dengue season active (+25%)" |
| **Non-expert usability** | WhatsApp-first, 7 languages, mobile-first dark UI |
| **Real-world applicability** | Designed for 12M+ Indian small businesses |
| **Technical innovation** | Handwriting OCR + disease intelligence + WhatsApp integration |

---

## 👥 Target Users

<div align="center">

| Persona | Business | Pain Point | StockSense Solution |
|:---|:---|:---|:---|
| 🏪 **Ramesh** | Kirana Store, Mumbai | Tracks 200 SKUs in a notebook | OCR → instant digital inventory |
| 🏥 **Dr. Priya** | Pharmacy, Chennai | Misses dengue-season medicine spikes | Disease intelligence auto-boosts forecasts |
| 📦 **Vikram** | Distributor, Delhi | Manages 50+ retailer orders | WhatsApp briefings + bulk reorder exports |

</div>

---

## 🤝 Contributing

This project was built as a multi-agent system with strict directory ownership:

| Agent | Workspace | Responsibility |
|:---|:---|:---|
| Agent 1 | `frontend/**` | React UI, pages, components, i18n |
| Agent 2 | `backend/**` (structure) | Routers, models, schemas, config |
| Agent 3 | `backend/services/**` | AI/ML service implementations |
| Agent 4 | `whatsapp-bot/**` | Node.js WhatsApp sidecar |

> See [AGENTS.md](AGENTS.md) for the complete multi-agent coordination protocol.

---

## 📜 License

MIT License — build something great with it.

---

<div align="center">

**StockSense** — *"From notebook to forecast in 60 seconds."*

Built with ❤️ for India's 12M+ small businesses

[![NatWest Hackathon 2026](https://img.shields.io/badge/NatWest%20Hackathon-2026-6366F1?style=for-the-badge)](https://natwest.com)

</div>
