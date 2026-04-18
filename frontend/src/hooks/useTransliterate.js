import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { translateApi } from '../services/api';

/**
 * Hook to transliterate product names to the user's selected language.
 *
 * - If language is 'en', returns names as-is (no API call).
 * - Caches results in sessionStorage to avoid repeat API calls within a session.
 * - Falls back to original text if translation fails.
 *
 * @param {string[]} texts - Array of product names to transliterate
 * @returns {{ translatedMap: Object, loading: boolean }}
 */
export function useTransliterate(texts = []) {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [translatedMap, setTranslatedMap] = useState({});
  const [loading, setLoading] = useState(false);
  const lastRequestRef = useRef('');

  useEffect(() => {
    // Filter to unique, non-empty texts
    const unique = [...new Set(texts.filter(t => t && t.trim()))];

    if (lang === 'en' || unique.length === 0) {
      // No translation needed — map each to itself
      const identity = {};
      unique.forEach(t => { identity[t] = t; });
      setTranslatedMap(identity);
      return;
    }

    // Build cache key to avoid duplicate requests
    const requestKey = `${lang}:${unique.sort().join('|')}`;
    if (requestKey === lastRequestRef.current) return;

    // Check sessionStorage cache
    const cacheKey = `transliterate_${lang}`;
    let cached = {};
    try {
      cached = JSON.parse(sessionStorage.getItem(cacheKey) || '{}');
    } catch { cached = {}; }

    // Find which texts still need translation
    const uncached = unique.filter(t => !cached[t]);

    if (uncached.length === 0) {
      // All cached — use from sessionStorage
      const result = {};
      unique.forEach(t => { result[t] = cached[t] || t; });
      setTranslatedMap(result);
      lastRequestRef.current = requestKey;
      return;
    }

    // Call API for uncached texts
    let cancelled = false;
    setLoading(true);

    translateApi.translate(uncached, lang)
      .then(data => {
        if (cancelled) return;
        const newTranslations = data.translations || {};

        // Merge into sessionStorage cache
        const merged = { ...cached, ...newTranslations };
        try {
          sessionStorage.setItem(cacheKey, JSON.stringify(merged));
        } catch { /* sessionStorage full — ignore */ }

        // Build final result map
        const result = {};
        unique.forEach(t => { result[t] = merged[t] || t; });
        setTranslatedMap(result);
        lastRequestRef.current = requestKey;
      })
      .catch(() => {
        if (cancelled) return;
        // Fallback: use original texts
        const result = {};
        unique.forEach(t => { result[t] = cached[t] || t; });
        setTranslatedMap(result);
        lastRequestRef.current = requestKey;
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [texts.join(','), lang]);

  return { translatedMap, loading };
}
