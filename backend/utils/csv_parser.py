"""
CSV/Excel parser utility — AI-powered column detection.

Uses the LLM to intelligently map arbitrary column names to our expected fields:
  product name, date, quantity, price, expiry_date, category.

Falls back to a simple heuristic if the AI call fails.
"""

import io
import json
import logging
import re
from typing import Dict, List, Optional, Tuple

import pandas as pd

from schemas.upload import ParsedProduct

logger = logging.getLogger(__name__)


# ── Expected fields and their semantics (used in the AI prompt) ──────────

EXPECTED_FIELDS = {
    "name": "The product / item name (the main identifier of the item being tracked)",
    "date": "A date field such as sale date, transaction date, or order date",
    "quantity": "The numeric quantity — units sold, stock count, amount, etc.",
    "price": "The unit price or cost per item (NOT total/aggregated amounts)",
    "expiry_date": "Expiry / expiration / best-before date of the product",
    "category": "Product category or type classification",
}


# ── Heuristic fallback aliases (used when AI is unavailable) ─────────────

_FALLBACK_ALIASES = {
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
        "quantity_sold", "sold_quantity", "total_qty",
        "amount", "count", "num", "stock", "current_stock",
    ],
    "price": [
        "price", "unit_price", "cost", "unit_cost", "rate",
        "mrp", "selling_price", "sale_price",
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
    "sno", "sl_no", "sl no", "index", "transaction_id",
    "transaction id", "txn_id", "txn id",
}


# ═══════════════════════════════════════════════════════════════════════════
# AI-powered column mapping
# ═══════════════════════════════════════════════════════════════════════════

def _ai_map_columns(column_names: List[str], sample_rows: List[dict]) -> Optional[Dict[str, str]]:
    """
    Use the LLM to intelligently map column names to our expected fields.

    Sends the column names + a few sample rows to the AI and asks it to
    return a JSON mapping of { our_field: csv_column_name }.

    Args:
        column_names: List of column names from the uploaded file.
        sample_rows: A few sample data rows (as dicts) for context.

    Returns:
        Dict mapping our field names to CSV column names, or None on failure.
        Example: {"name": "Product Name", "date": "Sale Date", "quantity": "Quantity Sold", ...}
    """
    from services.ai_client import call_llm

    # Prepare sample data preview (max 3 rows to keep prompt small)
    sample_str = ""
    for i, row in enumerate(sample_rows[:3]):
        row_preview = {k: str(v)[:50] for k, v in row.items()}
        sample_str += f"  Row {i+1}: {json.dumps(row_preview, ensure_ascii=False)}\n"

    prompt = f"""You are a data-mapping assistant. Given these CSV/Excel column names and sample data rows, map each column to our standard field names.

**CSV Columns:** {json.dumps(column_names, ensure_ascii=False)}

**Sample Data:**
{sample_str}

**Our Standard Fields (map CSV columns to these):**
- "name": The product/item name or description (the main identifier)
- "date": A sale date, transaction date, or entry date
- "quantity": The numeric quantity — units sold, stock count, etc.
- "price": The per-unit price or cost (NOT total/aggregated amounts like total sales/revenue)
- "expiry_date": Product expiry/expiration/best-before date
- "category": Product category or type

**Rules:**
1. Each standard field should map to AT MOST one CSV column.
2. Only include a mapping if you are confident the column matches.
3. If a CSV column is clearly a total/aggregated amount (e.g., "Total Sales"), do NOT map it to "price" — "price" should be per-unit cost.
4. If a CSV column is an ID/serial number (e.g., "Transaction ID", "Product ID"), do NOT map it to "name".
5. Omit any standard field that has no matching column.
6. Return ONLY a JSON object, no markdown, no explanation.

**Example output:**
{{"name": "Product Name", "quantity": "Qty Sold", "price": "Unit Price (₹)", "date": "Sale Date"}}

Return the mapping JSON now:"""

    try:
        response = call_llm(prompt)
        if not response:
            logger.warning("AI column mapping returned empty response")
            return None

        # Clean markdown fences if present
        cleaned = response.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()

        mapping = json.loads(cleaned)

        if not isinstance(mapping, dict):
            logger.warning("AI column mapping returned non-dict: %s", type(mapping))
            return None

        # Validate that mapped column names actually exist in the CSV
        valid_mapping = {}
        col_set = set(column_names)
        for field, col in mapping.items():
            if field in EXPECTED_FIELDS and col in col_set:
                valid_mapping[field] = col
            else:
                logger.debug(
                    "Skipping AI mapping %s -> %s (field valid: %s, col exists: %s)",
                    field, col, field in EXPECTED_FIELDS, col in col_set,
                )

        logger.info("AI column mapping result: %s", valid_mapping)
        return valid_mapping if valid_mapping else None

    except (json.JSONDecodeError, KeyError, TypeError) as e:
        logger.warning("Failed to parse AI column mapping response: %s", e)
        return None
    except Exception as e:
        logger.warning("AI column mapping failed: %s", e)
        return None


# ═══════════════════════════════════════════════════════════════════════════
# Heuristic fallback — used when AI is unavailable
# ═══════════════════════════════════════════════════════════════════════════

def _heuristic_detect_column(df_columns: List[str], target: str) -> str | None:
    """
    Heuristic fallback: find the best matching column for a target field.
    Normalises whitespace/underscores and strips parenthetical suffixes.
    """
    aliases = _FALLBACK_ALIASES.get(target, [])

    lower_cols = {}
    normalised_cols = {}
    cleaned_cols = {}
    for col in df_columns:
        lc = col.lower().strip()
        lower_cols[lc] = col
        normalised_cols[lc.replace(" ", "_")] = col
        # Strip parenthetical suffixes like " (₹)" and special chars
        cleaned = re.sub(r'\s*\(.*?\)', '', lc).strip()
        cleaned = re.sub(r'[₹$€£%#]', '', cleaned).strip()
        cleaned_cols[cleaned.replace(" ", "_")] = col

    for alias in aliases:
        if alias in lower_cols:
            return lower_cols[alias]
        if alias in normalised_cols:
            return normalised_cols[alias]
        if alias in cleaned_cols:
            return cleaned_cols[alias]

    return None


def _heuristic_map_columns(df_columns: List[str]) -> Dict[str, str]:
    """Build a column mapping using heuristic alias matching."""
    mapping = {}
    for field in EXPECTED_FIELDS:
        col = _heuristic_detect_column(df_columns, field)
        if col:
            mapping[field] = col
    return mapping


# ═══════════════════════════════════════════════════════════════════════════
# Public API
# ═══════════════════════════════════════════════════════════════════════════

def parse_csv(file_content: bytes, filename: str) -> Tuple[List[ParsedProduct], List[str]]:
    """
    Parse a CSV or Excel file and extract product/sales data.

    Uses AI to intelligently detect column mappings, with a heuristic
    fallback if the LLM is unavailable.

    Args:
        file_content: Raw bytes of the uploaded file.
        filename: Original filename (used to detect Excel vs CSV).

    Returns:
        Tuple of (list of ParsedProduct, list of detected column names).
    """
    # ── Read into DataFrame ──
    if filename.endswith((".xlsx", ".xls")):
        df = pd.read_excel(io.BytesIO(file_content))
    else:
        try:
            df = pd.read_csv(io.BytesIO(file_content), encoding="utf-8")
        except UnicodeDecodeError:
            df = pd.read_csv(io.BytesIO(file_content), encoding="latin-1")

    if df.empty:
        return [], []

    columns = df.columns.tolist()

    # ── Ask AI to map columns (primary) ──
    sample_rows = df.head(3).to_dict(orient="records")
    col_mapping = _ai_map_columns(columns, sample_rows)

    # ── Fallback to heuristic if AI failed ──
    if not col_mapping:
        logger.info("Using heuristic column detection (AI unavailable)")
        col_mapping = _heuristic_map_columns(columns)

    name_col = col_mapping.get("name")
    date_col = col_mapping.get("date")
    qty_col = col_mapping.get("quantity")
    price_col = col_mapping.get("price")
    expiry_col = col_mapping.get("expiry_date")
    category_col = col_mapping.get("category")

    # ── Build detected_columns list for the frontend ──
    # Uses standardised names so the frontend can identify column types.
    _field_to_detected = {
        "name": "product_name",
        "date": "date",
        "quantity": "quantity",
        "price": "unit_price",
        "expiry_date": "expiry_date",
        "category": "category",
    }
    detected_columns = [
        _field_to_detected[f]
        for f in _field_to_detected
        if f in col_mapping
    ]

    # ── If no name column, try the first text column (not an ID) ──
    if not name_col:
        for col in columns:
            if col.lower().strip() in _ID_COLUMN_NAMES:
                continue
            if df[col].dtype == "object":
                name_col = col
                if "product_name" not in detected_columns:
                    detected_columns.insert(0, "product_name")
                break

    if not name_col:
        logger.warning("No product name column detected in %s", filename)
        return [], detected_columns

    # ── Extract rows ──
    products: List[ParsedProduct] = []
    for _, row in df.iterrows():
        name_val = str(row[name_col]).strip() if pd.notna(row.get(name_col)) else ""
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
                raw = row[price_col]
                # Strip currency symbols if value is a string
                if isinstance(raw, str):
                    raw = re.sub(r'[₹$€£,]', '', raw).strip()
                price_val = float(raw)
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

    logger.info(
        "Parsed %d rows from '%s' | Mapping: %s",
        len(products), filename, col_mapping,
    )
    return products, detected_columns
