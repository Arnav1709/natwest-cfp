#!/bin/bash
# ─────────────────────────────────────────────────────────────
# StockSense — Tail Logs
# ─────────────────────────────────────────────────────────────
# Usage:
#   ./logs.sh             # All services
#   ./logs.sh backend     # Backend only
#   ./logs.sh frontend    # Frontend only

docker compose logs -f ${1:-}
