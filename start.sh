#!/bin/bash
# ─────────────────────────────────────────────────────────────
# SupplySense — Start All Services
# ─────────────────────────────────────────────────────────────

set -e

echo "🧠 SupplySense — AI-Powered Inventory Management"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🚀 Starting all services..."
echo ""
echo "  📊 Frontend:   http://localhost:5173"
echo "  ⚙️  Backend:    http://localhost:8000"
echo "  📖 API Docs:   http://localhost:8000/docs"
echo "  📱 WhatsApp:   http://localhost:3001"
echo "  🌐 Unified:    http://localhost:80 (nginx)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

docker compose up --build "$@"
