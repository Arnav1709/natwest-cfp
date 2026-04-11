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

# Vite must bind to 0.0.0.0 to be accessible outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
