#!/bin/bash
# ─────────────────────────────────────────────────────────────
# SupplySense — Tail Logs
# ─────────────────────────────────────────────────────────────
# Usage:
#   ./logs.sh             # All services
#   ./logs.sh backend     # Backend only
#   ./logs.sh frontend    # Frontend only
#   ./logs.sh whatsapp-bot # WhatsApp bot only

docker compose logs -f ${1:-}
