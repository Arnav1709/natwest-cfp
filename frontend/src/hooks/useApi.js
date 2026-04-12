import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * ── Stale-While-Revalidate Client Cache ──────────────────
 * Simple in-memory cache with TTL.
 * On mount: instantly return cached data (no loading flash),
 * then revalidate in background.
 */
const _cache = new Map();
const _CACHE_TTL = 30_000; // 30 seconds

function getCached(key) {
  const entry = _cache.get(key);
  if (!entry) return undefined;
  // Return data even if stale (SWR pattern) — caller checks freshness
  return entry;
}

function setCache(key, data) {
  _cache.set(key, { data, timestamp: Date.now() });
}

function isFresh(entry) {
  return entry && (Date.now() - entry.timestamp) < _CACHE_TTL;
}


/**
 * Custom hook for API calls with loading/error/empty states.
 * Features:
 * - Stale-while-revalidate: shows cached data instantly, refreshes in background
 * - Mounted guard: prevents state updates on unmounted components
 * - Stable apiCall ref: prevents re-render loops from unstable inline arrows
 */
export function useApi(apiCall, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  // Stabilize the apiCall reference — always use the latest function
  // without causing re-renders when the inline arrow changes identity.
  const apiCallRef = useRef(apiCall);
  apiCallRef.current = apiCall;

  // Serialize deps to detect real changes (not just reference changes)
  const depsKey = JSON.stringify(deps);

  // Use depsKey as cache key (captures which data we're fetching)
  const cacheKey = useRef('');

  const fetchData = useCallback(async (showLoading = true) => {
    if (!mountedRef.current) return;

    // Build a cache key from the stringified deps
    const key = `useApi:${depsKey}:${apiCallRef.current.toString().slice(0, 80)}`;
    cacheKey.current = key;

    // Check cache first (SWR: use stale data immediately)
    const cached = getCached(key);
    if (cached) {
      setData(cached.data);
      setError(null);
      // If data is still fresh, skip network call entirely
      if (isFresh(cached)) {
        setLoading(false);
        return;
      }
      // Data is stale — show it but refresh in background (no loading spinner)
      setLoading(false);
    } else if (showLoading) {
      setLoading(true);
    }

    try {
      const result = await apiCallRef.current();
      if (mountedRef.current && cacheKey.current === key) {
        setData(result);
        setError(null);
        setCache(key, result);
      }
    } catch (err) {
      if (mountedRef.current && cacheKey.current === key) {
        console.error('API error:', err.message);
        setError(err.message);
        // Keep stale data visible on error (don't clear it)
        if (!cached) {
          setData(null);
        }
      }
    } finally {
      if (mountedRef.current && cacheKey.current === key) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  useEffect(() => {
    mountedRef.current = true;
    fetchData(true);

    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  return { data, loading, error, refetch: () => fetchData(false), setData };
}

/**
 * Custom hook for manual API mutations
 */
export function useMutation(apiCall) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiCallRef = useRef(apiCall);
  apiCallRef.current = apiCall;

  const mutate = useCallback(async (...args) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCallRef.current(...args);
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { mutate, loading, error };
}
