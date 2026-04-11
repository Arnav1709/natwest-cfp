#!/bin/bash
# ─────────────────────────────────────────────────────────────
# StockSense — Stop All Services
# ─────────────────────────────────────────────────────────────

echo "🛑 Stopping StockSense..."
docker compose down "$@"
echo "✅ All services stopped."
