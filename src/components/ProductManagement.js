import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Save, X, FileSpreadsheet, Package, TrendingUp, DollarSign, BarChart3 } from 'lucide-react';
import ProductExcelImportModal from './ProductExcelImportModal';

const ProductManagement = ({ products, onFilter, onAdd, onUpdate, onDelete, allProducts }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExcelImportModalOpen, setIsExcelImportModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [newProduct, setNewProduct] = useState({
    productCode: '',
    productName: '',
    category: 'コネクタ',
    material: 'S14',
    unitWeight: 0,
    standardPrice: 0,
    inventory: 0,
    monthlySales: 0,
    totalSales: 0,
    description: '',
    specifications: '',
    drawingNumber: '',
    status: 'active'
  });

  // Apply filters
  useEffect(() => {
    let filtered = allProducts;

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(product => product.category === categoryFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(product => product.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(product =>
        product.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.productCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    onFilter(filtered);
  }, [allProducts, categoryFilter, statusFilter, searchTerm, onFilter]);

  const handleAddProduct = useCallback(() => {
    if (!newProduct.productCode || !newProduct.productName || !newProduct.unitWeight) {
      alert('必須項目（*）を全て入力してください。');
      return;
    }

    if (allProducts.find(p => p.productCode === newProduct.productCode)) {
      alert('この製品コードは既に存在します。');
      return;
    }

    onAdd({
      ...newProduct,
      id: Date.now().toString(),
      createdDate: new Date().toISOString().split('T')[0],
      updatedDate: new Date().toISOString().split('T')[0]
    });
    setIsAddModalOpen(false);
    resetNewProduct();
  }, [newProduct, onAdd, allProducts]);

  const handleEditProduct = useCallback((product) => {
    setEditingProduct({ ...product });
    setIsEditModalOpen(true);
  }, []);

  const handleUpdateProduct = useCallback(() => {
    if (!editingProduct.productCode || !editingProduct.productName || !editingProduct.unitWeight) {
      alert('必須項目（*）を全て入力してください。');
      return;
    }

    onUpdate(editingProduct.id, {
      ...editingProduct,
      updatedDate: new Date().toISOString().split('T')[0]
    });
    setIsEditModalOpen(false);
    setEditingProduct(null);
  }, [editingProduct, onUpdate]);

  const handleDeleteProduct = useCallback((productId) => {
    const product = allProducts.find(p => p.id === productId);
    if (window.confirm(`製品「${product?.productName}」を削除しますか？`)) {
      onDelete(productId);
    }
  }, [onDelete, allProducts]);

  const handleExcelImportSuccess = useCallback((importedProducts, updatedProducts, stats) => {
    // Add new products
    importedProducts.forEach(product => {
      onAdd(product);
    });
    
    // Update existing products if any
    if (updatedProducts && updatedProducts.length > 0) {
      updatedProducts.forEach(product => {
        // Find existing product by productCode
        const existingProduct = allProducts.find(p => p.productCode === product.productCode);
        if (existingProduct) {
          onUpdate(existingProduct.id, {
            ...product,
            id: existingProduct.id,
            createdDate: existingProduct.createdDate, // Keep original creation date
            updatedDate: new Date().toISOString().split('T')[0]
          });
        }
      });
    }
    
    // Show success message
    let message = `製品データExcel取り込み完了`;
    if (stats.duplicateHandling === 'skip') {
      message += `\n新規登録: ${stats.imported}件\nスキップ: ${stats.skipped}件\n合計: ${stats.total}件`;
    } else if (stats.duplicateHandling === 'update') {
      message += `\n新規登録: ${stats.imported}件\n更新: ${stats.updated}件\n合計: ${stats.total}件`;
    }
    
    alert(message);
  }, [onAdd, onUpdate, allProducts]);

  const resetNewProduct = () => {
    setNewProduct({
      productCode: '',
      productName: '',
      category: 'コネクタ',
      material: 'S14',
      unitWeight: 0,
      standardPrice: 0,
      inventory: 0,
      monthlySales: 0,
      totalSales: 0,
      description: '',
      specifications: '',
      drawingNumber: '',
      status: 'active'
    });
  };

  const exportToCSV = () => {
    const headers = ['製品コード', '製品名', 'カテゴリ', '材質', '単重量', '標準価格', '在庫数', '月間売上', '総売上', '説明', '仕様', '図面番号', 'ステータス'];
    const csvData = products.map(product => [
      product.productCode,
      product.productName,
      product.category,
      product.material,
      product.unitWeight,
      product.standardPrice,
      product.inventory || 0,
      product.monthlySales || 0,
      product.totalSales || 0,
      product.description,
      product.specifications,
      product.drawingNumber,
      product.status
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field || ''}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `products_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status) => {
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
        status === 'active' 
          ? 'bg-green-100 text-green-800 border border-green-200' 
          : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        {status === 'active' ? 'アクティブ' : '非アクティブ'}
      </span>
    );
  };

  const getMaterialBadge = (material) => {
    const styles = {
      S14: 'bg-blue-100 text-blue-800 border-blue-200',
      SCS: 'bg-green-100 text-green-800 border-green-200',
      SUS304: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      SUS316: 'bg-purple-100 text-purple-800 border-purple-200',
      FCD400: 'bg-red-100 text-red-800 border-red-200'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${styles[material] || 'bg-gray-100 text-gray-800 border-gray-200'}`}>
        {material}
      </span>
    );
  };

  const getInventoryStatus = (inventory) => {
    if (inventory === 0) return { color: 'text-red-600', label: '在庫切れ' };
    if (inventory < 10) return { color: 'text-orange-600', label: '在庫少' };
    return { color: 'text-green-600', label: '在庫あり' };
  };

  // Calculate statistics
  const stats = {
    totalProducts: products.length,
    inStock: products.filter(p => p.inventory > 0).length,
    monthlySales: products.reduce((sum, p) => sum + (p.monthlySales || 0), 0),
    totalSales: products.reduce((sum, p) => sum + (p.totalSales || 0), 0)
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">製品管理</h1>
            <p className="text-gray-600">製品情報の管理と在庫状況の確認</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3 mt-4 lg:mt-0">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white px-4 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              製品追加
            </button>
            <button
              onClick={() => setIsExcelImportModalOpen(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white px-4 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel取込
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white px-4 py-2.5 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg font-medium"
            >
              <Download className="w-4 h-4" />
              CSVエクスポート
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">製品総数</p>
              <p className="text-3xl font-bold mt-1">{stats.totalProducts}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <Package className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl text-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">在庫あり</p>
              <p className="text-3xl font-bold mt-1">{stats.inStock}</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <BarChart3 className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl text-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">月間売上</p>
              <p className="text-3xl font-bold mt-1">¥{(stats.monthlySales / 1000).toFixed(0)}K</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl text-white p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">総売上実績</p>
              <p className="text-3xl font-bold mt-1">¥{(stats.totalSales / 1000000).toFixed(1)}M</p>
            </div>
            <div className="bg-white bg-opacity-20 rounded-full p-3">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
              <input
                type="text"
                placeholder="製品名、製品コードで検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              >
                <option value="all">すべてのカテゴリ</option>
                <option value="コネクタ">コネクタ</option>
                <option value="バルブ">バルブ</option>
                <option value="フランジ">フランジ</option>
                <option value="エルボ">エルボ</option>
                <option value="ティー">ティー</option>
                <option value="キャップ">キャップ</option>
                <option value="その他">その他</option>
              </select>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            >
              <option value="all">すべてのステータス</option>
              <option value="active">アクティブ</option>
              <option value="inactive">非アクティブ</option>
            </select>
            
            <button
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setStatusFilter('all');
              }}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all duration-200 font-medium"
            >
              リセット
            </button>
          </div>
        </div>
        
        <div className="mt-3 text-sm text-gray-600">
          表示中: <span className="font-semibold text-gray-900">{products.length}件</span> / 全<span className="font-semibold text-gray-900">{allProducts.length}件</span>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">製品コード</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">製品名</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">カテゴリ</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">価格</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">在庫</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ステータス</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {products.map((product, index) => {
                const inventoryStatus = getInventoryStatus(product.inventory || 0);
                return (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {product.productCode}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div className="font-medium text-gray-900">{product.productName}</div>
                      <div className="text-gray-500 text-xs mt-1">{getMaterialBadge(product.material)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      ¥{product.standardPrice?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className={`font-medium ${inventoryStatus.color}`}>
                        {product.inventory || 0}個
                      </div>
                      <div className="text-xs text-gray-500">{inventoryStatus.label}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(product.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditProduct(product)}
                          className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-all duration-200"
                          title="編集"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(product.id)}
                          className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-all duration-200"
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

        {products.length === 0 && (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">製品が見つかりません</h3>
            <p className="text-gray-500">検索条件を変更するか、新しい製品を追加してください。</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-xl">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Plus className="w-6 h-6" />
                製品追加
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); resetNewProduct(); }}
                className="text-white hover:text-gray-200 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">製品コード *</label>
                  <input
                    type="text"
                    value={newProduct.productCode}
                    onChange={(e) => setNewProduct({...newProduct, productCode: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="例: P815-110-0162"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">製品名 *</label>
                  <input
                    type="text"
                    value={newProduct.productName}
                    onChange={(e) => setNewProduct({...newProduct, productName: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="例: コネクタ VLN-15"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="コネクタ">コネクタ</option>
                    <option value="バルブ">バルブ</option>
                    <option value="フランジ">フランジ</option>
                    <option value="エルボ">エルボ</option>
                    <option value="ティー">ティー</option>
                    <option value="キャップ">キャップ</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">材質</label>
                  <select
                    value={newProduct.material}
                    onChange={(e) => setNewProduct({...newProduct, material: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="S14">S14</option>
                    <option value="SCS">SCS</option>
                    <option value="SUS304">SUS304</option>
                    <option value="SUS316">SUS316</option>
                    <option value="FCD400">FCD400</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">単重量 (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={newProduct.unitWeight}
                    onChange={(e) => setNewProduct({...newProduct, unitWeight: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="0.0"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">標準価格 (円)</label>
                  <input
                    type="number"
                    value={newProduct.standardPrice}
                    onChange={(e) => setNewProduct({...newProduct, standardPrice: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">在庫数</label>
                  <input
                    type="number"
                    value={newProduct.inventory}
                    onChange={(e) => setNewProduct({...newProduct, inventory: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">図面番号</label>
                  <input
                    type="text"
                    value={newProduct.drawingNumber}
                    onChange={(e) => setNewProduct({...newProduct, drawingNumber: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="例: DWG-815-162"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  rows="3"
                  placeholder="製品の詳細な説明を入力してください"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => { setIsAddModalOpen(false); resetNewProduct(); }}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddProduct}
                  disabled={!newProduct.productCode || !newProduct.productName || !newProduct.unitWeight}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  製品追加
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-green-600 to-green-700 text-white rounded-t-xl">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Edit className="w-6 h-6" />
                製品編集
              </h3>
              <button 
                onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }}
                className="text-white hover:text-gray-200 p-1 rounded-full hover:bg-white hover:bg-opacity-20 transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">製品コード *</label>
                  <input
                    type="text"
                    value={editingProduct.productCode}
                    onChange={(e) => setEditingProduct({...editingProduct, productCode: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">製品名 *</label>
                  <input
                    type="text"
                    value={editingProduct.productName}
                    onChange={(e) => setEditingProduct({...editingProduct, productName: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">カテゴリ</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="コネクタ">コネクタ</option>
                    <option value="バルブ">バルブ</option>
                    <option value="フランジ">フランジ</option>
                    <option value="エルボ">エルボ</option>
                    <option value="ティー">ティー</option>
                    <option value="キャップ">キャップ</option>
                    <option value="その他">その他</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">材質</label>
                  <select
                    value={editingProduct.material}
                    onChange={(e) => setEditingProduct({...editingProduct, material: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="S14">S14</option>
                    <option value="SCS">SCS</option>
                    <option value="SUS304">SUS304</option>
                    <option value="SUS316">SUS316</option>
                    <option value="FCD400">FCD400</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">単重量 (kg) *</label>
                  <input
                    type="number"
                    step="0.1"
                    value={editingProduct.unitWeight}
                    onChange={(e) => setEditingProduct({...editingProduct, unitWeight: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ステータス</label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({...editingProduct, status: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="active">アクティブ</option>
                    <option value="inactive">非アクティブ</option>
                  </select>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">標準価格 (円)</label>
                  <input
                    type="number"
                    value={editingProduct.standardPrice}
                    onChange={(e) => setEditingProduct({...editingProduct, standardPrice: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">在庫数</label>
                  <input
                    type="number"
                    value={editingProduct.inventory || 0}
                    onChange={(e) => setEditingProduct({...editingProduct, inventory: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">図面番号</label>
                  <input
                    type="text"
                    value={editingProduct.drawingNumber || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, drawingNumber: e.target.value})}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">説明</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200"
                  rows="3"
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }}
                  className="px-6 py-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all duration-200 font-medium"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateProduct}
                  className="px-6 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded-lg transition-all duration-200 flex items-center gap-2 font-medium shadow-md hover:shadow-lg"
                >
                  <Save className="w-4 h-4" />
                  更新
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Excel Import Modal */}
      <ProductExcelImportModal
        isOpen={isExcelImportModalOpen}
        onClose={() => setIsExcelImportModalOpen(false)}
        onImportSuccess={handleExcelImportSuccess}
        existingProducts={allProducts}
      />
    </div>
  );
};

export default ProductManagement;