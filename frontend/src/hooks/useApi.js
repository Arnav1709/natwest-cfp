import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for API calls with loading/error/empty states.
 * No mock fallback — shows real data or error state.
 *
 * Fixed: stabilized apiCall reference to prevent blank pages on
 * re-navigation. The old implementation passed a new [] to useCallback
 * on every render, causing fetchData identity to change → useEffect
 * re-fired → race condition on unmount/remount.
 */
export function useApi(apiCall, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Stabilize the apiCall reference — always use the latest function
  // without causing re-renders when the inline arrow changes identity.
  const apiCallRef = useRef(apiCall);
  apiCallRef.current = apiCall;

  // Serialize deps to detect real changes (not just reference changes)
  const depsKey = JSON.stringify(deps);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiCallRef.current();
      setData(result);
    } catch (err) {
      console.error('API error:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  useEffect(() => {
    let cancelled = false;

    async function doFetch() {
      setLoading(true);
      setError(null);
      try {
        const result = await apiCallRef.current();
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('API error:', err.message);
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    doFetch();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [depsKey]);

  return { data, loading, error, refetch: fetchData, setData };
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
