"""
CSV/Excel parser utility.
Auto-detects columns (product name, date, quantity, price, expiry, category)
from uploaded files.
"""

import io
from typing import List, Tuple

import pandas as pd

from schemas.upload import ParsedProduct


# Common column name variations for auto-detection
COLUMN_ALIASES = {
    "name": [
        "product_name", "product", "name", "item_name", "item",
        "medicine", "medicine_name", "sku", "description",
    ],
    "date": [
        "date", "sale_date", "transaction_date", "sold_date",
        "order_date", "created_at", "timestamp",
    ],
    "quantity": [
        "quantity", "qty", "units", "sold", "units_sold",
        "amount", "count", "num", "stock", "current_stock",
    ],
    "price": [
        "price", "unit_price", "cost", "unit_cost", "rate",
        "mrp", "selling_price", "revenue",
    ],
    "expiry_date": [
        "expiry_date", "expiry", "exp_date", "expiration_date",
        "expiration", "exp", "best_before", "use_before",
        "valid_until", "valid_till", "shelf_life_end",
    ],
    "category": [
        "category", "cat", "type", "product_type", "group",
        "product_category", "item_category", "class",
    ],
}

# Column names that look like identifiers and should NOT be used as
# the product name when a real name column exists.
_ID_COLUMN_NAMES = {
    "product_id", "product id", "id", "item_id", "item id",
    "sku_id", "sku id", "sr", "sr_no", "sr no",
    "serial", "serial_no", "serial no", "s_no", "s no",
    "sno", "sl_no", "sl no", "index",
}


def _detect_column(df_columns: List[str], target: str) -> str | None:
    """
    Find the best matching column name for a target field.

    Normalises whitespace ↔ underscore so that "Product Name" matches
    the alias "product_name" and vice-versa.

    Args:
        df_columns: List of column names from the DataFrame.
        target: One of 'name', 'date', 'quantity', 'price', 'expiry_date', 'category'.

    Returns:
        The matching column name, or None if not found.
    """
    aliases = COLUMN_ALIASES.get(target, [])

    # Build TWO lookup maps: one with the raw lowered name, one with
    # spaces replaced by underscores.  This lets "Product Name" match
    # the alias "product_name" and "expiry_date" match "Expiry Date".
    lower_cols = {}          # lowered col → original col
    normalised_cols = {}     # lowered + spaces→underscores → original col
    for col in df_columns:
        lc = col.lower().strip()
        lower_cols[lc] = col
        normalised_cols[lc.replace(" ", "_")] = col

    for alias in aliases:
        # Try exact match first, then normalised
        if alias in lower_cols:
            return lower_cols[alias]
        if alias in normalised_cols:
            return normalised_cols[alias]

    return None


def parse_csv(file_content: bytes, filename: str) -> Tuple[List[ParsedProduct], List[str]]:
    """
    Parse a CSV or Excel file and extract product/sales data.

    Auto-detects column names for product name, date, quantity, price,
    expiry date, and category.
    Returns parsed products and the list of detected column mappings.

    Args:
        file_content: Raw bytes of the uploaded file.
        filename: Original filename (used to detect Excel vs CSV).

    Returns:
        Tuple of (list of ParsedProduct, list of detected column names).
    """
    # Read into DataFrame
    if filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(io.BytesIO(file_content))
    else:
        # Try common encodings
        try:
            df = pd.read_csv(io.BytesIO(file_content), encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(file_content), encoding="latin-1")

    if df.empty:
        return [], []

    # Auto-detect columns
    name_col = _detect_column(df.columns.tolist(), "name")
    date_col = _detect_column(df.columns.tolist(), "date")
    qty_col = _detect_column(df.columns.tolist(), "quantity")
    price_col = _detect_column(df.columns.tolist(), "price")
    expiry_col = _detect_column(df.columns.tolist(), "expiry_date")
    category_col = _detect_column(df.columns.tolist(), "category")

    detected_columns = []
    if name_col:
        detected_columns.append("product_name")
    if date_col:
        detected_columns.append("date")
    if qty_col:
        detected_columns.append("quantity")
    if price_col:
        detected_columns.append("unit_price")
    if expiry_col:
        detected_columns.append("expiry_date")
    if category_col:
        detected_columns.append("category")

    # If no name column detected, try the first text column that
    # is NOT explicitly an ID/numeric-identifier column.
    if not name_col:
        for col in df.columns:
            if col.lower().strip() in _ID_COLUMN_NAMES:
                continue
            if df[col].dtype == "object":
                name_col = col
                detected_columns.insert(0, "product_name")
                break

    products: List[ParsedProduct] = []
    for _, row in df.iterrows():
        name_val = str(row[name_col]).strip() if name_col and pd.notna(row.get(name_col)) else ""
        if not name_val or name_val == "nan":
            continue

        date_val = None
        if date_col and pd.notna(row.get(date_col)):
            try:
                date_val = str(pd.to_datetime(row[date_col]).date())
            except Exception:
                date_val = str(row[date_col])

        qty_val = None
        if qty_col and pd.notna(row.get(qty_col)):
            try:
                qty_val = float(row[qty_col])
            except (ValueError, TypeError):
                pass

        price_val = None
        if price_col and pd.notna(row.get(price_col)):
            try:
                price_val = float(row[price_col])
            except (ValueError, TypeError):
                pass

        expiry_val = None
        if expiry_col and pd.notna(row.get(expiry_col)):
            try:
                expiry_val = str(pd.to_datetime(row[expiry_col]).date())
            except Exception:
                expiry_val = str(row[expiry_col])

        category_val = None
        if category_col and pd.notna(row.get(category_col)):
            category_val = str(row[category_col]).strip()

        products.append(ParsedProduct(
            name=name_val,
            date=date_val,
            quantity=qty_val,
            price=price_val,
            expiry_date=expiry_val,
            category=category_val,
            confidence=1.0,
        ))

    return products, detected_columns

