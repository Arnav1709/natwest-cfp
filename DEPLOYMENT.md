# StockSense — Deployment Guide

The app is two pieces that deploy independently:

- **Frontend** (React + Vite) → **Vercel** (static hosting)
- **Backend** (FastAPI + Prophet) → **Render** (Docker web service) + **Postgres**

> The backend is heavy (Prophet, ChromaDB, pandas/scipy). Deploy it on Render
> via **Docker** (not the native Python runtime) so the Prophet C++ build is
> reproducible. The free instance has 512 MB RAM and sleeps after inactivity.

---

## 1. Backend + Database on Render

Easiest path — the included `render.yaml` blueprint provisions both:

1. Push this repo to GitHub.
2. Render Dashboard → **New → Blueprint** → select the repo. It reads
   `render.yaml` and creates `stocksense-backend` (Docker) + `stocksense-db` (Postgres).
3. `SECRET_KEY` is auto-generated and `DATABASE_URL` is auto-wired.
4. After the first deploy, set these in the backend service's **Environment** tab:
   - `CORS_ORIGINS` = your frontend URL, e.g. `https://stocksense.vercel.app`
   - (optional) `CORS_ORIGIN_REGEX` = `https://.*\.vercel\.app` to also allow Vercel preview deploys
   - `GEMINI_API_KEY` and/or `OPENROUTER_API_KEY` for AI features (forecasting works without them; chat/insights/OCR need one)
5. Note the backend URL, e.g. `https://stocksense-backend.onrender.com`.

**Manual alternative** (no blueprint): create a Web Service → Docker → root
`backend/` → health check path `/api/health`, and set the env vars above plus a
Postgres `DATABASE_URL` yourself.

---

## 2. Frontend on Vercel

1. Vercel → **New Project** → import the repo.
2. Set **Root Directory** to `frontend`. (`vercel.json` handles the Vite build
   and SPA routing automatically.)
3. Add an environment variable:
   - `VITE_API_BASE_URL` = `https://stocksense-backend.onrender.com/api`
     (your Render URL + `/api`)
4. Deploy. Then go back to Render and make sure `CORS_ORIGINS` contains the
   final Vercel URL.

---

## 3. Local development (unchanged)

```bash
docker compose up --build
# Frontend  http://localhost:5173
# Backend   http://localhost:8000
# Unified   http://localhost (nginx)
```

Locally, leave `VITE_API_BASE_URL` and `CORS_ORIGINS` unset — the app uses the
relative `/api` path and the localhost CORS defaults.

---

## Production checklist

- [ ] `SECRET_KEY` set to a strong random value (Render generates one)
- [ ] `DEBUG=false` on the backend
- [ ] `DATABASE_URL` points at Postgres (SQLite is wiped on every Render restart)
- [ ] `CORS_ORIGINS` includes the exact frontend origin (scheme + host, no trailing slash)
- [ ] `VITE_API_BASE_URL` set on Vercel to the backend `/api` URL
- [ ] At least one AI key (`GEMINI_API_KEY` / `OPENROUTER_API_KEY`) if you need AI features
