// WebSocket通信用のReact Hooks
import { useState, useEffect, useCallback, useRef } from 'react';
import { wsManager, realtimeSync, notificationManager } from '../utils/websocket-manager';

// 基本WebSocket接続Hook
export const useWebSocket = (url = null, options = {}) => {
  const [connectionState, setConnectionState] = useState({
    isConnected: false,
    isConnecting: false,
    error: null,
    reconnectCount: 0
  });
  
  const [stats, setStats] = useState({});
  const connectPromise = useRef(null);

  // WebSocketイベントリスナーの設定
  useEffect(() => {
    const updateConnectionState = () => {
      const state = wsManager.getConnectionState();
      setConnectionState({
        isConnected: state.isConnected,
        isConnecting: state.isReconnecting,
        error: null,
        reconnectCount: state.reconnectCount || 0
      });
    };

    const updateStats = () => {
      setStats(wsManager.getStats());
    };

    // イベントリスナーの登録
    wsManager.on('connect', updateConnectionState);
    wsManager.on('disconnect', updateConnectionState);
    wsManager.on('error', (data) => {
      setConnectionState(prev => ({
        ...prev,
        error: data.event,
        isConnecting: false
      }));
    });
    wsManager.on('max_reconnect_attempts', () => {
      setConnectionState(prev => ({
        ...prev,
        error: new Error('最大再接続試行回数に達しました'),
        isConnecting: false
      }));
    });

    // 統計情報の定期更新
    const statsInterval = setInterval(updateStats, 5000);
    updateConnectionState();
    updateStats();

    return () => {
      clearInterval(statsInterval);
      wsManager.removeAllListeners('connect');
      wsManager.removeAllListeners('disconnect');
      wsManager.removeAllListeners('error');
      wsManager.removeAllListeners('max_reconnect_attempts');
    };
  }, []);

  // 接続開始
  const connect = useCallback(async (customUrl = null) => {
    if (connectPromise.current) {
      return connectPromise.current;
    }

    setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      if (customUrl || url) {
        wsManager.url = customUrl || url;
      }
      
      connectPromise.current = wsManager.connect();
      await connectPromise.current;
      
    } catch (error) {
      setConnectionState(prev => ({
        ...prev,
        error,
        isConnecting: false
      }));
      throw error;
    } finally {
      connectPromise.current = null;
    }
  }, [url]);

  // 接続切断
  const disconnect = useCallback(() => {
    wsManager.disconnect();
    setConnectionState(prev => ({
      ...prev,
      isConnected: false,
      isConnecting: false
    }));
  }, []);

  // メッセージ送信
  const sendMessage = useCallback((message) => {
    return wsManager.send(message);
  }, []);

  // 自動接続
  useEffect(() => {
    if (options.autoConnect !== false) {
      connect().catch(error => {
        console.warn('自動接続に失敗しました:', error);
      });
    }

    return () => {
      if (options.disconnectOnUnmount !== false) {
        disconnect();
      }
    };
  }, [connect, disconnect, options.autoConnect, options.disconnectOnUnmount]);

  return {
    connectionState,
    stats,
    connect,
    disconnect,
    sendMessage
  };
};

// リアルタイムデータ同期Hook
export const useRealtimeData = (dataType, initialData = []) => {
  const [data, setData] = useState(initialData);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [conflicts, setConflicts] = useState([]);
  
  const { connectionState } = useWebSocket();

  // データ変更の送信
  const broadcastChange = useCallback((operation, itemData) => {
    if (connectionState.isConnected) {
      const success = realtimeSync.sendDataChange(dataType, operation, itemData);
      if (!success) {
        console.warn(`${dataType}の${operation}操作をブロードキャストできませんでした`);
      }
      return success;
    }
    return false;
  }, [dataType, connectionState.isConnected]);

  // リモートデータ変更の受信
  useEffect(() => {
    const handleDataChange = ({ dataType: changedDataType, operation, data: changeData }) => {
      if (changedDataType !== dataType) return;

      setLastUpdate(new Date());

      switch (operation) {
        case 'create':
          setData(prevData => {
            // 重複チェック
            const exists = prevData.some(item => item.id === changeData.order?.id || changeData.customer?.id || changeData.product?.id);
            if (!exists) {
              return [...prevData, changeData.order || changeData.customer || changeData.product];
            }
            return prevData;
          });
          break;

        case 'update':
          setData(prevData => {
            const updatedItem = changeData.order || changeData.customer || changeData.product;
            return prevData.map(item => {
              if (item.id === updatedItem.id) {
                // 競合チェック（タイムスタンプ比較）
                const localTime = new Date(item.updatedAt || item.createdAt);
                const remoteTime = new Date(updatedItem.updatedAt || updatedItem.createdAt);
                
                if (remoteTime >= localTime) {
                  return updatedItem;
                } else {
                  // 競合発生
                  setConflicts(prev => [...prev, {
                    id: item.id,
                    local: item,
                    remote: updatedItem,
                    timestamp: new Date()
                  }]);
                  return item;
                }
              }
              return item;
            });
          });
          break;

        case 'delete':
          setData(prevData => 
            prevData.filter(item => item.id !== changeData.orderId)
          );
          break;

        default:
          console.warn(`未知の操作: ${operation}`);
      }
    };

    realtimeSync.onDataChange(dataType, handleDataChange);

    return () => {
      // クリーンアップ（実際の実装では適切なリスナー削除が必要）
    };
  }, [dataType]);

  // ローカルデータの更新（ブロードキャスト付き）
  const updateData = useCallback((newData, operation = 'update') => {
    setData(newData);
    
    // 差分を計算してブロードキャスト
    if (Array.isArray(newData)) {
      // 配列の場合は全体を更新（詳細な差分計算は省略）
      newData.forEach(item => {
        broadcastChange(operation, item);
      });
    } else {
      // 単一アイテムの場合
      broadcastChange(operation, newData);
    }
  }, [broadcastChange]);

  // 競合の解決
  const resolveConflict = useCallback((conflictId, resolution) => {
    setConflicts(prev => prev.filter(conflict => conflict.id !== conflictId));
    
    if (resolution.action === 'use_remote') {
      setData(prevData => 
        prevData.map(item => 
          item.id === conflictId ? resolution.data : item
        )
      );
    }
    // 'use_local'の場合は何もしない
  }, []);

  return {
    data,
    lastUpdate,
    conflicts,
    updateData,
    broadcastChange,
    resolveConflict,
    isConnected: connectionState.isConnected
  };
};

// 通知管理Hook
export const useNotifications = (options = {}) => {
  const { maxNotifications = 50, autoMarkAsRead = false } = options;
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const { connectionState } = useWebSocket();

  // 通知の受信
  useEffect(() => {
    const handleNotification = (notification) => {
      setNotifications(prev => {
        const updated = [{ ...notification, read: autoMarkAsRead }, ...prev];
        return updated.slice(0, maxNotifications);
      });

      if (!autoMarkAsRead) {
        setUnreadCount(prev => prev + 1);
      }

      // ブラウザ通知（権限がある場合）
      if (Notification.permission === 'granted' && notification.type === 'urgent') {
        new Notification(notification.title || '重要な通知', {
          body: notification.message,
          icon: '/favicon.ico'
        });
      }
    };

    notificationManager.onNotification(handleNotification);

    // 初期通知の読み込み
    const existingNotifications = notificationManager.getNotifications(maxNotifications);
    setNotifications(existingNotifications);

    return () => {
      // クリーンアップ（実際の実装では適切なリスナー削除が必要）
    };
  }, [maxNotifications, autoMarkAsRead]);

  // 通知の送信
  const sendNotification = useCallback((notification) => {
    if (connectionState.isConnected) {
      return notificationManager.sendNotification(notification);
    }
    return false;
  }, [connectionState.isConnected]);

  // 通知を既読に
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // すべての通知を既読に
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
    setUnreadCount(0);
  }, []);

  // 通知のクリア
  const clearNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
    notificationManager.clearNotifications();
  }, []);

  // ブラウザ通知の許可要求
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }, []);

  return {
    notifications,
    unreadCount,
    sendNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    requestNotificationPermission,
    isConnected: connectionState.isConnected
  };
};

// リアルタイム注文管理Hook
export const useRealtimeOrders = (initialOrders = []) => {
  const {
    data: orders,
    lastUpdate,
    conflicts,
    updateData,
    broadcastChange,
    resolveConflict,
    isConnected
  } = useRealtimeData('orders', initialOrders);

  // 注文の追加
  const addOrder = useCallback((orderData) => {
    const newOrder = {
      ...orderData,
      id: orderData.id || `order_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    updateData([...orders, newOrder], 'create');
    return newOrder;
  }, [orders, updateData]);

  // 注文の更新
  const updateOrder = useCallback((orderId, updates) => {
    const updatedOrders = orders.map(order => 
      order.id === orderId 
        ? { ...order, ...updates, updatedAt: new Date().toISOString() }
        : order
    );
    
    updateData(updatedOrders);
    return updatedOrders.find(order => order.id === orderId);
  }, [orders, updateData]);

  // 注文の削除
  const deleteOrder = useCallback((orderId) => {
    const filteredOrders = orders.filter(order => order.id !== orderId);
    updateData(filteredOrders, 'delete');
    broadcastChange('delete', { orderId });
  }, [orders, updateData, broadcastChange]);

  // ステータス更新のブロードキャスト
  const updateOrderStatus = useCallback((orderId, newStatus) => {
    const updatedOrder = updateOrder(orderId, { status: newStatus });
    
    // 重要なステータス変更は通知として送信
    if (['completed', 'cancelled'].includes(newStatus)) {
      broadcastChange('status_changed', {
        orderId,
        status: newStatus,
        orderNumber: updatedOrder?.orderNumber
      });
    }

    return updatedOrder;
  }, [updateOrder, broadcastChange]);

  return {
    orders,
    lastUpdate,
    conflicts,
    isConnected,
    addOrder,
    updateOrder,
    deleteOrder,
    updateOrderStatus,
    resolveConflict
  };
};

// オンラインユーザー追跡Hook
export const useOnlineUsers = () => {
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [userActivities, setUserActivities] = useState(new Map());
  
  const { connectionState, sendMessage } = useWebSocket();

  useEffect(() => {
    const handleUserJoined = ({ userId, timestamp }) => {
      setOnlineUsers(prev => new Set([...prev, userId]));
      setUserActivities(prev => new Map([...prev, [userId, { lastSeen: timestamp, status: 'online' }]]));
    };

    const handleUserLeft = ({ userId, timestamp }) => {
      setOnlineUsers(prev => {
        const updated = new Set(prev);
        updated.delete(userId);
        return updated;
      });
      setUserActivities(prev => {
        const updated = new Map(prev);
        updated.set(userId, { lastSeen: timestamp, status: 'offline' });
        return updated;
      });
    };

    wsManager.on('user_joined', handleUserJoined);
    wsManager.on('user_left', handleUserLeft);

    return () => {
      wsManager.off('user_joined', handleUserJoined);
      wsManager.off('user_left', handleUserLeft);
    };
  }, []);

  // 自分の活動状況を送信
  const updateActivity = useCallback((activity) => {
    if (connectionState.isConnected) {
      sendMessage({
        type: 'user_activity',
        payload: {
          activity,
          timestamp: new Date().toISOString()
        }
      });
    }
  }, [connectionState.isConnected, sendMessage]);

  return {
    onlineUsers: Array.from(onlineUsers),
    userActivities: Object.fromEntries(userActivities),
    updateActivity,
    isConnected: connectionState.isConnected
  };
};

// システム監視Hook
export const useSystemMonitoring = () => {
  const [systemStatus, setSystemStatus] = useState({
    server: 'unknown',
    database: 'unknown',
    lastCheck: null
  });
  
  const { connectionState } = useWebSocket();

  useEffect(() => {
    const handleSystemMessage = ({ message, level, timestamp }) => {
      console.log(`[${level.toUpperCase()}] ${message}`);
      
      if (message.includes('server')) {
        setSystemStatus(prev => ({
          ...prev,
          server: level === 'error' ? 'error' : 'ok',
          lastCheck: timestamp
        }));
      }
    };

    wsManager.on('system_message', handleSystemMessage);

    return () => {
      wsManager.off('system_message', handleSystemMessage);
    };
  }, []);

  // システム状態の要求
  const requestSystemStatus = useCallback(() => {
    if (connectionState.isConnected) {
      wsManager.send({
        type: 'system_status_request',
        payload: { timestamp: new Date().toISOString() }
      });
    }
  }, [connectionState.isConnected]);

  return {
    systemStatus,
    requestSystemStatus,
    isConnected: connectionState.isConnected
  };
};