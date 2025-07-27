// WebSocket通信管理クラス - リアルタイム機能
export class WebSocketManager {
  constructor(url = null, options = {}) {
    this.url = url || this._getDefaultUrl();
    this.options = {
      reconnectAttempts: 5,
      reconnectInterval: 3000,
      heartbeatInterval: 30000,
      maxReconnectDelay: 30000,
      ...options
    };
    
    this.ws = null;
    this.isConnected = false;
    this.reconnectCount = 0;
    this.lastHeartbeat = null;
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    
    // イベントリスナー
    this.listeners = new Map();
    this.messageQueue = [];
    this.isReconnecting = false;
    
    // ユーザー情報
    this.userId = this._generateUserId();
    this.sessionId = this._generateSessionId();
    
    // 統計情報
    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      reconnectAttempts: 0,
      uptime: null,
      lastConnected: null
    };
  }

  // 接続の開始
  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log('WebSocket already connecting or connected');
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      try {
        console.log(`WebSocket接続を開始: ${this.url}`);
        this.ws = new WebSocket(this.url);
        
        this.ws.onopen = (event) => {
          this.isConnected = true;
          this.reconnectCount = 0;
          this.isReconnecting = false;
          this.stats.lastConnected = new Date();
          this.stats.uptime = Date.now();
          
          console.log('WebSocket接続成功');
          this._onOpen(event);
          this._startHeartbeat();
          this._flushMessageQueue();
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.stats.messagesReceived++;
          this._onMessage(event);
        };

        this.ws.onclose = (event) => {
          this.isConnected = false;
          this._onClose(event);
          this._stopHeartbeat();
          
          if (!event.wasClean && this.reconnectCount < this.options.reconnectAttempts) {
            this._scheduleReconnect();
          }
        };

        this.ws.onerror = (event) => {
          console.error('WebSocket接続エラー:', event);
          this._onError(event);
          reject(event);
        };

        // 接続タイムアウト
        setTimeout(() => {
          if (this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error('接続タイムアウト'));
          }
        }, 10000); // 10秒タイムアウト

      } catch (error) {
        console.error('WebSocket接続の初期化エラー:', error);
        reject(error);
      }
    });
  }

  // 接続の切断
  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this._stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Normal closure');
      this.ws = null;
    }
    
    this.isConnected = false;
    this.isReconnecting = false;
    this.messageQueue = [];
  }

  // メッセージの送信
  send(message) {
    const messageObj = {
      id: this._generateMessageId(),
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
      ...message
    };

    if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(messageObj));
        this.stats.messagesSent++;
        return true;
      } catch (error) {
        console.error('メッセージ送信エラー:', error);
        this.messageQueue.push(messageObj);
        return false;
      }
    } else {
      // 接続していない場合はキューに追加
      this.messageQueue.push(messageObj);
      return false;
    }
  }

  // イベントリスナーの登録
  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  // イベントリスナーの削除
  off(eventType, callback) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  // 特定のイベントタイプのリスナーをすべて削除
  removeAllListeners(eventType) {
    if (eventType) {
      this.listeners.delete(eventType);
    } else {
      this.listeners.clear();
    }
  }

  // プライベートメソッド
  _getDefaultUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws/cast-management`;
  }

  _generateUserId() {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  _onOpen(event) {
    // 接続成功時の認証
    this.send({
      type: 'auth',
      payload: {
        userId: this.userId,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      }
    });

    this._emit('connect', { event, userId: this.userId });
  }

  _onMessage(event) {
    try {
      const message = JSON.parse(event.data);
      
      // ハートビート応答の処理
      if (message.type === 'pong') {
        this.lastHeartbeat = Date.now();
        return;
      }

      // メッセージタイプに応じた処理
      this._handleMessage(message);
      
    } catch (error) {
      console.error('メッセージ解析エラー:', error);
    }
  }

  _onClose(event) {
    console.log('WebSocket接続が閉じられました:', event.code, event.reason);
    this._emit('disconnect', { event, code: event.code, reason: event.reason });
  }

  _onError(event) {
    console.error('WebSocketエラー:', event);
    this._emit('error', { event });
  }

  _handleMessage(message) {
    const { type, payload, userId, timestamp } = message;

    // 自分が送信したメッセージは無視
    if (userId === this.userId) {
      return;
    }

    switch (type) {
      case 'order_updated':
        this._emit('order_updated', { order: payload, userId, timestamp });
        break;
      case 'order_created':
        this._emit('order_created', { order: payload, userId, timestamp });
        break;
      case 'order_deleted':
        this._emit('order_deleted', { orderId: payload.id, userId, timestamp });
        break;
      case 'customer_updated':
        this._emit('customer_updated', { customer: payload, userId, timestamp });
        break;
      case 'product_updated':
        this._emit('product_updated', { product: payload, userId, timestamp });
        break;
      case 'user_joined':
        this._emit('user_joined', { userId: payload.userId, timestamp });
        break;
      case 'user_left':
        this._emit('user_left', { userId: payload.userId, timestamp });
        break;
      case 'notification':
        this._emit('notification', { ...payload, timestamp });
        break;
      case 'system_message':
        this._emit('system_message', { message: payload.message, level: payload.level, timestamp });
        break;
      default:
        this._emit('message', message);
    }
  }

  _emit(eventType, data) {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`イベント "${eventType}" のコールバック実行エラー:`, error);
        }
      });
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
        this.send({ type: 'ping', payload: { timestamp: Date.now() } });
        
        // ハートビートタイムアウトチェック
        if (this.lastHeartbeat && Date.now() - this.lastHeartbeat > this.options.heartbeatInterval * 2) {
          console.warn('ハートビートタイムアウト - 再接続を試行');
          this.ws.close();
        }
      }
    }, this.options.heartbeatInterval);
  }

  _stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  _scheduleReconnect() {
    if (this.isReconnecting) return;
    
    this.isReconnecting = true;
    this.reconnectCount++;
    this.stats.reconnectAttempts++;
    
    const delay = Math.min(
      this.options.reconnectInterval * Math.pow(2, this.reconnectCount - 1),
      this.options.maxReconnectDelay
    );

    console.log(`${delay}ms後に再接続を試行します (${this.reconnectCount}/${this.options.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.reconnectCount <= this.options.reconnectAttempts) {
        this.connect().catch(error => {
          console.error('再接続エラー:', error);
        });
      } else {
        console.error('最大再接続試行回数に達しました');
        this._emit('max_reconnect_attempts', { attempts: this.reconnectCount });
      }
    }, delay);
  }

  _flushMessageQueue() {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      this.send(message);
    }
  }

  // 統計情報の取得
  getStats() {
    return {
      ...this.stats,
      isConnected: this.isConnected,
      reconnectCount: this.reconnectCount,
      queuedMessages: this.messageQueue.length,
      uptime: this.stats.uptime ? Date.now() - this.stats.uptime : null
    };
  }

  // 接続状態の取得
  getConnectionState() {
    return {
      isConnected: this.isConnected,
      isReconnecting: this.isReconnecting,
      readyState: this.ws ? this.ws.readyState : WebSocket.CLOSED,
      userId: this.userId,
      sessionId: this.sessionId
    };
  }
}

// リアルタイムデータ同期クラス
export class RealtimeDataSync {
  constructor(websocketManager) {
    this.wsManager = websocketManager;
    this.dataListeners = new Map();
    this.conflictResolvers = new Map();
    
    // データタイプとイベントのマッピング
    this.eventMappings = {
      'orders': {
        create: 'order_created',
        update: 'order_updated',
        delete: 'order_deleted'
      },
      'customers': {
        create: 'customer_created',
        update: 'customer_updated',
        delete: 'customer_deleted'
      },
      'products': {
        create: 'product_created',
        update: 'product_updated',
        delete: 'product_deleted'
      }
    };

    this._setupEventListeners();
  }

  // データ変更の送信
  sendDataChange(dataType, operation, data) {
    const eventType = this.eventMappings[dataType]?.[operation];
    if (!eventType) {
      console.warn(`未知のデータタイプまたは操作: ${dataType}.${operation}`);
      return false;
    }

    return this.wsManager.send({
      type: eventType,
      payload: data
    });
  }

  // データリスナーの登録
  onDataChange(dataType, callback) {
    if (!this.dataListeners.has(dataType)) {
      this.dataListeners.set(dataType, []);
    }
    this.dataListeners.get(dataType).push(callback);
  }

  // 競合解決ハンドラーの設定
  setConflictResolver(dataType, resolver) {
    this.conflictResolvers.set(dataType, resolver);
  }

  // プライベートメソッド
  _setupEventListeners() {
    // 注文データの変更イベント
    this.wsManager.on('order_created', (data) => {
      this._handleDataChange('orders', 'create', data);
    });
    
    this.wsManager.on('order_updated', (data) => {
      this._handleDataChange('orders', 'update', data);
    });
    
    this.wsManager.on('order_deleted', (data) => {
      this._handleDataChange('orders', 'delete', data);
    });

    // 顧客データの変更イベント
    this.wsManager.on('customer_updated', (data) => {
      this._handleDataChange('customers', 'update', data);
    });

    // 製品データの変更イベント
    this.wsManager.on('product_updated', (data) => {
      this._handleDataChange('products', 'update', data);
    });
  }

  _handleDataChange(dataType, operation, data) {
    const listeners = this.dataListeners.get(dataType);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback({ dataType, operation, data });
        } catch (error) {
          console.error(`データ変更リスナーエラー (${dataType}.${operation}):`, error);
        }
      });
    }
  }
}

// 通知管理クラス
export class NotificationManager {
  constructor(websocketManager) {
    this.wsManager = websocketManager;
    this.notifications = [];
    this.maxNotifications = 100;
    this.listeners = [];
    
    this._setupEventListeners();
  }

  // 通知の送信
  sendNotification(notification) {
    return this.wsManager.send({
      type: 'notification',
      payload: {
        id: this._generateNotificationId(),
        ...notification,
        timestamp: new Date().toISOString()
      }
    });
  }

  // 通知リスナーの登録
  onNotification(callback) {
    this.listeners.push(callback);
  }

  // 通知履歴の取得
  getNotifications(limit = 20) {
    return this.notifications.slice(0, limit);
  }

  // 通知のクリア
  clearNotifications() {
    this.notifications = [];
  }

  // プライベートメソッド
  _setupEventListeners() {
    this.wsManager.on('notification', (data) => {
      this._handleNotification(data);
    });
  }

  _handleNotification(notification) {
    // 通知履歴に追加
    this.notifications.unshift(notification);
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    // リスナーに通知
    this.listeners.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('通知リスナーエラー:', error);
      }
    });
  }

  _generateNotificationId() {
    return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// デフォルトインスタンス（シングルトン）
export const wsManager = new WebSocketManager();
export const realtimeSync = new RealtimeDataSync(wsManager);
export const notificationManager = new NotificationManager(wsManager);

// 初期化関数
export const initializeWebSocket = async (url = null, options = {}) => {
  try {
    if (url) {
      wsManager.url = url;
    }
    
    await wsManager.connect();
    console.log('WebSocket接続が初期化されました');
    return true;
  } catch (error) {
    console.error('WebSocket初期化エラー:', error);
    return false;
  }
};