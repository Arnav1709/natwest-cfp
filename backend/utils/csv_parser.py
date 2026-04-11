"""
CSV/Excel parser utility.
Auto-detects columns (product name, date, quantity, price) from uploaded files.
"""

import io
from typing import List, Tuple

import pandas as pd

from schemas.upload import ParsedProduct


# Common column name variations for auto-detection
COLUMN_ALIASES = {
    "name": [
        "name", "product_name", "product", "item", "item_name",
        "medicine", "medicine_name", "sku", "description",
    ],
    "date": [
        "date", "sale_date", "transaction_date", "sold_date",
        "order_date", "created_at", "timestamp",
    ],
    "quantity": [
        "quantity", "qty", "units", "sold", "units_sold",
        "amount", "count", "num",
    ],
    "price": [
        "price", "unit_price", "cost", "unit_cost", "rate",
        "mrp", "selling_price", "revenue",
    ],
}


def _detect_column(df_columns: List[str], target: str) -> str | None:
    """
    Find the best matching column name for a target field.

    Args:
        df_columns: List of column names from the DataFrame.
        target: One of 'name', 'date', 'quantity', 'price'.

    Returns:
        The matching column name, or None if not found.
    """
    aliases = COLUMN_ALIASES.get(target, [])
    lower_cols = {col.lower().strip(): col for col in df_columns}

    for alias in aliases:
        if alias in lower_cols:
            return lower_cols[alias]

    return None


def parse_csv(file_content: bytes, filename: str) -> Tuple[List[ParsedProduct], List[str]]:
    """
    Parse a CSV or Excel file and extract product/sales data.

    Auto-detects column names for product name, date, quantity, and price.
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

    detected_columns = []
    if name_col:
        detected_columns.append("product_name")
    if date_col:
        detected_columns.append("date")
    if qty_col:
        detected_columns.append("quantity")
    if price_col:
        detected_columns.append("unit_price")

    # If no name column detected, try the first text column
    if not name_col:
        for col in df.columns:
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

        products.append(ParsedProduct(
            name=name_val,
            date=date_val,
            quantity=qty_val,
            price=price_val,
            confidence=1.0,
        ))

    return products, detected_columns
