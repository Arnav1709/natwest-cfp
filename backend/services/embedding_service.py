"""
Embedding Service — ChromaDB-powered vector similarity for cold-start forecasting.

When a new product has insufficient sales history (<8 weeks), this service:
1. Generates a text embedding for the product using Gemini's embedding API
2. Stores it persistently in ChromaDB (survives server restarts)
3. Finds the most similar existing products via cosine similarity
4. Returns their sales data as a proxy for the new product's forecast

ChromaDB runs locally — no external vector DB server needed.
Data persists at: /app/data/chroma_db/
"""

import logging
import os
from datetime import date, timedelta
from typing import List, Optional, Tuple

import numpy as np
from sqlalchemy.orm import Session
from sqlalchemy import func as sql_func

from models.product import Product
from models.sales import SalesHistory

logger = logging.getLogger(__name__)

# ── ChromaDB persistent client ──────────────────────────────────
_chroma_client = None
_collection = None

CHROMA_DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "chroma_db")


def _get_collection():
    """
    Lazy-init ChromaDB collection.
    Creates persistent storage on first call, reuses on subsequent calls.
    """
    global _chroma_client, _collection

    if _collection is not None:
        return _collection

    try:
        import chromadb

        # Ensure directory exists
        os.makedirs(CHROMA_DB_PATH, exist_ok=True)

        _chroma_client = chromadb.PersistentClient(path=CHROMA_DB_PATH)
        _collection = _chroma_client.get_or_create_collection(
            name="product_embeddings",
            metadata={"hnsw:space": "cosine"},  # Use cosine similarity
        )
        logger.info("ChromaDB initialized at %s (%d embeddings stored)",
                     CHROMA_DB_PATH, _collection.count())
        return _collection

    except Exception as e:
        logger.error("ChromaDB init failed: %s", e)
        return None


def _generate_embedding(text: str) -> Optional[List[float]]:
    """
    Generate a text embedding using Gemini's embedding API.
    Returns a list of 768 floats, or None if API is unavailable.
    """
    try:
        from config import settings
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            return None

        import google.generativeai as genai
        genai.configure(api_key=api_key)

        result = genai.embed_content(
            model="models/text-embedding-004",
            content=text,
            task_type="SEMANTIC_SIMILARITY",
        )
        return result["embedding"]

    except Exception as e:
        logger.warning("Embedding generation failed: %s", e)
        return None


def _build_product_text(product: Product) -> str:
    """
    Build a descriptive text string for embedding.
    Combines name + category for semantic matching.
    """
    parts = [product.name]
    if product.category:
        parts.append(f"category: {product.category}")
    if product.unit:
        parts.append(f"unit: {product.unit}")
    return " | ".join(parts)


def _make_id(product_id: int) -> str:
    """Create a ChromaDB document ID from product_id."""
    return f"product_{product_id}"


def store_embedding(product: Product) -> bool:
    """
    Generate and store embedding for a product in ChromaDB.
    Called when a new product is added or updated.

    Returns True if successful, False otherwise.
    """
    collection = _get_collection()
    if collection is None:
        return False

    text = _build_product_text(product)
    embedding = _generate_embedding(text)
    if embedding is None:
        return False

    try:
        collection.upsert(
            ids=[_make_id(product.id)],
            embeddings=[embedding],
            metadatas=[{
                "product_id": product.id,
                "name": product.name,
                "category": product.category or "",
            }],
            documents=[text],
        )
        logger.info("Stored embedding for '%s' (id=%d) in ChromaDB",
                     product.name, product.id)
        return True

    except Exception as e:
        logger.error("Failed to store embedding: %s", e)
        return False


def find_similar_products(
    db: Session,
    target_product: Product,
    user_id: int,
    top_k: int = 3,
    min_similarity: float = 0.60,
) -> List[Tuple[Product, float]]:
    """
    Find the most similar products to a target product using ChromaDB.

    Steps:
    1. Ensure target product has an embedding in ChromaDB
    2. Query ChromaDB for nearest neighbors
    3. Filter by user_id and minimum sales data
    4. Return top-k matches with similarity scores

    Args:
        db: Database session
        target_product: The new product that needs a forecast
        user_id: Owner's user ID (only compare within same user's products)
        top_k: Number of similar products to return
        min_similarity: Minimum cosine similarity threshold (0-1)

    Returns:
        List of (Product, similarity_score) tuples, sorted by similarity desc
    """
    collection = _get_collection()
    if collection is None:
        logger.warning("ChromaDB not available — skipping similarity search")
        return []

    # Ensure all user's products have embeddings
    _ensure_user_products_embedded(db, user_id)

    # Generate embedding for target product
    target_text = _build_product_text(target_product)
    target_embedding = _generate_embedding(target_text)

    if target_embedding is None:
        logger.warning("Cannot generate embedding for '%s' — Gemini API unavailable",
                       target_product.name)
        return []

    # Store target's embedding too
    store_embedding(target_product)

    # Query ChromaDB for similar products
    # Request more than top_k since we'll filter by user_id and sales data
    try:
        results = collection.query(
            query_embeddings=[target_embedding],
            n_results=min(top_k * 3, collection.count()),  # Over-fetch then filter
        )
    except Exception as e:
        logger.error("ChromaDB query failed: %s", e)
        return []

    if not results or not results["ids"] or not results["ids"][0]:
        return []

    # Process results
    similar = []
    for idx, doc_id in enumerate(results["ids"][0]):
        # Skip self
        if doc_id == _make_id(target_product.id):
            continue

        # Extract product_id from ChromaDB metadata
        metadata = results["metadatas"][0][idx]
        product_id = metadata.get("product_id")
        if product_id is None:
            continue

        # Cosine distance → similarity (ChromaDB returns distance, not similarity)
        distance = results["distances"][0][idx]
        similarity = 1.0 - distance  # Convert distance to similarity

        if similarity < min_similarity:
            continue

        # Verify: product belongs to same user and has enough sales
        product = db.query(Product).filter(
            Product.id == product_id,
            Product.user_id == user_id,
        ).first()

        if not product:
            continue

        # Check if product has at least 2 weeks of daily data
        sales_count = (
            db.query(sql_func.count(SalesHistory.id))
            .filter(SalesHistory.product_id == product_id)
            .scalar()
        )
        if sales_count < 14:
            continue

        similar.append((product, similarity))

        if len(similar) >= top_k:
            break

    if similar:
        logger.info("Found %d similar products for '%s':",
                     len(similar), target_product.name)
        for prod, score in similar:
            logger.info("  → '%s' (%.0f%% similar)", prod.name, score * 100)

    return similar


def _ensure_user_products_embedded(db: Session, user_id: int):
    """
    Ensure all products for a user have embeddings in ChromaDB.
    Only generates embeddings for products that are missing.
    """
    collection = _get_collection()
    if collection is None:
        return

    products = db.query(Product).filter(Product.user_id == user_id).all()

    for product in products:
        doc_id = _make_id(product.id)
        # Check if already in ChromaDB
        try:
            existing = collection.get(ids=[doc_id])
            if existing and existing["ids"]:
                continue  # Already stored
        except Exception:
            pass

        # Generate and store
        store_embedding(product)


def get_proxy_sales(
    db: Session,
    similar_products: List[Tuple[Product, float]],
    weeks: int = 8,
) -> List[dict]:
    """
    Build a weighted proxy sales history from similar products.

    Higher-similarity products contribute more to the proxy.
    Returns a list of {date, quantity} records suitable for forecasting.

    Args:
        db: Database session
        similar_products: List of (Product, similarity_score)
        weeks: How many weeks of history to pull

    Returns:
        List of synthetic daily sales records
    """
    if not similar_products:
        return []

    today = date.today()
    start_date = today - timedelta(weeks=weeks)

    # Normalize weights to sum=1
    total_weight = sum(score for _, score in similar_products)
    if total_weight == 0:
        return []

    # Build a date -> weighted_quantity map
    date_quantities: dict = {}

    for product, score in similar_products:
        weight = score / total_weight

        sales = (
            db.query(SalesHistory)
            .filter(
                SalesHistory.product_id == product.id,
                SalesHistory.date >= start_date,
            )
            .order_by(SalesHistory.date.asc())
            .all()
        )

        for sale in sales:
            d = sale.date
            if d not in date_quantities:
                date_quantities[d] = 0.0
            date_quantities[d] += float(sale.quantity) * weight

    # Convert to sorted list
    proxy_sales = []
    for d in sorted(date_quantities.keys()):
        proxy_sales.append({
            "date": d,
            "quantity": round(date_quantities[d], 1),
        })

    logger.info("Generated %d proxy sales records from %d similar products",
                len(proxy_sales), len(similar_products))
    return proxy_sales


def delete_embedding(product_id: int) -> bool:
    """Remove a product's embedding from ChromaDB (e.g., when product is deleted)."""
    collection = _get_collection()
    if collection is None:
        return False

    try:
        collection.delete(ids=[_make_id(product_id)])
        logger.info("Deleted embedding for product %d", product_id)
        return True
    except Exception as e:
        logger.error("Failed to delete embedding: %s", e)
        return False


def get_stats() -> dict:
    """Get ChromaDB statistics for debugging/monitoring."""
    collection = _get_collection()
    if collection is None:
        return {"status": "unavailable", "count": 0}

    return {
        "status": "active",
        "count": collection.count(),
        "path": CHROMA_DB_PATH,
    }
