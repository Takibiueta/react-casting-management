// キャッシュユーティリティクラス - 実用的なReact統合機能
import { CacheManager } from './performance-manager';

// アプリケーション全体で使用するグローバルキャッシュインスタンス
export const globalCache = new CacheManager({
  maxSize: 200,
  ttl: 600000 // 10分
});

// APIレスポンス専用キャッシュ
export const apiCache = new CacheManager({
  maxSize: 50,
  ttl: 300000 // 5分
});

// 計算結果専用キャッシュ
export const computationCache = new CacheManager({
  maxSize: 100,
  ttl: 900000 // 15分
});

// キャッシュキー生成ユーティリティ
export class CacheKeyGenerator {
  static orderSummary(filters = {}) {
    const { material, status, searchTerm } = filters;
    return `order-summary-${material || 'all'}-${status || 'all'}-${searchTerm || ''}`;
  }

  static batchOptimization(orders) {
    const orderIds = orders.map(o => o.id).sort().join(',');
    return `batch-optimization-${orderIds}`;
  }

  static performanceMetrics(timeRange) {
    return `performance-metrics-${timeRange}`;
  }

  static customerOrders(customerId) {
    return `customer-orders-${customerId}`;
  }

  static materialAnalysis(material, dateRange) {
    return `material-analysis-${material}-${dateRange}`;
  }

  static api(endpoint, params = {}) {
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `api-${endpoint}-${paramString}`;
  }
}

// データ変換とキャッシュを組み合わせたユーティリティ
export class DataTransformCache {
  constructor(cacheInstance = globalCache) {
    this.cache = cacheInstance;
  }

  // 注文統計の計算とキャッシュ
  getOrderStatistics(orders, filters = {}) {
    const cacheKey = CacheKeyGenerator.orderSummary(filters);
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const stats = this.calculateOrderStatistics(orders, filters);
    this.cache.set(cacheKey, stats, 300000); // 5分キャッシュ
    return stats;
  }

  calculateOrderStatistics(orders, filters) {
    let filteredOrders = orders;

    // フィルタリング適用
    if (filters.material && filters.material !== 'all') {
      filteredOrders = filteredOrders.filter(o => o.material === filters.material);
    }
    if (filters.status && filters.status !== 'all') {
      filteredOrders = filteredOrders.filter(o => o.status === filters.status);
    }

    const totalOrders = filteredOrders.length;
    const totalWeight = filteredOrders.reduce((sum, order) => sum + (order.totalWeight || 0), 0);
    const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;
    const processingOrders = filteredOrders.filter(o => o.status === 'processing').length;
    
    // 緊急度分析
    const today = new Date();
    const urgentOrders = filteredOrders.filter(order => {
      const deliveryDate = new Date(order.deliveryDate);
      const daysDiff = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7 && order.status !== 'completed';
    }).length;

    const overdueOrders = filteredOrders.filter(order => {
      const deliveryDate = new Date(order.deliveryDate);
      const daysDiff = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
      return daysDiff < 0 && order.status !== 'completed';
    }).length;

    // 材質別統計
    const materialStats = {};
    ['S14', 'SCS', 'SUS304', 'SUS316', 'FCD400'].forEach(material => {
      const materialOrders = filteredOrders.filter(o => o.material === material);
      materialStats[material] = {
        count: materialOrders.length,
        weight: materialOrders.reduce((sum, o) => sum + (o.totalWeight || 0), 0)
      };
    });

    return {
      totalOrders,
      totalWeight,
      pendingOrders,
      processingOrders,
      urgentOrders,
      overdueOrders,
      materialStats,
      averageWeight: totalOrders > 0 ? totalWeight / totalOrders : 0,
      completionRate: totalOrders > 0 ? 
        (filteredOrders.filter(o => o.status === 'completed').length / totalOrders) * 100 : 0,
      calculatedAt: new Date().toISOString()
    };
  }

  // バッチ最適化計算とキャッシュ
  getBatchOptimization(orders, targetWeight = 300) {
    const cacheKey = CacheKeyGenerator.batchOptimization(orders);
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const optimization = this.calculateBatchOptimization(orders, targetWeight);
    this.cache.set(cacheKey, optimization, 600000); // 10分キャッシュ
    return optimization;
  }

  calculateBatchOptimization(orders, targetWeight) {
    const pendingOrders = orders.filter(order => order.status === 'pending');
    const batches = [];
    let currentBatch = [];
    let currentWeight = 0;

    // 材質別にグループ化
    const materialGroups = {};
    pendingOrders.forEach(order => {
      if (!materialGroups[order.material]) {
        materialGroups[order.material] = [];
      }
      materialGroups[order.material].push(order);
    });

    // 各材質グループでバッチ最適化
    Object.keys(materialGroups).forEach(material => {
      const orders = materialGroups[material];
      orders.sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate));

      orders.forEach(order => {
        if (currentWeight + order.totalWeight <= targetWeight) {
          currentBatch.push(order);
          currentWeight += order.totalWeight;
        } else {
          if (currentBatch.length > 0) {
            batches.push({
              id: `batch-${batches.length + 1}`,
              material,
              orders: [...currentBatch],
              totalWeight: currentWeight,
              efficiency: (currentWeight / targetWeight) * 100,
              earliestDelivery: Math.min(...currentBatch.map(o => new Date(o.deliveryDate)))
            });
          }
          currentBatch = [order];
          currentWeight = order.totalWeight;
        }
      });

      // 最後のバッチを追加
      if (currentBatch.length > 0) {
        batches.push({
          id: `batch-${batches.length + 1}`,
          material,
          orders: [...currentBatch],
          totalWeight: currentWeight,
          efficiency: (currentWeight / targetWeight) * 100,
          earliestDelivery: Math.min(...currentBatch.map(o => new Date(o.deliveryDate)))
        });
        currentBatch = [];
        currentWeight = 0;
      }
    });

    // バッチ統計
    const totalBatches = batches.length;
    const averageEfficiency = batches.length > 0 ?
      batches.reduce((sum, batch) => sum + batch.efficiency, 0) / batches.length : 0;
    const totalOptimizedWeight = batches.reduce((sum, batch) => sum + batch.totalWeight, 0);

    return {
      batches,
      statistics: {
        totalBatches,
        averageEfficiency,
        totalOptimizedWeight,
        targetWeight,
        optimizationRatio: totalOptimizedWeight / (totalBatches * targetWeight) * 100
      },
      recommendations: this.generateBatchRecommendations(batches),
      calculatedAt: new Date().toISOString()
    };
  }

  generateBatchRecommendations(batches) {
    const recommendations = [];

    // 効率の低いバッチを特定
    const lowEfficiencyBatches = batches.filter(batch => batch.efficiency < 70);
    if (lowEfficiencyBatches.length > 0) {
      recommendations.push({
        type: 'efficiency',
        message: `${lowEfficiencyBatches.length}個のバッチの効率が70%未満です。注文の組み合わせを見直すことをお勧めします。`,
        severity: 'medium',
        batches: lowEfficiencyBatches.map(b => b.id)
      });
    }

    // 緊急度の高い注文を含むバッチ
    const today = new Date();
    const urgentBatches = batches.filter(batch => {
      return batch.orders.some(order => {
        const deliveryDate = new Date(order.deliveryDate);
        const daysDiff = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7;
      });
    });

    if (urgentBatches.length > 0) {
      recommendations.push({
        type: 'urgency',
        message: `${urgentBatches.length}個のバッチに緊急の注文が含まれています。優先的に処理してください。`,
        severity: 'high',
        batches: urgentBatches.map(b => b.id)
      });
    }

    return recommendations;
  }

  // キャッシュの手動無効化
  invalidateOrderStatistics() {
    const keys = Array.from(this.cache.cache.keys())
      .filter(key => key.startsWith('order-summary-'));
    keys.forEach(key => this.cache.delete(key));
  }

  invalidateBatchOptimization() {
    const keys = Array.from(this.cache.cache.keys())
      .filter(key => key.startsWith('batch-optimization-'));
    keys.forEach(key => this.cache.delete(key));
  }

  invalidateAll() {
    this.cache.clear();
  }
}

// デフォルトのデータ変換キャッシュインスタンス
export const dataTransformCache = new DataTransformCache(globalCache);

// APIコール用のキャッシュラッパー
export class CachedApiService {
  constructor(cacheInstance = apiCache) {
    this.cache = cacheInstance;
  }

  async get(endpoint, params = {}, options = {}) {
    const cacheKey = CacheKeyGenerator.api(endpoint, params);
    const { forceRefresh = false, ttl = 300000 } = options;

    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    try {
      // 実際のAPI呼び出し（fetch実装は環境に依存）
      const response = await this.fetchData(endpoint, params);
      this.cache.set(cacheKey, response, ttl);
      return response;
    } catch (error) {
      console.error('API call failed:', error);
      // エラー時はキャッシュされたデータを返す（存在する場合）
      const cached = this.cache.get(cacheKey);
      if (cached) {
        console.warn('Returning cached data due to API error');
        return cached;
      }
      throw error;
    }
  }

  async fetchData(endpoint, params) {
    // 実際のAPI実装はここで行う
    // 現在はダミー実装
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({ data: `API response for ${endpoint}`, params });
      }, 100);
    });
  }

  invalidateEndpoint(endpoint) {
    const keys = Array.from(this.cache.cache.keys())
      .filter(key => key.includes(`api-${endpoint}`));
    keys.forEach(key => this.cache.delete(key));
  }
}

// デフォルトのAPIサービスインスタンス
export const cachedApiService = new CachedApiService(apiCache);

// 定期的なキャッシュクリーンアップ
export const startCacheCleanup = (interval = 300000) => { // 5分間隔
  return setInterval(() => {
    const globalCleanedCount = globalCache.cleanup();
    const apiCleanedCount = apiCache.cleanup();
    const computationCleanedCount = computationCache.cleanup();
    
    if (globalCleanedCount + apiCleanedCount + computationCleanedCount > 0) {
      console.log(`Cache cleanup: ${globalCleanedCount + apiCleanedCount + computationCleanedCount} expired items removed`);
    }
  }, interval);
};

// キャッシュ統計の取得
export const getCacheStatistics = () => {
  return {
    global: globalCache.getStats(),
    api: apiCache.getStats(),
    computation: computationCache.getStats()
  };
};