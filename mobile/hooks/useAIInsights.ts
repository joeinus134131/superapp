import { useLanguage } from '../context/languageContext';
import { useState, useEffect, useCallback } from 'react';
import { fetchAIInsights, AIInsight } from '../lib/ai';
import { getData, setData, STORAGE_KEYS } from '../lib/storage';

const CACHE_KEY = 'ai_insights_cache';
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

export function useAIInsights() {
  const { language } = useLanguage();
  const cacheKey = `${CACHE_KEY}_${language}`;
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const loadCached = useCallback(async () => {
    const cached = await getData(cacheKey);
    if (cached && cached.data && (Date.now() - cached.timestamp < CACHE_TTL)) {
      setInsights(cached.data);
      setLoading(false);
      return true;
    }
    return false;
  }, [cacheKey]);

  const refreshInsights = useCallback(async (force = true) => {
    if (!force) {
      const hasCache = await loadCached();
      if (hasCache) return;
    }

    setLoading(true);
    try {
      const data = await fetchAIInsights(language);
      if (data && data.length > 0) {
        setInsights(data);
        await setData(cacheKey, { data, timestamp: Date.now() });
      }
    } catch (e) {
      console.error('Hook fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [loadCached, language, cacheKey]);

  useEffect(() => {
    refreshInsights(false); // Try cache first on mount
  }, [refreshInsights]);

  return { insights, loading, refreshInsights };
}
