# ─────────────────────────────────────────────────────────────
# StockSense Backend — Python FastAPI Container
# ─────────────────────────────────────────────────────────────
# Prophet requires C++ build tools (gcc, g++, cmake).
# System deps are installed first for Docker layer caching.
# Uses a virtual environment so that the dev volume mount
# (./backend:/app) does NOT overwrite installed packages.
# ─────────────────────────────────────────────────────────────

FROM python:3.11-slim

# System deps for Prophet (C++ build) + curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ make cmake curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create a virtual environment OUTSIDE the /app mount point
# so host volume mounts don't clobber installed packages
ENV VIRTUAL_ENV=/opt/venv
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

# Install Python deps (cached unless requirements.txt changes)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code (changes most frequently — last layer)
COPY . .

# Create data directory for SQLite persistence
# (Docker named volume will be mounted here)
RUN mkdir -p /app/data

EXPOSE 8000

# Default: dev mode with hot reload
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
