import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Save, X, Building, Phone, Mail, FileSpreadsheet, Users, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import ExcelImportModal from './ExcelImportModal';

const CustomerManagement = ({ customers, onFilter, onAdd, onUpdate, onDelete, allCustomers }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
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
    customerType: '法人',
    monthlyOrders: 0,
    totalOrderAmount: 0,
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

  const handleExcelImportSuccess = useCallback((importedCustomers, updatedCustomers, stats) => {
    // Add new customers
    importedCustomers.forEach(customer => {
      onAdd(customer);
    });
    
    // Update existing customers if any
    if (updatedCustomers && updatedCustomers.length > 0) {
      updatedCustomers.forEach(customer => {
        // Find existing customer by customerCode
        const existingCustomer = allCustomers.find(c => c.customerCode === customer.customerCode);
        if (existingCustomer) {
          onUpdate(existingCustomer.id, {
            ...customer,
            id: existingCustomer.id,
            createdDate: existingCustomer.createdDate, // Keep original creation date
            updatedDate: new Date().toISOString().split('T')[0]
          });
        }
      });
    }
    
    // Show success message
    let message = `Excel取り込み完了`;
    if (stats.duplicateHandling === 'skip') {
      message += `\n新規登録: ${stats.imported}件\nスキップ: ${stats.skipped}件\n合計: ${stats.total}件`;
    } else if (stats.duplicateHandling === 'update') {
      message += `\n新規登録: ${stats.imported}件\n更新: ${stats.updated}件\n合計: ${stats.total}件`;
    }
    
    alert(message);
  }, [onAdd, onUpdate, allCustomers]);

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
      customerType: '法人',
      monthlyOrders: 0,
      totalOrderAmount: 0,
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

  // Calculate statistics
  const stats = {
    totalCustomers: allCustomers.length,
    activeCustomers: allCustomers.filter(c => c.status === 'active').length,
    averageMonthlyOrders: allCustomers.length > 0 ? Math.round(allCustomers.reduce((sum, c) => sum + (c.monthlyOrders || 0), 0) / allCustomers.length) : 0,
    totalOrderAmount: allCustomers.reduce((sum, c) => sum + (c.totalOrderAmount || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">取引先管理</h1>
                <p className="text-gray-600">顧客情報の管理と統計</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg text-white overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">取引先総数</p>
                <p className="text-3xl font-bold">{stats.totalCustomers}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg text-white overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">アクティブ</p>
                <p className="text-3xl font-bold">{stats.activeCustomers}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg text-white overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">月間平均注文</p>
                <p className="text-3xl font-bold">{stats.averageMonthlyOrders}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg text-white overflow-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">総注文実績</p>
                <p className="text-3xl font-bold">¥{stats.totalOrderAmount.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
              >
                <Plus className="w-4 h-4" />
                取引先追加
              </button>
              <button
                onClick={() => setIsExcelImportModalOpen(true)}
                className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
              >
                <FileSpreadsheet className="w-4 h-4" />
                Excel取り込み
              </button>
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white px-4 py-2.5 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 font-medium"
              >
                <Download className="w-4 h-4" />
                CSV出力
              </button>
            </div>
          </div>

          {/* Search and Filter Section */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[250px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="取引先名、担当者名、電話番号で検索..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-w-[150px]"
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
                className="px-4 py-2.5 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-colors font-medium"
              >
                リセット
              </button>
            </div>
            
            <div className="mt-3 text-sm text-gray-600">
              表示中: <span className="font-semibold text-blue-600">{customers.length}</span>件 / 全<span className="font-semibold">{allCustomers.length}</span>件
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">取引先コード</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">会社名</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">担当者</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">連絡先</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">取引実績</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">ステータス</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {customers.map((customer, index) => (
                    <tr key={customer.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-6 py-4">
                        <div className="text-sm font-mono font-medium text-gray-900">{customer.customerCode}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                            <Building className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">{customer.companyName}</div>
                            <div className="text-xs text-gray-500">{customer.customerType || '法人'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{customer.contactPerson}</div>
                        {customer.department && (
                          <div className="text-xs text-gray-500">{customer.department}</div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {customer.phone && (
                          <div className="flex items-center gap-1 text-sm text-gray-900 mb-1">
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
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-gray-900 font-medium">月{customer.monthlyOrders || 0}回</div>
                          <div className="text-xs text-gray-500">¥{(customer.totalOrderAmount || 0).toLocaleString()}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          customer.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.status === 'active' ? 'アクティブ' : '非アクティブ'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditCustomer(customer)}
                            className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-100 transition-all"
                            title="編集"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomer(customer.id)}
                            className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-100 transition-all"
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
          </div>
        </div>
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-500 to-green-600 text-white rounded-t-xl">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-6 h-6" />
                取引先追加
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); resetNewCustomer(); }}
                className="text-white hover:text-gray-200 p-1 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">会社名 *</label>
                  <input
                    type="text"
                    value={newCustomer.companyName}
                    onChange={(e) => setNewCustomer({...newCustomer, companyName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">部署</label>
                  <input
                    type="text"
                    value={newCustomer.department}
                    onChange={(e) => setNewCustomer({...newCustomer, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={newCustomer.email}
                    onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">住所</label>
                <textarea
                  value={newCustomer.address}
                  onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  rows="2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">支払条件</label>
                  <select
                    value={newCustomer.paymentTerms}
                    onChange={(e) => setNewCustomer({...newCustomer, paymentTerms: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  >
                    <option value="active">アクティブ</option>
                    <option value="inactive">非アクティブ</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => { setIsAddModalOpen(false); resetNewCustomer(); }}
                  className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddCustomer}
                  disabled={!newCustomer.customerCode || !newCustomer.companyName}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-lg"
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
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-t-xl">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Edit className="w-6 h-6" />
                取引先編集
              </h3>
              <button 
                onClick={() => { setIsEditModalOpen(false); setEditingCustomer(null); }}
                className="text-white hover:text-gray-200 p-1 rounded-lg hover:bg-white hover:bg-opacity-20 transition-all"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">会社名</label>
                  <input
                    type="text"
                    value={editingCustomer.companyName}
                    onChange={(e) => setEditingCustomer({...editingCustomer, companyName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">部署</label>
                  <input
                    type="text"
                    value={editingCustomer.department || ''}
                    onChange={(e) => setEditingCustomer({...editingCustomer, department: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">メールアドレス</label>
                  <input
                    type="email"
                    value={editingCustomer.email || ''}
                    onChange={(e) => setEditingCustomer({...editingCustomer, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">住所</label>
                <textarea
                  value={editingCustomer.address || ''}
                  onChange={(e) => setEditingCustomer({...editingCustomer, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  rows="2"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">支払条件</label>
                  <select
                    value={editingCustomer.paymentTerms || '月末締め翌月末払い'}
                    onChange={(e) => setEditingCustomer({...editingCustomer, paymentTerms: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  >
                    <option value="active">アクティブ</option>
                    <option value="inactive">非アクティブ</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => { setIsEditModalOpen(false); setEditingCustomer(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateCustomer}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl transition-all flex items-center gap-2 font-medium shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Excel Import Modal */}
      <ExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        onImportSuccess={handleExcelImportSuccess}
        existingCustomers={allCustomers}
      />
    </div>
  );
};

export default CustomerManagement;