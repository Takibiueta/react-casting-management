// データ管理ユーティリティクラス
class DataManager {
  constructor() {
    this.STORAGE_KEYS = {
      ORDERS: 'casting_orders',
      PRODUCTS: 'casting_products',
      CUSTOMERS: 'casting_customers',
      SETTINGS: 'casting_settings'
    };
  }

  // ローカルストレージへの保存
  saveData(key, data) {
    try {
      const jsonData = JSON.stringify(data);
      localStorage.setItem(key, jsonData);
      return true;
    } catch (error) {
      console.error('データ保存エラー:', error);
      return false;
    }
  }

  // ローカルストレージからの読み込み
  loadData(key) {
    try {
      const jsonData = localStorage.getItem(key);
      return jsonData ? JSON.parse(jsonData) : null;
    } catch (error) {
      console.error('データ読み込みエラー:', error);
      return null;
    }
  }

  // 注文データの保存
  saveOrders(orders) {
    return this.saveData(this.STORAGE_KEYS.ORDERS, orders);
  }

  // 注文データの読み込み
  loadOrders() {
    return this.loadData(this.STORAGE_KEYS.ORDERS) || [];
  }

  // 製品データの保存
  saveProducts(products) {
    return this.saveData(this.STORAGE_KEYS.PRODUCTS, products);
  }

  // 製品データの読み込み
  loadProducts() {
    return this.loadData(this.STORAGE_KEYS.PRODUCTS) || [];
  }

  // 顧客データの保存
  saveCustomers(customers) {
    return this.saveData(this.STORAGE_KEYS.CUSTOMERS, customers);
  }

  // 顧客データの読み込み
  loadCustomers() {
    return this.loadData(this.STORAGE_KEYS.CUSTOMERS) || [];
  }

  // 設定データの保存
  saveSettings(settings) {
    return this.saveData(this.STORAGE_KEYS.SETTINGS, settings);
  }

  // 設定データの読み込み
  loadSettings() {
    return this.loadData(this.STORAGE_KEYS.SETTINGS) || {};
  }

  // すべてのデータをクリア
  clearAllData() {
    Object.values(this.STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }

  // データのエクスポート（バックアップ用）
  exportAllData() {
    const allData = {
      orders: this.loadOrders(),
      products: this.loadProducts(),
      customers: this.loadCustomers(),
      settings: this.loadSettings(),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    return allData;
  }

  // データのインポート（復元用）
  importAllData(data) {
    try {
      if (data.orders) this.saveOrders(data.orders);
      if (data.products) this.saveProducts(data.products);
      if (data.customers) this.saveCustomers(data.customers);
      if (data.settings) this.saveSettings(data.settings);
      return true;
    } catch (error) {
      console.error('データインポートエラー:', error);
      return false;
    }
  }

  // CSVエクスポート（注文データ）
  exportOrdersToCSV(orders) {
    const headers = [
      '優先度',
      '注文番号',
      '顧客名',
      '品名',
      '品番',
      '材質',
      '単重量(kg)',
      '数量',
      '総重量(kg)',
      'ステータス',
      '注文日',
      '納期',
      '残日数',
      '備考'
    ];

    const csvContent = [
      // BOM付きヘッダー（日本語文字化け対策）
      '\uFEFF' + headers.join(','),
      ...orders.map(order => [
        order.priority,
        `"${order.orderNumber || ''}"`,
        `"${order.customerName || ''}"`,
        `"${order.productName || ''}"`,
        `"${order.productCode || ''}"`,
        order.material,
        order.unitWeight,
        order.quantity,
        order.totalWeight,
        this.getStatusLabel(order.status),
        order.orderDate,
        order.deliveryDate,
        order.daysRemaining,
        `"${order.notes || ''}"`
      ].join(','))
    ].join('\n');

    return csvContent;
  }

  // ステータスラベル変換
  getStatusLabel(status) {
    const labels = {
      waiting: '未着手',
      'in-progress': '進行中',
      completed: '完了'
    };
    return labels[status] || status;
  }

  // CSVダウンロード
  downloadCSV(csvContent, filename = 'orders.csv') {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  // 統計計算
  calculateStatistics(orders) {
    const stats = {
      totalOrders: orders.length,
      totalWeight: orders.reduce((sum, order) => sum + (order.totalWeight || 0), 0),
      urgentOrders: orders.filter(order => order.daysRemaining < 7).length,
      overdueOrders: orders.filter(order => order.daysRemaining < 0).length,
      completedOrders: orders.filter(order => order.status === 'completed').length,
      pendingOrders: orders.filter(order => order.status === 'waiting').length,
      inProgressOrders: orders.filter(order => order.status === 'in-progress').length,
      recommendedBatches: Math.ceil(orders.reduce((sum, order) => sum + (order.totalWeight || 0), 0) / 300),
      materialBreakdown: {},
      averageWeight: 0,
      averageDeliveryDays: 0
    };

    // 材質別集計
    orders.forEach(order => {
      const material = order.material || 'Unknown';
      if (!stats.materialBreakdown[material]) {
        stats.materialBreakdown[material] = {
          count: 0,
          totalWeight: 0
        };
      }
      stats.materialBreakdown[material].count++;
      stats.materialBreakdown[material].totalWeight += order.totalWeight || 0;
    });

    // 平均値計算
    if (orders.length > 0) {
      stats.averageWeight = stats.totalWeight / orders.length;
      stats.averageDeliveryDays = orders.reduce((sum, order) => sum + (order.daysRemaining || 0), 0) / orders.length;
    }

    return stats;
  }

  // データ整合性チェック
  validateOrder(order) {
    const errors = [];
    
    if (!order.productName || order.productName.trim() === '') {
      errors.push('品名が未入力です');
    }
    
    if (!order.unitWeight || order.unitWeight <= 0) {
      errors.push('単重量が無効です');
    }
    
    if (!order.quantity || order.quantity <= 0) {
      errors.push('数量が無効です');
    }
    
    if (!order.deliveryDate) {
      errors.push('納期が未入力です');
    }
    
    // 納期の妥当性チェック
    if (order.deliveryDate) {
      const deliveryDate = new Date(order.deliveryDate);
      const today = new Date();
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(today.getFullYear() + 1);
      
      if (deliveryDate < new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000)) {
        errors.push('納期が過去すぎます（1年以上前）');
      }
      
      if (deliveryDate > oneYearFromNow) {
        errors.push('納期が未来すぎます（1年以上先）');
      }
    }
    
    // 重量の妥当性チェック
    if (order.unitWeight > 1000) {
      errors.push('単重量が大きすぎます（1000kg以上）');
    }
    
    if (order.quantity > 10000) {
      errors.push('数量が多すぎます（10000個以上）');
    }
    
    return errors;
  }

  // 重複注文チェック
  checkDuplicateOrder(newOrder, existingOrders) {
    const duplicates = existingOrders.filter(order => 
      order.orderNumber === newOrder.orderNumber ||
      (order.productCode === newOrder.productCode && 
       order.customerName === newOrder.customerName &&
       order.deliveryDate === newOrder.deliveryDate)
    );
    
    return duplicates;
  }

  // バッチ最適化提案
  optimizeBatches(orders, targetWeight = 300) {
    const batches = [];
    const sortedOrders = [...orders].sort((a, b) => {
      // 納期優先、材質でグループ化
      if (a.daysRemaining !== b.daysRemaining) {
        return a.daysRemaining - b.daysRemaining;
      }
      return a.material.localeCompare(b.material);
    });

    let currentBatch = {
      id: 1,
      orders: [],
      totalWeight: 0,
      material: null,
      urgency: 'normal',
      estimatedDays: 0
    };

    sortedOrders.forEach(order => {
      // 材質が異なる場合、または重量超過の場合は新しいバッチ
      if ((currentBatch.material && currentBatch.material !== order.material) ||
          (currentBatch.totalWeight + order.totalWeight > targetWeight * 1.2)) {
        
        if (currentBatch.orders.length > 0) {
          batches.push({...currentBatch});
        }
        
        currentBatch = {
          id: batches.length + 1,
          orders: [],
          totalWeight: 0,
          material: order.material,
          urgency: order.daysRemaining < 7 ? 'urgent' : 'normal',
          estimatedDays: Math.max(order.daysRemaining, 0)
        };
      }

      currentBatch.orders.push(order);
      currentBatch.totalWeight += order.totalWeight;
      if (!currentBatch.material) {
        currentBatch.material = order.material;
      }
      if (order.daysRemaining < 7) {
        currentBatch.urgency = 'urgent';
      }
      currentBatch.estimatedDays = Math.min(currentBatch.estimatedDays, Math.max(order.daysRemaining, 0));
    });

    // 最後のバッチを追加
    if (currentBatch.orders.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }
}

// シングルトンインスタンス
const dataManager = new DataManager();

export default dataManager;