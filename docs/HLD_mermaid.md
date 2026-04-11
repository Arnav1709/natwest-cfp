# StockSense — HLD (Mermaid Diagrams)

> All architecture diagrams from the HLD rendered as Mermaid code.

---

## 1. System Context Diagram

```mermaid
graph TB
    subgraph Actors
        SO["🏪 Shop Owner<br/>(Web App)"]
        WU["📱 WhatsApp User<br/>(Messaging)"]
        AD["📊 Admin / Distributor<br/>(Web App)"]
    end

    subgraph StockSense["StockSense System"]
        FE["React Frontend<br/>(Vite + Plotly.js)"]
        BE["FastAPI Backend<br/>(Python)"]
        DB["Database<br/>(SQLite / PostgreSQL)"]
    end

    subgraph External["External Services"]
        GEM["Google Gemini API<br/>(OCR + NLP)"]
        PRO["Facebook Prophet<br/>(Local Forecasting)"]
        WA["whatsapp-web.js<br/>(Node.js Bot)"]
    end

    SO --> FE
    WU --> WA
    AD --> FE
    FE --> BE
    BE --> DB
    BE --> GEM
    BE --> PRO
    BE --> WA
```

---

## 2. Logical Architecture (Layered)

```mermaid
graph TB
    subgraph Clients["CLIENT LAYER"]
        REACT["React SPA<br/>(Vite + Plotly)"]
        WABOT["WhatsApp Bot<br/>(whatsapp-web.js)"]
        EXPORT["Export Consumer<br/>(CSV / PDF)"]
    end

    subgraph Gateway["GATEWAY LAYER"]
        NGINX["Nginx / Caddy<br/>Reverse Proxy + SSL"]
    end

    subgraph API["API LAYER (FastAPI Routers)"]
        R_AUTH["/auth"]
        R_UPLOAD["/upload"]
        R_INV["/inventory"]
        R_FORE["/forecast"]
        R_ANOM["/anomalies"]
        R_REORD["/reorder"]
        R_ALERT["/alerts"]
        R_SET["/settings"]
        R_WA["/whatsapp"]
    end

    subgraph Services["SERVICE LAYER"]
        S_INV["Inventory<br/>Service"]
        S_FORE["Forecast<br/>Service"]
        S_ANOM["Anomaly<br/>Service"]
        S_REORD["Reorder<br/>Service"]
        S_ALERT["Alert<br/>Service"]
        S_OCR["OCR<br/>Service"]
        S_I18N["I18n<br/>Service"]
        S_WA["WhatsApp<br/>Service"]
    end

    subgraph Infra["INFRASTRUCTURE LAYER"]
        PG["Database<br/>(PG / SQLite)"]
        REDIS["Redis<br/>(Cache + Broker)"]
        CELERY["Celery<br/>(Task Queue)"]
        MINIO["MinIO / LocalFS<br/>(File Storage)"]
    end

    subgraph ExtSvc["EXTERNAL INTEGRATIONS"]
        GEMINI["Google Gemini<br/>(Free Tier)"]
        PROPHET["FB Prophet<br/>(Local Engine)"]
        WAWEB["whatsapp-web.js<br/>(Node Sidecar)"]
    end

    REACT --> NGINX
    WABOT --> NGINX
    EXPORT --> NGINX
    NGINX --> API

    R_AUTH --> S_INV
    R_UPLOAD --> S_OCR
    R_INV --> S_INV
    R_FORE --> S_FORE
    R_ANOM --> S_ANOM
    R_REORD --> S_REORD
    R_ALERT --> S_ALERT
    R_SET --> S_INV
    R_WA --> S_WA

    S_INV --> PG
    S_FORE --> PG
    S_FORE --> PROPHET
    S_FORE --> GEMINI
    S_ANOM --> PG
    S_REORD --> PG
    S_ALERT --> PG
    S_ALERT --> S_WA
    S_OCR --> GEMINI
    S_OCR --> MINIO
    S_I18N --> GEMINI
    S_WA --> WAWEB

    S_FORE --> CELERY
    S_OCR --> CELERY
    S_ALERT --> CELERY
    CELERY --> REDIS
```

---

## 3. Data Ingestion Pipeline

```mermaid
flowchart LR
    INPUT["📄 CSV / 📷 Image / ✍️ Manual"]
    PARSE["Parser / OCR<br/>(Gemini Vision)"]
    VERIFY["✅ Verification Stage<br/>(User Edits & Confirms)"]
    DB_STORE["💾 Database<br/>(Products + Sales History)"]
    TRIGGER["⚙️ Trigger:<br/>Forecast Recalculation"]
    PROPHET_E["🔮 Prophet Engine<br/>(per-product)"]
    ANOMALY_E["🚨 Anomaly Detection<br/>(Z-score)"]
    GEMINI_E["🧠 Gemini NLP<br/>(Explanations)"]
    ALERT_E["🔔 Alert Engine<br/>(Multi-channel)"]
    DASH["📊 Dashboard / API"]
    WEB["🌐 Web UI"]
    WAPP["📱 WhatsApp"]
    EMAIL["📧 Email"]

    INPUT --> PARSE --> VERIFY --> DB_STORE --> TRIGGER
    TRIGGER --> PROPHET_E
    TRIGGER --> ANOMALY_E
    PROPHET_E --> GEMINI_E
    ANOMALY_E --> ALERT_E
    GEMINI_E --> DASH
    ALERT_E --> DASH
    DASH --> WEB
    DASH --> WAPP
    DASH --> EMAIL
```

---

## 4. Forecast Generation Pipeline

```mermaid
flowchart TD
    START(["Start: product_id"])
    FETCH["1. Fetch sales_history<br/>from Database"]
    CHECK{"2. Data >= 8 weeks?"}
    PROPHET["3a. Run Prophet<br/>fit & predict 6 weeks"]
    SMA["3b. Fallback: Simple Moving Avg<br/>wider confidence bands"]
    BASELINE["4. Compute Naive Baseline<br/>(same as last period)"]
    ENRICH["5. Enrich with External Factors"]
    DISEASE["Disease Season Boost<br/>(pharmacy only)"]
    FESTIVAL["Festival Calendar<br/>Multiplier"]
    WEATHER["Weather / Climate<br/>Heuristic"]
    HISTORY["Historical Anomaly<br/>Memory"]
    ZSCORE["6. Z-score Anomaly Detection<br/>on residuals"]
    GEMINI_NLP["7. Gemini NLP<br/>Generate explanation<br/>in user's language"]
    STORE["8. Store Results"]
    STORE_F["forecasts table"]
    STORE_A["anomalies table"]
    STORE_ACC["forecast_accuracy table"]
    ALERTS["9. Trigger Alerts<br/>(stockout risk, anomaly, seasonal)"]

    START --> FETCH --> CHECK
    CHECK -->|"Yes"| PROPHET
    CHECK -->|"No"| SMA
    PROPHET --> BASELINE
    SMA --> BASELINE
    BASELINE --> ENRICH
    ENRICH --> DISEASE
    ENRICH --> FESTIVAL
    ENRICH --> WEATHER
    ENRICH --> HISTORY
    DISEASE --> ZSCORE
    FESTIVAL --> ZSCORE
    WEATHER --> ZSCORE
    HISTORY --> ZSCORE
    ZSCORE --> GEMINI_NLP
    GEMINI_NLP --> STORE
    STORE --> STORE_F
    STORE --> STORE_A
    STORE --> STORE_ACC
    STORE --> ALERTS
```

---

## 5. Entity-Relationship Diagram

```mermaid
erDiagram
    users {
        int id PK
        text shop_name
        text business_type
        text city
        text state
        text language
        text phone
        text email
        datetime created_at
    }

    products {
        int id PK
        int user_id FK
        text name
        text category
        text unit
        real current_stock
        real reorder_point
        real safety_stock
        real unit_cost
        text supplier_name
        text supplier_contact
        int lead_time_days
        date expiry_date
        datetime created_at
        datetime updated_at
    }

    sales_history {
        int id PK
        int product_id FK
        date date
        real quantity
        real revenue
        datetime created_at
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
        datetime created_at
    }

    anomalies {
        int id PK
        int product_id FK
        date date
        text type
        real z_score
        text explanation
        boolean dismissed
        datetime created_at
    }

    alerts {
        int id PK
        int user_id FK
        int product_id FK
        text type
        text severity
        text title
        text message
        boolean dismissed
        boolean sent_whatsapp
        datetime created_at
    }

    stock_movements {
        int id PK
        int product_id FK
        text type
        real quantity
        text notes
        datetime created_at
    }

    forecast_accuracy {
        int id PK
        int product_id FK
        date week_start
        real predicted_likely
        real actual
        real mape
        datetime created_at
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

    users ||--o{ products : "owns"
    users ||--o{ alerts : "receives"
    products ||--o{ sales_history : "has"
    products ||--o{ forecasts : "has"
    products ||--o{ anomalies : "has"
    products ||--o{ stock_movements : "has"
    products ||--o{ forecast_accuracy : "tracked_by"
    products ||--o{ alerts : "triggers"
```

---

## 6. Horizontal Scaling Topology

```mermaid
graph TB
    LB["🔀 Load Balancer<br/>(Nginx / Caddy)"]

    subgraph Workers["FastAPI Workers"]
        W1["FastAPI Worker 1"]
        W2["FastAPI Worker 2"]
        W3["FastAPI Worker N"]
    end

    subgraph TaskWorkers["Celery Workers"]
        CW1["Celery Worker 1<br/>(Forecast)"]
        CW2["Celery Worker 2<br/>(OCR)"]
        CW3["Celery Worker N<br/>(Alerts)"]
    end

    subgraph DataStores["Data Stores"]
        PG_PRIMARY["PostgreSQL<br/>(Primary)"]
        PG_REPLICA["PostgreSQL<br/>(Read Replica)"]
        REDIS_STORE["Redis<br/>(Cache + Broker)"]
        MINIO_STORE["MinIO<br/>(File Storage)"]
    end

    WABOT_NODE["WhatsApp Bot<br/>(Node.js Sidecar)"]

    LB --> W1
    LB --> W2
    LB --> W3

    W1 --> PG_PRIMARY
    W2 --> PG_PRIMARY
    W3 --> PG_PRIMARY

    W1 --> PG_REPLICA
    W2 --> PG_REPLICA
    W3 --> PG_REPLICA

    W1 --> REDIS_STORE
    W2 --> REDIS_STORE
    W3 --> REDIS_STORE

    W1 --> MINIO_STORE

    REDIS_STORE --> CW1
    REDIS_STORE --> CW2
    REDIS_STORE --> CW3

    CW1 --> PG_PRIMARY
    CW2 --> PG_PRIMARY
    CW3 --> PG_PRIMARY

    W1 --> WABOT_NODE

    PG_PRIMARY --> PG_REPLICA
```

---

## 7. Background Task Architecture

```mermaid
flowchart LR
    subgraph Producers["API Servers (Produce Tasks)"]
        API1["FastAPI"]
    end

    subgraph Broker["Message Broker"]
        REDIS_B["Redis"]
    end

    subgraph Consumers["Celery Workers (Consume Tasks)"]
        T1["forecast_tasks<br/>recalculate_forecast<br/>~2-5 sec"]
        T2["ocr_tasks<br/>process_image<br/>~3-8 sec"]
        T3["alert_tasks<br/>dispatch_alerts<br/>~1-2 sec"]
        T4["whatsapp_tasks<br/>send_daily_briefing<br/>cron @ 8 AM"]
        T5["whatsapp_tasks<br/>send_weekly_summary<br/>cron @ Sun 7 PM"]
        T6["forecast_tasks<br/>batch_recalculate<br/>all products"]
    end

    API1 -->|"enqueue"| REDIS_B
    REDIS_B -->|"dequeue"| T1
    REDIS_B -->|"dequeue"| T2
    REDIS_B -->|"dequeue"| T3
    REDIS_B -->|"dequeue"| T4
    REDIS_B -->|"dequeue"| T5
    REDIS_B -->|"dequeue"| T6
```

---

## 8. Caching Strategy

```mermaid
flowchart TD
    REQ["API Request"]
    CACHE_CHECK{"Cache Hit?"}
    RETURN_CACHED["Return Cached Data<br/>(< 5 ms)"]
    DB_QUERY["Query Database<br/>(50-200 ms)"]
    POPULATE_CACHE["Populate Cache<br/>(set TTL)"]
    RETURN_FRESH["Return Fresh Data"]
    INVALIDATE["Cache Invalidation<br/>Triggers"]
    NEW_SALE["New Sale Recorded"]
    STOCK_MOVE["Stock Movement"]
    DATA_UPLOAD["Data Upload Verified"]

    REQ --> CACHE_CHECK
    CACHE_CHECK -->|"Yes"| RETURN_CACHED
    CACHE_CHECK -->|"No"| DB_QUERY
    DB_QUERY --> POPULATE_CACHE --> RETURN_FRESH

    NEW_SALE --> INVALIDATE
    STOCK_MOVE --> INVALIDATE
    DATA_UPLOAD --> INVALIDATE
    INVALIDATE -->|"delete key"| CACHE_CHECK
```

---

## 9. Gemini API Integration with Resilience

```mermaid
flowchart TD
    REQUEST["AI Request<br/>(OCR / NLP / Translate)"]
    RATE_LIMIT{"Rate Limit<br/>OK?"}
    WAIT["Wait / Queue"]
    GEMINI_CALL["Call Gemini API"]
    SUCCESS{"Success?"}
    RETURN_OK["Return Result"]
    RETRY_CHECK{"Retries < 3?"}
    BACKOFF["Exponential Backoff<br/>(1s, 2s, 4s)"]
    CIRCUIT{"Circuit Breaker<br/>Open?"}
    FALLBACK["OpenRouter<br/>Free Tier Fallback"]
    FALLBACK_SUCCESS{"Fallback<br/>Success?"}
    ERROR["Return Error<br/>+ Graceful Degradation"]

    REQUEST --> RATE_LIMIT
    RATE_LIMIT -->|"Yes"| GEMINI_CALL
    RATE_LIMIT -->|"No"| WAIT --> GEMINI_CALL
    GEMINI_CALL --> SUCCESS
    SUCCESS -->|"Yes"| RETURN_OK
    SUCCESS -->|"No"| RETRY_CHECK
    RETRY_CHECK -->|"Yes"| BACKOFF --> GEMINI_CALL
    RETRY_CHECK -->|"No"| CIRCUIT
    CIRCUIT -->|"Open (5+ fails)"| FALLBACK
    CIRCUIT -->|"Closed"| FALLBACK
    FALLBACK --> FALLBACK_SUCCESS
    FALLBACK_SUCCESS -->|"Yes"| RETURN_OK
    FALLBACK_SUCCESS -->|"No"| ERROR
```

---

## 10. WhatsApp Integration Architecture

```mermaid
flowchart TD
    subgraph PythonBackend["StockSense Backend (Python)"]
        WA_SVC["WhatsAppService"]
        SEND["send_message(phone, text)"]
        BRIEF["send_daily_briefing(user_id)"]
        HANDLE["handle_inbound(message)"]
    end

    subgraph NodeSidecar["WhatsApp Bot (Node.js)"]
        WAWEB["whatsapp-web.js"]
        QR["QR Code Pairing"]
        OUTBOUND["Outbound Messages"]
        INBOUND["Inbound Listener"]
    end

    subgraph User["User"]
        PHONE["📱 WhatsApp"]
    end

    WA_SVC --> SEND
    WA_SVC --> BRIEF
    SEND -->|"HTTP POST :3001"| OUTBOUND
    BRIEF -->|"HTTP POST :3001"| OUTBOUND
    OUTBOUND --> WAWEB --> PHONE
    PHONE --> WAWEB --> INBOUND
    INBOUND -->|"POST /webhook"| HANDLE
    QR -->|"Session init"| WAWEB
```

---

## 11. Deployment — Hackathon (Single Machine)

```mermaid
graph TB
    subgraph Machine["Local Machine / Render Free Tier"]
        FE_DEV["Frontend<br/>npm run dev<br/>:5173"]
        BE_DEV["Backend<br/>uvicorn<br/>:8000"]
        WA_DEV["WhatsApp Bot<br/>node index.js<br/>:3001"]
        SQLITE["SQLite<br/>./stocksense.db"]
    end

    BROWSER["🌐 Browser"] --> FE_DEV
    FE_DEV -->|"REST API"| BE_DEV
    BE_DEV --> SQLITE
    BE_DEV -->|"HTTP"| WA_DEV
```

---

## 12. Deployment — Production (Containerized)

```mermaid
graph TB
    subgraph Cluster["Docker Compose / K8s"]
        NGINX_P["Nginx<br/>Reverse Proxy<br/>+ Static Assets"]

        subgraph APIReplicas["API Replicas"]
            FA1["FastAPI #1"]
            FA2["FastAPI #2"]
            FAN["FastAPI #N"]
        end

        subgraph CeleryReplicas["Celery Workers"]
            CE1["Worker #1<br/>(Forecast)"]
            CE2["Worker #2<br/>(OCR)"]
            CEN["Worker #N<br/>(Alerts)"]
        end

        WA_PROD["WhatsApp Bot<br/>(1 replica)"]
        PG_PROD["PostgreSQL<br/>(persistent volume)"]
        REDIS_PROD["Redis<br/>(cache + broker)"]
        MINIO_PROD["MinIO<br/>(file store)"]
    end

    INTERNET["🌐 Internet"] --> NGINX_P
    NGINX_P --> FA1
    NGINX_P --> FA2
    NGINX_P --> FAN

    FA1 --> PG_PROD
    FA2 --> PG_PROD
    FAN --> PG_PROD

    FA1 --> REDIS_PROD
    FA2 --> REDIS_PROD

    REDIS_PROD --> CE1
    REDIS_PROD --> CE2
    REDIS_PROD --> CEN

    CE1 --> PG_PROD
    CE2 --> PG_PROD

    FA1 --> WA_PROD
    FA1 --> MINIO_PROD
```

---

## 13. Technology Stack Map

```mermaid
mindmap
    root((StockSense))
        Frontend
            React + Vite
            Plotly.js Charts
            Vanilla CSS
            i18n JSON files
        Backend
            Python FastAPI
            Pydantic Schemas
            SQLAlchemy ORM
            Alembic Migrations
        AI & ML
            Facebook Prophet
            Google Gemini 2.0 Flash
            OpenRouter Fallback
            Z-score Anomaly Detection
        Infrastructure
            SQLite → PostgreSQL
            Redis Cache + Broker
            Celery Task Queue
            MinIO File Storage
            Nginx Reverse Proxy
        Integrations
            whatsapp-web.js
            Gemini Vision OCR
            pandas CSV Export
            ReportLab PDF
        Deployment
            Docker Compose
            Render Free Tier
            Lets Encrypt SSL
```

---

> **Usage:** Copy any `mermaid` code block into a Mermaid-compatible renderer (GitHub, VS Code Mermaid Preview, [mermaid.live](https://mermaid.live)) to see the rendered diagrams.
