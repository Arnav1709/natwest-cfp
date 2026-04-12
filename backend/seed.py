"""
Seed script — Populate the database with 12 weeks of realistic sales data.

Creates a test user, 15 pharmacy products, and 84 days of daily sales
with realistic patterns (weekly seasonality, product-specific demand).
This gives Prophet >= 8 weeks of data so it can generate real AI forecasts.

Run with:
    docker compose exec backend python seed.py
"""

from datetime import date, timedelta
import random
import math
from database import SessionLocal, init_db
from models.user import User
from models.product import Product
from models.sales import SalesHistory
from models.stock_movement import StockMovement
from models.forecast import Forecast, ForecastAccuracy
from utils.auth import hash_password


def seed():
    """Seed the database with a test user + 15 products + 12 weeks of sales."""
    init_db()
    db = SessionLocal()

    try:
        # ── Check if seed user already exists ─────────────────────
        existing = db.query(User).filter(User.phone == "9999999999").first()
        if existing:
            print("⚠️  Seed user already exists. Clearing old data and re-seeding...")
            old_products = db.query(Product).filter(Product.user_id == existing.id).all()
            product_ids = [p.id for p in old_products]
            if product_ids:
                # Clear all FK-dependent tables first
                db.query(SalesHistory).filter(SalesHistory.product_id.in_(product_ids)).delete(synchronize_session=False)
                db.query(StockMovement).filter(StockMovement.product_id.in_(product_ids)).delete(synchronize_session=False)
                db.query(Forecast).filter(Forecast.product_id.in_(product_ids)).delete(synchronize_session=False)
                db.query(ForecastAccuracy).filter(ForecastAccuracy.product_id.in_(product_ids)).delete(synchronize_session=False)
                db.commit()
                # Now safe to delete products
                db.query(Product).filter(Product.user_id == existing.id).delete(synchronize_session=False)
                db.commit()
            test_user = existing
            print(f"   Cleared old data for user ID: {existing.id}")
        else:
            # ── Create test user ──────────────────────────────────
            test_user = User(
                shop_name="Demo Pharmacy",
                business_type="pharmacy",
                city="Mumbai",
                state="Maharashtra",
                language="en",
                phone="9999999999",
                email="demo@stocksense.app",
                password_hash=hash_password("test1234"),
            )
            db.add(test_user)
            db.flush()
            print(f"✅ Test user created — ID: {test_user.id}")

        print(f"   Login: phone=9999999999, password=test1234")

        # ── Create 15 pharmacy products ───────────────────────────
        # Each product has a base_daily_demand that controls how much it sells
        products_data = [
            {"name": "Paracetamol 500mg",     "category": "pain_relief",    "current_stock": 500, "reorder_point": 100, "safety_stock": 50,  "unit_cost": 2.50,  "supplier_name": "Sun Pharma",      "lead_time_days": 3, "expiry_date": date.today() + timedelta(days=365), "base_daily_demand": 12},
            {"name": "Amoxicillin 250mg",     "category": "antibiotics",    "current_stock": 200, "reorder_point": 50,  "safety_stock": 25,  "unit_cost": 8.00,  "supplier_name": "Cipla Ltd",       "lead_time_days": 5, "expiry_date": date.today() + timedelta(days=180), "base_daily_demand": 6},
            {"name": "Cetirizine 10mg",       "category": "antihistamine",  "current_stock": 300, "reorder_point": 60,  "safety_stock": 30,  "unit_cost": 3.00,  "supplier_name": "Dr. Reddy's",     "lead_time_days": 2, "expiry_date": date.today() + timedelta(days=270), "base_daily_demand": 8},
            {"name": "Omeprazole 20mg",       "category": "gastro",         "current_stock": 150, "reorder_point": 40,  "safety_stock": 20,  "unit_cost": 5.50,  "supplier_name": "Mankind Pharma",  "lead_time_days": 4, "expiry_date": date.today() + timedelta(days=300), "base_daily_demand": 5},
            {"name": "Metformin 500mg",       "category": "diabetes",       "current_stock": 400, "reorder_point": 80,  "safety_stock": 40,  "unit_cost": 4.00,  "supplier_name": "Sun Pharma",      "lead_time_days": 3, "expiry_date": date.today() + timedelta(days=240), "base_daily_demand": 10},
            {"name": "Azithromycin 500mg",    "category": "antibiotics",    "current_stock": 120, "reorder_point": 30,  "safety_stock": 15,  "unit_cost": 15.00, "supplier_name": "Cipla Ltd",       "lead_time_days": 5, "expiry_date": date.today() + timedelta(days=210), "base_daily_demand": 4},
            {"name": "Ibuprofen 400mg",       "category": "pain_relief",    "current_stock": 350, "reorder_point": 70,  "safety_stock": 35,  "unit_cost": 3.50,  "supplier_name": "Lupin Ltd",       "lead_time_days": 3, "expiry_date": date.today() + timedelta(days=330), "base_daily_demand": 9},
            {"name": "Dolo 650",              "category": "pain_relief",    "current_stock": 600, "reorder_point": 120, "safety_stock": 60,  "unit_cost": 2.00,  "supplier_name": "Micro Labs",      "lead_time_days": 2, "expiry_date": date.today() + timedelta(days=400), "base_daily_demand": 15},
            {"name": "Crocin Advance",        "category": "pain_relief",    "current_stock": 250, "reorder_point": 50,  "safety_stock": 25,  "unit_cost": 3.00,  "supplier_name": "GSK",             "lead_time_days": 3, "expiry_date": date.today() + timedelta(days=280), "base_daily_demand": 7},
            {"name": "ORS Sachet",            "category": "rehydration",    "current_stock": 80,  "reorder_point": 50,  "safety_stock": 25,  "unit_cost": 5.00,  "supplier_name": "FDC Ltd",         "lead_time_days": 2, "expiry_date": date.today() + timedelta(days=200), "base_daily_demand": 6},
            {"name": "Vitamin C 500mg",       "category": "vitamins",       "current_stock": 200, "reorder_point": 40,  "safety_stock": 20,  "unit_cost": 6.00,  "supplier_name": "Limcee",          "lead_time_days": 4, "expiry_date": date.today() + timedelta(days=350), "base_daily_demand": 5},
            {"name": "B-Complex Tablets",     "category": "vitamins",       "current_stock": 180, "reorder_point": 35,  "safety_stock": 15,  "unit_cost": 4.50,  "supplier_name": "Abbott",          "lead_time_days": 3, "expiry_date": date.today() + timedelta(days=320), "base_daily_demand": 4},
            {"name": "Betadine Solution",     "category": "antiseptic",     "current_stock": 45,  "reorder_point": 20,  "safety_stock": 10,  "unit_cost": 55.00, "supplier_name": "Win-Medicare",    "lead_time_days": 5, "expiry_date": date.today() + timedelta(days=500), "base_daily_demand": 3},
            {"name": "Insulin Glargine",      "category": "diabetes",       "current_stock": 30,  "reorder_point": 15,  "safety_stock": 8,   "unit_cost": 450.00,"supplier_name": "Sanofi",          "lead_time_days": 7, "expiry_date": date.today() + timedelta(days=90),  "base_daily_demand": 2},
            {"name": "Salbutamol Inhaler",    "category": "respiratory",    "current_stock": 25,  "reorder_point": 10,  "safety_stock": 5,   "unit_cost": 120.00,"supplier_name": "Cipla Ltd",       "lead_time_days": 5, "expiry_date": date.today() + timedelta(days=260), "base_daily_demand": 2},
        ]

        created_products = []
        product_demand_map = {}  # product_id -> base_daily_demand
        for p_data in products_data:
            base_demand = p_data.pop("base_daily_demand")
            product = Product(user_id=test_user.id, unit="units", **p_data)
            db.add(product)
            db.flush()
            created_products.append(product)
            product_demand_map[product.id] = base_demand

        print(f"✅ {len(created_products)} products seeded:")
        for p in created_products:
            print(f"   📦 {p.name:30s} — stock: {p.current_stock}, demand: ~{product_demand_map[p.id]}/day")

        # ── Generate 12 weeks (84 days) of realistic sales data ──
        random.seed(42)
        sales_count = 0
        TOTAL_DAYS = 84  # 12 weeks

        # Day-of-week multipliers (Sun is low, Wed-Fri is high)
        #                          Mon   Tue   Wed   Thu   Fri   Sat   Sun
        dow_multiplier = {0: 1.0, 1: 1.1, 2: 1.2, 3: 1.2, 4: 1.15, 5: 0.9, 6: 0.5}

        for day_offset in range(TOTAL_DAYS, 0, -1):
            sale_date = date.today() - timedelta(days=day_offset)
            day_of_week = sale_date.weekday()  # 0=Mon, 6=Sun

            # Week number (0-11) — add a gradual upward trend
            week_num = (TOTAL_DAYS - day_offset) // 7
            trend_multiplier = 1.0 + (week_num * 0.02)  # +2% per week growth

            for product in created_products:
                base = product_demand_map[product.id]

                # Apply day-of-week pattern
                daily_mult = dow_multiplier.get(day_of_week, 1.0)

                # Apply weekly trend
                demand = base * daily_mult * trend_multiplier

                # Add some noise (±30%)
                noise = random.uniform(0.7, 1.3)
                demand = demand * noise

                # Some days a product doesn't sell at all (skip ~15% of entries)
                if random.random() < 0.15:
                    continue

                qty = max(1, round(demand))
                revenue = qty * product.unit_cost

                sale = SalesHistory(
                    product_id=product.id,
                    date=sale_date,
                    quantity=qty,
                    revenue=revenue,
                )
                db.add(sale)
                sales_count += 1

        db.commit()
        print(f"✅ {sales_count} historical sales records created ({TOTAL_DAYS} days = 12 weeks)")

        # Print weekly summary for first product
        first_product = created_products[0]
        print(f"\n📊 Weekly sales summary for {first_product.name}:")
        for w in range(12):
            week_start = date.today() - timedelta(days=TOTAL_DAYS - w * 7)
            week_end = week_start + timedelta(days=6)
            week_sales = db.query(SalesHistory).filter(
                SalesHistory.product_id == first_product.id,
                SalesHistory.date >= week_start,
                SalesHistory.date <= week_end,
            ).all()
            total = sum(s.quantity for s in week_sales)
            print(f"   Week {w+1:2d} ({week_start} → {week_end}): {int(total):4d} units")

        print("\n" + "=" * 60)
        print("🎉 SEED DATA READY!")
        print("=" * 60)
        print(f"  User:     Demo Pharmacy")
        print(f"  Phone:    9999999999")
        print(f"  Password: test1234")
        print(f"  Products: {len(created_products)}")
        print(f"  Sales:    {sales_count} records ({TOTAL_DAYS} days)")
        print(f"  Prophet:  ✅ Will use AI model (>= 8 weeks available)")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
