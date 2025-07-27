import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Truck, Package, CheckCircle, Clock, FileText, Printer, QrCode } from 'lucide-react';

const ShippingManagement = ({ orders, onUpdateOrder, customers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ready_to_ship');
  const [selectedOrders, setSelectedOrders] = useState([]);

  // 出荷可能な注文をフィルタリング
  const shippableOrders = useMemo(() => {
    let filtered = orders.filter(order => 
      order.status === 'completed' || 
      order.status === 'ready_to_ship' || 
      order.status === 'shipped'
    );

    // ステータスフィルター
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => {
        if (statusFilter === 'ready_to_ship') {
          return order.status === 'completed' || order.status === 'ready_to_ship';
        }
        return order.status === statusFilter;
      });
    }

    // 検索フィルター
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered.sort((a, b) => new Date(a.deliveryDate) - new Date(b.deliveryDate));
  }, [orders, statusFilter, searchTerm]);

  // 統計情報
  const stats = useMemo(() => {
    const readyToShip = orders.filter(o => o.status === 'completed' || o.status === 'ready_to_ship').length;
    const shipped = orders.filter(o => o.status === 'shipped').length;
    const urgent = orders.filter(o => {
      if (o.status === 'shipped') return false;
      const today = new Date();
      const delivery = new Date(o.deliveryDate);
      const daysDiff = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));
      return daysDiff <= 3 && (o.status === 'completed' || o.status === 'ready_to_ship');
    }).length;

    return { readyToShip, shipped, urgent };
  }, [orders]);

  // 出荷準備完了
  const handlePrepareShipping = (orderId) => {
    onUpdateOrder(orderId, { 
      status: 'ready_to_ship',
      shippingPreparedAt: new Date().toISOString(),
      shippingPreparedBy: 'current_user' // 実際のユーザーIDに置き換え
    });
  };

  // 出荷完了
  const handleShipOrder = (orderId) => {
    const trackingNumber = `TRK${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    onUpdateOrder(orderId, { 
      status: 'shipped',
      shippedAt: new Date().toISOString(),
      trackingNumber: trackingNumber,
      shippedBy: 'current_user' // 実際のユーザーIDに置き換え
    });
  };

  // 一括出荷
  const handleBulkShip = () => {
    if (selectedOrders.length === 0) {
      alert('出荷する注文を選択してください。');
      return;
    }
    
    if (window.confirm(`${selectedOrders.length}件の注文を一括出荷しますか？`)) {
      selectedOrders.forEach(orderId => {
        handleShipOrder(orderId);
      });
      setSelectedOrders([]);
    }
  };

  // 出荷ラベル印刷
  const handlePrintShippingLabel = (order) => {
    const customer = customers.find(c => c.companyName === order.customer) || {};
    
    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1>黒石鋳工所</h1>
          <h2>出荷ラベル</h2>
        </div>
        
        <div style="border: 2px solid #333; padding: 15px; margin-bottom: 20px;">
          <h3>配送先情報</h3>
          <p><strong>会社名:</strong> ${order.customer}</p>
          <p><strong>住所:</strong> ${customer.address || '住所未登録'}</p>
          <p><strong>担当者:</strong> ${customer.contactPerson || '担当者未登録'}</p>
          <p><strong>電話:</strong> ${customer.phone || '電話番号未登録'}</p>
        </div>
        
        <div style="border: 2px solid #333; padding: 15px; margin-bottom: 20px;">
          <h3>製品情報</h3>
          <p><strong>注文番号:</strong> ${order.orderNumber}</p>
          <p><strong>製品名:</strong> ${order.productName}</p>
          <p><strong>品番:</strong> ${order.productCode}</p>
          <p><strong>数量:</strong> ${order.quantity}個</p>
          <p><strong>重量:</strong> ${order.totalWeight}kg</p>
          <p><strong>材質:</strong> ${order.material}</p>
        </div>
        
        <div style="border: 2px solid #333; padding: 15px;">
          <h3>出荷情報</h3>
          <p><strong>出荷日:</strong> ${new Date().toLocaleDateString('ja-JP')}</p>
          <p><strong>納期:</strong> ${order.deliveryDate}</p>
          ${order.trackingNumber ? `<p><strong>追跡番号:</strong> ${order.trackingNumber}</p>` : ''}
          <p><strong>備考:</strong> ${order.notes || 'なし'}</p>
        </div>
      </div>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-blue-100 text-blue-800',
      ready_to_ship: 'bg-yellow-100 text-yellow-800',
      shipped: 'bg-green-100 text-green-800'
    };
    
    const labels = {
      completed: '製造完了',
      ready_to_ship: '出荷準備完了',
      shipped: '出荷済み'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getUrgencyBadge = (deliveryDate, status) => {
    if (status === 'shipped') return null;
    
    const today = new Date();
    const delivery = new Date(deliveryDate);
    const daysDiff = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      return <span className="px-2 py-1 bg-red-500 text-white rounded text-xs font-bold">遅延 {Math.abs(daysDiff)}日</span>;
    } else if (daysDiff <= 3) {
      return <span className="px-2 py-1 bg-orange-500 text-white rounded text-xs font-bold">緊急 {daysDiff}日</span>;
    }
    return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">残り {daysDiff}日</span>;
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-semibold mb-4">🚚 出荷管理</h2>
        
        {/* Statistics */}
        <div className="grid grid-cols-3 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.readyToShip}</div>
            <div className="text-sm opacity-90">出荷準備中</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.shipped}</div>
            <div className="text-sm opacity-90">出荷済み</div>
          </div>
          <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.urgent}</div>
            <div className="text-sm opacity-90">緊急出荷</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center mb-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="注文番号・製品名・顧客名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ready_to_ship">出荷準備中</option>
            <option value="shipped">出荷済み</option>
            <option value="all">すべて</option>
          </select>

          {selectedOrders.length > 0 && (
            <button
              onClick={handleBulkShip}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Truck className="w-4 h-4" />
              一括出荷 ({selectedOrders.length}件)
            </button>
          )}
        </div>
        
        <div className="text-sm text-gray-600">
          表示中: {shippableOrders.length}件
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-4 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedOrders(shippableOrders.map(o => o.id));
                    } else {
                      setSelectedOrders([]);
                    }
                  }}
                  checked={selectedOrders.length === shippableOrders.length && shippableOrders.length > 0}
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">注文番号</th>
              <th className="px-4 py-3 text-left text-sm font-medium">顧客名</th>
              <th className="px-4 py-3 text-left text-sm font-medium">製品名</th>
              <th className="px-4 py-3 text-left text-sm font-medium">数量</th>
              <th className="px-4 py-3 text-left text-sm font-medium">納期</th>
              <th className="px-4 py-3 text-left text-sm font-medium">ステータス</th>
              <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {shippableOrders.map((order) => (
              <tr key={order.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(order.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedOrders([...selectedOrders, order.id]);
                      } else {
                        setSelectedOrders(selectedOrders.filter(id => id !== order.id));
                      }
                    }}
                  />
                </td>
                <td className="px-4 py-3 text-sm font-mono">{order.orderNumber}</td>
                <td className="px-4 py-3 text-sm">{order.customer}</td>
                <td className="px-4 py-3 text-sm font-medium">{order.productName}</td>
                <td className="px-4 py-3 text-sm">{order.quantity}個</td>
                <td className="px-4 py-3 text-sm">
                  <div>{order.deliveryDate}</div>
                  <div>{getUrgencyBadge(order.deliveryDate, order.status)}</div>
                </td>
                <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    {order.status === 'completed' && (
                      <button
                        onClick={() => handlePrepareShipping(order.id)}
                        className="text-yellow-600 hover:text-yellow-800 p-1 rounded transition-colors"
                        title="出荷準備"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                    )}
                    {order.status === 'ready_to_ship' && (
                      <button
                        onClick={() => handleShipOrder(order.id)}
                        className="text-green-600 hover:text-green-800 p-1 rounded transition-colors"
                        title="出荷完了"
                      >
                        <Truck className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handlePrintShippingLabel(order)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                      title="出荷ラベル印刷"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    {order.trackingNumber && (
                      <button
                        onClick={() => alert(`追跡番号: ${order.trackingNumber}`)}
                        className="text-purple-600 hover:text-purple-800 p-1 rounded transition-colors"
                        title="追跡番号"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shippableOrders.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <Truck className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <p>出荷可能な注文がありません</p>
        </div>
      )}
    </div>
  );
};

export default ShippingManagement;