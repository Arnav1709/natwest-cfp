# ─────────────────────────────────────────────────────────────
# StockSense Frontend — React + Vite Dev Container
# ─────────────────────────────────────────────────────────────
# Development mode: Vite HMR with --host 0.0.0.0 for Docker.
# For production, see Dockerfile.prod (multi-stage nginx build).
# ─────────────────────────────────────────────────────────────

FROM node:20-alpine

WORKDIR /app

# Install deps (cached unless package files change)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

EXPOSE 5173

# vite.config.js already sets host: '0.0.0.0'
# Use npx to invoke vite directly (avoids npm run -- arg-passing issues)
CMD ["npx", "vite", "--host", "0.0.0.0"]
