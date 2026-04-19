#!/bin/bash
# ─────────────────────────────────────────────────────────────
# SupplySense — Stop All Services
# ─────────────────────────────────────────────────────────────

echo "🛑 Stopping SupplySense..."
docker compose down "$@"
echo "✅ All services stopped."
