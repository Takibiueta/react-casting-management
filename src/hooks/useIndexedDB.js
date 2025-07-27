// IndexedDB操作用のReact Hooks
import { useState, useEffect, useCallback, useRef } from 'react';
import { dbManager } from '../utils/indexed-db-manager';

// 基本的なIndexedDB操作Hook
export const useIndexedDB = (storeName) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // データベース初期化
  useEffect(() => {
    const initDB = async () => {
      try {
        await dbManager.initialize();
        setInitialized(true);
        setError(null);
      } catch (err) {
        setError(err);
        console.error('IndexedDB初期化エラー:', err);
      }
    };

    initDB();
  }, []);

  // データの読み込み
  const loadData = useCallback(async () => {
    if (!initialized) return;

    try {
      setLoading(true);
      const result = await dbManager.getAll(storeName);
      setData(result);
      setError(null);
    } catch (err) {
      setError(err);
      console.error(`${storeName}データ読み込みエラー:`, err);
    } finally {
      setLoading(false);
    }
  }, [storeName, initialized]);

  // 初期化完了後にデータを読み込み
  useEffect(() => {
    if (initialized) {
      loadData();
    }
  }, [initialized, loadData]);

  // データの追加
  const addItem = useCallback(async (item) => {
    try {
      const newItem = await dbManager.add(storeName, item);
      setData(prevData => [...prevData, newItem]);
      return newItem;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [storeName]);

  // データの更新
  const updateItem = useCallback(async (item) => {
    try {
      const updatedItem = await dbManager.update(storeName, item);
      setData(prevData => 
        prevData.map(existingItem => 
          existingItem.id === updatedItem.id ? updatedItem : existingItem
        )
      );
      return updatedItem;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [storeName]);

  // データの削除
  const deleteItem = useCallback(async (id) => {
    try {
      await dbManager.delete(storeName, id);
      setData(prevData => prevData.filter(item => item.id !== id));
      return id;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [storeName]);

  // データの検索
  const searchItems = useCallback(async (filters) => {
    try {
      const results = await dbManager.search(storeName, filters);
      return results;
    } catch (err) {
      setError(err);
      throw err;
    }
  }, [storeName]);

  // データの再読み込み
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  return {
    data,
    loading,
    error,
    initialized,
    addItem,
    updateItem,
    deleteItem,
    searchItems,
    refresh
  };
};

// 注文データ専用Hook
export const useOrdersDB = () => {
  const {
    data: orders,
    loading,
    error,
    initialized,
    addItem: addOrder,
    updateItem: updateOrder,
    deleteItem: deleteOrder,
    searchItems: searchOrders,
    refresh
  } = useIndexedDB('orders');

  // 注文統計の計算
  const getOrderStatistics = useCallback(() => {
    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const processingOrders = orders.filter(o => o.status === 'processing').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const totalWeight = orders.reduce((sum, o) => sum + (o.totalWeight || 0), 0);

    // 緊急度分析
    const today = new Date();
    const urgentOrders = orders.filter(order => {
      const deliveryDate = new Date(order.deliveryDate);
      const daysDiff = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7 && order.status !== 'completed';
    }).length;

    return {
      totalOrders,
      pendingOrders,
      processingOrders,
      completedOrders,
      totalWeight,
      urgentOrders,
      averageWeight: totalOrders > 0 ? totalWeight / totalOrders : 0
    };
  }, [orders]);

  // 材質別注文の取得
  const getOrdersByMaterial = useCallback((material) => {
    return orders.filter(order => order.material === material);
  }, [orders]);

  // 顧客別注文の取得
  const getOrdersByCustomer = useCallback((customer) => {
    return orders.filter(order => order.customer === customer);
  }, [orders]);

  // 期間別注文の取得
  const getOrdersByDateRange = useCallback((startDate, endDate) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    return orders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= start && orderDate <= end;
    });
  }, [orders]);

  return {
    orders,
    loading,
    error,
    initialized,
    addOrder,
    updateOrder,
    deleteOrder,
    searchOrders,
    refresh,
    getOrderStatistics,
    getOrdersByMaterial,
    getOrdersByCustomer,
    getOrdersByDateRange
  };
};

// 顧客データ専用Hook
export const useCustomersDB = () => {
  const {
    data: customers,
    loading,
    error,
    initialized,
    addItem: addCustomer,
    updateItem: updateCustomer,
    deleteItem: deleteCustomer,
    searchItems: searchCustomers,
    refresh
  } = useIndexedDB('customers');

  // 顧客コードによる検索
  const findByCustomerCode = useCallback(async (customerCode) => {
    try {
      const results = await dbManager.findByIndex('customers', 'customerCode', customerCode);
      return results[0] || null;
    } catch (err) {
      console.error('顧客コード検索エラー:', err);
      return null;
    }
  }, []);

  // 活動中の顧客のみを取得
  const getActiveCustomers = useCallback(() => {
    return customers.filter(customer => customer.status === 'active');
  }, [customers]);

  return {
    customers,
    loading,
    error,
    initialized,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    searchCustomers,
    refresh,
    findByCustomerCode,
    getActiveCustomers
  };
};

// 製品データ専用Hook
export const useProductsDB = () => {
  const {
    data: products,
    loading,
    error,
    initialized,
    addItem: addProduct,
    updateItem: updateProduct,
    deleteItem: deleteProduct,
    searchItems: searchProducts,
    refresh
  } = useIndexedDB('products');

  // 製品コードによる検索
  const findByProductCode = useCallback(async (productCode) => {
    try {
      const results = await dbManager.findByIndex('products', 'productCode', productCode);
      return results[0] || null;
    } catch (err) {
      console.error('製品コード検索エラー:', err);
      return null;
    }
  }, []);

  // カテゴリ別製品の取得
  const getProductsByCategory = useCallback((category) => {
    return products.filter(product => product.category === category);
  }, [products]);

  // 活動中の製品のみを取得
  const getActiveProducts = useCallback(() => {
    return products.filter(product => product.status === 'active');
  }, [products]);

  return {
    products,
    loading,
    error,
    initialized,
    addProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    refresh,
    findByProductCode,
    getProductsByCategory,
    getActiveProducts
  };
};

// データ同期Hook
export const useDataSync = () => {
  const [syncStatus, setSyncStatus] = useState({
    isSync: false,
    lastSync: null,
    error: null
  });

  // サーバーとの同期
  const syncWithServer = useCallback(async (storeName, serverData, options = {}) => {
    try {
      setSyncStatus(prev => ({ ...prev, isSync: true, error: null }));
      
      const result = await dbManager.syncWithServer(storeName, serverData, options);
      
      setSyncStatus(prev => ({
        ...prev,
        isSync: false,
        lastSync: new Date().toISOString()
      }));

      return result;
    } catch (err) {
      setSyncStatus(prev => ({
        ...prev,
        isSync: false,
        error: err.message
      }));
      throw err;
    }
  }, []);

  return {
    syncStatus,
    syncWithServer
  };
};

// バックアップ管理Hook
export const useBackupManager = () => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // バックアップ一覧の読み込み
  const loadBackups = useCallback(async () => {
    try {
      setLoading(true);
      const backupList = await dbManager.getAll('backups');
      setBackups(backupList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // バックアップの作成
  const createBackup = useCallback(async (storeNames = null) => {
    try {
      setLoading(true);
      const backup = await dbManager.createBackup(storeNames);
      await loadBackups(); // リストを更新
      return backup;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [loadBackups]);

  // バックアップの復元
  const restoreBackup = useCallback(async (backupId) => {
    try {
      setLoading(true);
      const result = await dbManager.restoreBackup(backupId);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 初期化時にバックアップを読み込み
  useEffect(() => {
    loadBackups();
  }, [loadBackups]);

  return {
    backups,
    loading,
    error,
    createBackup,
    restoreBackup,
    loadBackups
  };
};

// データベース統計Hook
export const useDBStatistics = () => {
  const [statistics, setStatistics] = useState({});
  const [loading, setLoading] = useState(false);

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const stats = await dbManager.getStatistics();
      setStatistics(stats);
    } catch (error) {
      console.error('統計取得エラー:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 定期的に統計を更新
  useEffect(() => {
    loadStatistics();
    const interval = setInterval(loadStatistics, 60000); // 1分間隔
    return () => clearInterval(interval);
  }, [loadStatistics]);

  return {
    statistics,
    loading,
    refresh: loadStatistics
  };
};

// データインポート/エクスポートHook
export const useDataImportExport = () => {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(null);

  // データのエクスポート
  const exportData = useCallback(async (storeNames = null, format = 'json') => {
    try {
      setExporting(true);
      setError(null);
      const exportedData = await dbManager.exportData(storeNames, format);
      
      // ダウンロード用のBlobを作成
      const blob = new Blob([exportedData], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      
      const url = URL.createObjectURL(blob);
      const filename = `cast-management-export-${new Date().toISOString().split('T')[0]}.${format}`;
      
      // ダウンロードリンクを作成
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return exportedData;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setExporting(false);
    }
  }, []);

  // データのインポート
  const importData = useCallback(async (importData, options = {}) => {
    try {
      setImporting(true);
      setError(null);
      const result = await dbManager.importData(importData, options);
      return result;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setImporting(false);
    }
  }, []);

  // ファイルからのインポート
  const importFromFile = useCallback(async (file, options = {}) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const result = await importData(e.target.result, options);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      
      reader.onerror = () => reject(new Error('ファイル読み込みエラー'));
      reader.readAsText(file);
    });
  }, [importData]);

  return {
    importing,
    exporting,
    error,
    exportData,
    importData,
    importFromFile
  };
};

// オフライン対応Hook
export const useOfflineStorage = (storeName) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState([]);
  const pendingQueue = useRef([]);

  // オンライン状態の監視
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // オフライン時の操作をキューに追加
  const queueOperation = useCallback((operation) => {
    pendingQueue.current.push({
      ...operation,
      timestamp: new Date().toISOString(),
      id: Date.now().toString()
    });
    setPendingOperations([...pendingQueue.current]);
  }, []);

  // オンライン復帰時にキューを処理
  const processPendingOperations = useCallback(async () => {
    if (!isOnline || pendingQueue.current.length === 0) return;

    const results = [];
    const operations = [...pendingQueue.current];
    
    for (const operation of operations) {
      try {
        // ここで実際のサーバー同期を実行
        // 現在はローカルDBに保存のみ
        await dbManager[operation.method](storeName, operation.data);
        results.push({ success: true, operation });
        
        // 成功した操作をキューから削除
        pendingQueue.current = pendingQueue.current.filter(op => op.id !== operation.id);
      } catch (error) {
        results.push({ success: false, operation, error: error.message });
      }
    }

    setPendingOperations([...pendingQueue.current]);
    return results;
  }, [isOnline, storeName]);

  // オンライン復帰時に自動処理
  useEffect(() => {
    if (isOnline && pendingQueue.current.length > 0) {
      processPendingOperations();
    }
  }, [isOnline, processPendingOperations]);

  return {
    isOnline,
    pendingOperations,
    queueOperation,
    processPendingOperations
  };
};