import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit, Trash2, Search, Filter, Download, Save, X } from 'lucide-react';

const OrderManagement = ({ orders, onFilter, onAdd, onUpdate, onDelete, allOrders }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [materialFilter, setMaterialFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState(null);
  const [newOrder, setNewOrder] = useState({
    orderNumber: '',
    customer: '',
    productCode: '',
    productName: '',
    material: 'S14',
    unitWeight: 0,
    quantity: 1,
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    status: 'pending',
    notes: ''
  });

  // Apply filters
  useEffect(() => {
    let filtered = allOrders;

    // Material filter
    if (materialFilter !== 'all') {
      filtered = filtered.filter(order => order.material === materialFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(order =>
        order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    onFilter(filtered);
  }, [allOrders, materialFilter, statusFilter, searchTerm, onFilter]);

  const handleAddOrder = useCallback(() => {
    const orderData = {
      ...newOrder,
      totalWeight: newOrder.unitWeight * newOrder.quantity
    };
    onAdd(orderData);
    setIsAddModalOpen(false);
    resetNewOrder();
  }, [newOrder, onAdd]);

  const handleEditOrder = useCallback((order) => {
    setEditingOrder({ ...order });
    setIsEditModalOpen(true);
  }, []);

  const handleUpdateOrder = useCallback(() => {
    const updatedOrder = {
      ...editingOrder,
      totalWeight: editingOrder.unitWeight * editingOrder.quantity
    };
    onUpdate(editingOrder.id, updatedOrder);
    setIsEditModalOpen(false);
    setEditingOrder(null);
  }, [editingOrder, onUpdate]);

  const handleDeleteOrder = useCallback((orderId) => {
    if (window.confirm('この注文を削除しますか？')) {
      onDelete(orderId);
    }
  }, [onDelete]);

  const resetNewOrder = () => {
    setNewOrder({
      orderNumber: '',
      customer: '',
      productCode: '',
      productName: '',
      material: 'S14',
      unitWeight: 0,
      quantity: 1,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      status: 'pending',
      notes: ''
    });
  };

  const exportToCSV = () => {
    const headers = ['注文番号', '顧客名', '品番', '品名', '材質', '単重量', '数量', '総重量', '注文日', '納期', 'ステータス', '備考'];
    const csvData = orders.map(order => [
      order.orderNumber,
      order.customer,
      order.productCode,
      order.productName,
      order.material,
      order.unitWeight,
      order.quantity,
      order.totalWeight,
      order.orderDate,
      order.deliveryDate,
      order.status,
      order.notes
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `orders_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-orange-500 text-white',
      processing: 'bg-blue-500 text-white',
      completed: 'bg-green-500 text-white'
    };
    
    const labels = {
      pending: '未着手',
      processing: '進行中',
      completed: '完了'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status] || 'bg-gray-500 text-white'}`}>
        {labels[status] || status}
      </span>
    );
  };

  const getMaterialBadge = (material) => {
    const styles = {
      S14: 'bg-blue-100 text-blue-800',
      SCS: 'bg-green-100 text-green-800',
      SUS304: 'bg-yellow-100 text-yellow-800',
      SUS316: 'bg-purple-100 text-purple-800',
      FCD400: 'bg-red-100 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${styles[material] || 'bg-gray-100 text-gray-800'}`}>
        {material}
      </span>
    );
  };

  const getUrgencyIndicator = (deliveryDate, status) => {
    if (status === 'completed') return null;
    
    const today = new Date();
    const delivery = new Date(deliveryDate);
    const daysDiff = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));
    
    if (daysDiff < 0) {
      return <span className="text-red-600 font-bold">⚠️ 遅延 ({Math.abs(daysDiff)}日)</span>;
    } else if (daysDiff <= 7) {
      return <span className="text-orange-600 font-bold">🔥 緊急 ({daysDiff}日)</span>;
    }
    return <span className="text-gray-600">{daysDiff}日</span>;
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">📦 注文管理</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              新規注文追加
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
            >
              <Download className="w-4 h-4" />
              CSV出力
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="mt-4 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={materialFilter}
              onChange={(e) => setMaterialFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべての材質</option>
              <option value="S14">S14</option>
              <option value="SCS">SCS</option>
              <option value="SUS304">SUS304</option>
              <option value="SUS316">SUS316</option>
              <option value="FCD400">FCD400</option>
            </select>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">すべてのステータス</option>
            <option value="pending">未着手</option>
            <option value="processing">進行中</option>
            <option value="completed">完了</option>
          </select>
          
          <button
            onClick={() => {
              setSearchTerm('');
              setMaterialFilter('all');
              setStatusFilter('all');
            }}
            className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            リセット
          </button>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          表示中: {orders.length}件 / 全{allOrders.length}件
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">注文番号</th>
              <th className="px-4 py-3 text-left text-sm font-medium">顧客名</th>
              <th className="px-4 py-3 text-left text-sm font-medium">品番</th>
              <th className="px-4 py-3 text-left text-sm font-medium">品名</th>
              <th className="px-4 py-3 text-left text-sm font-medium">材質</th>
              <th className="px-4 py-3 text-left text-sm font-medium">単重量</th>
              <th className="px-4 py-3 text-left text-sm font-medium">数量</th>
              <th className="px-4 py-3 text-left text-sm font-medium">総重量</th>
              <th className="px-4 py-3 text-left text-sm font-medium">注文日</th>
              <th className="px-4 py-3 text-left text-sm font-medium">納期</th>
              <th className="px-4 py-3 text-left text-sm font-medium">ステータス</th>
              <th className="px-4 py-3 text-left text-sm font-medium">備考</th>
              <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const today = new Date();
              const delivery = new Date(order.deliveryDate);
              const daysDiff = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));
              const isUrgent = daysDiff <= 7 && order.status !== 'completed';
              const isOverdue = daysDiff < 0 && order.status !== 'completed';
              
              return (
                <tr 
                  key={order.id} 
                  className={`border-b hover:bg-gray-50 transition-colors ${
                    isOverdue ? 'bg-red-50' : 
                    isUrgent ? 'bg-yellow-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-sm font-mono">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-sm">{order.customer}</td>
                  <td className="px-4 py-3 text-sm font-mono bg-gray-50">{order.productCode}</td>
                  <td className="px-4 py-3 text-sm">{order.productName}</td>
                  <td className="px-4 py-3">{getMaterialBadge(order.material)}</td>
                  <td className="px-4 py-3 text-sm">{order.unitWeight}kg</td>
                  <td className="px-4 py-3 text-sm">{order.quantity}個</td>
                  <td className="px-4 py-3 text-sm font-bold">{order.totalWeight}kg</td>
                  <td className="px-4 py-3 text-sm">{order.orderDate}</td>
                  <td className="px-4 py-3 text-sm">
                    <div>{order.deliveryDate}</div>
                    <div>{getUrgencyIndicator(order.deliveryDate, order.status)}</div>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 max-w-32 truncate" title={order.notes}>
                    {order.notes}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditOrder(order)}
                        className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                        title="編集"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(order.id)}
                        className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-green-500 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-6 h-6" />
                新規注文追加
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); resetNewOrder(); }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">注文番号</label>
                  <input
                    type="text"
                    value={newOrder.orderNumber}
                    onChange={(e) => setNewOrder({...newOrder, orderNumber: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">顧客名 *</label>
                  <input
                    type="text"
                    value={newOrder.customer}
                    onChange={(e) => setNewOrder({...newOrder, customer: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">品番</label>
                  <input
                    type="text"
                    value={newOrder.productCode}
                    onChange={(e) => setNewOrder({...newOrder, productCode: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">品名 *</label>
                  <input
                    type="text"
                    value={newOrder.productName}
                    onChange={(e) => setNewOrder({...newOrder, productName: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">材質</label>
                  <select
                    value={newOrder.material}
                    onChange={(e) => setNewOrder({...newOrder, material: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="S14">S14</option>
                    <option value="SCS">SCS</option>
                    <option value="SUS304">SUS304</option>
                    <option value="SUS316">SUS316</option>
                    <option value="FCD400">FCD400</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">単重量 (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newOrder.unitWeight}
                    onChange={(e) => setNewOrder({...newOrder, unitWeight: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">数量 *</label>
                  <input
                    type="number"
                    value={newOrder.quantity}
                    onChange={(e) => setNewOrder({...newOrder, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">注文日</label>
                  <input
                    type="date"
                    value={newOrder.orderDate}
                    onChange={(e) => setNewOrder({...newOrder, orderDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">納期 *</label>
                  <input
                    type="date"
                    value={newOrder.deliveryDate}
                    onChange={(e) => setNewOrder({...newOrder, deliveryDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">備考</label>
                <textarea
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({...newOrder, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="3"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => { setIsAddModalOpen(false); resetNewOrder(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddOrder}
                  disabled={!newOrder.customer || !newOrder.productName || !newOrder.unitWeight || !newOrder.deliveryDate}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  注文追加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-blue-500 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Edit className="w-6 h-6" />
                注文編集
              </h3>
              <button 
                onClick={() => { setIsEditModalOpen(false); setEditingOrder(null); }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">注文番号</label>
                  <input
                    type="text"
                    value={editingOrder.orderNumber}
                    onChange={(e) => setEditingOrder({...editingOrder, orderNumber: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">顧客名</label>
                  <input
                    type="text"
                    value={editingOrder.customer}
                    onChange={(e) => setEditingOrder({...editingOrder, customer: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">品番</label>
                  <input
                    type="text"
                    value={editingOrder.productCode}
                    onChange={(e) => setEditingOrder({...editingOrder, productCode: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">品名</label>
                  <input
                    type="text"
                    value={editingOrder.productName}
                    onChange={(e) => setEditingOrder({...editingOrder, productName: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">材質</label>
                  <select
                    value={editingOrder.material}
                    onChange={(e) => setEditingOrder({...editingOrder, material: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="S14">S14</option>
                    <option value="SCS">SCS</option>
                    <option value="SUS304">SUS304</option>
                    <option value="SUS316">SUS316</option>
                    <option value="FCD400">FCD400</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">単重量 (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingOrder.unitWeight}
                    onChange={(e) => setEditingOrder({...editingOrder, unitWeight: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">数量</label>
                  <input
                    type="number"
                    value={editingOrder.quantity}
                    onChange={(e) => setEditingOrder({...editingOrder, quantity: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ステータス</label>
                  <select
                    value={editingOrder.status}
                    onChange={(e) => setEditingOrder({...editingOrder, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pending">未着手</option>
                    <option value="processing">進行中</option>
                    <option value="completed">完了</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">注文日</label>
                  <input
                    type="date"
                    value={editingOrder.orderDate}
                    onChange={(e) => setEditingOrder({...editingOrder, orderDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">納期</label>
                  <input
                    type="date"
                    value={editingOrder.deliveryDate}
                    onChange={(e) => setEditingOrder({...editingOrder, deliveryDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">備考</label>
                <textarea
                  value={editingOrder.notes}
                  onChange={(e) => setEditingOrder({...editingOrder, notes: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => { setIsEditModalOpen(false); setEditingOrder(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateOrder}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderManagement;