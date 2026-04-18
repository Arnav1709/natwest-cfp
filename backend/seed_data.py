"""
StockSense Seed Data Script.

Creates realistic pharmacy demo data:
- 1 user (Dr. Priya's Pharmacy)
- 18 products across medicine categories
- 6 months of sales history
- Disease season lookup data
- Festival calendar data
- Sample alerts and anomalies

Run: python seed_data.py
"""

import random
from datetime import date, timedelta, datetime

from database import SessionLocal, init_db
from models.user import User
from models.product import Product
from models.sales import SalesHistory
from models.stock_movement import StockMovement
from models.forecast import Forecast, ForecastAccuracy
from models.anomaly import Anomaly
from models.alert import Alert
from models.lookup import DiseaseSeason, FestivalCalendar
from models.notification import NotificationPreference
from utils.auth import hash_password


def seed():
    """Seed the database with realistic pharmacy demo data."""
    init_db()
    db = SessionLocal()

    try:
        # Check if already seeded
        existing = db.query(User).first()
        if existing:
            print("⚠️  Database already has data. Skipping seed.")
            print("   Delete stocksense.db and re-run to reseed.")
            return

        print("🌱 Seeding StockSense database...")

        # ──────────────────────────────────────────
        # 1. CREATE USER
        # ──────────────────────────────────────────
        user = User(
            shop_name="Priya Medical Store",
            business_type="pharmacy",
            city="Chennai",
            state="Tamil Nadu",
            language="en",
            phone="+919876543210",
            email="priya@example.com",
            password_hash=hash_password("demo1234"),
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"   ✅ User created: {user.shop_name} (ID: {user.id})")

        # Default notification preferences
        prefs = NotificationPreference(user_id=user.id)
        db.add(prefs)
        db.commit()

        # ──────────────────────────────────────────
        # 2. CREATE PRODUCTS
        # ──────────────────────────────────────────
        products_data = [
            # (name, category, unit, stock, reorder_pt, safety, cost, supplier, contact, lead, expiry_days)
            ("Paracetamol 500mg", "medicines", "strips", 45, 100, 30, 12.5, "Mehta Pharma", "+919800000001", 3, 400),
            ("ORS Sachets", "medicines", "packets", 80, 60, 20, 8.0, "Mehta Pharma", "+919800000001", 3, 300),
            ("Cough Syrup (100ml)", "medicines", "bottles", 120, 40, 10, 45.0, "Singh Distributors", "+919800000002", 5, 180),
            ("Amoxicillin 250mg", "medicines", "strips", 30, 50, 15, 22.0, "Mehta Pharma", "+919800000001", 3, 365),
            ("Cetrizine 10mg", "medicines", "strips", 200, 80, 25, 6.0, "National Pharma", "+919800000003", 4, 500),
            ("Calamine Lotion", "medicines", "bottles", 25, 30, 10, 55.0, "Singh Distributors", "+919800000002", 5, 365),
            ("Vitamin C 500mg", "medicines", "strips", 150, 60, 20, 15.0, "National Pharma", "+919800000003", 4, 400),
            ("Bandages (Roll)", "supplies", "rolls", 300, 100, 30, 5.0, "Singh Distributors", "+919800000002", 5, 730),
            ("Digital Thermometer", "equipment", "pieces", 12, 5, 2, 180.0, "MedEquip India", "+919800000004", 7, None),
            ("Glucose Powder", "medicines", "packets", 60, 40, 15, 18.0, "Mehta Pharma", "+919800000001", 3, 365),
            ("Mosquito Repellent Cream", "personal_care", "tubes", 35, 30, 10, 25.0, "National Pharma", "+919800000003", 4, 300),
            ("Electrolyte Sachets", "medicines", "packets", 90, 50, 20, 10.0, "Mehta Pharma", "+919800000001", 3, 365),
            ("Acyclovir Cream", "medicines", "tubes", 15, 20, 5, 65.0, "Singh Distributors", "+919800000002", 5, 365),
            ("Eye Drops (Antibiotic)", "medicines", "bottles", 40, 25, 8, 35.0, "National Pharma", "+919800000003", 4, 180),
            ("Hand Sanitizer (500ml)", "personal_care", "bottles", 50, 20, 5, 120.0, "MedEquip India", "+919800000004", 7, 730),
            ("N95 Masks (Box of 20)", "supplies", "boxes", 18, 15, 5, 200.0, "MedEquip India", "+919800000004", 7, None),
            ("Ibuprofen 400mg", "medicines", "strips", 0, 50, 15, 14.0, "Mehta Pharma", "+919800000001", 3, 400),
            ("Chloroquine Tablets", "medicines", "strips", 10, 25, 8, 18.0, "Singh Distributors", "+919800000002", 5, 500),
        ]

        products = []
        today = date.today()
        for (name, cat, unit, stock, reorder, safety, cost, supplier, contact, lead, exp_days) in products_data:
            expiry = today + timedelta(days=exp_days) if exp_days else None
            p = Product(
                user_id=user.id,
                name=name,
                category=cat,
                unit=unit,
                current_stock=stock,
                reorder_point=reorder,
                safety_stock=safety,
                unit_cost=cost,
                supplier_name=supplier,
                supplier_contact=contact,
                lead_time_days=lead,
                expiry_date=expiry,
            )
            db.add(p)
            products.append(p)

        db.commit()
        for p in products:
            db.refresh(p)
        print(f"   ✅ {len(products)} products created")

        # ──────────────────────────────────────────
        # 2b. CREATE PRODUCT BATCHES (multi-batch expiry tracking)
        # ──────────────────────────────────────────
        from models.product_batch import ProductBatch
        batch_count = 0
        for i, p in enumerate(products):
            if p.expiry_date is None:
                continue
            # Create 2-3 batches per product with staggered expiry dates
            batch_configs = [
                # (days_offset, qty_fraction, batch_suffix)
                (-5, 0.1, "A"),     # Already expired (small qty)
                (15, 0.3, "B"),     # Expiring soon
                (120, 0.6, "C"),    # Safe batch
            ]
            # Vary batches per product
            if i % 3 == 0:
                batch_configs = [(-3, 0.15, "A"), (8, 0.35, "B"), (200, 0.5, "C")]
            elif i % 3 == 1:
                batch_configs = [(25, 0.4, "B"), (180, 0.6, "C")]
            else:
                batch_configs = [(5, 0.2, "A"), (45, 0.3, "B"), (150, 0.5, "C")]

            for (days_off, qty_frac, suffix) in batch_configs:
                qty = max(1, int(p.current_stock * qty_frac))
                batch = ProductBatch(
                    product_id=p.id,
                    batch_number=f"BATCH-{p.name[:3].upper()}-{suffix}",
                    quantity=qty,
                    expiry_date=today + timedelta(days=days_off),
                    purchase_date=today - timedelta(days=random.randint(30, 180)),
                    unit_cost=p.unit_cost,
                )
                db.add(batch)
                batch_count += 1
        db.commit()
        print(f"   ✅ {batch_count} product batches created")

        # ──────────────────────────────────────────
        # 3. GENERATE SALES HISTORY (6 months)
        # ──────────────────────────────────────────
        sales_count = 0
        start_date = today - timedelta(days=180)

        # Base weekly demand per product (rough)
        base_demands = [85, 50, 20, 25, 60, 15, 40, 30, 2, 25, 20, 35, 8, 15, 10, 5, 35, 10]

        for week_offset in range(26):  # 26 weeks = 6 months
            week_start = start_date + timedelta(weeks=week_offset)

            for i, product in enumerate(products):
                base = base_demands[i % len(base_demands)]

                # Add seasonality (increase demand in Jul-Oct for medicines)
                month = week_start.month
                seasonal_mult = 1.0
                if product.category == "medicines" and 7 <= month <= 10:
                    seasonal_mult = 1.3  # Dengue / monsoon boost
                if product.category == "personal_care" and 7 <= month <= 9:
                    seasonal_mult = 1.25  # Monsoon
                if product.category == "medicines" and 12 <= month or month <= 2:
                    seasonal_mult = 1.15  # Winter cold/flu

                # Add random noise
                qty = max(1, int(base * seasonal_mult * random.uniform(0.7, 1.4)))

                # Create daily records within the week (3-5 sales days per week)
                num_days = random.randint(3, 6)
                for day_offset in range(num_days):
                    sale_date = week_start + timedelta(days=day_offset)
                    daily_qty = max(1, qty // num_days + random.randint(-2, 3))
                    revenue = daily_qty * product.unit_cost

                    sale = SalesHistory(
                        product_id=product.id,
                        date=sale_date,
                        quantity=daily_qty,
                        revenue=revenue,
                    )
                    db.add(sale)
                    sales_count += 1

        db.commit()
        print(f"   ✅ {sales_count} sales history records created (6 months)")

        # ──────────────────────────────────────────
        # 4. SEED DISEASE SEASONS
        # ──────────────────────────────────────────
        diseases = [
            ("Chickenpox", 2, 5, "Calamine Lotion,Acyclovir Cream,ORS Sachets", 35),
            ("Dengue", 7, 10, "Paracetamol 500mg,ORS Sachets,Electrolyte Sachets", 40),
            ("Flu / Cold", 12, 2, "Cetrizine 10mg,Cough Syrup (100ml),Vitamin C 500mg", 30),
            ("Heat Stroke", 4, 6, "ORS Sachets,Electrolyte Sachets,Glucose Powder", 35),
            ("Malaria", 6, 9, "Chloroquine Tablets,Paracetamol 500mg", 30),
            ("Conjunctivitis", 7, 9, "Eye Drops (Antibiotic),Cetrizine 10mg", 25),
            ("Typhoid", 5, 8, "Amoxicillin 250mg,ORS Sachets,Electrolyte Sachets", 30),
        ]
        for (disease, start, end, meds, boost) in diseases:
            ds = DiseaseSeason(
                disease=disease,
                start_month=start,
                end_month=end,
                medicines=meds,
                boost_pct=boost,
            )
            db.add(ds)
        db.commit()
        print(f"   ✅ {len(diseases)} disease seasons seeded")

        # ──────────────────────────────────────────
        # 5. SEED FESTIVAL CALENDAR
        # ──────────────────────────────────────────
        festivals = [
            ("Diwali", 10, "sweets,dry fruits,gift items", 1.8),
            ("Holi", 3, "colors,skin creams,ORS", 1.5),
            ("Navratri", 10, "fasting foods,fruits,dairy", 1.4),
            ("Eid", 4, "sweets,dairy,vermicelli", 1.5),
            ("Christmas", 12, "beverages,snacks,party items", 1.3),
            ("Pongal", 1, "sweets,dairy,rice", 1.4),
            ("Ram Navami", 4, "sweets,puja items,dairy", 1.3),
            ("Exam Season (March)", 3, "energy drinks,glucose,stationery", 1.2),
            ("Wedding Season Start", 11, "sweets,dairy,beverages,gifts", 1.6),
        ]
        for (name, month, cats, mult) in festivals:
            fc = FestivalCalendar(
                name=name,
                month=month,
                affected_categories=cats,
                demand_multiplier=mult,
            )
            db.add(fc)
        db.commit()
        print(f"   ✅ {len(festivals)} festivals seeded")

        # ──────────────────────────────────────────
        # 6. SEED SAMPLE ALERTS
        # ──────────────────────────────────────────
        alerts_data = [
            (products[16].id, "stockout", "critical", "OUT OF STOCK: Ibuprofen 400mg",
             "Ibuprofen 400mg is out of stock. Immediate reorder recommended. Dengue season is currently active."),
            (products[0].id, "low_stock", "warning", "Low Stock: Paracetamol 500mg",
             "Paracetamol 500mg is below reorder point (100). Current stock: 45 strips."),
            (products[5].id, "low_stock", "warning", "Low Stock: Calamine Lotion",
             "Calamine Lotion is below reorder point (30). Current stock: 25 bottles. Chickenpox season approaching."),
            (products[12].id, "low_stock", "warning", "Low Stock: Acyclovir Cream",
             "Acyclovir Cream is below reorder point (20). Current stock: 15 tubes."),
            (None, "seasonal", "info", "🦟 Dengue Season Active",
             "Dengue season is active in Tamil Nadu (Jul-Oct). Consider stocking 40% more ORS and Paracetamol."),
        ]
        for (pid, atype, sev, title, msg) in alerts_data:
            a = Alert(
                user_id=user.id,
                product_id=pid,
                type=atype,
                severity=sev,
                title=title,
                message=msg,
            )
            db.add(a)
        db.commit()
        print(f"   ✅ {len(alerts_data)} sample alerts created")

        # ──────────────────────────────────────────
        # 7. SEED SAMPLE ANOMALIES
        # ──────────────────────────────────────────
        anomaly_data = [
            (products[0].id, today - timedelta(days=3), "spike", 2.8,
             "Paracetamol demand is 3× normal — possible local illness outbreak."),
            (products[1].id, today - timedelta(days=5), "spike", 2.3,
             "ORS demand is significantly above average — likely heat wave related."),
            (products[4].id, today - timedelta(days=10), "drop", -2.1,
             "Cetrizine demand dropped unexpectedly. Check if competitor pricing changed."),
        ]
        for (pid, adate, atype, zscore, explanation) in anomaly_data:
            an = Anomaly(
                product_id=pid,
                date=adate,
                type=atype,
                z_score=zscore,
                explanation=explanation,
            )
            db.add(an)
        db.commit()
        print(f"   ✅ {len(anomaly_data)} sample anomalies created")

        # ──────────────────────────────────────────
        # DONE
        # ──────────────────────────────────────────
        print("\n🎉 Seed complete!")
        print(f"   Login: phone=+919876543210, password=demo1234")
        print(f"   Total: {len(products)} products, {sales_count} sales records")

    except Exception as e:
        db.rollback()
        print(f"❌ Seed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
