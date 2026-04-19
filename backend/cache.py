"""
SupplySense — In-Memory Cache Manager

Lightweight per-user TTL cache for read-heavy API endpoints.
Uses cachetools TTLCache (no Redis/external dependency needed).

Usage in routers:
    from cache import cache_get, cache_set, cache_invalidate

    # Check cache first
    cached = cache_get(user_id, "inventory_list", category="all")
    if cached is not None:
        return cached

    # ... expensive DB query ...
    result = heavy_query(db)

    # Store in cache
    cache_set(user_id, "inventory_list", result, category="all")
    return result

    # On mutation, bust relevant caches
    cache_invalidate(user_id, "inventory_list", "inventory_health")
"""

import threading
from cachetools import TTLCache

# ── Configuration ──────────────────────────────────────────
# Max entries per cache namespace and default TTLs (seconds)
_DEFAULT_TTL = 60
_LONG_TTL = 120  # For expensive computation (forecast, reorder)
_MAX_ENTRIES = 256

# TTL overrides per cache namespace
_TTL_MAP = {
    "inventory_list": _DEFAULT_TTL,
    "inventory_health": _DEFAULT_TTL,
    "inventory_expiring": _DEFAULT_TTL,
    "inventory_product": _DEFAULT_TTL,
    "forecast_all": _LONG_TTL,
    "forecast_product": _LONG_TTL,
    "reorder": _LONG_TTL,
    "alerts": _DEFAULT_TTL,
    "anomalies": _DEFAULT_TTL,
    "anomalies_product": _DEFAULT_TTL,
    "sales_history": _DEFAULT_TTL,
    "notification_settings": _DEFAULT_TTL,
}

# ── Internal Storage ───────────────────────────────────────
# Structure: { namespace: TTLCache({ composite_key: value }) }
_caches: dict[str, TTLCache] = {}
_lock = threading.Lock()


def _get_cache(namespace: str) -> TTLCache:
    """Get or create a TTLCache for the given namespace."""
    if namespace not in _caches:
        ttl = _TTL_MAP.get(namespace, _DEFAULT_TTL)
        _caches[namespace] = TTLCache(maxsize=_MAX_ENTRIES, ttl=ttl)
    return _caches[namespace]


def _make_key(user_id: int, **params) -> str:
    """Build a composite cache key from user_id + sorted params."""
    parts = [str(user_id)]
    for k in sorted(params.keys()):
        parts.append(f"{k}={params[k]}")
    return "|".join(parts)


# ── Public API ─────────────────────────────────────────────

def cache_get(user_id: int, namespace: str, **params):
    """
    Retrieve a cached value.
    Returns None on cache miss (callers should check `is not None`).
    """
    with _lock:
        cache = _get_cache(namespace)
        key = _make_key(user_id, **params)
        return cache.get(key)


def cache_set(user_id: int, namespace: str, value, **params):
    """Store a value in the cache."""
    with _lock:
        cache = _get_cache(namespace)
        key = _make_key(user_id, **params)
        cache[key] = value


def cache_invalidate(user_id: int, *namespaces: str):
    """
    Invalidate all cached entries for given namespaces.
    If no namespaces provided, clears ALL caches for the user.

    For simplicity, clears the entire namespace cache
    (not just user-specific entries), which is fine for
    single-user or low-traffic scenarios.
    """
    with _lock:
        if not namespaces:
            # Clear everything
            for ns in list(_caches.keys()):
                _caches[ns].clear()
        else:
            for ns in namespaces:
                if ns in _caches:
                    _caches[ns].clear()


def cache_invalidate_all():
    """Nuclear option — clear every cache namespace."""
    with _lock:
        for cache in _caches.values():
            cache.clear()
