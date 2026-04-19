# SupplySense — Product Requirements Document

> **AI-Powered Inventory Management & Demand Forecasting**
> *NatWest Hackathon — AI Predictive Forecasting Track*

---

## Table of Contents

1. [Product Overview](#1-product-overview)
2. [Problem Statement](#2-problem-statement)
3. [Target Users & Personas](#3-target-users--personas)
4. [User Journey](#4-user-journey)
5. [Information Architecture](#5-information-architecture)
6. [Feature Specifications](#6-feature-specifications)
7. [Dashboard & UI Specifications](#7-dashboard--ui-specifications)
8. [WhatsApp Notification System](#8-whatsapp-notification-system)
9. [Multilingual Support](#9-multilingual-support)
10. [Tech Stack](#10-tech-stack)
11. [API Contracts](#11-api-contracts)
12. [Database Schema](#12-database-schema)
13. [External Data Sources](#13-external-data-sources)
14. [Hackathon Judging Criteria Mapping](#14-hackathon-judging-criteria-mapping)
15. [Constraints & Known Limitations](#15-constraints--known-limitations)
16. [Implementation Roadmap](#16-implementation-roadmap)

---

## 1. Product Overview

### One-Line Pitch

> *"SupplySense turns any business's sales data — from a CSV or a photo of a notebook — into a continuously-updated inventory dashboard and 6-week AI demand forecast, managed entirely through WhatsApp in your language."*

### What It Is

A **complete, continuously-running inventory management system with an AI forecasting engine built in** — delivered as a responsive web application. Not just a prediction tool; a full operational platform that any business (kirana store, pharmacy, distributor, general retailer) can use daily.

| Layer | Purpose |
|---|---|
| **Layer 1 — Inventory Management** | Real-time stock tracking, reorder alerts, supplier management, product catalog. The operational core users interact with every day. |
| **Layer 2 — AI Forecasting Engine** | Sits on top of inventory data and continuously predicts what stock is needed, when, and how much — so the user never has to guess. |

### Positioning

- **Base system** = generic inventory + forecasting for **any** retail business.
- **Disease intelligence** = a specialized plugin layer that activates for **pharmacies and medical shops**.

### Three Unique Differentiators

| # | Differentiator | Why It Matters |
|---|---|---|
| 1 | **Handwriting OCR with verification** | Works even if your data is in a notebook. Trust layer before forecasting. |
| 2 | **Seasonal disease intelligence** | Medicine forecasts that know the Indian disease calendar — as a pharmacy-specific plugin. |
| 3 | **WhatsApp as primary interface** | Full inventory management through the app every Indian shopkeeper already uses. |

---

## 2. Problem Statement

Indian small businesses — kirana stores, pharmacies, medical shops — manage inventory on **gut feel and handwritten ledgers**. They have no tools to anticipate demand shifts from festivals, seasons, or disease outbreaks.

**The result:**
- Medicines expire on shelves while others run out during peak need.
- Grocers over-order before slow weeks and under-order before festivals.
- This is a **₹1.4 trillion inventory waste problem** in Indian retail alone.

**Larger businesses** have data but no accessible, affordable tool to act on it intelligently.

**SupplySense solves both** — accepting data in any format (digital or handwritten), producing actionable forecasts in plain language, and delivering alerts through WhatsApp.

---

## 3. Target Users & Personas

### Persona 1 — Ramesh (Kirana Store Owner, Tier-2 City)

| Attribute | Detail |
|---|---|
| **Age** | 45 |
| **Business** | Neighborhood grocery store, ~500 SKUs |
| **Data maturity** | Handwritten ledger, no digital records |
| **Language** | Hindi, limited English |
| **Tech comfort** | Uses WhatsApp and UPI daily, no experience with business software |
| **Pain points** | Over-orders perishables, runs out of staples during festivals, no visibility into slow-moving stock |
| **What he needs** | "Just tell me what to order and when — in Hindi, on WhatsApp" |

### Persona 2 — Dr. Priya (Pharmacy Owner, Metro City)

| Attribute | Detail |
|---|---|
| **Age** | 35 |
| **Business** | Medical shop attached to clinic, ~1200 SKUs |
| **Data maturity** | Mix of POS software exports (CSV) and handwritten notes |
| **Language** | English, Tamil |
| **Tech comfort** | Comfortable with web apps and dashboards |
| **Pain points** | Medicines expire before selling, seasonal disease spikes catch her off guard, manual reorder calculations |
| **What she needs** | Disease-season intelligence, expiry tracking, automated reorder suggestions |

### Persona 3 — Vikram (Regional Distributor)

| Attribute | Detail |
|---|---|
| **Age** | 50 |
| **Business** | FMCG distribution, 3 warehouses, ~5000 SKUs |
| **Data maturity** | Full digital records in Excel/CSV |
| **Language** | English, Marathi |
| **Tech comfort** | High — uses ERP, comfortable with dashboards |
| **Pain points** | Forecast accuracy is low, seasonal planning is manual, no anomaly detection |
| **What he needs** | Accurate forecasts with confidence bands, scenario planning, multi-location overview |

---

## 4. User Journey

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER JOURNEY                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. ONBOARD                                                     │
│     └── Choose language (Hindi, Tamil, Telugu, etc.)             │
│     └── Choose business type (Pharmacy / Grocery / Retail)      │
│     └── Enter basic details (shop name, city/state)             │
│                                                                 │
│  2. UPLOAD DATA                                                 │
│     └── CSV / Excel upload                                      │
│     └── Photo of handwritten ledger                             │
│     └── Manual entry form                                       │
│                                                                 │
│  3. VERIFY (trust layer — critical)                             │
│     └── Extracted data shown as table                           │
│     └── User confirms / corrects before any forecasting runs    │
│     └── Catches OCR errors, builds user trust                   │
│                                                                 │
│  4. INVENTORY BUILT                                             │
│     └── Product catalog auto-populated                          │
│     └── Current stock levels set                                │
│     └── User enters current stock quantities                    │
│                                                                 │
│  5. FORECAST GENERATED                                          │
│     └── Dashboard live within seconds                           │
│     └── Confidence bands shown immediately                      │
│     └── Baseline comparison visible                             │
│     └── Anomaly alerts if any                                   │
│                                                                 │
│  6. DAILY USE                                                   │
│     └── Update stock (sales made, new stock received)           │
│     └── Forecasts refresh automatically                         │
│     └── WhatsApp morning briefing at 8 AM                       │
│                                                                 │
│  7. WEEKLY                                                      │
│     └── Download AI reorder list → send to supplier             │
│     └── Review forecast accuracy vs actual sales                │
│     └── Weekly WhatsApp summary on Sunday                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Information Architecture

### Site Map

```
SupplySense Web App
│
├── / (Landing Page)
│   └── Hero, value prop, CTA → Sign Up / Login
│
├── /onboarding
│   ├── /language        — Language selection
│   ├── /business-type   — Pharmacy / Grocery / Retail / Other
│   └── /setup           — Shop name, city, state
│
├── /upload
│   ├── CSV / Excel uploader
│   ├── Image uploader (handwritten ledger)
│   ├── Manual entry form
│   └── /verify          — Extracted data table for confirmation
│
├── /dashboard
│   ├── /overview        — KPI cards, stock health summary
│   ├── /forecasting     — Per-product forecast charts
│   ├── /inventory       — Stock heatmap, expiry, slow-movers
│   └── /scenarios       — What-if simulation panel
│
├── /products
│   ├── Product catalog listing
│   ├── /[product-id]    — Individual product detail + forecast
│   └── /add             — Add new product
│
├── /reorder
│   ├── AI-generated reorder list
│   └── Export (CSV / PDF)
│
├── /alerts
│   ├── Active alert feed
│   └── Alert history
│
├── /settings
│   ├── /profile         — Shop details, region
│   ├── /notifications   — WhatsApp, email, push preferences
│   └── /language        — Change language
│
└── /whatsapp-connect
    └── QR code scan to link WhatsApp
```

---

## 6. Feature Specifications

### 6.1 Flexible Data Input

| Input Method | Description | Details |
|---|---|---|
| **CSV / Excel Upload** | Standard digital import | Auto-detects columns: product name, date, quantity, price. Preview table shown for column mapping confirmation. |
| **Image Upload (Handwriting OCR)** | Photo of handwritten ledger | Gemini Vision extracts product names, quantities, dates. Handles mixed Hindi/English, inconsistent date formats (`12 Jan`, `12/1`, `Jan 12`), quantities as words (`बारह` = 12). |
| **Manual Entry** | Form-based input | Product name, category, quantity, date, supplier, reorder point, expiry date. |
| **Bulk Import** | Excel with multiple sheets | Each sheet = one category or time period. |

> **IMPORTANT:** Data verification step is mandatory. After any OCR or auto-parsing, the extracted data is displayed as an editable table. The user must confirm or correct before forecasting runs. This is non-negotiable — it prevents bad predictions from bad data and builds trust.

### 6.2 Live Inventory Dashboard

| Feature | Description |
|---|---|
| **Stock level indicators** | Green (healthy) / Amber (low — approaching reorder point) / Red (critical — below safety stock or out of stock) |
| **Days of stock remaining** | Calculated per product: `current_stock / avg_daily_sales` |
| **Expiry date tracking** | Traffic-light system. Products expiring within 7 days flagged red. Critical for pharmacies and perishables. |
| **Low stock alerts** | Triggered when stock falls below user-defined reorder point. |
| **Out-of-stock alerts** | Triggered immediately when stock hits zero. |
| **Supplier info** | Supplier name, contact, lead time stored per product. Used by reorder engine. |
| **Category breakdown** | Stock health aggregated by category (medicines, groceries, electronics, etc.). |
| **Inventory value** | Total value of current stock calculated from unit cost × quantity. |

### 6.3 AI Forecasting Engine

#### Core Forecasting

| Spec | Detail |
|---|---|
| **Model** | Facebook Prophet (open-source, runs locally, no API cost) |
| **Forecast horizon** | 4–6 weeks ahead |
| **Output** | Three bands: **Low** (pessimistic) / **Likely** (central estimate) / **High** (optimistic) — never a single number |
| **Baseline** | Naive "same as last period" line always shown alongside the AI forecast for honest comparison |
| **Update frequency** | Forecasts recalculate automatically whenever new sales data is entered |
| **Granularity** | Per-product, per-week |

#### Forecast Explainability

Every forecast includes a **plain-language explanation of drivers**, generated by Gemini:

> *"Demand for Paracetamol expected to rise 40% next week — Dengue season is active, monsoon peaks this month, and your sales trended upward the last 3 Julys."*

Drivers shown per-product:
- Trend direction (growing / declining / flat)
- Seasonality component (festivals, holidays)
- Disease season factor (pharmacy mode)
- Weather/climate factor
- Historical anomaly memory
- Regional adjustment

#### Forecast Accuracy Tracking

| Metric | Description |
|---|---|
| **MAPE** | Mean Absolute Percentage Error — tracked per product per week |
| **Accuracy score** | Displayed on dashboard as a percentage: `"Forecast accuracy: 89%"` |
| **Predicted vs Actual chart** | Overlay of what the model predicted vs what actually sold — updated weekly |
| **Trend** | Is forecast accuracy improving or declining over time? |

### 6.4 Anomaly Detection

| Type | Detection Method | Example Alert |
|---|---|---|
| **Demand spike** | Z-score > 2.0 on Prophet residuals | *"Paracetamol demand is 3× normal this week — possible local illness outbreak. Reorder before Thursday."* |
| **Demand drop** | Z-score < -2.0 | *"Cold drink sales dropped 80% vs forecast — unusual for June. Check for supplier issue or competitor price cut."* |
| **New pattern** | 3+ consecutive weeks of consistent deviation | *"For 3 consecutive Fridays, Eggs sold 2× weekly average. Consider increasing Friday stock."* |
| **Expiry risk** | Stock quantity × days to expiry vs forecast demand | *"120 units of Cough Syrup expire in 10 days but forecasted sales are only 30 units. Consider a clearance promotion."* |

### 6.5 Scenario Planning

Users can test **what-if situations** before committing inventory decisions:

| Scenario | How It Works |
|---|---|
| **Discount simulation** | *"What if I run a 20% Diwali discount?"* → Multiplicative adjustment to baseline demand. Side-by-side forecast shown. |
| **Demand surge** | *"What if demand grows 15% next month?"* → Adjusted reorder quantities recalculated. |
| **Supplier delay** | *"What if my supplier delays by 2 weeks?"* → Stockout risk recalculated with extended lead time. |
| **Custom multiplier** | User enters their own growth/decline % → revised forecast shown instantly. |

**UI:** Two forecast charts side-by-side — "Current Forecast" vs "Scenario Forecast" — with the delta highlighted.

### 6.6 Seasonal Disease Intelligence Layer

> This feature activates **only when business type is set to Pharmacy**. For other business types, this section is hidden.

The system maps known Indian seasonal disease patterns to months and **automatically adjusts medicine forecasts upward *before* disease seasons hit** — giving enough lead time to reorder.

| Disease | Peak Months | Medicines Auto-flagged |
|---|---|---|
| Chickenpox | Feb – May | Calamine Lotion, Acyclovir, ORS |
| Dengue | Jul – Oct | Paracetamol, ORS, Platelet support |
| Flu / Cold | Dec – Feb | Antihistamines, Cough syrup, Vitamin C |
| Heat Stroke | Apr – Jun | ORS, Electrolytes, Glucose |
| Malaria | Jun – Sep | Chloroquine, Paracetamol |
| Conjunctivitis | Jul – Sep | Eye drops, Antihistamine |
| Typhoid | May – Aug | Antibiotics, ORS |

**Implementation:** Start with a hardcoded lookup table of 10–15 disease-to-month-to-medicine mappings. Label it *"Seasonal Health Intelligence Layer"* — honest, demonstrable, impressive.

**User-facing output:**

> 🦟 *"Dengue season is active in your region (Jul–Oct). Consider stocking 40% more ORS and Paracetamol than last year."*

### 6.7 Additional External Factors

These apply to **all business types**, not just pharmacies.

#### Indian Festival & Holiday Calendar

| Festival / Event | Affected Stock Categories |
|---|---|
| Diwali | Sweets, dry fruits, gift items, diyas, crackers |
| Holi | Colors, water guns, skin creams, ORS |
| Navratri / Durga Puja | Fasting foods, fruits, dairy |
| Eid | Sweets, meat, vermicelli, dairy |
| Christmas / New Year | Beverages, snacks, party items |
| Exam Season (Mar, Nov) | Energy drinks, stationery |
| Wedding Season (Nov–Feb) | Dairy, sweets, beverages |

#### Weather & Climate Triggers

| Weather Condition | Affected Stock |
|---|---|
| Summer (Apr–Jun) | Cold drinks, ORS, ice cream, sunscreen, cooling oils |
| Monsoon (Jul–Sep) | Umbrellas, raincoats, anti-fungal creams, mosquito repellent |
| Winter (Nov–Jan) | Woolens, hot beverages, Vicks, moisturizers |

#### Regional Patterns

- User selects **state/city at onboarding**.
- System adjusts baseline demand assumptions:
  - Kerala sees different monsoon intensity than Rajasthan.
  - Punjab has different wedding season buying patterns than Tamil Nadu.
  - Coastal regions have higher demand for certain foods year-round.

#### Historical Anomaly Memory

> *"Last October your Paracetamol sales tripled in Week 3. That week is 10 days away — consider restocking now."*

The system remembers past unexpected spikes/drops at the same time of year and pre-warns the user.

#### Combined Intelligence Prompt

All factors are **combined into a single Gemini prompt per product** — not five separate alerts. Output is one ranked, plain-language recommendation:

> 📋 **This week's stocking intelligence**
> - **Paracetamol** — stock 60% more than usual. Dengue season is active and monsoon peaks this month. Last July you ran out in week 3.
> - **ORS Sachets** — stock 40% more. Heat and Dengue both drive demand simultaneously.
> - **Mosquito repellent** — reorder now. Current stock will last ~4 days at forecasted demand.
> - **Eid stock** — Sevai, dairy, and sweets demand will spike in 12 days.

### 6.8 Smart Reorder Engine

| Feature | Description |
|---|---|
| **Optimal reorder qty** | Calculated as: `forecasted_demand × lead_time_days + safety_stock − current_stock` |
| **Urgency ranking** | Products ranked by days-to-stockout. Most urgent at top. |
| **Supplier grouping** | Reorder list grouped by supplier for easier ordering. |
| **Export** | One-click export as **CSV** or **PDF** — formatted to send directly to supplier. |
| **Cost estimate** | Estimated reorder cost based on last purchase price × suggested quantity. |

---

## 7. Dashboard & UI Specifications

### 7.1 Design Principles

| Principle | Implementation |
|---|---|
| **Mobile-first** | Indian shopkeepers will use this on phones. Every screen must work on 360px width. |
| **Minimal cognitive load** | Max 3 actions per screen. Plain language everywhere. |
| **Visual-first** | Charts, color-coding, and icons over text tables. |
| **Dark mode support** | Default to light mode; dark mode toggle available. |
| **Accessibility** | WCAG 2.1 AA. High contrast. Large touch targets (min 44px). |

### 7.2 Overview Dashboard

**Purpose:** Headline KPIs — the "at a glance" screen.

| Component | Content |
|---|---|
| **KPI Cards (top row)** | Total SKUs · Items below reorder point · Stockout risk items · Forecast accuracy score · Total inventory value (₹) |
| **Stock health donut** | Pie/donut chart: % Green / Amber / Red products |
| **Alert feed** | Last 5 active alerts (clickable → full alert detail) |
| **Quick actions** | "Upload Data" · "View Reorder List" · "Run Scenario" |
| **Stocking intelligence banner** | Combined AI recommendation (see §6.7) |

### 7.3 Forecasting Dashboard

**Purpose:** Per-product forecast visualization.

| Component | Content |
|---|---|
| **Product selector** | Dropdown or search to pick a product |
| **Forecast chart** | Line chart: solid line = central estimate, shaded ribbon = confidence band (low/high). Dotted line = naive baseline. X-axis = weeks, Y-axis = units. |
| **Anomaly markers** | Red dots on chart where actuals exceeded the upper band |
| **Driver explanation** | Text panel below chart: *"Forecast drivers: Dengue season (+25%), monsoon (+10%), upward trend (+8%)"* |
| **Accuracy panel** | Predicted vs Actual overlay for the last 4 weeks. MAPE displayed. |
| **Scenario toggle** | Button: "Test a scenario" → opens side-by-side comparison panel |

### 7.4 Inventory Health Dashboard

**Purpose:** Identifying problems before they cost money.

| Component | Content |
|---|---|
| **Stock heatmap** | Grid: rows = products, columns = days. Color intensity = stock level. Instantly shows which products are running low. |
| **Days remaining bar chart** | Horizontal bars per product — length = days of stock remaining. Red zone marked. |
| **Expiry timeline** | Calendar-style view: products plotted by expiry date. Items expiring within 7 days highlighted red. |
| **Slow-moving stock list** | Products with <10% of stock sold in last 30 days. Flagged with recommendation: *"Consider clearance pricing or return to supplier."* |
| **Category breakdown** | Bar chart: stock value by category (medicines, groceries, etc.). |

### 7.5 Chart Library

All charts rendered with **Plotly** (interactive, mobile-responsive, supports shaded confidence bands natively).

| Chart Type | Used For |
|---|---|
| Line + shaded ribbon | Forecast with confidence bands |
| Dotted overlay line | Naive baseline comparison |
| Heatmap | Stock levels by product × time |
| Horizontal bar | Days of stock remaining |
| Donut | Stock health distribution |
| Scatter with markers | Anomaly points on forecast |
| Side-by-side dual chart | Scenario comparison |

---

## 8. WhatsApp Notification System

### 8.1 Role

WhatsApp is a **primary interface**, not just a notification channel. Users can manage their entire inventory through WhatsApp commands without ever opening the web app.

### 8.2 Technology

| Environment | Tool | Notes |
|---|---|---|
| **Hackathon demo** | `whatsapp-web.js` | Free, unlimited, no business verification. Scan QR code with any WhatsApp account. Setup < 1 hour. |
| **Production** | Meta WhatsApp Business API | Requires business verification. No message limits. |

### 8.3 Alert Types

| Type | Trigger | Timing | Channel |
|---|---|---|---|
| 🔴 **Stockout** | Stock hits 0 | Immediate | WhatsApp + In-app |
| 🟠 **Low stock** | Below reorder point | Immediate | WhatsApp + In-app |
| 🟡 **Daily briefing** | Schedule | 8 AM daily | WhatsApp |
| 🟢 **Seasonal warning** | 14 days before event | Advance | WhatsApp + In-app |
| 📊 **Weekly summary** | Schedule | Sunday 7 PM | WhatsApp + Email |
| 📈 **Anomaly spike** | Z-score breach | Immediate | WhatsApp + In-app |
| ⏰ **Expiry warning** | 7 days to expiry | Daily | In-app |

### 8.4 Message Templates

#### 🔴 Stockout Alert (Immediate)

```
🚨 *SupplySense Alert*

*Paracetamol 500mg* is OUT OF STOCK.

Your last 3 units were sold today.
Dengue season is currently active in your region.

📦 Suggested reorder: *200 units*
🏪 Supplier: Mehta Pharma — 98XXXXXXXX

Reply *REORDER* to generate order slip.
```

#### 🟡 Daily Briefing (8 AM)

```
🌅 *Good Morning — SupplySense Daily Brief*
📅 Saturday, 12 April

*Today's Stock Health*
✅ 47 products — Good
🟡 4 products — Low stock
🔴 1 product — Out of stock

*Today's Intelligence*
🦟 Dengue season active — ORS demand up 40%
🛕 Ram Navami in 3 days — sweets & puja items

*Top Action*
Reorder Paracetamol, ORS, and Calamine today.

Reply *REPORT* for full details.
```

#### 📊 Weekly Summary (Sunday 7 PM)

```
📊 *SupplySense Weekly Summary*
Week of 7–13 April

*Performance*
📈 Forecast accuracy: 89%
✅ Stockouts prevented: 3
💰 Estimated revenue saved: ₹4,200

*This week's top movers*
↑ ORS Sachets +65% (Dengue season)
↑ Electrolytes +40% (Heat wave)
↓ Cold drinks -20% (Unexpected dip)

*Next week watch*
⚠️ Ram Navami on Wednesday
   Stock up: Sweets, Puja items, Dairy

Reply *FULL* for detailed report.
```

### 8.5 Two-Way Reply Commands

| User Replies | System Response |
|---|---|
| `REORDER` | Sends formatted reorder list for all low stock items |
| `LIST` | Sends today's full inventory status |
| `REPORT` | Sends detailed forecast report |
| `FULL` | Sends complete weekly PDF report link |
| `STATUS` | Current stock health summary |
| `STOP` | Pauses all notifications |
| `HELP` | Lists all available commands |

### 8.6 Notification Preferences (Web UI Settings)

```
🔔 Notification Preferences

Critical stockout alerts          ● ON   (always on, cannot disable)
Daily reorder reminders           ● ON   Time: [8:00 AM ▼]
Weekly forecast briefing          ● ON   Day:  [Monday ▼]
Seasonal event warnings           ● ON   How early: [14 days ▼]
Anomaly / spike alerts            ● ON
Weekly summary report             ● ON
Slow-moving stock reminders       ● OFF

Delivery channel:
  ✓ In-app
  ✓ WhatsApp  +91 [__________]
  ✓ Email     [________________]
```

---

## 9. Multilingual Support

### 9.1 Supported Languages

| Language | Script | Locale Code |
|---|---|---|
| English | Latin | `en` |
| Hindi | Devanagari | `hi` |
| Tamil | Tamil | `ta` |
| Telugu | Telugu | `te` |
| Marathi | Devanagari | `mr` |
| Bengali | Bengali | `bn` |
| Gujarati | Gujarati | `gu` |

### 9.2 What Gets Translated

| Content Type | Translation Method |
|---|---|
| UI labels & navigation | Static translation files (JSON i18n) |
| AI forecast summaries | Gemini generates directly in target language |
| Anomaly alerts | Gemini generates directly in target language |
| WhatsApp messages | Gemini generates directly in target language |
| Product names | Preserved as-is (user's own language) |
| Chart labels & axes | Static translation files |

### 9.3 Onboarding Screen

```
┌──────────────────────────────────────┐
│                                      │
│   अपनी भाषा चुनें                     │
│   Choose your language               │
│                                      │
│   ○ English                          │
│   ○ हिंदी (Hindi)                     │
│   ○ தமிழ் (Tamil)                     │
│   ○ తెలుగు (Telugu)                   │
│   ○ मराठी (Marathi)                   │
│   ○ বাংলা (Bengali)                   │
│   ○ ગુજરાતી (Gujarati)               │
│                                      │
│          [ Continue → ]              │
│                                      │
└──────────────────────────────────────┘
```

---

## 10. Tech Stack

> Every component in this stack is **100% free** — no paid APIs, no trial limits that expire during demos.

| Layer | Tool | Why |
|---|---|---|
| **Frontend** | React (Vite) | Fast build, component-based, rich ecosystem for charts and UI |
| **Styling** | Vanilla CSS + CSS Variables | Full control, design tokens, dark mode support |
| **Charts** | Plotly.js | Interactive charts, native shaded confidence bands, mobile-responsive |
| **Backend** | Python (FastAPI) | Fast REST API, async support, easy integration with Prophet |
| **Forecasting** | Facebook Prophet | Open source, handles seasonality natively, no API cost |
| **Anomaly Detection** | Z-score on Prophet residuals | Lightweight, explainable, no external dependency |
| **OCR + AI Summaries + Translation** | Google Gemini 2.0 Flash API | Free 1M tokens/day, handles vision + text + multilingual natively |
| **Fallback AI** | OpenRouter free tier | Aggregates free models (Llama, Mistral, Qwen) as backup |
| **WhatsApp** | `whatsapp-web.js` | Free, no business verification, hackathon-ready |
| **Database** | SQLite | Zero config, file-based, sufficient for single-instance demo |
| **Export** | pandas → CSV / ReportLab → PDF | Reorder list exports |
| **Hosting (demo)** | Local dev server / Render free tier | For hackathon presentation |

### Tech Stack Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Dashboard │  │ Upload   │  │ Forecast │  │   Settings     │  │
│  │ Overview  │  │ & Verify │  │ Charts   │  │   Page         │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────────────┘  │
│       │              │              │             │               │
│       └──────────────┴──────┬───────┴─────────────┘              │
│                             │ REST API (Fetch / Axios)           │
└─────────────────────────────┼───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                    BACKEND (Python FastAPI)                      │
│                                                                  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────────┐  │
│  │ Inventory │  │ Forecast │  │ Anomaly  │  │   Reorder      │  │
│  │ Service   │  │ Engine   │  │ Detector │  │   Engine       │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └───┬────────────┘  │
│       │              │              │             │               │
│  ┌────┴──────────────┴──────────────┴─────────────┴──────────┐  │
│  │                    SQLite Database                          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐  │
│  │ Gemini API     │  │ Prophet        │  │ WhatsApp          │  │
│  │ (OCR + NLP)    │  │ (Local)        │  │ (whatsapp-web.js) │  │
│  └────────────────┘  └────────────────┘  └───────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 11. API Contracts

### 11.1 Data Upload

```
POST /api/upload/csv
Content-Type: multipart/form-data
Body: file (CSV/Excel)
Response: {
  "products": [...],
  "rows_parsed": 150,
  "needs_verification": true
}

POST /api/upload/image
Content-Type: multipart/form-data
Body: image (JPEG/PNG of handwritten ledger)
Response: {
  "extracted_data": [...],
  "confidence": 0.87,
  "needs_verification": true
}

POST /api/upload/verify
Body: {
  "verified_data": [...],
  "corrections": [...]
}
Response: {
  "products_created": 25,
  "inventory_updated": true
}
```

### 11.2 Inventory

```
GET    /api/inventory                    — List all products with stock levels
GET    /api/inventory/:id                — Single product detail
POST   /api/inventory                    — Add product manually
PUT    /api/inventory/:id                — Update stock / product info
GET    /api/inventory/health             — Aggregated health metrics (KPIs)
GET    /api/inventory/expiring?days=7    — Products expiring within N days
```

### 11.3 Forecasting

```
GET    /api/forecast/:product_id         — Forecast for single product
Response: {
  "forecast": [
    { "week": "2026-W16", "low": 60, "likely": 85, "high": 120 },
    ...
  ],
  "baseline": [...],
  "drivers": "...",
  "accuracy": { "mape": 11.2 }
}

GET    /api/forecast/all                 — Forecasts for all products (summary)

POST   /api/forecast/scenario            — Run a what-if scenario
Body: {
  "product_id": "...",
  "scenario_type": "discount",
  "value": 20
}
Response: {
  "original_forecast": [...],
  "scenario_forecast": [...],
  "delta": [...]
}
```

### 11.4 Anomalies

```
GET    /api/anomalies                    — All active anomalies
GET    /api/anomalies/:product_id        — Anomalies for a specific product
Response: {
  "anomalies": [
    {
      "date": "...",
      "type": "spike",
      "z_score": 2.8,
      "explanation": "..."
    }
  ]
}
```

### 11.5 Reorder

```
GET    /api/reorder                      — AI-generated reorder list
GET    /api/reorder/export?format=csv    — Export reorder list as CSV
GET    /api/reorder/export?format=pdf    — Export reorder list as PDF
```

### 11.6 Alerts & Notifications

```
GET    /api/alerts                       — Active alerts
PUT    /api/alerts/:id/dismiss           — Dismiss an alert
GET    /api/notifications/settings       — Notification preferences
PUT    /api/notifications/settings       — Update preferences
POST   /api/whatsapp/connect             — Initiate WhatsApp QR code pairing
GET    /api/whatsapp/status              — Connection status
```

---

## 12. Database Schema

```sql
-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_name     TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN ('pharmacy', 'grocery', 'retail', 'other')),
    city          TEXT,
    state         TEXT,
    language      TEXT DEFAULT 'en',
    phone         TEXT,
    email         TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id          INTEGER NOT NULL REFERENCES users(id),
    name             TEXT NOT NULL,
    category         TEXT,
    unit             TEXT DEFAULT 'units',
    current_stock    REAL DEFAULT 0,
    reorder_point    REAL DEFAULT 0,
    safety_stock     REAL DEFAULT 0,
    unit_cost        REAL DEFAULT 0,
    supplier_name    TEXT,
    supplier_contact TEXT,
    lead_time_days   INTEGER DEFAULT 3,
    expiry_date      DATE,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sales_history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    date        DATE NOT NULL,
    quantity    REAL NOT NULL,
    revenue     REAL,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE forecasts (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    week_start  DATE NOT NULL,
    low         REAL NOT NULL,
    likely      REAL NOT NULL,
    high        REAL NOT NULL,
    baseline    REAL NOT NULL,
    drivers     TEXT,           -- JSON: list of driver factors
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE anomalies (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    date        DATE NOT NULL,
    type        TEXT CHECK (type IN ('spike', 'drop', 'pattern')),
    z_score     REAL,
    explanation TEXT,
    dismissed   BOOLEAN DEFAULT FALSE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE alerts (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id        INTEGER NOT NULL REFERENCES users(id),
    product_id     INTEGER REFERENCES products(id),
    type           TEXT NOT NULL,  -- 'stockout', 'low_stock', 'expiry', 'anomaly', 'seasonal', 'reorder'
    severity       TEXT CHECK (severity IN ('critical', 'warning', 'info')),
    title          TEXT NOT NULL,
    message        TEXT NOT NULL,
    dismissed      BOOLEAN DEFAULT FALSE,
    sent_whatsapp  BOOLEAN DEFAULT FALSE,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE stock_movements (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id  INTEGER NOT NULL REFERENCES products(id),
    type        TEXT CHECK (type IN ('sale', 'restock', 'adjustment', 'return')),
    quantity    REAL NOT NULL,  -- negative for sales, positive for restocks
    notes       TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE forecast_accuracy (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id       INTEGER NOT NULL REFERENCES products(id),
    week_start       DATE NOT NULL,
    predicted_likely REAL NOT NULL,
    actual           REAL NOT NULL,
    mape             REAL,        -- Mean Absolute Percentage Error
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- LOOKUP TABLES
-- ============================================

CREATE TABLE disease_seasons (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    disease     TEXT NOT NULL,
    start_month INTEGER NOT NULL,  -- 1-12
    end_month   INTEGER NOT NULL,
    medicines   TEXT NOT NULL,     -- JSON array of medicine names
    boost_pct   REAL DEFAULT 40   -- % increase to apply to forecast
);

CREATE TABLE festival_calendar (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    month               INTEGER NOT NULL,
    affected_categories TEXT NOT NULL,      -- JSON array
    demand_multiplier   REAL DEFAULT 1.5
);
```

---

## 13. External Data Sources

| Data | Source | Usage |
|---|---|---|
| Disease-season mappings | Hardcoded lookup table (10–15 entries) | Auto-adjust pharmacy forecasts |
| Indian festival calendar | Hardcoded lookup table (12–15 festivals) | Demand spike predictions |
| Weather/climate patterns | Month + region heuristics (no API) | Seasonal demand adjustments |
| Regional demand baselines | State-level heuristics from census/trade data | Cold-start defaults |

> For the hackathon, **all external data is hardcoded in lookup tables** — no live APIs for weather or disease surveillance. This is intentional: it keeps the system fast, free, and deterministic. In production, these could be upgraded to live feeds (e.g., IDSP disease surveillance API, OpenWeatherMap).

---

## 14. Hackathon Judging Criteria Mapping

| Criterion | How SupplySense Covers It | Section |
|---|---|---|
| **Forecast with uncertainty range** | Low / Likely / High confidence bands on every product forecast | §6.3 |
| **Baseline comparison** | Naive "same as last period" baseline always shown alongside AI forecast | §6.3 |
| **Anomaly detection** | Z-score alerts with plain-language cause explanation, both spike and drop | §6.4 |
| **Scenario planning** | Discount, demand surge, supplier delay simulations with side-by-side charts | §6.5 |
| **Non-expert explanations** | Gemini generates driver explanations and summaries in local language | §6.3, §9 |
| **Forecast accuracy** | Predicted vs actual tracked and scored over time | §6.3 |
| **Transparent data sources** | Data verification step before forecasting; all factors explained per-forecast | §6.1, §6.3 |
| **Lightweight and fast** | Prophet runs locally; Gemini only called for text generation, not compute | §10 |

---

## 15. Constraints & Known Limitations

| Constraint | How SupplySense Handles It |
|---|---|
| **OCR errors from messy handwriting** | User verifies extracted table before forecasting runs. Editable cells for corrections. |
| **Sparse or new product data** | Fallback heuristics — category-level averages and seasonal priors fill gaps until enough product-level data accumulates. |
| **Cold start (new user, no history)** | System uses regional and seasonal defaults. Forecast accuracy improves as data grows. Clear messaging: *"Predictions will improve as more sales data is added."* |
| **Mixed scripts in ledgers** | Gemini Vision handles Hindi/English in the same image natively. |
| **WhatsApp rate limits** | `whatsapp-web.js` has no official rate limits but can be throttled. Batch messages in digest format rather than per-product alerts. |
| **Prophet requires 2+ seasons of data** | For products with < 8 weeks of data, fallback to simple moving average with wider confidence bands. Clearly labeled as *"Limited data — forecast is approximate."* |
| **Free API tier limits** | Gemini: 1M tokens/day (more than sufficient). OpenRouter as fallback. Prophet runs entirely locally. |
| **Single-user SQLite** | Sufficient for hackathon demo. Production would migrate to PostgreSQL or Supabase. |

---

## 16. Implementation Roadmap

### Phase 1 — Foundation (Day 1)

| Task | Deliverable |
|---|---|
| Project scaffolding | React (Vite) frontend + FastAPI backend |
| Database setup | SQLite schema created, seed data loaded |
| Basic UI shell | Navigation, layout, responsive skeleton |
| CSV upload + parsing | Upload page, column auto-detection, preview table |
| Manual product entry | Form to add/edit products |

### Phase 2 — Core Intelligence (Day 1–2)

| Task | Deliverable |
|---|---|
| Prophet integration | Forecast engine: input sales history → output 3-band forecast |
| Baseline calculation | Naive "same as last period" baseline computed alongside |
| Z-score anomaly detection | Anomaly detection on Prophet residuals |
| Forecast API endpoints | REST API serving forecast data to frontend |
| Inventory dashboard | Live stock levels, health indicators, KPI cards |

### Phase 3 — AI Integration (Day 2)

| Task | Deliverable |
|---|---|
| Gemini Vision OCR | Image upload → extracted table → verification screen |
| Gemini text summaries | Forecast driver explanations, anomaly alerts in plain language |
| Multilingual output | Gemini generates all text in selected language |
| Disease season layer | Hardcoded lookup table + automatic forecast adjustment for pharmacies |
| Festival/weather factors | Lookup tables integrated into forecast context |

### Phase 4 — Advanced Features (Day 2–3)

| Task | Deliverable |
|---|---|
| Scenario planning | What-if UI with side-by-side forecast comparison |
| Smart reorder engine | Auto-calculated reorder quantities, export to CSV/PDF |
| Forecast accuracy tracking | Predicted vs actual comparison, MAPE scoring |
| Three dashboards | Overview, Forecasting, Inventory Health — fully interactive |

### Phase 5 — WhatsApp & Polish (Day 3)

| Task | Deliverable |
|---|---|
| WhatsApp integration | `whatsapp-web.js` setup, QR pairing, message sending |
| Two-way commands | Reply handler for REORDER, LIST, REPORT, STATUS |
| Alert system | All alert types wired to WhatsApp + in-app |
| Notification settings | Preferences panel in settings page |
| UI polish | Animations, transitions, responsive fixes, dark mode |
| Demo preparation | Sample dataset loaded, walkthrough script written |

### Phase 6 — Demo Ready

| Task | Deliverable |
|---|---|
| Sample dataset | Realistic 6-month sales history for a pharmacy (15–20 products) |
| Live demo flow | Onboarding → upload → verify → dashboard → forecast → WhatsApp alert |
| README | One-line pitch, setup instructions, `.env.example`, screenshots |
| Video recording | 3-minute walkthrough of key features |

---

## Environment Variables (`.env.example`)

```env
# Google Gemini API (free tier)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenRouter fallback (free tier)
OPENROUTER_API_KEY=your_openrouter_key_here

# WhatsApp (no key needed — QR code pairing)
WHATSAPP_ENABLED=true

# App config
APP_PORT=8000
FRONTEND_PORT=5173
DATABASE_PATH=./SupplySense.db
DEFAULT_LANGUAGE=en
DEFAULT_FORECAST_WEEKS=6
```

---

> **SupplySense** — *"From notebook to forecast in 60 seconds."*
