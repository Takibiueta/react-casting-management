import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Search, Filter, Download, Edit, Trash2, Save, X, FileSpreadsheet } from 'lucide-react';
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

    onAdd(newProduct);
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

    onUpdate(editingProduct.id, editingProduct);
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
      description: '',
      specifications: '',
      drawingNumber: '',
      status: 'active'
    });
  };

  const exportToCSV = () => {
    const headers = ['製品コード', '製品名', 'カテゴリ', '材質', '単重量', '標準価格', '説明', '仕様', '図面番号', 'ステータス'];
    const csvData = products.map(product => [
      product.productCode,
      product.productName,
      product.category,
      product.material,
      product.unitWeight,
      product.standardPrice,
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
      <span className={`px-2 py-1 rounded text-xs font-bold ${
        status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
      }`}>
        {status === 'active' ? 'アクティブ' : '非アクティブ'}
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

  // Calculate statistics
  const stats = {
    totalItems: products.length,
    activeProducts: products.filter(p => p.status === 'active').length,
    materialTypes: [...new Set(products.map(p => p.material))].length,
    averageWeight: products.length > 0 ? products.reduce((sum, p) => sum + p.unitWeight, 0) / products.length : 0
  };

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Statistics Dashboard */}
      <div className="p-4 border-b bg-gray-50 rounded-t-lg">
        <h2 className="text-lg font-semibold mb-4">📋 製品管理</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <div className="text-sm opacity-90">総製品数</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.activeProducts}</div>
            <div className="text-sm opacity-90">アクティブ製品</div>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.materialTypes}</div>
            <div className="text-sm opacity-90">材質種類</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg text-center">
            <div className="text-2xl font-bold">{stats.averageWeight.toFixed(1)}kg</div>
            <div className="text-sm opacity-90">平均重量</div>
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
              製品追加
            </button>
            <button
              onClick={() => setIsExcelImportModalOpen(true)}
              className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel取り込み
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
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            className="px-3 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            リセット
          </button>
        </div>
        
        <div className="mt-2 text-sm text-gray-600">
          表示中: {products.length}件 / 全{allProducts.length}件
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-800 text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">製品コード</th>
              <th className="px-4 py-3 text-left text-sm font-medium">製品名</th>
              <th className="px-4 py-3 text-left text-sm font-medium">カテゴリ</th>
              <th className="px-4 py-3 text-left text-sm font-medium">材質</th>
              <th className="px-4 py-3 text-left text-sm font-medium">単重量</th>
              <th className="px-4 py-3 text-left text-sm font-medium">標準価格</th>
              <th className="px-4 py-3 text-left text-sm font-medium">ステータス</th>
              <th className="px-4 py-3 text-left text-sm font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-mono">{product.productCode}</td>
                <td className="px-4 py-3 text-sm font-medium">{product.productName}</td>
                <td className="px-4 py-3 text-sm">{product.category}</td>
                <td className="px-4 py-3">{getMaterialBadge(product.material)}</td>
                <td className="px-4 py-3 text-sm">{product.unitWeight}kg</td>
                <td className="px-4 py-3 text-sm">¥{product.standardPrice?.toLocaleString()}</td>
                <td className="px-4 py-3">{getStatusBadge(product.status)}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="text-blue-600 hover:text-blue-800 p-1 rounded transition-colors"
                      title="編集"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
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
                製品追加
              </h3>
              <button 
                onClick={() => { setIsAddModalOpen(false); resetNewProduct(); }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">製品コード *</label>
                  <input
                    type="text"
                    value={newProduct.productCode}
                    onChange={(e) => setNewProduct({...newProduct, productCode: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">製品名 *</label>
                  <input
                    type="text"
                    value={newProduct.productName}
                    onChange={(e) => setNewProduct({...newProduct, productName: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">カテゴリ</label>
                  <select
                    value={newProduct.category}
                    onChange={(e) => setNewProduct({...newProduct, category: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
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
                  <label className="block text-sm font-medium mb-1">材質</label>
                  <select
                    value={newProduct.material}
                    onChange={(e) => setNewProduct({...newProduct, material: e.target.value})}
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
                    value={newProduct.unitWeight}
                    onChange={(e) => setNewProduct({...newProduct, unitWeight: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">標準価格 (円)</label>
                  <input
                    type="number"
                    value={newProduct.standardPrice}
                    onChange={(e) => setNewProduct({...newProduct, standardPrice: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">図面番号</label>
                  <input
                    type="text"
                    value={newProduct.drawingNumber}
                    onChange={(e) => setNewProduct({...newProduct, drawingNumber: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">説明</label>
                <textarea
                  value={newProduct.description}
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="3"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => { setIsAddModalOpen(false); resetNewProduct(); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleAddProduct}
                  disabled={!newProduct.productCode || !newProduct.productName || !newProduct.unitWeight}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-blue-500 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Edit className="w-6 h-6" />
                製品編集
              </h3>
              <button 
                onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">製品コード</label>
                  <input
                    type="text"
                    value={editingProduct.productCode}
                    onChange={(e) => setEditingProduct({...editingProduct, productCode: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">製品名</label>
                  <input
                    type="text"
                    value={editingProduct.productName}
                    onChange={(e) => setEditingProduct({...editingProduct, productName: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">カテゴリ</label>
                  <select
                    value={editingProduct.category}
                    onChange={(e) => setEditingProduct({...editingProduct, category: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-sm font-medium mb-1">材質</label>
                  <select
                    value={editingProduct.material}
                    onChange={(e) => setEditingProduct({...editingProduct, material: e.target.value})}
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
                    value={editingProduct.unitWeight}
                    onChange={(e) => setEditingProduct({...editingProduct, unitWeight: parseFloat(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">ステータス</label>
                  <select
                    value={editingProduct.status}
                    onChange={(e) => setEditingProduct({...editingProduct, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">アクティブ</option>
                    <option value="inactive">非アクティブ</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">標準価格 (円)</label>
                  <input
                    type="number"
                    value={editingProduct.standardPrice}
                    onChange={(e) => setEditingProduct({...editingProduct, standardPrice: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">図面番号</label>
                  <input
                    type="text"
                    value={editingProduct.drawingNumber || ''}
                    onChange={(e) => setEditingProduct({...editingProduct, drawingNumber: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">説明</label>
                <textarea
                  value={editingProduct.description || ''}
                  onChange={(e) => setEditingProduct({...editingProduct, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows="3"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  onClick={() => { setIsEditModalOpen(false); setEditingProduct(null); }}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleUpdateProduct}
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