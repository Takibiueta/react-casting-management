// キャッシュ機能用のReact Hooks
import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  globalCache, 
  apiCache, 
  dataTransformCache, 
  cachedApiService,
  CacheKeyGenerator 
} from '../utils/cache-utils';

// 基本的なキャッシュHook
export const useCache = (cacheInstance = globalCache) => {
  const [cacheStats, setCacheStats] = useState(cacheInstance.getStats());

  const getCached = useCallback((key) => {
    return cacheInstance.get(key);
  }, [cacheInstance]);

  const setCached = useCallback((key, value, ttl) => {
    const result = cacheInstance.set(key, value, ttl);
    setCacheStats(cacheInstance.getStats());
    return result;
  }, [cacheInstance]);

  const deleteCached = useCallback((key) => {
    const result = cacheInstance.delete(key);
    setCacheStats(cacheInstance.getStats());
    return result;
  }, [cacheInstance]);

  const clearCache = useCallback(() => {
    const result = cacheInstance.clear();
    setCacheStats(cacheInstance.getStats());
    return result;
  }, [cacheInstance]);

  const hasKey = useCallback((key) => {
    return cacheInstance.has(key);
  }, [cacheInstance]);

  // 定期的にキャッシュ統計を更新
  useEffect(() => {
    const interval = setInterval(() => {
      setCacheStats(cacheInstance.getStats());
    }, 10000); // 10秒間隔

    return () => clearInterval(interval);
  }, [cacheInstance]);

  return {
    getCached,
    setCached,
    deleteCached,
    clearCache,
    hasKey,
    cacheStats
  };
};

// 計算結果をキャッシュするHook
export const useCachedComputation = (computeFn, dependencies = [], options = {}) => {
  const { ttl = 300000, keyPrefix = 'computation' } = options;
  const [result, setResult] = useState(null);
  const [isComputing, setIsComputing] = useState(false);
  const [error, setError] = useState(null);
  
  const computationKey = useRef('');

  const compute = useCallback(async (...args) => {
    const key = `${keyPrefix}-${JSON.stringify([...dependencies, ...args])}`;
    computationKey.current = key;

    // キャッシュから取得を試行
    const cached = globalCache.get(key);
    if (cached) {
      setResult(cached);
      setError(null);
      return cached;
    }

    try {
      setIsComputing(true);
      setError(null);
      
      const computedResult = await computeFn(...args);
      
      // 結果をキャッシュに保存
      globalCache.set(key, computedResult, ttl);
      setResult(computedResult);
      
      return computedResult;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsComputing(false);
    }
  }, [computeFn, dependencies, keyPrefix, ttl]);

  const invalidate = useCallback(() => {
    if (computationKey.current) {
      globalCache.delete(computationKey.current);
      setResult(null);
    }
  }, []);

  return {
    result,
    compute,
    invalidate,
    isComputing,
    error
  };
};

// 注文統計をキャッシュするHook
export const useOrderStatistics = (orders, filters = {}) => {
  const [statistics, setStatistics] = useState(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const calculateStats = useCallback(async () => {
    setIsCalculating(true);
    try {
      const stats = dataTransformCache.getOrderStatistics(orders, filters);
      setStatistics(stats);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('統計計算エラー:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [orders, filters]);

  const invalidateStats = useCallback(() => {
    dataTransformCache.invalidateOrderStatistics();
    setStatistics(null);
    setLastUpdated(null);
  }, []);

  // 依存関係が変更された場合に自動で再計算
  useEffect(() => {
    if (orders && orders.length > 0) {
      calculateStats();
    }
  }, [calculateStats, orders]);

  return {
    statistics,
    isCalculating,
    lastUpdated,
    calculateStats,
    invalidateStats
  };
};

// バッチ最適化をキャッシュするHook
export const useBatchOptimization = (orders, targetWeight = 300) => {
  const [optimization, setOptimization] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [lastOptimized, setLastOptimized] = useState(null);

  const optimizeBatches = useCallback(async () => {
    setIsOptimizing(true);
    try {
      const result = dataTransformCache.getBatchOptimization(orders, targetWeight);
      setOptimization(result);
      setLastOptimized(new Date());
    } catch (error) {
      console.error('バッチ最適化エラー:', error);
    } finally {
      setIsOptimizing(false);
    }
  }, [orders, targetWeight]);

  const invalidateOptimization = useCallback(() => {
    dataTransformCache.invalidateBatchOptimization();
    setOptimization(null);
    setLastOptimized(null);
  }, []);

  // 注文データが変更された場合に自動で再最適化
  useEffect(() => {
    if (orders && orders.length > 0) {
      const pendingOrders = orders.filter(o => o.status === 'pending');
      if (pendingOrders.length > 0) {
        optimizeBatches();
      }
    }
  }, [optimizeBatches, orders]);

  return {
    optimization,
    isOptimizing,
    lastOptimized,
    optimizeBatches,
    invalidateOptimization
  };
};

// API呼び出しをキャッシュするHook
export const useCachedApi = (endpoint, params = {}, options = {}) => {
  const { autoFetch = true, ttl = 300000, dependencies = [] } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);

  const fetchData = useCallback(async (customParams = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await cachedApiService.get(
        endpoint, 
        { ...params, ...customParams },
        { ttl }
      );
      setData(result);
      setLastFetched(new Date());
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, params, ttl]);

  const refetch = useCallback((customParams = {}) => {
    return fetchData(customParams);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    cachedApiService.invalidateEndpoint(endpoint);
    setData(null);
    setLastFetched(null);
  }, [endpoint]);

  // 自動フェッチ
  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [fetchData, autoFetch, ...dependencies]);

  return {
    data,
    loading,
    error,
    refetch,
    invalidate,
    lastFetched
  };
};

// デバウンスされたキャッシュ検索Hook
export const useDebouncedCachedSearch = (searchFn, delay = 300, options = {}) => {
  const { ttl = 300000, keyPrefix = 'search' } = options;
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef(null);

  const search = useCallback(async (searchQuery) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const cacheKey = `${keyPrefix}-${searchQuery}`;
    
    // キャッシュから結果を取得
    const cached = globalCache.get(cacheKey);
    if (cached) {
      setResults(cached);
      return;
    }

    setIsSearching(true);
    try {
      const searchResults = await searchFn(searchQuery);
      globalCache.set(cacheKey, searchResults, ttl);
      setResults(searchResults);
    } catch (error) {
      console.error('検索エラー:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchFn, keyPrefix, ttl]);

  const debouncedSearch = useCallback((searchQuery) => {
    setQuery(searchQuery);
    
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    debounceTimer.current = setTimeout(() => {
      search(searchQuery);
    }, delay);
  }, [search, delay]);

  const clearResults = useCallback(() => {
    setQuery('');
    setResults([]);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    query,
    results,
    isSearching,
    search: debouncedSearch,
    clearResults
  };
};

// キャッシュ統計を監視するHook
export const useCacheMonitor = (interval = 10000) => {
  const [stats, setStats] = useState({
    global: globalCache.getStats(),
    api: apiCache.getStats()
  });

  useEffect(() => {
    const updateStats = () => {
      setStats({
        global: globalCache.getStats(),
        api: apiCache.getStats()
      });
    };

    const timer = setInterval(updateStats, interval);
    return () => clearInterval(timer);
  }, [interval]);

  const clearAllCaches = useCallback(() => {
    globalCache.clear();
    apiCache.clear();
    dataTransformCache.invalidateAll();
  }, []);

  return {
    stats,
    clearAllCaches
  };
};

// パフォーマンス監視付きキャッシュHook
export const usePerformantCache = (key, computeFn, dependencies = [], options = {}) => {
  const { ttl = 300000, trackPerformance = true } = options;
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [computationTime, setComputationTime] = useState(null);
  const [hitCount, setHitCount] = useState(0);
  const [missCount, setMissCount] = useState(0);

  const computeAndCache = useCallback(async (...args) => {
    const startTime = trackPerformance ? performance.now() : 0;
    
    // キャッシュヒット確認
    const cached = globalCache.get(key);
    if (cached) {
      setData(cached);
      setHitCount(prev => prev + 1);
      return cached;
    }

    // キャッシュミス
    setMissCount(prev => prev + 1);
    setIsLoading(true);

    try {
      const result = await computeFn(...args);
      globalCache.set(key, result, ttl);
      setData(result);

      if (trackPerformance) {
        const endTime = performance.now();
        setComputationTime(endTime - startTime);
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }, [key, computeFn, ttl, trackPerformance]);

  useEffect(() => {
    computeAndCache();
  }, [computeAndCache, ...dependencies]);

  const getHitRate = useCallback(() => {
    const total = hitCount + missCount;
    return total > 0 ? (hitCount / total) * 100 : 0;
  }, [hitCount, missCount]);

  return {
    data,
    isLoading,
    computationTime,
    hitRate: getHitRate(),
    hitCount,
    missCount,
    recompute: computeAndCache
  };
};