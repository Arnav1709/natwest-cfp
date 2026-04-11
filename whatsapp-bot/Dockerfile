# ─────────────────────────────────────────────────────────────
# StockSense WhatsApp Bot — Node.js + Puppeteer/Chromium
# ─────────────────────────────────────────────────────────────
# whatsapp-web.js uses Puppeteer which needs Chromium.
# Uses node:20-slim (NOT alpine — Puppeteer doesn't work on alpine).
# ─────────────────────────────────────────────────────────────

FROM node:20-slim

# Puppeteer/Chromium dependencies for whatsapp-web.js
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst \
    libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libasound2 libpangocairo-1.0-0 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libxshmfence1 libnss3 libxss1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Tell Puppeteer to use system Chromium (skip downloading its own)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

# Install Node deps (cached unless package files change)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source
COPY . .

EXPOSE 3001

CMD ["node", "index.js"]
