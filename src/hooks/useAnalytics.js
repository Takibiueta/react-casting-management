// 予測分析機能用のReact Hooks
import { useState, useEffect, useCallback, useMemo } from 'react';
import { analyticsEngine, statisticsUtils } from '../utils/analytics-engine';

// 需要予測Hook
export const useDemandForecast = (orders, options = {}) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastAnalysis, setLastAnalysis] = useState(null);

  const analyzeData = useCallback(async () => {
    if (!orders || orders.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const result = await analyticsEngine.analyzeDemandForecast(orders, options);
      setForecast(result);
      setLastAnalysis(new Date());
    } catch (err) {
      setError(err);
      console.error('需要予測エラー:', err);
    } finally {
      setLoading(false);
    }
  }, [orders, options]);

  // 依存関係が変更された時に自動分析
  useEffect(() => {
    const timer = setTimeout(() => {
      analyzeData();
    }, 500); // デバウンス

    return () => clearTimeout(timer);
  }, [analyzeData]);

  // 予測の信頼性レベル
  const confidenceLevel = useMemo(() => {
    if (!forecast || forecast.error) return 'unknown';
    
    const accuracy = forecast.accuracy;
    if (accuracy && accuracy.accuracy === 'high') return 'high';
    if (accuracy && accuracy.accuracy === 'medium') return 'medium';
    return 'low';
  }, [forecast]);

  // トレンドの要約
  const trendSummary = useMemo(() => {
    if (!forecast || !forecast.trendAnalysis) return null;

    const trend = forecast.trendAnalysis;
    return {
      direction: trend.trend,
      strength: trend.strength,
      description: `${trend.trend === 'increasing' ? '増加' : 
                   trend.trend === 'decreasing' ? '減少' : '安定'}傾向（${
                   trend.strength === 'strong' ? '強い' : 
                   trend.strength === 'moderate' ? '中程度' : '弱い'}）`
    };
  }, [forecast]);

  return {
    forecast,
    loading,
    error,
    lastAnalysis,
    confidenceLevel,
    trendSummary,
    refresh: analyzeData
  };
};

// 効率最適化Hook
export const useEfficiencyOptimization = (orders, options = {}) => {
  const [optimization, setOptimization] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const optimizeEfficiency = useCallback(async () => {
    if (!orders || orders.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const result = await analyticsEngine.analyzeProductionEfficiency(orders, options);
      setOptimization(result);
    } catch (err) {
      setError(err);
      console.error('効率最適化エラー:', err);
    } finally {
      setLoading(false);
    }
  }, [orders, options]);

  // 最適化実行
  useEffect(() => {
    const timer = setTimeout(() => {
      optimizeEfficiency();
    }, 1000); // デバウンス

    return () => clearTimeout(timer);
  }, [optimizeEfficiency]);

  // 最適化サマリー
  const optimizationSummary = useMemo(() => {
    if (!optimization) return null;

    const overall = optimization.overallEfficiency;
    return {
      totalBatches: overall.totalBatches,
      averageEfficiency: overall.averageBatchEfficiency.toFixed(1),
      wastedCapacity: overall.wastedCapacity.toFixed(1),
      utilizationRate: overall.weightUtilization.toFixed(1),
      status: overall.averageBatchEfficiency >= 80 ? 'excellent' : 
              overall.averageBatchEfficiency >= 70 ? 'good' : 
              overall.averageBatchEfficiency >= 60 ? 'fair' : 'poor'
    };
  }, [optimization]);

  // 推奨事項の取得
  const getRecommendations = useCallback((priority = 'all') => {
    if (!optimization || !optimization.recommendations) return [];
    
    if (priority === 'all') return optimization.recommendations;
    return optimization.recommendations.filter(rec => rec.priority === priority);
  }, [optimization]);

  return {
    optimization,
    loading,
    error,
    optimizationSummary,
    getRecommendations,
    refresh: optimizeEfficiency
  };
};

// 品質予測Hook
export const useQualityPrediction = (orders, products = []) => {
  const [qualityAnalysis, setQualityAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeQuality = useCallback(async () => {
    if (!orders || orders.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const result = await analyticsEngine.analyzeQualityPrediction(orders, products);
      setQualityAnalysis(result);
    } catch (err) {
      setError(err);
      console.error('品質予測エラー:', err);
    } finally {
      setLoading(false);
    }
  }, [orders, products]);

  useEffect(() => {
    analyzeQuality();
  }, [analyzeQuality]);

  // 品質リスクの要約
  const qualityRiskSummary = useMemo(() => {
    if (!qualityAnalysis || !qualityAnalysis.qualityRiskPrediction) return null;

    const risks = qualityAnalysis.qualityRiskPrediction;
    const highRisks = risks.filter(risk => risk.severity === 'high').length;
    const mediumRisks = risks.filter(risk => risk.severity === 'medium').length;

    return {
      totalRisks: risks.length,
      highRisks,
      mediumRisks,
      riskLevel: highRisks > 0 ? 'high' : mediumRisks > 0 ? 'medium' : 'low'
    };
  }, [qualityAnalysis]);

  // 材質別品質トレンド
  const getMaterialQualityTrend = useCallback((material) => {
    if (!qualityAnalysis || !qualityAnalysis.materialQualityTrends) return null;
    return qualityAnalysis.materialQualityTrends[material] || null;
  }, [qualityAnalysis]);

  return {
    qualityAnalysis,
    loading,
    error,
    qualityRiskSummary,
    getMaterialQualityTrend,
    refresh: analyzeQuality
  };
};

// 収益性分析Hook
export const useProfitabilityAnalysis = (orders, products = [], options = {}) => {
  const [profitability, setProfitability] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const analyzeProfitability = useCallback(async () => {
    if (!orders || orders.length === 0) return;

    setLoading(true);
    setError(null);

    try {
      const result = await analyticsEngine.analyzeProfitability(orders, products, options);
      setProfitability(result);
    } catch (err) {
      setError(err);
      console.error('収益性分析エラー:', err);
    } finally {
      setLoading(false);
    }
  }, [orders, products, options]);

  useEffect(() => {
    analyzeProfitability();
  }, [analyzeProfitability]);

  // 収益性サマリー
  const profitabilitySummary = useMemo(() => {
    if (!profitability) return null;

    const totalRevenue = profitability.metadata.totalRevenue;
    const insights = profitability.insights || [];
    
    return {
      totalRevenue: totalRevenue.toLocaleString(),
      profitabilityTrend: insights.find(i => i.type === 'trend')?.direction || 'unknown',
      topMaterial: insights.find(i => i.type === 'top_material')?.material || 'unknown',
      topCustomer: insights.find(i => i.type === 'top_customer')?.customer || 'unknown'
    };
  }, [profitability]);

  return {
    profitability,
    loading,
    error,
    profitabilitySummary,
    refresh: analyzeProfitability
  };
};

// 統計分析Hook
export const useStatisticsAnalysis = (data, analysisType = 'basic') => {
  const [statistics, setStatistics] = useState(null);

  const calculateStatistics = useCallback(() => {
    if (!data || !Array.isArray(data) || data.length === 0) {
      setStatistics(null);
      return;
    }

    const values = data.map(item => 
      typeof item === 'number' ? item : item.value || item.totalWeight || 0
    );

    const basicStats = {
      count: values.length,
      mean: statisticsUtils.mean(values),
      median: statisticsUtils.median(values),
      standardDeviation: statisticsUtils.standardDeviation(values),
      min: Math.min(...values),
      max: Math.max(...values)
    };

    if (analysisType === 'extended') {
      // 拡張統計
      const sortedValues = [...values].sort((a, b) => a - b);
      const q1Index = Math.floor(values.length / 4);
      const q3Index = Math.floor(3 * values.length / 4);

      setStatistics({
        ...basicStats,
        quartiles: {
          q1: sortedValues[q1Index],
          q2: basicStats.median,
          q3: sortedValues[q3Index]
        },
        outliers: this.detectOutliers(values),
        skewness: this.calculateSkewness(values, basicStats.mean, basicStats.standardDeviation),
        kurtosis: this.calculateKurtosis(values, basicStats.mean, basicStats.standardDeviation)
      });
    } else {
      setStatistics(basicStats);
    }
  }, [data, analysisType]);

  useEffect(() => {
    calculateStatistics();
  }, [calculateStatistics]);

  // 異常値検出
  const detectOutliers = useCallback((values) => {
    const mean = statisticsUtils.mean(values);
    const stdDev = statisticsUtils.standardDeviation(values);
    return values.filter(value => Math.abs(value - mean) > 2 * stdDev);
  }, []);

  // 歪度計算
  const calculateSkewness = useCallback((values, mean, stdDev) => {
    const n = values.length;
    const sum = values.reduce((acc, value) => {
      return acc + Math.pow((value - mean) / stdDev, 3);
    }, 0);
    return sum / n;
  }, []);

  // 尖度計算
  const calculateKurtosis = useCallback((values, mean, stdDev) => {
    const n = values.length;
    const sum = values.reduce((acc, value) => {
      return acc + Math.pow((value - mean) / stdDev, 4);
    }, 0);
    return (sum / n) - 3; // 正規分布を基準とした超過尖度
  }, []);

  return {
    statistics,
    refresh: calculateStatistics
  };
};

// 比較分析Hook
export const useComparativeAnalysis = (currentData, historicalData, comparisonType = 'percentage') => {
  const [comparison, setComparison] = useState(null);

  const performComparison = useCallback(() => {
    if (!currentData || !historicalData) return;

    const currentValue = Array.isArray(currentData) 
      ? currentData.reduce((sum, item) => sum + (item.value || item.totalWeight || 0), 0)
      : currentData.value || currentData.totalWeight || currentData;

    const historicalValue = Array.isArray(historicalData)
      ? historicalData.reduce((sum, item) => sum + (item.value || item.totalWeight || 0), 0)
      : historicalData.value || historicalData.totalWeight || historicalData;

    const difference = currentValue - historicalValue;
    const percentageChange = historicalValue !== 0 ? (difference / historicalValue) * 100 : 0;

    const result = {
      current: currentValue,
      historical: historicalValue,
      difference,
      percentageChange,
      trend: difference > 0 ? 'increase' : difference < 0 ? 'decrease' : 'stable',
      significance: Math.abs(percentageChange) > 10 ? 'significant' : 
                   Math.abs(percentageChange) > 5 ? 'moderate' : 'minimal'
    };

    setComparison(result);
  }, [currentData, historicalData, comparisonType]);

  useEffect(() => {
    performComparison();
  }, [performComparison]);

  return {
    comparison,
    refresh: performComparison
  };
};

// 予測精度評価Hook
export const useForecastAccuracy = (actualData, forecastData) => {
  const [accuracy, setAccuracy] = useState(null);

  const evaluateAccuracy = useCallback(() => {
    if (!actualData || !forecastData || actualData.length !== forecastData.length) {
      setAccuracy(null);
      return;
    }

    const errors = actualData.map((actual, index) => {
      const forecast = forecastData[index];
      return {
        actual: actual.value || actual,
        forecast: forecast.value || forecast,
        error: (actual.value || actual) - (forecast.value || forecast),
        absoluteError: Math.abs((actual.value || actual) - (forecast.value || forecast)),
        percentageError: actual.value !== 0 ? 
          Math.abs(((actual.value || actual) - (forecast.value || forecast)) / (actual.value || actual)) * 100 : 0
      };
    });

    const meanAbsoluteError = errors.reduce((sum, e) => sum + e.absoluteError, 0) / errors.length;
    const meanAbsolutePercentageError = errors.reduce((sum, e) => sum + e.percentageError, 0) / errors.length;
    const rootMeanSquareError = Math.sqrt(errors.reduce((sum, e) => sum + e.error * e.error, 0) / errors.length);

    setAccuracy({
      meanAbsoluteError,
      meanAbsolutePercentageError,
      rootMeanSquareError,
      accuracy: meanAbsolutePercentageError < 10 ? 'high' : 
               meanAbsolutePercentageError < 20 ? 'medium' : 'low',
      errors
    });
  }, [actualData, forecastData]);

  useEffect(() => {
    evaluateAccuracy();
  }, [evaluateAccuracy]);

  return {
    accuracy,
    refresh: evaluateAccuracy
  };
};

// 総合分析ダッシュボードHook
export const useAnalyticsDashboard = (orders, products = [], customers = []) => {
  const [dashboard, setDashboard] = useState({
    demand: null,
    efficiency: null,
    quality: null,
    profitability: null
  });
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  const { forecast } = useDemandForecast(orders);
  const { optimization } = useEfficiencyOptimization(orders);
  const { qualityAnalysis } = useQualityPrediction(orders, products);
  const { profitability } = useProfitabilityAnalysis(orders, products);

  // 統合ダッシュボードデータの構築
  useEffect(() => {
    if (forecast || optimization || qualityAnalysis || profitability) {
      setDashboard({
        demand: forecast,
        efficiency: optimization,
        quality: qualityAnalysis,
        profitability: profitability
      });
      setLastUpdate(new Date());
    }
  }, [forecast, optimization, qualityAnalysis, profitability]);

  // KPI計算
  const kpis = useMemo(() => {
    if (!orders || orders.length === 0) return null;

    const totalOrders = orders.length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const totalWeight = orders.reduce((sum, o) => sum + (o.totalWeight || 0), 0);
    const averageOrderValue = orders.reduce((sum, o) => sum + ((o.unitPrice || 0) * (o.quantity || 0)), 0) / totalOrders;

    return {
      totalOrders,
      completionRate: (completedOrders / totalOrders) * 100,
      totalWeight,
      averageOrderValue,
      efficiency: dashboard.efficiency?.optimizationSummary?.averageEfficiency || 0,
      qualityScore: dashboard.quality ? 
        Object.values(dashboard.quality.materialQualityTrends || {})
          .reduce((sum, trend) => sum + (trend.averageQuality || 0), 0) /
        Object.keys(dashboard.quality.materialQualityTrends || {}).length : 0
    };
  }, [orders, dashboard]);

  return {
    dashboard,
    kpis,
    loading,
    lastUpdate
  };
};