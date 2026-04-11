-- ============================================
-- StockSense Database Schema
-- Source of truth for all agents
-- ============================================

-- CORE TABLES

CREATE TABLE users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    shop_name     TEXT NOT NULL,
    business_type TEXT NOT NULL CHECK (business_type IN ('pharmacy', 'grocery', 'retail', 'other')),
    city          TEXT,
    state         TEXT,
    language      TEXT DEFAULT 'en',
    phone         TEXT,
    email         TEXT,
    password_hash TEXT NOT NULL,
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
    drivers     TEXT,
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
    type           TEXT NOT NULL,
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
    quantity    REAL NOT NULL,
    notes       TEXT,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE forecast_accuracy (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id       INTEGER NOT NULL REFERENCES products(id),
    week_start       DATE NOT NULL,
    predicted_likely REAL NOT NULL,
    actual           REAL NOT NULL,
    mape             REAL,
    created_at       DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- LOOKUP TABLES

CREATE TABLE disease_seasons (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    disease     TEXT NOT NULL,
    start_month INTEGER NOT NULL,
    end_month   INTEGER NOT NULL,
    medicines   TEXT NOT NULL,
    boost_pct   REAL DEFAULT 40
);

CREATE TABLE festival_calendar (
    id                  INTEGER PRIMARY KEY AUTOINCREMENT,
    name                TEXT NOT NULL,
    month               INTEGER NOT NULL,
    affected_categories TEXT NOT NULL,
    demand_multiplier   REAL DEFAULT 1.5
);

-- NOTIFICATION PREFERENCES

CREATE TABLE notification_preferences (
    id                    INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id               INTEGER NOT NULL REFERENCES users(id) UNIQUE,
    stockout_alerts       BOOLEAN DEFAULT TRUE,
    low_stock_alerts      BOOLEAN DEFAULT TRUE,
    daily_briefing        BOOLEAN DEFAULT TRUE,
    daily_briefing_time   TEXT DEFAULT '08:00',
    weekly_summary        BOOLEAN DEFAULT TRUE,
    weekly_summary_day    TEXT DEFAULT 'sunday',
    seasonal_warnings     BOOLEAN DEFAULT TRUE,
    seasonal_advance_days INTEGER DEFAULT 14,
    anomaly_alerts        BOOLEAN DEFAULT TRUE,
    channel_in_app        BOOLEAN DEFAULT TRUE,
    channel_whatsapp      BOOLEAN DEFAULT TRUE,
    channel_email         BOOLEAN DEFAULT FALSE,
    created_at            DATETIME DEFAULT CURRENT_TIMESTAMP
);
