// レポート機能用のReact Hooks
import { useState, useCallback, useMemo } from 'react';
import { reportGenerator, reportUtils } from '../utils/report-generator';

// 基本レポート生成Hook
export const useReportGenerator = () => {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [lastGenerated, setLastGenerated] = useState(null);

  // 注文レポート生成
  const generateOrderReport = useCallback(async (orders, options = {}) => {
    setGenerating(true);
    setError(null);

    try {
      const report = await reportGenerator.generateOrderReport(orders, options);
      setLastGenerated({
        type: 'order',
        timestamp: new Date(),
        filename: report.filename
      });
      return report;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  // 分析レポート生成
  const generateAnalyticsReport = useCallback(async (analyticsData, options = {}) => {
    setGenerating(true);
    setError(null);

    try {
      const report = await reportGenerator.generateAnalyticsReport(analyticsData, options);
      setLastGenerated({
        type: 'analytics',
        timestamp: new Date(),
        filename: report.filename
      });
      return report;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  // バッチ最適化レポート生成
  const generateBatchReport = useCallback(async (optimizationData, options = {}) => {
    setGenerating(true);
    setError(null);

    try {
      const report = await reportGenerator.generateBatchOptimizationReport(optimizationData, options);
      setLastGenerated({
        type: 'batch',
        timestamp: new Date(),
        filename: report.filename
      });
      return report;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  // カスタムレポート生成
  const generateCustomReport = useCallback(async (data, template, options = {}) => {
    setGenerating(true);
    setError(null);

    try {
      const report = await reportGenerator.generateCustomReport(data, template, options);
      setLastGenerated({
        type: 'custom',
        timestamp: new Date(),
        filename: report.filename
      });
      return report;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setGenerating(false);
    }
  }, []);

  return {
    generating,
    error,
    lastGenerated,
    generateOrderReport,
    generateAnalyticsReport,
    generateBatchReport,
    generateCustomReport
  };
};

// レポートダウンロードHook
export const useReportDownload = () => {
  const [downloadHistory, setDownloadHistory] = useState([]);
  const maxHistory = 10;

  const downloadReport = useCallback((reportResult) => {
    try {
      reportUtils.downloadReport(reportResult);
      
      // ダウンロード履歴に追加
      const historyItem = {
        id: Date.now(),
        filename: reportResult.filename,
        format: reportResult.format,
        timestamp: new Date(),
        size: reportResult.content ? reportResult.content.length : 0
      };

      setDownloadHistory(prev => {
        const updated = [historyItem, ...prev];
        return updated.slice(0, maxHistory);
      });

      return true;
    } catch (error) {
      console.error('レポートダウンロードエラー:', error);
      return false;
    }
  }, []);

  const clearHistory = useCallback(() => {
    setDownloadHistory([]);
  }, []);

  return {
    downloadReport,
    downloadHistory,
    clearHistory
  };
};

// レポート印刷Hook
export const useReportPrint = () => {
  const [printing, setPrinting] = useState(false);
  const [printQueue, setPrintQueue] = useState([]);

  const printReport = useCallback(async (reportData, options = {}) => {
    const { 
      format = 'html',
      openPreview = true,
      autoPrint = false 
    } = options;

    setPrinting(true);
    
    try {
      let htmlContent;
      
      if (format === 'html' && typeof reportData === 'string') {
        htmlContent = reportData;
      } else {
        // HTMLレポートを生成
        const htmlReport = await reportGenerator.generateOrderReport(reportData, { format: 'html' });
        htmlContent = htmlReport.content;
      }

      if (openPreview) {
        reportUtils.openPrintPreview(htmlContent);
      }

      // 印刷キューに追加
      const printJob = {
        id: Date.now(),
        timestamp: new Date(),
        content: htmlContent,
        status: 'queued'
      };

      setPrintQueue(prev => [...prev, printJob]);

      if (autoPrint) {
        setTimeout(() => {
          window.print();
        }, 500);
      }

      return printJob.id;
    } catch (error) {
      console.error('印刷エラー:', error);
      throw error;
    } finally {
      setPrinting(false);
    }
  }, []);

  const clearPrintQueue = useCallback(() => {
    setPrintQueue([]);
  }, []);

  return {
    printing,
    printQueue,
    printReport,
    clearPrintQueue
  };
};

// レポートテンプレート管理Hook
export const useReportTemplates = () => {
  const [templates, setTemplates] = useState(() => {
    // ローカルストレージからテンプレートを読み込み
    const saved = localStorage.getItem('reportTemplates');
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // テンプレートの保存
  const saveTemplate = useCallback((name, template) => {
    const newTemplate = {
      id: Date.now(),
      name,
      template,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setTemplates(prev => {
      const updated = { ...prev, [name]: newTemplate };
      localStorage.setItem('reportTemplates', JSON.stringify(updated));
      return updated;
    });

    reportGenerator.registerTemplate(name, template);
    return newTemplate;
  }, []);

  // テンプレートの読み込み
  const loadTemplate = useCallback((name) => {
    const template = templates[name];
    if (template) {
      setSelectedTemplate(template);
      return template;
    }
    return null;
  }, [templates]);

  // テンプレートの削除
  const deleteTemplate = useCallback((name) => {
    setTemplates(prev => {
      const updated = { ...prev };
      delete updated[name];
      localStorage.setItem('reportTemplates', JSON.stringify(updated));
      return updated;
    });

    if (selectedTemplate && selectedTemplate.name === name) {
      setSelectedTemplate(null);
    }
  }, [selectedTemplate]);

  // デフォルトテンプレートの取得
  const getDefaultTemplates = useCallback(() => {
    return {
      basic: {
        name: '基本レポート',
        sections: ['header', 'data'],
        style: 'minimal'
      },
      detailed: {
        name: '詳細レポート',
        sections: ['header', 'statistics', 'data', 'footer'],
        style: 'detailed'
      },
      summary: {
        name: 'サマリーレポート',
        sections: ['header', 'statistics', 'charts'],
        style: 'summary'
      }
    };
  }, []);

  return {
    templates,
    selectedTemplate,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
    setSelectedTemplate,
    getDefaultTemplates
  };
};

// レポートスケジューリングHook
export const useReportScheduling = () => {
  const [scheduledReports, setScheduledReports] = useState(() => {
    const saved = localStorage.getItem('scheduledReports');
    return saved ? JSON.parse(saved) : [];
  });

  const [nextExecution, setNextExecution] = useState(null);

  // スケジュールされたレポートの追加
  const scheduleReport = useCallback((reportConfig) => {
    const schedule = {
      id: Date.now(),
      ...reportConfig,
      createdAt: new Date().toISOString(),
      status: 'active',
      lastRun: null,
      nextRun: calculateNextRun(reportConfig.frequency, reportConfig.time)
    };

    setScheduledReports(prev => {
      const updated = [...prev, schedule];
      localStorage.setItem('scheduledReports', JSON.stringify(updated));
      return updated;
    });

    updateNextExecution();
    return schedule.id;
  }, []);

  // スケジュールされたレポートの削除
  const removeScheduledReport = useCallback((id) => {
    setScheduledReports(prev => {
      const updated = prev.filter(report => report.id !== id);
      localStorage.setItem('scheduledReports', JSON.stringify(updated));
      return updated;
    });
    updateNextExecution();
  }, []);

  // 次回実行時間の更新
  const updateNextExecution = useCallback(() => {
    const activeReports = scheduledReports.filter(report => report.status === 'active');
    if (activeReports.length > 0) {
      const nextRun = Math.min(...activeReports.map(report => new Date(report.nextRun).getTime()));
      setNextExecution(new Date(nextRun));
    } else {
      setNextExecution(null);
    }
  }, [scheduledReports]);

  // スケジュール実行チェック
  const checkScheduledReports = useCallback(async () => {
    const now = new Date();
    const reportsToRun = scheduledReports.filter(report => 
      report.status === 'active' && new Date(report.nextRun) <= now
    );

    for (const report of reportsToRun) {
      try {
        // レポート生成の実行
        await executeScheduledReport(report);
        
        // 次回実行時間を更新
        const updatedReport = {
          ...report,
          lastRun: now.toISOString(),
          nextRun: calculateNextRun(report.frequency, report.time).toISOString(),
          status: 'active',
          lastError: null
        };

        setScheduledReports(prev => 
          prev.map(r => r.id === report.id ? updatedReport : r)
        );
      } catch (error) {
        // エラーログ
        const errorReport = {
          ...report,
          status: 'error',
          lastError: error.message,
          lastRun: now.toISOString()
        };

        setScheduledReports(prev => 
          prev.map(r => r.id === report.id ? errorReport : r)
        );
      }
    }

    updateNextExecution();
  }, [scheduledReports]);

  return {
    scheduledReports,
    nextExecution,
    scheduleReport,
    removeScheduledReport,
    checkScheduledReports
  };
};

// レポート設定Hook
export const useReportSettings = () => {
  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('reportSettings');
    return saved ? JSON.parse(saved) : {
      defaultFormat: 'pdf',
      defaultTemplate: 'basic',
      autoDownload: true,
      emailDelivery: false,
      emailAddress: '',
      pageSize: 'A4',
      orientation: 'portrait',
      includeCharts: true,
      includeStatistics: true
    };
  });

  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem('reportSettings', JSON.stringify(updated));
      
      // ReportGeneratorの設定も更新
      if (key === 'pageSize' || key === 'orientation') {
        reportGenerator.setPageOptions({
          format: updated.pageSize,
          orientation: updated.orientation
        });
      }
      
      return updated;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const defaultSettings = {
      defaultFormat: 'pdf',
      defaultTemplate: 'basic',
      autoDownload: true,
      emailDelivery: false,
      emailAddress: '',
      pageSize: 'A4',
      orientation: 'portrait',
      includeCharts: true,
      includeStatistics: true
    };
    
    setSettings(defaultSettings);
    localStorage.setItem('reportSettings', JSON.stringify(defaultSettings));
  }, []);

  return {
    settings,
    updateSetting,
    resetSettings
  };
};

// レポート履歴管理Hook
export const useReportHistory = () => {
  const [history, setHistory] = useState(() => {
    const saved = localStorage.getItem('reportHistory');
    return saved ? JSON.parse(saved) : [];
  });

  const maxHistory = 50;

  const addToHistory = useCallback((reportInfo) => {
    const historyItem = {
      id: Date.now(),
      ...reportInfo,
      timestamp: new Date().toISOString()
    };

    setHistory(prev => {
      const updated = [historyItem, ...prev].slice(0, maxHistory);
      localStorage.setItem('reportHistory', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('reportHistory');
  }, []);

  const getHistoryByType = useCallback((type) => {
    return history.filter(item => item.type === type);
  }, [history]);

  const getRecentHistory = useCallback((count = 10) => {
    return history.slice(0, count);
  }, [history]);

  return {
    history,
    addToHistory,
    clearHistory,
    getHistoryByType,
    getRecentHistory
  };
};

// ユーティリティ関数
const calculateNextRun = (frequency, time) => {
  const now = new Date();
  const [hours, minutes] = time.split(':').map(Number);
  
  const nextRun = new Date(now);
  nextRun.setHours(hours, minutes, 0, 0);
  
  if (nextRun <= now) {
    switch (frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
    }
  }
  
  return nextRun;
};

const executeScheduledReport = async (reportConfig) => {
  // スケジュールされたレポートの実行
  // 実際の実装では、reportConfigに基づいてレポートを生成し、
  // 指定された配信方法（ダウンロード、メール等）でレポートを配信
  console.log('Executing scheduled report:', reportConfig);
  
  // プレースホルダー実装
  return new Promise(resolve => setTimeout(resolve, 1000));
};