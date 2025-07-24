import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Save, X, Building, User, Phone, Mail } from 'lucide-react';

const CustomerManagement = ({ customers, onFilter, onAdd, onUpdate, onDelete, allCustomers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    customerCode: '',
    companyName: '',
    contactPerson: '',
    department: '',
    phone: '',
    email: '',
    address: '',
    paymentTerms: '月末締め翌月末払い',
    creditLimit: 0,
    taxType: '外税',
    status: 'active'
  });

  // Apply filters
  useEffect(() => {
    let filtered = allCustomers;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(customer => customer.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.customerCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.contactPerson && customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    onFilter(filtered);
  }, [allCustomers, statusFilter, searchTerm, onFilter]);

  const handleAddCustomer = useCallback(() => {
    if (!newCustomer.customerCode || !newCustomer.companyName) {
      alert('必須項目（*）を全て入力してください。');
      return;
    }

    if (allCustomers.find(c => c.customerCode === newCustomer.customerCode)) {
      alert('この取引先コードは既に存在します。');
      return;
    }

    if (newCustomer.email && !newCustomer.email.includes('@')) {
      alert('正しいメールアドレス形式で入力してください。');
      return;
    }

    const customerData = {
      ...newCustomer,
      id: Date.now(),
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0]
    };

    onAdd(customerData);
    setIsAddModalOpen(false);
    resetNewCustomer();
  }, [newCustomer, onAdd, allCustomers]);

  const handleEditCustomer = useCallback((customer) => {
    setEditingCustomer({ ...customer });
    setIsEditModalOpen(true);
  }, []);

  const handleUpdateCustomer = useCallback(() => {
    if (!editingCustomer.customerCode || !editingCustomer.companyName) {
      alert('必須項目（*）を全て入力してください。');
      return;
    }

    if (editingCustomer.email && !editingCustomer.email.includes('@')) {
      alert('正しいメールアドレス形式で入力してください。');
      return;
    }

    const updatedCustomer = {
      ...editingCustomer,
      updatedDate: new Date().toISOString().split('T')[0]
    };

    onUpdate(editingCustomer.id, updatedCustomer);
    setIsEditModalOpen(false);
    setEditingCustomer(null);
  }, [editingCustomer, onUpdate]);

  const handleDeleteCustomer = useCallback((customerId) => {
    const customer = allCustomers.find(c => c.id === customerId);
    if (window.confirm(`取引先「${customer?.companyName}」を削除しますか？`)) {
      onDelete(customerId);
    }
  }, [onDelete, allCustomers]);

  const resetNewCustomer = () => {
    setNewCustomer({
      customerCode: '',
      companyName: '',
      contactPerson: '',
      department: '',
      phone: '',
      email: '',
      address: '',
      paymentTerms: '月末締め翌月末払い',
      creditLimit: 0,
      taxType: '外税',
      status: 'active'
    });
  };

  const exportToCSV = () => {
    const headers = ['取引先コード', '会社名', '担当者', '部署', '電話番号', 'メール', '住所', '支払条件', 'ステータス'];
    const csvData = customers.map(customer => [
      customer.customerCode,
      customer.companyName,
      customer.contactPerson,
      customer.department,
      customer.phone,
      customer.email,
      customer.address,
      customer.paymentTerms,
      customer.status
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field || ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `customers_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${
        status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
      }`}>
        {status === 'active' ? 'アクティブ' : '非アクティブ'}
      </span>
    );
  };

  // Calculate statistics
  const stats = {
    totalCustomers: customers.length,
    activeCustomers: customers.filter(c => c.status === 'active').length,
    contactRegistered: customers.filter(c => c.email).length,
    phoneRegistered: customers.filter(c => c.phone).length
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Statistics Dashboard */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-semibold mb-4">🏢 取引先管理</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.totalCustomers}</div>
            <div className="text-sm opacity-90">総取引先数</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.activeCustomers}</div>
            <div className="text-sm opacity-90">アクティブ取引先</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.contactRegistered}</div>
            <div className="text-sm opacity-90">メール登録済み</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.phoneRegistered}</div>
            <div className="text-sm opacity-90">電話登録済み</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
            >
              <Plus className="w-4 h-4" />
              取引先追加
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべてのステータス</option>
              <option value="active">アクティブ</option>
              <option value="inactive">非アクティブ</option>
            </select>
          </div>
          
          <button
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
            }}
            className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            リセット
          </button>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          表示中: {customers.length}件 / 全{allCustomers.length}件
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">取引先コード</th>
              <th className="px-4 py-3 text-left text-sm font-medium">会社名</th>
              <th className="px-4 py-3 text-left text-sm font-medium">担当者</th>
              <th className="px-4 py-3 text-left text-sm font-medium">連絡先</th>
              <th className="px-4 py-3 text-left text-sm font-medium">支払条件</th>
              <th className="px-4 py-3 text-left text-sm font-medium">ステータス</th>
              <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((customer) => (
              <tr key={customer.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-mono">{customer.customerCode}</td>
                <td className="px-4 py-3 text-sm font-medium">{customer.companyName}</td>
                <td className="px-4 py-3 text-sm">
                  <div>{customer.contactPerson}</div>
                  {customer.department && (
                    <div className="text-xs text-gray-500">{customer.department}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">
                  {customer.phone && (
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-gray-400" />
                      {customer.phone}
                    </div>
                  )}
                  {customer.email && (
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Mail className="w-3 h-3 text-gray-400" />
                      {customer.email}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">{customer.paymentTerms}</td>
                <td className="px-4 py-3">{getStatusBadge(customer.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditCustomer(customer)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                      title="編集"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCustomer(customer.id)}
                      className="text-red-600 hover:text-red-800 p-1 rounded transition-colors"
                      title="削除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
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
                取引先追加
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); resetNewCustomer(); }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">取引先コード *</label>
                  <input
                    type="text"
                    value={newCustomer.customerCode}
                    onChange={(e) => setNewCustomer({...newCustomer, customerCode: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">会社名 *</label>
                  <input
                    type="text"
                    value={newCustomer.companyName}
                    onChange={(e) => setNewCustomer({...newCustomer, companyName: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">担当者名</label>
                  <input
                    type="text"
                    value={newCustomer.contactPerson}
                    onChange={(e) => setNewCustomer({...newCustomer, contactPerson: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">部署</label>
                  <input
                    type="text"
                    value={newCustomer.department}
                    onChange={(e) => setNewCustomer({...newCustomer, department: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">電話番号</label>
                  <input
                    type="tel"
                    value={newCustomer.phone}
                    onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">住所</label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">支払条件</label>
                  <select
                    value={newCustomer.paymentTerms}
                    onChange={(e) => setNewCustomer({...newCustomer, paymentTerms: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="月末締め翌月末払い">月末締め翌月末払い</option>
                    <option value="25日締め翌月10日払い">25日締め翌月10日払い</option>
                    <option value="15日締め翌月末払い">15日締め翌月末払い</option>
                    <option value="即金">即金</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ステータス</label>
                  <select
                    value={newCustomer.status}
                    onChange={(e) => setNewCustomer({...newCustomer, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="active">アクティブ</option>
                    <option value="inactive">非アクティブ</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => { setIsAddModalOpen(false); resetNewCustomer(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddCustomer}
                  disabled={!newCustomer.customerCode || !newCustomer.companyName}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  取引先追加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-blue-500 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Edit className="w-6 h-6" />
                取引先編集
              </h3>
              <button 
                onClick={() => { setIsEditModalOpen(false); setEditingCustomer(null); }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">取引先コード</label>
                  <input
                    type="text"
                    value={editingCustomer.customerCode}
                    onChange={(e) => setEditingCustomer({...editingCustomer, customerCode: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">会社名</label>
                  <input
                    type="text"
                    value={editingCustomer.companyName}
                    onChange={(e) => setEditingCustomer({...editingCustomer, companyName: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">担当者名</label>
                  <input
                    type="text"
                    value={editingCustomer.contactPerson || ''}
                    onChange={(e) => setEditingCustomer({...editingCustomer, contactPerson: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">部署</label>
                  <input
                    type="text"
                    value={editingCustomer.department || ''}
                    onChange={(e) => setEditingCustomer({...editingCustomer, department: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">電話番号</label>
                  <input
                    type="tel"
                    value={editingCustomer.phone || ''}
                    onChange={(e) => setEditingCustomer({...editingCustomer, phone: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={editingCustomer.email || ''}
                    onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">住所</label>
                <textarea
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({...editingCustomer, address: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">支払条件</label>
                  <select
                    value={editingCustomer.paymentTerms || '月末締め翌月末払い'}
                    onChange={(e) => setEditingCustomer({...editingCustomer, paymentTerms: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="月末締め翌月末払い">月末締め翌月末払い</option>
                    <option value="25日締め翌月10日払い">25日締め翌月10日払い</option>
                    <option value="15日締め翌月末払い">15日締め翌月末払い</option>
                    <option value="即金">即金</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ステータス</label>
                  <select
                    value={editingCustomer.status}
                    onChange={(e) => setEditingCustomer({...editingCustomer, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">アクティブ</option>
                    <option value="inactive">非アクティブ</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => { setIsEditModalOpen(false); setEditingCustomer(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateCustomer}
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

export default CustomerManagement;