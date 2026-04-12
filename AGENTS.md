# AGENTS.md — Multi-Agent Coordination Protocol

> **Project:** StockSense — AI-Powered Inventory Management & Demand Forecasting
> **Hackathon:** NatWest AI Predictive Forecasting Track
> **Last Updated:** 2026-04-11

---

## Project Overview

StockSense is a full-stack web application with:
- **Frontend:** React 18 + Vite + Plotly.js (16 screens)
- **Backend:** Python FastAPI + SQLAlchemy + SQLite
- **AI/ML:** Facebook Prophet + Google Gemini API
- **WhatsApp Bot:** Node.js sidecar with whatsapp-web.js
- **Key Differentiators:** Handwriting OCR, Disease Intelligence, WhatsApp-first

---

## Directory Structure & Ownership

```
/home/arnav/Desktop/natwest/
│
├── AGENTS.md                  ← THIS FILE (coordination rules — READ ONLY)
├── PRD.md                     ← Product Requirements (READ ONLY)
│
├── docs/                      ← Architecture docs (READ ONLY)
│   ├── HLD_mermaid.md
│   ├── HLD.md
│   ├── sequence_diagrams_mermaid.md
│   └── sequence_diagrams.md
│
├── design/                    ← UI designs (READ ONLY)
│   ├── DESIGN_DOC.md
│   ├── screens/               ← 16 PNG mockups
│   └── html_screens/
│
├── shared/                    ← Shared contracts (READ ONLY for agents)
│   ├── api-contracts.md       ← API endpoint specs
│   ├── schema.sql             ← Database DDL
│   └── design-tokens.css      ← CSS variables
│
├── data/                      ← Sample datasets (READ ONLY)
│
├── frontend/                  ← 🖥️  AGENT 1 WORKSPACE
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── services/          ← API client functions
│   │   ├── mocks/             ← Mock data for development
│   │   ├── i18n/              ← Translation JSON files
│   │   └── styles/            ← CSS files
│   ├── public/
│   ├── package.json
│   └── vite.config.js
│
├── backend/                   ← ⚙️  AGENT 2 WORKSPACE (structure)
│   │                             🔮  AGENT 3 WORKSPACE (services/ implementations)
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── routers/               ← Agent 2 owns
│   │   ├── auth.py
│   │   ├── upload.py
│   │   ├── inventory.py
│   │   ├── forecast.py
│   │   ├── anomalies.py
│   │   ├── reorder.py
│   │   ├── alerts.py
│   │   ├── settings.py
│   │   └── whatsapp.py
│   ├── models/                ← Agent 2 owns
│   │   └── *.py               ← SQLAlchemy models
│   ├── schemas/               ← Agent 2 owns
│   │   └── *.py               ← Pydantic schemas
│   ├── services/              ← Agent 3 owns IMPLEMENTATIONS
│   │   ├── forecast_service.py
│   │   ├── anomaly_service.py
│   │   ├── intelligence_service.py
│   │   ├── reorder_service.py
│   │   ├── ocr_service.py
│   │   └── lookup_data/
│   │       ├── disease_seasons.json
│   │       ├── festival_calendar.json
│   │       └── weather_heuristics.json
│   ├── utils/                 ← Agent 2 owns
│   ├── requirements.txt
│   └── stocksense.db
│
└── whatsapp-bot/              ← 📱 AGENT 4 WORKSPACE
    ├── index.js
    ├── whatsapp-client.js
    ├── message-handler.js
    ├── message-templates.js
    ├── package.json
    └── .wwebjs_auth/          ← Session data
```

---

## Ground Rules (ALL AGENTS MUST FOLLOW)

### Rule 1: Directory Ownership
Each agent ONLY creates/modifies files within its designated workspace. No exceptions.

| Agent | WRITES to | READS from (never writes) |
|---|---|---|
| Agent 1 (Frontend) | `frontend/**` | `shared/`, `design/`, `docs/`, `PRD.md`, `AGENTS.md` |
| Agent 2 (Backend) | `backend/**` EXCEPT `backend/services/*.py` internals | `shared/`, `docs/`, `PRD.md`, `AGENTS.md` |
| Agent 3 (AI/ML) | `backend/services/**` | `shared/`, `docs/`, `backend/models/`, `backend/schemas/`, `PRD.md`, `AGENTS.md` |
| Agent 4 (WhatsApp) | `whatsapp-bot/**` | `shared/`, `docs/`, `PRD.md`, `AGENTS.md` |

### Rule 2: Interface-First Development
- Agent 2 (Backend) creates service files in `backend/services/` with **function signatures, docstrings, and return type hints** but stub/mock implementations.
- Agent 3 (AI/ML) then fills in the real implementations.
- This ensures imports work correctly.

### Rule 3: Shared Contracts Are Law
- Database schema → `shared/schema.sql`
- API contracts → `shared/api-contracts.md`
- Design tokens → `shared/design-tokens.css`
- If an agent needs a schema change, document it but DO NOT modify `shared/` files.

### Rule 4: Mock Data First
- Frontend uses mock data (in `frontend/src/mocks/`) until backend is wired.
- Backend returns hardcoded/sample data from service stubs until AI/ML is implemented.
- WhatsApp bot uses template strings until backend webhook is live.

### Rule 5: Port Assignments
| Service | Port | Agent |
|---|---|---|
| Frontend (Vite dev server) | 5173 | Agent 1 |
| Backend (FastAPI/uvicorn) | 8000 | Agent 2 |
| WhatsApp Bot (Express) | 3001 | Agent 4 |

### Rule 6: CORS Configuration
Backend must allow `http://localhost:5173` in CORS origins.

### Rule 7: API Base URL
Frontend API calls target: `http://localhost:8000/api/`
WhatsApp Bot webhooks target: `http://localhost:8000/api/whatsapp/webhook`
Backend calls WhatsApp Bot at: `http://localhost:3001/`

---

## Technology Requirements

### Agent 1 (Frontend)
```
react@18, react-dom@18, react-router-dom@6
plotly.js / react-plotly.js
i18next, react-i18next
```

### Agent 2 (Backend)
```
fastapi, uvicorn[standard]
sqlalchemy>=2.0, alembic
pydantic>=2.0
python-jose[cryptography], passlib[bcrypt]
python-multipart
pandas, reportlab
python-dotenv
```

### Agent 3 (AI/ML)
```
prophet
google-generativeai
requests (for OpenRouter fallback)
numpy, scipy (for Z-score)
```

### Agent 4 (WhatsApp)
```
express
whatsapp-web.js
qrcode-terminal
axios
```

---

## Key Reference Files

| What | Where | Read by |
|---|---|---|
| Full product spec | `PRD.md` | All agents |
| System architecture | `docs/HLD_mermaid.md` | All agents |
| Interaction flows | `docs/sequence_diagrams_mermaid.md` | All agents |
| UI screen designs | `design/DESIGN_DOC.md` + `design/screens/*.png` | Agent 1 |
| Database DDL | `shared/schema.sql` | Agents 2, 3 |
| API endpoints | `shared/api-contracts.md` | Agents 1, 2 |
| CSS design tokens | `shared/design-tokens.css` | Agent 1 |

---

## Communication Protocol

Since agents cannot talk to each other directly, coordination happens through:

1. **Filesystem** — Files created by one agent are readable by all others
2. **This file (AGENTS.md)** — The single source of truth for coordination rules
3. **shared/ directory** — Immutable contracts that all agents reference
4. **The orchestrator** (the human + main conversation) resolves conflicts

---

> **Remember:** You are ONE agent in a multi-agent system. Respect the boundaries. Read the contracts. Build within your workspace. The orchestrator will integrate everything at the end.

<!-- code-review-graph MCP tools -->
## MCP Tools: code-review-graph

**IMPORTANT: This project has a knowledge graph. ALWAYS use the
code-review-graph MCP tools BEFORE using Grep/Glob/Read to explore
the codebase.** The graph is faster, cheaper (fewer tokens), and gives
you structural context (callers, dependents, test coverage) that file
scanning cannot.

### When to use graph tools FIRST

- **Exploring code**: `semantic_search_nodes` or `query_graph` instead of Grep
- **Understanding impact**: `get_impact_radius` instead of manually tracing imports
- **Code review**: `detect_changes` + `get_review_context` instead of reading entire files
- **Finding relationships**: `query_graph` with callers_of/callees_of/imports_of/tests_for
- **Architecture questions**: `get_architecture_overview` + `list_communities`

Fall back to Grep/Glob/Read **only** when the graph doesn't cover what you need.

### Key Tools

| Tool | Use when |
|------|----------|
| `detect_changes` | Reviewing code changes — gives risk-scored analysis |
| `get_review_context` | Need source snippets for review — token-efficient |
| `get_impact_radius` | Understanding blast radius of a change |
| `get_affected_flows` | Finding which execution paths are impacted |
| `query_graph` | Tracing callers, callees, imports, tests, dependencies |
| `semantic_search_nodes` | Finding functions/classes by name or keyword |
| `get_architecture_overview` | Understanding high-level codebase structure |
| `refactor_tool` | Planning renames, finding dead code |

### Workflow

1. The graph auto-updates on file changes (via hooks).
2. Use `detect_changes` for code review.
3. Use `get_affected_flows` to understand impact.
4. Use `query_graph` pattern="tests_for" to check coverage.
