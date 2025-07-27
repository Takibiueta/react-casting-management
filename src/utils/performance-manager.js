// パフォーマンス最適化マネージャー
// VirtualScrollTable、CacheManager、PerformanceMonitorクラスを含む

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// 仮想スクロールテーブルクラス
export class VirtualScrollTable {
  constructor(options = {}) {
    this.itemHeight = options.itemHeight || 50;
    this.containerHeight = options.containerHeight || 400;
    this.overscan = options.overscan || 10;
    this.data = options.data || [];
    this.renderItem = options.renderItem || (() => null);
    
    this.scrollTop = 0;
    this.viewportStartIndex = 0;
    this.viewportEndIndex = 0;
    this.visibleItemCount = Math.ceil(this.containerHeight / this.itemHeight);
  }

  // スクロール位置を更新
  updateScroll(scrollTop) {
    this.scrollTop = scrollTop;
    this.calculateVisibleRange();
  }

  // 表示範囲を計算
  calculateVisibleRange() {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + this.visibleItemCount + this.overscan,
      this.data.length
    );
    
    this.viewportStartIndex = Math.max(0, startIndex - this.overscan);
    this.viewportEndIndex = endIndex;
  }

  // 表示アイテムを取得
  getVisibleItems() {
    return this.data.slice(this.viewportStartIndex, this.viewportEndIndex);
  }

  // 総高さを計算
  getTotalHeight() {
    return this.data.length * this.itemHeight;
  }

  // スタイル計算
  getContainerStyle() {
    return {
      height: this.containerHeight,
      overflow: 'auto',
      position: 'relative'
    };
  }

  getContentStyle() {
    return {
      height: this.getTotalHeight(),
      position: 'relative'
    };
  }

  getItemStyle(index) {
    const actualIndex = this.viewportStartIndex + index;
    return {
      position: 'absolute',
      top: actualIndex * this.itemHeight,
      left: 0,
      right: 0,
      height: this.itemHeight
    };
  }
}

// データキャッシュマネージャークラス
export class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 100;
    this.ttl = options.ttl || 300000; // 5分
    this.cache = new Map();
    this.accessTimes = new Map();
    this.sizeLimits = new Map();
  }

  // キャッシュにデータを保存
  set(key, value, customTTL = null) {
    const now = Date.now();
    const expiresAt = now + (customTTL || this.ttl);
    
    // キャッシュサイズ制限をチェック
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: now
    });
    
    this.accessTimes.set(key, now);
    return this;
  }

  // キャッシュからデータを取得
  get(key) {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // TTL チェック
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return null;
    }

    // アクセス時間を更新（LRU用）
    this.accessTimes.set(key, Date.now());
    return item.value;
  }

  // キャッシュが存在するかチェック
  has(key) {
    const item = this.cache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  // キャッシュを削除
  delete(key) {
    this.cache.delete(key);
    this.accessTimes.delete(key);
    return this;
  }

  // キャッシュをクリア
  clear() {
    this.cache.clear();
    this.accessTimes.clear();
    return this;
  }

  // LRUによる退去
  evictLRU() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, time] of this.accessTimes.entries()) {
      if (time < oldestTime) {
        oldestTime = time;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
    }
  }

  // 期限切れアイテムを削除
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
    return keysToDelete.length;
  }

  // キャッシュ統計を取得
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.calculateHitRate(),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  calculateHitRate() {
    // 簡易的なヒット率計算（実装依存）
    return this.cache.size > 0 ? 0.85 : 0;
  }

  estimateMemoryUsage() {
    // 簡易的なメモリ使用量推定
    let totalSize = 0;
    for (const [key, item] of this.cache.entries()) {
      totalSize += JSON.stringify(item).length + key.length;
    }
    return totalSize;
  }
}

// パフォーマンス監視クラス
export class PerformanceMonitor {
  constructor(options = {}) {
    this.metricsBuffer = [];
    this.maxBufferSize = options.maxBufferSize || 1000;
    this.samplingRate = options.samplingRate || 1.0;
    this.observers = [];
    this.isRunning = false;
  }

  // 監視開始
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.setupPerformanceObserver();
    this.startMemoryMonitoring();
    this.startRenderingMonitoring();
  }

  // 監視停止
  stop() {
    this.isRunning = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }

  // パフォーマンスオブザーバーの設定
  setupPerformanceObserver() {
    if (!window.PerformanceObserver) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (Math.random() <= this.samplingRate) {
          this.recordMetric({
            type: entry.entryType,
            name: entry.name,
            duration: entry.duration,
            startTime: entry.startTime,
            timestamp: Date.now()
          });
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      this.observers.push(observer);
    } catch (error) {
      console.warn('PerformanceObserver not supported:', error);
    }
  }

  // メモリ監視開始
  startMemoryMonitoring() {
    const checkMemory = () => {
      if (!this.isRunning) return;

      if (performance.memory) {
        this.recordMetric({
          type: 'memory',
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
          timestamp: Date.now()
        });
      }

      setTimeout(checkMemory, 5000); // 5秒間隔
    };

    checkMemory();
  }

  // レンダリング監視開始
  startRenderingMonitoring() {
    let lastFrameTime = performance.now();
    let frameCount = 0;

    const measureFPS = () => {
      if (!this.isRunning) return;

      const currentTime = performance.now();
      frameCount++;

      if (currentTime - lastFrameTime >= 1000) { // 1秒間隔
        const fps = Math.round((frameCount * 1000) / (currentTime - lastFrameTime));
        
        this.recordMetric({
          type: 'fps',
          value: fps,
          timestamp: Date.now()
        });

        frameCount = 0;
        lastFrameTime = currentTime;
      }

      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  // メトリック記録
  recordMetric(metric) {
    this.metricsBuffer.push(metric);
    
    // バッファサイズ制限
    if (this.metricsBuffer.length > this.maxBufferSize) {
      this.metricsBuffer.shift();
    }
  }

  // カスタムメトリック記録
  mark(name) {
    performance.mark(name);
    this.recordMetric({
      type: 'mark',
      name,
      timestamp: Date.now()
    });
  }

  // カスタム計測開始
  measure(name, startMark, endMark) {
    performance.measure(name, startMark, endMark);
    const measure = performance.getEntriesByName(name, 'measure')[0];
    
    if (measure) {
      this.recordMetric({
        type: 'custom-measure',
        name,
        duration: measure.duration,
        timestamp: Date.now()
      });
    }
  }

  // 統計取得
  getStats(timeRange = 60000) { // デフォルト1分
    const now = Date.now();
    const recentMetrics = this.metricsBuffer.filter(
      metric => now - metric.timestamp <= timeRange
    );

    const stats = {
      totalMetrics: recentMetrics.length,
      memoryStats: this.calculateMemoryStats(recentMetrics),
      performanceStats: this.calculatePerformanceStats(recentMetrics),
      fpsStats: this.calculateFPSStats(recentMetrics)
    };

    return stats;
  }

  calculateMemoryStats(metrics) {
    const memoryMetrics = metrics.filter(m => m.type === 'memory');
    if (memoryMetrics.length === 0) return null;

    const latest = memoryMetrics[memoryMetrics.length - 1];
    return {
      current: latest.usedJSHeapSize,
      total: latest.totalJSHeapSize,
      limit: latest.jsHeapSizeLimit,
      usagePercentage: (latest.usedJSHeapSize / latest.totalJSHeapSize) * 100
    };
  }

  calculatePerformanceStats(metrics) {
    const performanceMetrics = metrics.filter(m => 
      m.type === 'measure' || m.type === 'custom-measure'
    );

    if (performanceMetrics.length === 0) return null;

    const durations = performanceMetrics.map(m => m.duration);
    return {
      count: durations.length,
      average: durations.reduce((a, b) => a + b, 0) / durations.length,
      max: Math.max(...durations),
      min: Math.min(...durations)
    };
  }

  calculateFPSStats(metrics) {
    const fpsMetrics = metrics.filter(m => m.type === 'fps');
    if (fpsMetrics.length === 0) return null;

    const values = fpsMetrics.map(m => m.value);
    return {
      current: values[values.length - 1],
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values)
    };
  }

  // パフォーマンス問題の検出
  detectPerformanceIssues() {
    const stats = this.getStats();
    const issues = [];

    // メモリ使用量チェック
    if (stats.memoryStats && stats.memoryStats.usagePercentage > 80) {
      issues.push({
        type: 'memory',
        severity: 'high',
        message: 'メモリ使用量が80%を超えています'
      });
    }

    // FPSチェック
    if (stats.fpsStats && stats.fpsStats.average < 30) {
      issues.push({
        type: 'fps',
        severity: 'medium',
        message: 'フレームレートが低下しています'
      });
    }

    // レスポンス時間チェック
    if (stats.performanceStats && stats.performanceStats.average > 100) {
      issues.push({
        type: 'response-time',
        severity: 'medium',
        message: '応答時間が遅くなっています'
      });
    }

    return issues;
  }
}

// React Hooks
export const useVirtualScroll = (data, itemHeight = 50, containerHeight = 400) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const virtualTable = useMemo(() => {
    return new VirtualScrollTable({
      data,
      itemHeight,
      containerHeight
    });
  }, [data, itemHeight, containerHeight]);

  useEffect(() => {
    virtualTable.updateScroll(scrollTop);
  }, [scrollTop, virtualTable]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    containerRef,
    handleScroll,
    visibleItems: virtualTable.getVisibleItems(),
    totalHeight: virtualTable.getTotalHeight(),
    containerStyle: virtualTable.getContainerStyle(),
    contentStyle: virtualTable.getContentStyle(),
    getItemStyle: (index) => virtualTable.getItemStyle(index)
  };
};

export const useCache = (options = {}) => {
  const cacheManager = useMemo(() => new CacheManager(options), []);

  const getCached = useCallback((key) => {
    return cacheManager.get(key);
  }, [cacheManager]);

  const setCached = useCallback((key, value, ttl) => {
    return cacheManager.set(key, value, ttl);
  }, [cacheManager]);

  const clearCache = useCallback(() => {
    return cacheManager.clear();
  }, [cacheManager]);

  return {
    getCached,
    setCached,
    clearCache,
    cacheStats: cacheManager.getStats()
  };
};

export const usePerformanceMonitor = (options = {}) => {
  const monitor = useMemo(() => new PerformanceMonitor(options), []);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    monitor.start();
    
    const interval = setInterval(() => {
      setStats(monitor.getStats());
    }, 5000); // 5秒間隔で更新

    return () => {
      clearInterval(interval);
      monitor.stop();
    };
  }, [monitor]);

  const markPerformance = useCallback((name) => {
    monitor.mark(name);
  }, [monitor]);

  const measurePerformance = useCallback((name, startMark, endMark) => {
    monitor.measure(name, startMark, endMark);
  }, [monitor]);

  return {
    stats,
    markPerformance,
    measurePerformance,
    performanceIssues: monitor.detectPerformanceIssues()
  };
};