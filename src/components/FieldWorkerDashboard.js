import React, { useState, useMemo } from 'react';
import { Clock, Package, CheckCircle, User, LogOut, Filter, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const FieldWorkerDashboard = ({ orders, products, onUpdateOrder }) => {
  const { currentUser, logout } = useAuth();
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 現在のユーザーが担当している注文をフィルタリング
  const myOrders = useMemo(() => {
    if (!orders || !currentUser?.id) return [];
    let filtered = orders.filter(order => order && order.assignedWorker === currentUser?.id);
    
    // ステータスフィルター
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }
    
    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.productCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // 納期順でソート
    return filtered.sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate));
  }, [orders, currentUser?.id, statusFilter, searchTerm]);

  // 統計情報
  const stats = useMemo(() => {
    if (!orders || !currentUser?.id) {
      return { total: 0, pending: 0, processing: 0, urgent: 0 };
    }
    
    const myAllOrders = orders.filter(order => order && order.assignedWorker === currentUser?.id);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return {
      total: myAllOrders.length,
      pending: myAllOrders.filter(o => o && o.status === 'pending').length,
      processing: myAllOrders.filter(o => o && o.status === 'processing').length,
      urgent: myAllOrders.filter(o => {
        if (!o || !o.deliveryDate || o.status === 'completed') return false;
        const deliveryDate = new Date(o.deliveryDate);
        if (isNaN(deliveryDate.getTime())) return false;
        const daysDiff = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
        return daysDiff <= 7;
      }).length
    };
  }, [orders, currentUser?.id]);

  const handleStatusUpdate = (orderId, newStatus) => {
    onUpdateOrder(orderId, { status: newStatus });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-orange-500';
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return '未着手';
      case 'processing': return '作業中';
      case 'completed': return '完了';
      default: return status;
    }
  };

  const getUrgencyInfo = (deliveryDate) => {
    if (!deliveryDate) {
      return { text: '納期未設定', color: 'text-gray-400', bg: 'bg-gray-50' };
    }
    
    const today = new Date();
    const delivery = new Date(deliveryDate);
    
    // 日付が無効な場合の処理
    if (isNaN(delivery.getTime())) {
      return { text: '無効な日付', color: 'text-gray-400', bg: 'bg-gray-50' };
    }
    
    const daysDiff = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      return { text: `遅延 ${Math.abs(daysDiff)}日`, color: 'text-red-600', bg: 'bg-red-50' };
    } else if (daysDiff <= 7) {
      return { text: `残り ${daysDiff}日`, color: 'text-orange-600', bg: 'bg-orange-50' };
    }
    return { text: `残り ${daysDiff}日`, color: 'text-gray-600', bg: 'bg-gray-50' };
  };

  const getProductInfo = (productCode) => {
    if (!productCode || !products) return {};
    const product = products.find(p => p && p.productCode === productCode);
    return product || {};
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold">🏭</span>
            </div>
            <div>
              <h1 className="text-xl font-bold">黒石鋳工所 現場作業画面</h1>
              <p className="text-sm opacity-90">
                <User className="w-4 h-4 inline mr-1" />
                {currentUser?.name} ({currentUser?.department})
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-2 bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            ログアウト
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4">
        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                <div className="text-sm text-gray-600">総件数</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-600" />
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.pending}</div>
                <div className="text-sm text-gray-600">未着手</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-bold">作</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.processing}</div>
                <div className="text-sm text-gray-600">作業中</div>
              </div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <span className="text-red-600 font-bold">急</span>
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-800">{stats.urgent}</div>
                <div className="text-sm text-gray-600">緊急</div>
              </div>
            </div>
          </div>
        </div>

        {/* フィルター */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="製品名・品番で検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">全てのステータス</option>
                <option value="pending">未着手</option>
                <option value="processing">作業中</option>
                <option value="completed">完了</option>
              </select>
            </div>
            <div className="text-sm text-gray-600">
              表示中: {myOrders.length}件
            </div>
          </div>
        </div>

        {/* 注文カード一覧 */}
        <div className="space-y-4">
          {myOrders.length === 0 ? (
            <div className="bg-white p-8 rounded-lg shadow-md text-center">
              <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">担当案件がありません</h3>
              <p className="text-gray-600">
                {statusFilter !== 'all' ? 'フィルター条件' : '検索条件'}に一致する案件がありません。
              </p>
            </div>
          ) : (
            myOrders.map((order) => {
              const productInfo = getProductInfo(order.productCode);
              const urgencyInfo = getUrgencyInfo(order.deliveryDate);
              
              return (
                <div
                  key={order.id}
                  className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                    urgencyInfo.color.includes('red') ? 'border-red-500' :
                    urgencyInfo.color.includes('orange') ? 'border-orange-500' :
                    'border-gray-300'
                  }`}
                >
                  {/* カードヘッダー */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-800 mb-1">
                        {order.productName}
                      </h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {order.productCode}
                        </span>
                        <span>{order.material}</span>
                        <span>{order.unitWeight}kg × {order.quantity}個</span>
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-bold ${urgencyInfo.bg} ${urgencyInfo.color}`}>
                      {urgencyInfo.text}
                    </div>
                  </div>

                  {/* 詳細情報 */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">納期</div>
                      <div className="font-medium">{order.deliveryDate}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500 mb-1">総重量</div>
                      <div className="font-medium">{order.totalWeight}kg</div>
                    </div>
                    {productInfo.category && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">カテゴリ</div>
                        <div className="font-medium">{productInfo.category}</div>
                      </div>
                    )}
                    {order.notes && (
                      <div>
                        <div className="text-xs text-gray-500 mb-1">備考</div>
                        <div className="font-medium text-sm">{order.notes}</div>
                      </div>
                    )}
                  </div>

                  {/* ステータス更新 */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">ステータス:</span>
                      <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'processing')}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          作業開始
                        </button>
                      )}
                      {order.status === 'processing' && (
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'completed')}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium"
                        >
                          完了
                        </button>
                      )}
                      {order.status === 'completed' && (
                        <span className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          完了済み
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default FieldWorkerDashboard;