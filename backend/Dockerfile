# ─────────────────────────────────────────────────────────────
# StockSense Backend — Python FastAPI Container
# ─────────────────────────────────────────────────────────────
# Prophet requires C++ build tools (gcc, g++, cmake).
# System deps are installed first for Docker layer caching.
# ─────────────────────────────────────────────────────────────

FROM python:3.11-slim

# System deps for Prophet (C++ build) + curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ make cmake curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps (cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code (changes most frequently — last layer)
COPY . .

EXPOSE 8000

# Default: dev mode with hot reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
