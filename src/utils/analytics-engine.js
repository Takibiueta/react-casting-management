// 予測分析エンジン - 需要予測・効率最適化・データ分析
export class AnalyticsEngine {
  constructor() {
    this.models = new Map();
    this.cache = new Map();
    this.config = {
      forecastPeriods: 12, // 予測期間（月）
      seasonalityPeriod: 12, // 季節性周期
      trendSmoothingFactor: 0.3,
      seasonalSmoothingFactor: 0.3,
      minDataPoints: 6 // 最小データポイント数
    };
  }

  // 需要予測分析
  async analyzeDemandForecast(orders, options = {}) {
    const {
      material = null,
      customer = null,
      periods = this.config.forecastPeriods,
      includeSeasonality = true
    } = options;

    // データの前処理
    const processedData = this._preprocessOrderData(orders, { material, customer });
    
    if (processedData.length < this.config.minDataPoints) {
      return {
        error: 'insufficient_data',
        message: `予測には最低${this.config.minDataPoints}期間のデータが必要です`,
        requiredDataPoints: this.config.minDataPoints,
        currentDataPoints: processedData.length
      };
    }

    // トレンド分析
    const trendAnalysis = this._analyzeTrend(processedData);
    
    // 季節性分析
    const seasonalityAnalysis = includeSeasonality 
      ? this._analyzeSeasonality(processedData)
      : null;

    // 予測計算
    const forecast = this._calculateForecast(processedData, periods, trendAnalysis, seasonalityAnalysis);

    // 信頼区間の計算
    const confidenceIntervals = this._calculateConfidenceIntervals(forecast, processedData);

    return {
      forecast,
      trendAnalysis,
      seasonalityAnalysis,
      confidenceIntervals,
      accuracy: this._calculateForecastAccuracy(processedData),
      metadata: {
        dataPoints: processedData.length,
        forecastPeriods: periods,
        material,
        customer,
        generatedAt: new Date().toISOString()
      }
    };
  }

  // 効率最適化分析
  async analyzeProductionEfficiency(orders, options = {}) {
    const {
      targetBatchSize = 300,
      maxBatchVariance = 0.2,
      considerDeliveryDates = true,
      prioritizeUrgentOrders = true
    } = options;

    const pendingOrders = orders.filter(order => order.status === 'pending');
    
    // 材質別グループ化
    const materialGroups = this._groupOrdersByMaterial(pendingOrders);
    
    const optimizationResults = {};
    
    for (const [material, materialOrders] of Object.entries(materialGroups)) {
      optimizationResults[material] = this._optimizeMaterialBatches(
        materialOrders,
        targetBatchSize,
        maxBatchVariance,
        considerDeliveryDates,
        prioritizeUrgentOrders
      );
    }

    // 全体的な効率指標の計算
    const overallEfficiency = this._calculateOverallEfficiency(optimizationResults, targetBatchSize);

    return {
      materialOptimization: optimizationResults,
      overallEfficiency,
      recommendations: this._generateEfficiencyRecommendations(optimizationResults),
      metadata: {
        totalOrders: pendingOrders.length,
        materialsAnalyzed: Object.keys(materialGroups).length,
        targetBatchSize,
        generatedAt: new Date().toISOString()
      }
    };
  }

  // 品質予測分析
  async analyzeQualityPrediction(orders, products = []) {
    const qualityData = this._extractQualityData(orders, products);
    
    // 材質別品質トレンド
    const materialQualityTrends = this._analyzeMaterialQualityTrends(qualityData);
    
    // 顧客別品質パターン
    const customerQualityPatterns = this._analyzeCustomerQualityPatterns(qualityData);
    
    // 品質リスク予測
    const qualityRiskPrediction = this._predictQualityRisks(qualityData);

    return {
      materialQualityTrends,
      customerQualityPatterns,
      qualityRiskPrediction,
      recommendations: this._generateQualityRecommendations(qualityData),
      metadata: {
        totalOrders: orders.length,
        qualityDataPoints: qualityData.length,
        generatedAt: new Date().toISOString()
      }
    };
  }

  // 収益性分析
  async analyzeProfitability(orders, products = [], options = {}) {
    const {
      includeCosts = false,
      timeframe = 'month',
      compareWithPrevious = true
    } = options;

    const profitabilityData = this._calculateProfitability(orders, products, includeCosts);
    
    // 時系列収益性分析
    const timeSeriesAnalysis = this._analyzeTimeSeriesProfitability(profitabilityData, timeframe);
    
    // 材質別収益性
    const materialProfitability = this._analyzeMaterialProfitability(profitabilityData);
    
    // 顧客別収益性
    const customerProfitability = this._analyzeCustomerProfitability(profitabilityData);
    
    // 予測収益性
    const forecastProfitability = this._forecastProfitability(timeSeriesAnalysis);

    return {
      timeSeriesAnalysis,
      materialProfitability,
      customerProfitability,
      forecastProfitability,
      insights: this._generateProfitabilityInsights(profitabilityData),
      metadata: {
        timeframe,
        totalRevenue: profitabilityData.reduce((sum, d) => sum + d.revenue, 0),
        generatedAt: new Date().toISOString()
      }
    };
  }

  // データの前処理
  _preprocessOrderData(orders, filters = {}) {
    let filteredOrders = orders;

    // フィルター適用
    if (filters.material) {
      filteredOrders = filteredOrders.filter(order => order.material === filters.material);
    }
    if (filters.customer) {
      filteredOrders = filteredOrders.filter(order => order.customer === filters.customer);
    }

    // 月別集計
    const monthlyData = this._aggregateByMonth(filteredOrders);
    
    // データの正規化とクリーニング
    return this._cleanAndNormalizeData(monthlyData);
  }

  _aggregateByMonth(orders) {
    const monthlyAggregation = {};

    orders.forEach(order => {
      const orderDate = new Date(order.orderDate);
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyAggregation[monthKey]) {
        monthlyAggregation[monthKey] = {
          period: monthKey,
          orderCount: 0,
          totalWeight: 0,
          totalRevenue: 0,
          orders: []
        };
      }

      monthlyAggregation[monthKey].orderCount += 1;
      monthlyAggregation[monthKey].totalWeight += order.totalWeight || 0;
      monthlyAggregation[monthKey].totalRevenue += (order.unitPrice || 0) * (order.quantity || 0);
      monthlyAggregation[monthKey].orders.push(order);
    });

    return Object.values(monthlyAggregation).sort((a, b) => a.period.localeCompare(b.period));
  }

  _cleanAndNormalizeData(data) {
    // 異常値の検出と処理
    const values = data.map(d => d.totalWeight);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const stdDev = Math.sqrt(values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length);
    
    // 3σルールで異常値を検出（ただし削除はしない、フラグのみ）
    return data.map(item => ({
      ...item,
      isOutlier: Math.abs(item.totalWeight - mean) > 3 * stdDev,
      zScore: (item.totalWeight - mean) / stdDev
    }));
  }

  // トレンド分析
  _analyzeTrend(data) {
    if (data.length < 2) return { trend: 'insufficient_data', slope: 0 };

    const n = data.length;
    const xValues = data.map((_, index) => index);
    const yValues = data.map(d => d.totalWeight);

    // 最小二乗法による線形回帰
    const sumX = xValues.reduce((sum, x) => sum + x, 0);
    const sumY = yValues.reduce((sum, y) => sum + y, 0);
    const sumXY = xValues.reduce((sum, x, i) => sum + x * yValues[i], 0);
    const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // 決定係数（R²）の計算
    const yMean = sumY / n;
    const ssTotal = yValues.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
    const ssResidual = yValues.reduce((sum, y, i) => {
      const predicted = slope * xValues[i] + intercept;
      return sum + Math.pow(y - predicted, 2);
    }, 0);
    const rSquared = 1 - (ssResidual / ssTotal);

    // トレンドの分類
    let trendDirection;
    if (Math.abs(slope) < 0.1) {
      trendDirection = 'stable';
    } else if (slope > 0) {
      trendDirection = 'increasing';
    } else {
      trendDirection = 'decreasing';
    }

    return {
      trend: trendDirection,
      slope,
      intercept,
      rSquared,
      strength: Math.abs(slope) > 1 ? 'strong' : Math.abs(slope) > 0.5 ? 'moderate' : 'weak'
    };
  }

  // 季節性分析
  _analyzeSeasonality(data) {
    if (data.length < this.config.seasonalityPeriod) {
      return { seasonality: 'insufficient_data', pattern: null };
    }

    const seasonalIndices = {};
    const monthlyAverages = {};

    // 月別データの集計
    data.forEach(item => {
      const month = parseInt(item.period.split('-')[1]);
      if (!monthlyAverages[month]) {
        monthlyAverages[month] = [];
      }
      monthlyAverages[month].push(item.totalWeight);
    });

    // 各月の平均値計算
    const overallAverage = data.reduce((sum, item) => sum + item.totalWeight, 0) / data.length;
    
    Object.keys(monthlyAverages).forEach(month => {
      const monthData = monthlyAverages[month];
      const monthAverage = monthData.reduce((sum, val) => sum + val, 0) / monthData.length;
      seasonalIndices[month] = monthAverage / overallAverage;
    });

    // 季節性の強度を計算
    const seasonalVariance = Object.values(seasonalIndices).reduce((sum, index) => {
      return sum + Math.pow(index - 1, 2);
    }, 0) / Object.keys(seasonalIndices).length;

    const seasonalityStrength = seasonalVariance > 0.1 ? 'strong' : seasonalVariance > 0.05 ? 'moderate' : 'weak';

    return {
      seasonality: seasonalityStrength,
      indices: seasonalIndices,
      peakMonths: this._findPeakMonths(seasonalIndices),
      lowMonths: this._findLowMonths(seasonalIndices)
    };
  }

  _findPeakMonths(indices) {
    const sortedMonths = Object.entries(indices).sort(([,a], [,b]) => b - a);
    return sortedMonths.slice(0, 3).map(([month, index]) => ({ month: parseInt(month), index }));
  }

  _findLowMonths(indices) {
    const sortedMonths = Object.entries(indices).sort(([,a], [,b]) => a - b);
    return sortedMonths.slice(0, 3).map(([month, index]) => ({ month: parseInt(month), index }));
  }

  // 予測計算
  _calculateForecast(data, periods, trendAnalysis, seasonalityAnalysis) {
    const forecast = [];
    const lastDataPoint = data[data.length - 1];
    const baseValue = data.reduce((sum, d) => sum + d.totalWeight, 0) / data.length;

    for (let i = 1; i <= periods; i++) {
      const periodDate = this._addMonthsToDate(lastDataPoint.period, i);
      const month = parseInt(periodDate.split('-')[1]);
      
      // トレンド成分
      let trendValue = baseValue;
      if (trendAnalysis.trend !== 'stable') {
        trendValue += trendAnalysis.slope * (data.length + i - 1);
      }

      // 季節性成分
      let seasonalMultiplier = 1;
      if (seasonalityAnalysis && seasonalityAnalysis.indices[month]) {
        seasonalMultiplier = seasonalityAnalysis.indices[month];
      }

      const forecastValue = Math.max(0, trendValue * seasonalMultiplier);

      forecast.push({
        period: periodDate,
        forecastValue,
        trendComponent: trendValue,
        seasonalComponent: seasonalMultiplier
      });
    }

    return forecast;
  }

  _addMonthsToDate(dateString, months) {
    const [year, month] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1);
    date.setMonth(date.getMonth() + months);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  // 信頼区間計算
  _calculateConfidenceIntervals(forecast, historicalData) {
    // 履歴データから予測誤差の標準偏差を計算
    const errors = [];
    for (let i = 2; i < historicalData.length; i++) {
      const actual = historicalData[i].totalWeight;
      const simple_prediction = historicalData[i-1].totalWeight; // 簡単な予測
      errors.push(Math.abs(actual - simple_prediction));
    }

    const meanError = errors.reduce((sum, err) => sum + err, 0) / errors.length;
    const errorStdDev = Math.sqrt(errors.reduce((sum, err) => sum + Math.pow(err - meanError, 2), 0) / errors.length);

    return forecast.map(item => ({
      ...item,
      lowerBound: Math.max(0, item.forecastValue - 1.96 * errorStdDev),
      upperBound: item.forecastValue + 1.96 * errorStdDev,
      confidence: 0.95
    }));
  }

  // 予測精度計算
  _calculateForecastAccuracy(data) {
    if (data.length < 4) return { accuracy: 'insufficient_data' };

    let totalError = 0;
    let totalAbsoluteError = 0;
    let validPredictions = 0;

    // 履歴データで後ろから予測精度を検証
    for (let i = 3; i < data.length; i++) {
      const actual = data[i].totalWeight;
      const predicted = data[i-1].totalWeight; // 簡単な予測モデル
      
      const error = actual - predicted;
      const absoluteError = Math.abs(error);
      
      totalError += error;
      totalAbsoluteError += absoluteError;
      validPredictions++;
    }

    const meanError = totalError / validPredictions;
    const meanAbsoluteError = totalAbsoluteError / validPredictions;
    const meanActual = data.reduce((sum, d) => sum + d.totalWeight, 0) / data.length;
    const mape = (meanAbsoluteError / meanActual) * 100; // Mean Absolute Percentage Error

    return {
      meanError,
      meanAbsoluteError,
      mape,
      accuracy: mape < 10 ? 'high' : mape < 20 ? 'medium' : 'low'
    };
  }

  // 材質別グループ化
  _groupOrdersByMaterial(orders) {
    return orders.reduce((groups, order) => {
      const material = order.material || 'unknown';
      if (!groups[material]) {
        groups[material] = [];
      }
      groups[material].push(order);
      return groups;
    }, {});
  }

  // 材質別バッチ最適化
  _optimizeMaterialBatches(orders, targetBatchSize, maxVariance, considerDeliveryDates, prioritizeUrgent) {
    // 緊急度でソート
    const sortedOrders = [...orders].sort((a, b) => {
      if (prioritizeUrgent) {
        const urgencyA = this._calculateOrderUrgency(a);
        const urgencyB = this._calculateOrderUrgency(b);
        if (urgencyA !== urgencyB) return urgencyB - urgencyA;
      }
      
      if (considerDeliveryDates) {
        return new Date(a.deliveryDate) - new Date(b.deliveryDate);
      }
      
      return 0;
    });

    const batches = [];
    let currentBatch = [];
    let currentWeight = 0;

    sortedOrders.forEach(order => {
      const orderWeight = order.totalWeight || 0;
      
      // バッチに追加できるかチェック
      const potentialWeight = currentWeight + orderWeight;
      const variance = Math.abs(potentialWeight - targetBatchSize) / targetBatchSize;
      
      if (variance <= maxVariance || currentBatch.length === 0) {
        currentBatch.push(order);
        currentWeight = potentialWeight;
      } else {
        // 現在のバッチを完了し、新しいバッチを開始
        if (currentBatch.length > 0) {
          batches.push(this._createBatchSummary(currentBatch, currentWeight, targetBatchSize));
        }
        currentBatch = [order];
        currentWeight = orderWeight;
      }
    });

    // 最後のバッチを追加
    if (currentBatch.length > 0) {
      batches.push(this._createBatchSummary(currentBatch, currentWeight, targetBatchSize));
    }

    return {
      batches,
      totalBatches: batches.length,
      averageEfficiency: batches.reduce((sum, batch) => sum + batch.efficiency, 0) / batches.length,
      totalWeight: batches.reduce((sum, batch) => sum + batch.totalWeight, 0),
      recommendations: this._generateBatchRecommendations(batches, targetBatchSize)
    };
  }

  _calculateOrderUrgency(order) {
    const today = new Date();
    const deliveryDate = new Date(order.deliveryDate);
    const daysUntilDelivery = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDelivery < 0) return 10; // 遅延
    if (daysUntilDelivery <= 3) return 8; // 非常に緊急
    if (daysUntilDelivery <= 7) return 6; // 緊急
    if (daysUntilDelivery <= 14) return 4; // やや緊急
    return 2; // 通常
  }

  _createBatchSummary(orders, totalWeight, targetWeight) {
    const efficiency = Math.min(100, (totalWeight / targetWeight) * 100);
    const earliestDelivery = Math.min(...orders.map(o => new Date(o.deliveryDate)));
    const latestDelivery = Math.max(...orders.map(o => new Date(o.deliveryDate)));
    
    return {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      orders,
      totalWeight,
      targetWeight,
      efficiency,
      orderCount: orders.length,
      deliveryWindow: {
        earliest: new Date(earliestDelivery).toISOString().split('T')[0],
        latest: new Date(latestDelivery).toISOString().split('T')[0],
        span: Math.ceil((latestDelivery - earliestDelivery) / (1000 * 60 * 60 * 24))
      },
      urgency: Math.max(...orders.map(o => this._calculateOrderUrgency(o)))
    };
  }

  _generateBatchRecommendations(batches, targetWeight) {
    const recommendations = [];
    
    // 効率の低いバッチを特定
    const lowEfficiencyBatches = batches.filter(batch => batch.efficiency < 70);
    if (lowEfficiencyBatches.length > 0) {
      recommendations.push({
        type: 'efficiency_improvement',
        priority: 'medium',
        message: `${lowEfficiencyBatches.length}個のバッチの効率が70%未満です。注文の組み合わせを見直してください。`,
        affectedBatches: lowEfficiencyBatches.map(b => b.id)
      });
    }

    // 配送窓の長いバッチを特定
    const longDeliverySpanBatches = batches.filter(batch => batch.deliveryWindow.span > 14);
    if (longDeliverySpanBatches.length > 0) {
      recommendations.push({
        type: 'delivery_optimization',
        priority: 'low',
        message: `${longDeliverySpanBatches.length}個のバッチの配送期間が14日を超えています。`,
        affectedBatches: longDeliverySpanBatches.map(b => b.id)
      });
    }

    return recommendations;
  }

  _calculateOverallEfficiency(optimizationResults, targetBatchSize) {
    const allBatches = Object.values(optimizationResults).flatMap(result => result.batches);
    const totalWeight = allBatches.reduce((sum, batch) => sum + batch.totalWeight, 0);
    const totalTargetWeight = allBatches.length * targetBatchSize;
    
    return {
      weightUtilization: (totalWeight / totalTargetWeight) * 100,
      averageBatchEfficiency: allBatches.reduce((sum, batch) => sum + batch.efficiency, 0) / allBatches.length,
      totalBatches: allBatches.length,
      wastedCapacity: totalTargetWeight - totalWeight
    };
  }

  _generateEfficiencyRecommendations(optimizationResults) {
    const recommendations = [];
    
    Object.entries(optimizationResults).forEach(([material, result]) => {
      if (result.averageEfficiency < 75) {
        recommendations.push({
          type: 'material_efficiency',
          material,
          priority: 'high',
          message: `${material}の平均バッチ効率が${result.averageEfficiency.toFixed(1)}%と低くなっています。`,
          suggestion: '注文のタイミングを調整するか、バッチサイズの見直しを検討してください。'
        });
      }
    });

    return recommendations;
  }

  // 品質データ抽出
  _extractQualityData(orders, products) {
    // 簡易的な品質データ生成（実際の実装では品質データベースから取得）
    return orders.map(order => ({
      orderId: order.id,
      material: order.material,
      customer: order.customer,
      qualityScore: this._generateQualityScore(order, products),
      defectRate: Math.random() * 0.05, // 0-5%の不良率
      reworkRequired: Math.random() < 0.1, // 10%の確率で再加工要
      completedDate: order.completedDate || null
    })).filter(item => item.completedDate); // 完了した注文のみ
  }

  _generateQualityScore(order, products) {
    // 材質、顧客、製品に基づいた品質スコア（0-100）
    let baseScore = 85;
    
    // 材質による調整
    const materialFactors = {
      'S14': 5,
      'SCS': 3,
      'SUS304': 7,
      'SUS316': 8,
      'FCD400': -2
    };
    baseScore += materialFactors[order.material] || 0;
    
    // ランダム要素
    baseScore += (Math.random() - 0.5) * 20;
    
    return Math.max(0, Math.min(100, baseScore));
  }

  _analyzeMaterialQualityTrends(qualityData) {
    const materialTrends = {};
    
    const groupedByMaterial = qualityData.reduce((groups, item) => {
      if (!groups[item.material]) groups[item.material] = [];
      groups[item.material].push(item);
      return groups;
    }, {});

    Object.entries(groupedByMaterial).forEach(([material, data]) => {
      const sortedData = data.sort((a, b) => new Date(a.completedDate) - new Date(b.completedDate));
      const trend = this._calculateQualityTrend(sortedData);
      
      materialTrends[material] = {
        averageQuality: data.reduce((sum, item) => sum + item.qualityScore, 0) / data.length,
        averageDefectRate: data.reduce((sum, item) => sum + item.defectRate, 0) / data.length,
        trend,
        sampleSize: data.length
      };
    });

    return materialTrends;
  }

  _calculateQualityTrend(sortedQualityData) {
    if (sortedQualityData.length < 3) return 'insufficient_data';
    
    const recentData = sortedQualityData.slice(-6); // 最新6件
    const earlierData = sortedQualityData.slice(0, Math.max(1, sortedQualityData.length - 6));
    
    const recentAvg = recentData.reduce((sum, item) => sum + item.qualityScore, 0) / recentData.length;
    const earlierAvg = earlierData.reduce((sum, item) => sum + item.qualityScore, 0) / earlierData.length;
    
    const difference = recentAvg - earlierAvg;
    
    if (Math.abs(difference) < 2) return 'stable';
    return difference > 0 ? 'improving' : 'declining';
  }

  _analyzeCustomerQualityPatterns(qualityData) {
    const customerPatterns = {};
    
    const groupedByCustomer = qualityData.reduce((groups, item) => {
      if (!groups[item.customer]) groups[item.customer] = [];
      groups[item.customer].push(item);
      return groups;
    }, {});

    Object.entries(groupedByCustomer).forEach(([customer, data]) => {
      customerPatterns[customer] = {
        averageQuality: data.reduce((sum, item) => sum + item.qualityScore, 0) / data.length,
        consistencyScore: this._calculateConsistencyScore(data),
        reworkRate: data.filter(item => item.reworkRequired).length / data.length,
        orderCount: data.length
      };
    });

    return customerPatterns;
  }

  _calculateConsistencyScore(qualityData) {
    const scores = qualityData.map(item => item.qualityScore);
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    
    // 標準偏差が小さいほど一貫性が高い（0-100スケール）
    return Math.max(0, 100 - stdDev * 2);
  }

  _predictQualityRisks(qualityData) {
    // 品質リスクの予測（簡易実装）
    const risks = [];
    
    // 材質別リスク分析
    const materialRisks = this._analyzeMaterialQualityTrends(qualityData);
    Object.entries(materialRisks).forEach(([material, trend]) => {
      if (trend.trend === 'declining' && trend.averageDefectRate > 0.03) {
        risks.push({
          type: 'material_quality_decline',
          material,
          severity: 'high',
          description: `${material}の品質が低下傾向にあります`,
          recommendation: '工程管理の見直しを推奨します'
        });
      }
    });

    return risks;
  }

  _generateQualityRecommendations(qualityData) {
    const recommendations = [];
    
    // 全体的な品質傾向
    const overallQuality = qualityData.reduce((sum, item) => sum + item.qualityScore, 0) / qualityData.length;
    if (overallQuality < 80) {
      recommendations.push({
        type: 'overall_quality',
        priority: 'high',
        message: '全体的な品質スコアが80点を下回っています',
        suggestion: '品質管理プロセスの全面的な見直しを検討してください'
      });
    }

    return recommendations;
  }
}

// デフォルトインスタンス
export const analyticsEngine = new AnalyticsEngine();

// 簡易統計関数
export const statisticsUtils = {
  mean: (values) => values.reduce((sum, val) => sum + val, 0) / values.length,
  
  median: (values) => {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  },
  
  standardDeviation: (values) => {
    const mean = statisticsUtils.mean(values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  },
  
  correlation: (x, y) => {
    if (x.length !== y.length) return 0;
    
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    const sumYY = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumXX - sumX * sumX) * (n * sumYY - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
};