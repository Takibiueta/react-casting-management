// IndexedDBマネージャークラス - 高度なデータ永続化機能
export class IndexedDBManager {
  constructor(dbName = 'CastManagementDB', version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
    this.isInitialized = false;
    this.initPromise = null;
  }

  // データベースの初期化
  async initialize() {
    if (this.isInitialized && this.db) {
      return this.db;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initializeDB();
    return this.initPromise;
  }

  async _initializeDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('IndexedDB初期化エラー:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        this.isInitialized = true;
        console.log('IndexedDB初期化完了');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this._createObjectStores(db);
      };
    });
  }

  // オブジェクトストアの作成
  _createObjectStores(db) {
    // 注文データストア
    if (!db.objectStoreNames.contains('orders')) {
      const orderStore = db.createObjectStore('orders', { keyPath: 'id' });
      orderStore.createIndex('orderNumber', 'orderNumber', { unique: true });
      orderStore.createIndex('customer', 'customer', { unique: false });
      orderStore.createIndex('material', 'material', { unique: false });
      orderStore.createIndex('status', 'status', { unique: false });
      orderStore.createIndex('deliveryDate', 'deliveryDate', { unique: false });
      orderStore.createIndex('orderDate', 'orderDate', { unique: false });
    }

    // 顧客データストア
    if (!db.objectStoreNames.contains('customers')) {
      const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
      customerStore.createIndex('customerCode', 'customerCode', { unique: true });
      customerStore.createIndex('companyName', 'companyName', { unique: false });
    }

    // 製品データストア
    if (!db.objectStoreNames.contains('products')) {
      const productStore = db.createObjectStore('products', { keyPath: 'id' });
      productStore.createIndex('productCode', 'productCode', { unique: true });
      productStore.createIndex('category', 'category', { unique: false });
      productStore.createIndex('material', 'material', { unique: false });
    }

    // 設定データストア
    if (!db.objectStoreNames.contains('settings')) {
      db.createObjectStore('settings', { keyPath: 'key' });
    }

    // ログデータストア
    if (!db.objectStoreNames.contains('logs')) {
      const logStore = db.createObjectStore('logs', { keyPath: 'id', autoIncrement: true });
      logStore.createIndex('timestamp', 'timestamp', { unique: false });
      logStore.createIndex('type', 'type', { unique: false });
      logStore.createIndex('level', 'level', { unique: false });
    }

    // バックアップデータストア
    if (!db.objectStoreNames.contains('backups')) {
      const backupStore = db.createObjectStore('backups', { keyPath: 'id', autoIncrement: true });
      backupStore.createIndex('timestamp', 'timestamp', { unique: false });
      backupStore.createIndex('type', 'type', { unique: false });
    }
  }

  // CRUD操作 - Create
  async add(storeName, data) {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // IDが未設定の場合は生成
      if (!data.id) {
        data.id = this._generateId();
      }

      // タイムスタンプの追加
      data.createdAt = data.createdAt || new Date().toISOString();
      data.updatedAt = new Date().toISOString();

      const request = store.add(data);

      request.onsuccess = () => {
        this._logOperation('add', storeName, data.id);
        resolve(data);
      };

      request.onerror = () => {
        console.error(`${storeName}への追加エラー:`, request.error);
        reject(request.error);
      };
    });
  }

  // CRUD操作 - Read (単一)
  async get(storeName, id) {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`${storeName}からの取得エラー:`, request.error);
        reject(request.error);
      };
    });
  }

  // CRUD操作 - Read (全件)
  async getAll(storeName) {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`${storeName}からの全件取得エラー:`, request.error);
        reject(request.error);
      };
    });
  }

  // CRUD操作 - Update
  async update(storeName, data) {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      
      // 更新日時を追加
      data.updatedAt = new Date().toISOString();

      const request = store.put(data);

      request.onsuccess = () => {
        this._logOperation('update', storeName, data.id);
        resolve(data);
      };

      request.onerror = () => {
        console.error(`${storeName}の更新エラー:`, request.error);
        reject(request.error);
      };
    });
  }

  // CRUD操作 - Delete
  async delete(storeName, id) {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(id);

      request.onsuccess = () => {
        this._logOperation('delete', storeName, id);
        resolve(id);
      };

      request.onerror = () => {
        console.error(`${storeName}からの削除エラー:`, request.error);
        reject(request.error);
      };
    });
  }

  // インデックスによる検索
  async findByIndex(storeName, indexName, value) {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`${storeName}のインデックス検索エラー:`, request.error);
        reject(request.error);
      };
    });
  }

  // 範囲検索
  async findByRange(storeName, indexName, lowerBound, upperBound) {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const range = IDBKeyRange.bound(lowerBound, upperBound);
      const request = index.getAll(range);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        console.error(`${storeName}の範囲検索エラー:`, request.error);
        reject(request.error);
      };
    });
  }

  // 複合検索
  async search(storeName, filters = {}) {
    const allData = await this.getAll(storeName);
    
    return allData.filter(item => {
      return Object.keys(filters).every(key => {
        const filterValue = filters[key];
        const itemValue = item[key];

        if (filterValue === null || filterValue === undefined) {
          return true;
        }

        if (typeof filterValue === 'string') {
          return String(itemValue).toLowerCase().includes(filterValue.toLowerCase());
        }

        if (typeof filterValue === 'object' && filterValue.range) {
          const { min, max } = filterValue.range;
          return (!min || itemValue >= min) && (!max || itemValue <= max);
        }

        return itemValue === filterValue;
      });
    });
  }

  // バッチ操作
  async batch(operations) {
    await this.initialize();
    const results = [];

    for (const operation of operations) {
      try {
        let result;
        switch (operation.type) {
          case 'add':
            result = await this.add(operation.storeName, operation.data);
            break;
          case 'update':
            result = await this.update(operation.storeName, operation.data);
            break;
          case 'delete':
            result = await this.delete(operation.storeName, operation.id);
            break;
          default:
            throw new Error(`未知の操作タイプ: ${operation.type}`);
        }
        results.push({ success: true, result, operation });
      } catch (error) {
        results.push({ success: false, error: error.message, operation });
      }
    }

    return results;
  }

  // データ同期
  async syncWithServer(storeName, serverData, options = {}) {
    const { 
      strategy = 'server-wins', // 'server-wins', 'client-wins', 'merge'
      conflictResolver = null 
    } = options;

    const localData = await this.getAll(storeName);
    const syncResults = {
      added: [],
      updated: [],
      deleted: [],
      conflicts: []
    };

    // サーバーデータのマップを作成
    const serverDataMap = new Map();
    serverData.forEach(item => serverDataMap.set(item.id, item));

    // ローカルデータのマップを作成
    const localDataMap = new Map();
    localData.forEach(item => localDataMap.set(item.id, item));

    // サーバーから追加・更新されるデータの処理
    for (const serverItem of serverData) {
      const localItem = localDataMap.get(serverItem.id);

      if (!localItem) {
        // 新規追加
        await this.update(storeName, serverItem);
        syncResults.added.push(serverItem);
      } else {
        // 更新の競合チェック
        const serverTimestamp = new Date(serverItem.updatedAt || serverItem.createdAt);
        const localTimestamp = new Date(localItem.updatedAt || localItem.createdAt);

        if (serverTimestamp > localTimestamp || strategy === 'server-wins') {
          await this.update(storeName, serverItem);
          syncResults.updated.push(serverItem);
        } else if (strategy === 'merge' && conflictResolver) {
          const mergedItem = conflictResolver(localItem, serverItem);
          await this.update(storeName, mergedItem);
          syncResults.updated.push(mergedItem);
        } else if (strategy === 'client-wins') {
          // クライアント優先 - 何もしない
          syncResults.conflicts.push({ local: localItem, server: serverItem });
        }
      }
    }

    // ローカルにのみ存在するデータの処理（削除された可能性）
    for (const localItem of localData) {
      if (!serverDataMap.has(localItem.id)) {
        if (strategy === 'server-wins') {
          await this.delete(storeName, localItem.id);
          syncResults.deleted.push(localItem);
        }
      }
    }

    this._logOperation('sync', storeName, syncResults);
    return syncResults;
  }

  // バックアップ作成
  async createBackup(storeNames = null) {
    await this.initialize();
    
    const storesToBackup = storeNames || ['orders', 'customers', 'products', 'settings'];
    const backupData = {};
    
    for (const storeName of storesToBackup) {
      try {
        backupData[storeName] = await this.getAll(storeName);
      } catch (error) {
        console.error(`${storeName}のバックアップエラー:`, error);
        backupData[storeName] = null;
      }
    }

    const backup = {
      timestamp: new Date().toISOString(),
      version: this.version,
      data: backupData,
      type: 'full'
    };

    // バックアップをバックアップストアに保存
    await this.add('backups', backup);
    
    return backup;
  }

  // バックアップの復元
  async restoreBackup(backupId) {
    const backup = await this.get('backups', backupId);
    if (!backup) {
      throw new Error('バックアップが見つかりません');
    }

    const results = [];
    
    for (const [storeName, data] of Object.entries(backup.data)) {
      if (data && Array.isArray(data)) {
        try {
          // 既存データをクリア
          await this.clearStore(storeName);
          
          // バックアップデータを復元
          for (const item of data) {
            await this.add(storeName, item);
          }
          
          results.push({ storeName, status: 'success', count: data.length });
        } catch (error) {
          results.push({ storeName, status: 'error', error: error.message });
        }
      }
    }

    this._logOperation('restore', 'backups', backupId);
    return results;
  }

  // ストアのクリア
  async clearStore(storeName) {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => {
        this._logOperation('clear', storeName);
        resolve();
      };

      request.onerror = () => {
        console.error(`${storeName}のクリアエラー:`, request.error);
        reject(request.error);
      };
    });
  }

  // データベース統計の取得
  async getStatistics() {
    await this.initialize();
    const stats = {};
    const storeNames = ['orders', 'customers', 'products', 'settings', 'logs', 'backups'];

    for (const storeName of storeNames) {
      try {
        const data = await this.getAll(storeName);
        stats[storeName] = {
          count: data.length,
          size: this._estimateSize(data),
          lastModified: this._getLastModified(data)
        };
      } catch (error) {
        stats[storeName] = { error: error.message };
      }
    }

    return stats;
  }

  // データのエクスポート
  async exportData(storeNames = null, format = 'json') {
    const storesToExport = storeNames || ['orders', 'customers', 'products'];
    const exportData = {};

    for (const storeName of storesToExport) {
      exportData[storeName] = await this.getAll(storeName);
    }

    const exportObj = {
      timestamp: new Date().toISOString(),
      version: this.version,
      data: exportData
    };

    if (format === 'json') {
      return JSON.stringify(exportObj, null, 2);
    } else if (format === 'csv') {
      return this._convertToCSV(exportData);
    }

    return exportObj;
  }

  // データのインポート
  async importData(importData, options = {}) {
    const { overwrite = false, validate = true } = options;
    
    let parsedData;
    if (typeof importData === 'string') {
      parsedData = JSON.parse(importData);
    } else {
      parsedData = importData;
    }

    const results = [];

    for (const [storeName, items] of Object.entries(parsedData.data || parsedData)) {
      if (Array.isArray(items)) {
        for (const item of items) {
          try {
            if (validate) {
              // 基本的な検証
              if (!item.id) {
                item.id = this._generateId();
              }
            }

            if (overwrite) {
              await this.update(storeName, item);
            } else {
              await this.add(storeName, item);
            }
            
            results.push({ success: true, storeName, id: item.id });
          } catch (error) {
            results.push({ success: false, storeName, error: error.message, item });
          }
        }
      }
    }

    return results;
  }

  // ヘルパーメソッド
  _generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  _logOperation(operation, storeName, data = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      operation,
      storeName,
      data: data ? (typeof data === 'object' ? JSON.stringify(data) : String(data)) : null,
      level: 'info',
      type: 'database'
    };

    // ログストアに非同期で保存（エラーは無視）
    this.add('logs', logEntry).catch(() => {});
  }

  _estimateSize(data) {
    return JSON.stringify(data).length;
  }

  _getLastModified(data) {
    if (!data.length) return null;
    
    const timestamps = data
      .map(item => item.updatedAt || item.createdAt)
      .filter(timestamp => timestamp)
      .sort()
      .reverse();

    return timestamps[0] || null;
  }

  _convertToCSV(data) {
    // 簡易CSV変換実装
    const csvParts = [];
    
    for (const [storeName, items] of Object.entries(data)) {
      if (items.length > 0) {
        csvParts.push(`\n# ${storeName}`);
        const headers = Object.keys(items[0]);
        csvParts.push(headers.join(','));
        
        items.forEach(item => {
          const values = headers.map(header => {
            const value = item[header];
            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value || '');
          });
          csvParts.push(values.join(','));
        });
      }
    }
    
    return csvParts.join('\n');
  }

  // データベースの閉じる
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  // データベースの削除
  async deleteDatabase() {
    this.close();
    return new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDB(this.dbName);
      
      deleteRequest.onsuccess = () => {
        console.log('データベースが削除されました');
        resolve();
      };
      
      deleteRequest.onerror = () => {
        console.error('データベース削除エラー:', deleteRequest.error);
        reject(deleteRequest.error);
      };
    });
  }
}

// デフォルトのIndexedDBマネージャーインスタンス
export const dbManager = new IndexedDBManager();

// 初期化関数
export const initializeDatabase = async () => {
  try {
    await dbManager.initialize();
    console.log('データベースが正常に初期化されました');
    return true;
  } catch (error) {
    console.error('データベース初期化エラー:', error);
    return false;
  }
};