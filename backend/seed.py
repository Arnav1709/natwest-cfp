"""
Seed script — Populate the database with fake inventory data for testing.

Creates a test user and 15 pharmacy products with realistic stock levels
so you can test the sales recording → inventory deduction flow.

Run with:
    docker compose exec backend python seed.py
"""

from datetime import date, timedelta
from database import SessionLocal, init_db
from models.user import User
from models.product import Product
from models.sales import SalesHistory
from utils.auth import hash_password


def seed():
    """Seed the database with a test user + 15 products."""
    init_db()
    db = SessionLocal()

    try:
        # ── Check if seed user already exists ─────────────────────
        existing = db.query(User).filter(User.phone == "9999999999").first()
        if existing:
            print("⚠️  Seed data already exists (test user found). Skipping.")
            print(f"   Login: phone=9999999999, password=test1234")
            print(f"   User ID: {existing.id}")
            return

        # ── Create test user ──────────────────────────────────────
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
        db.flush()  # Get the user ID

        print(f"✅ Test user created — ID: {test_user.id}")
        print(f"   Login: phone=9999999999, password=test1234")

        # ── Create 15 pharmacy products ───────────────────────────
        products_data = [
            {"name": "Paracetamol 500mg",     "category": "pain_relief",    "current_stock": 500, "reorder_point": 100, "safety_stock": 50,  "unit_cost": 2.50,  "supplier_name": "Sun Pharma",      "lead_time_days": 3, "expiry_date": date.today() + timedelta(days=365)},
            {"name": "Amoxicillin 250mg",     "category": "antibiotics",    "current_stock": 200, "reorder_point": 50,  "safety_stock": 25,  "unit_cost": 8.00,  "supplier_name": "Cipla Ltd",       "lead_time_days": 5, "expiry_date": date.today() + timedelta(days=180)},
            {"name": "Cetirizine 10mg",       "category": "antihistamine",  "current_stock": 300, "reorder_point": 60,  "safety_stock": 30,  "unit_cost": 3.00,  "supplier_name": "Dr. Reddy's",     "lead_time_days": 2, "expiry_date": date.today() + timedelta(days=270)},
            {"name": "Omeprazole 20mg",       "category": "gastro",         "current_stock": 150, "reorder_point": 40,  "safety_stock": 20,  "unit_cost": 5.50,  "supplier_name": "Mankind Pharma",  "lead_time_days": 4, "expiry_date": date.today() + timedelta(days=300)},
            {"name": "Metformin 500mg",       "category": "diabetes",       "current_stock": 400, "reorder_point": 80,  "safety_stock": 40,  "unit_cost": 4.00,  "supplier_name": "Sun Pharma",      "lead_time_days": 3, "expiry_date": date.today() + timedelta(days=240)},
            {"name": "Azithromycin 500mg",    "category": "antibiotics",    "current_stock": 120, "reorder_point": 30,  "safety_stock": 15,  "unit_cost": 15.00, "supplier_name": "Cipla Ltd",       "lead_time_days": 5, "expiry_date": date.today() + timedelta(days=210)},
            {"name": "Ibuprofen 400mg",       "category": "pain_relief",    "current_stock": 350, "reorder_point": 70,  "safety_stock": 35,  "unit_cost": 3.50,  "supplier_name": "Lupin Ltd",       "lead_time_days": 3, "expiry_date": date.today() + timedelta(days=330)},
            {"name": "Dolo 650",              "category": "pain_relief",    "current_stock": 600, "reorder_point": 120, "safety_stock": 60,  "unit_cost": 2.00,  "supplier_name": "Micro Labs",      "lead_time_days": 2, "expiry_date": date.today() + timedelta(days=400)},
            {"name": "Crocin Advance",        "category": "pain_relief",    "current_stock": 250, "reorder_point": 50,  "safety_stock": 25,  "unit_cost": 3.00,  "supplier_name": "GSK",             "lead_time_days": 3, "expiry_date": date.today() + timedelta(days=280)},
            {"name": "ORS Sachet",            "category": "rehydration",    "current_stock": 80,  "reorder_point": 50,  "safety_stock": 25,  "unit_cost": 5.00,  "supplier_name": "FDC Ltd",         "lead_time_days": 2, "expiry_date": date.today() + timedelta(days=200)},
            {"name": "Vitamin C 500mg",       "category": "vitamins",       "current_stock": 200, "reorder_point": 40,  "safety_stock": 20,  "unit_cost": 6.00,  "supplier_name": "Limcee",          "lead_time_days": 4, "expiry_date": date.today() + timedelta(days=350)},
            {"name": "B-Complex Tablets",     "category": "vitamins",       "current_stock": 180, "reorder_point": 35,  "safety_stock": 15,  "unit_cost": 4.50,  "supplier_name": "Abbott",          "lead_time_days": 3, "expiry_date": date.today() + timedelta(days=320)},
            {"name": "Betadine Solution",     "category": "antiseptic",     "current_stock": 45,  "reorder_point": 20,  "safety_stock": 10,  "unit_cost": 55.00, "supplier_name": "Win-Medicare",    "lead_time_days": 5, "expiry_date": date.today() + timedelta(days=500)},
            {"name": "Insulin Glargine",      "category": "diabetes",       "current_stock": 30,  "reorder_point": 15,  "safety_stock": 8,   "unit_cost": 450.00,"supplier_name": "Sanofi",          "lead_time_days": 7, "expiry_date": date.today() + timedelta(days=90)},
            {"name": "Salbutamol Inhaler",    "category": "respiratory",    "current_stock": 25,  "reorder_point": 10,  "safety_stock": 5,   "unit_cost": 120.00,"supplier_name": "Cipla Ltd",       "lead_time_days": 5, "expiry_date": date.today() + timedelta(days=260)},
        ]

        created_products = []
        for p in products_data:
            product = Product(user_id=test_user.id, unit="units", **p)
            db.add(product)
            created_products.append(product)

        db.flush()

        print(f"✅ {len(created_products)} products seeded:")
        for p in created_products:
            print(f"   📦 {p.name:30s} — stock: {p.current_stock}, reorder at: {p.reorder_point}")

        # ── Add some historical sales (last 7 days) ──────────────
        import random
        random.seed(42)
        sales_count = 0

        for day_offset in range(7, 0, -1):
            sale_date = date.today() - timedelta(days=day_offset)
            # Each day, 5-8 random products sold
            sold_products = random.sample(created_products, random.randint(5, 8))
            for product in sold_products:
                qty = random.randint(2, 20)
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
        print(f"✅ {sales_count} historical sales records created (last 7 days)")

        print("\n" + "=" * 60)
        print("🎉 SEED DATA READY!")
        print("=" * 60)
        print(f"  User:     Demo Pharmacy")
        print(f"  Phone:    9999999999")
        print(f"  Password: test1234")
        print(f"  Products: {len(created_products)}")
        print(f"  Sales:    {sales_count} records")
        print("=" * 60)

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
