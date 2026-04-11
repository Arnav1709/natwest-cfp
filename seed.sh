#!/bin/bash
# ─────────────────────────────────────────────────────────────
# StockSense — Seed Database with Sample Data
# ─────────────────────────────────────────────────────────────

echo "🌱 Seeding database with sample data..."
docker compose exec backend python seed_data.py
echo "✅ Database seeded."
