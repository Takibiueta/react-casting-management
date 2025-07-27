import React, { useState, useEffect, useCallback } from 'react';
import { useOrderData, useProductData, useCustomerData } from './hooks/useLocalStorage';
import { AuthProvider, useAuth, usePermissions } from './hooks/useAuth';
import LoginPage from './components/LoginPage';
import FieldWorkerDashboard from './components/FieldWorkerDashboard';
import Dashboard from './components/Dashboard';
import TabNavigation from './components/TabNavigation';
import OrderManagement from './components/OrderManagement';
import ProductManagement from './components/ProductManagement';
import CustomerManagement from './components/CustomerManagement';
import AIChat from './components/AIChat';
import PDFReader from './PDFReader';
import ExcelImporter from './ExcelImporter';

// サンプルデータ（担当者フィールドを追加）
const sampleOrders = [
  {
    id: '1',
    orderNumber: 'MN002BUV',
    customer: '株式会社サンプル',
    productCode: 'P815-110-0162',
    productName: 'コネクタ VLN-15',
    material: 'S14',
    unitWeight: 13.2,
    quantity: 2,
    totalWeight: 26.4,
    orderDate: '2024-12-01',
    deliveryDate: '2025-01-31',
    status: 'pending',
    assignedWorker: 'worker1',
    notes: '25.4.9在庫3ケ仕上済'
  },
  {
    id: '2',
    orderNumber: 'MH002BVD',
    customer: '製造工業株式会社',
    productCode: 'P895-110-0163',
    productName: 'コネクタ VLN-5',
    material: 'S14',
    unitWeight: 7.3,
    quantity: 16,
    totalWeight: 116.8,
    orderDate: '2024-12-15',
    deliveryDate: '2025-02-28',
    status: 'pending',
    assignedWorker: 'worker2',
    notes: ''
  },
  {
    id: '3',
    orderNumber: 'SCH11',
    customer: 'エア機器株式会社',
    productCode: 'SCH11',
    productName: 'エアレジメンテ（2個セット）',
    material: 'SCS',
    unitWeight: 10.5,
    quantity: 16,
    totalWeight: 168.0,
    orderDate: '2024-12-20',
    deliveryDate: '2025-03-21',
    status: 'pending',
    assignedWorker: 'worker1',
    notes: ''
  },
  {
    id: '4',
    orderNumber: 'MH002BV3',
    customer: 'コネクタ工業',
    productCode: 'P893-110-0162',
    productName: 'コネクタ VLN-3（4個セット）',
    material: 'SCS',
    unitWeight: 6.0,
    quantity: 14,
    totalWeight: 84.0,
    orderDate: '2024-12-25',
    deliveryDate: '2025-03-21',
    status: 'processing',
    assignedWorker: 'worker2',
    notes: '枠6W分のみ'
  },
  {
    id: '5',
    orderNumber: 'FLD001',
    customer: '精密機器株式会社',
    productCode: 'P100-220-0001',
    productName: 'フランジ FL-20',
    material: 'SUS304',
    unitWeight: 25.8,
    quantity: 8,
    totalWeight: 206.4,
    orderDate: '2025-01-15',
    deliveryDate: '2025-01-30',
    status: 'pending',
    assignedWorker: 'worker1',
    notes: '急ぎ対応'
  }
];

const sampleProducts = [
  {
    id: '1',
    productCode: 'P815-110-0162',
    productName: 'コネクタ VLN-15',
    category: 'コネクタ',
    material: 'S14',
    unitWeight: 13.2,
    standardPrice: 15000,
    description: 'VLNシリーズコネクタ15型',
    specifications: '耐圧: 10MPa, 温度範囲: -40～+150℃',
    drawingNumber: 'DWG-815-162',
    status: 'active',
    createdDate: '2024-01-15',
    updatedDate: '2024-01-15'
  },
  {
    id: '2',
    productCode: 'P895-110-0163',
    productName: 'コネクタ VLN-5',
    category: 'コネクタ',
    material: 'S14',
    unitWeight: 7.3,
    standardPrice: 8500,
    description: 'VLNシリーズコネクタ5型',
    specifications: '耐圧: 8MPa, 温度範囲: -20～+120℃',
    drawingNumber: 'DWG-895-163',
    status: 'active',
    createdDate: '2024-01-20',
    updatedDate: '2024-01-20'
  }
];

const sampleCustomers = [
  {
    id: '1',
    customerCode: 'CUST001',
    companyName: '株式会社サンプル',
    contactPerson: '田中太郎',
    department: '購買部',
    email: 'tanaka@sample.co.jp',
    phone: '03-1234-5678',
    address: '東京都千代田区丸の内1-1-1',
    paymentTerms: '月末締め翌月末払い',
    creditLimit: 5000000,
    taxType: '外税',
    status: 'active',
    createdDate: '2024-01-10',
    updatedDate: '2024-01-10'
  },
  {
    id: '2',
    customerCode: 'CUST002',
    companyName: '製造工業株式会社',
    contactPerson: '鈴木花子',
    department: '資材調達課',
    email: 'suzuki@seizo.co.jp',
    phone: '06-9876-5432',
    address: '大阪府大阪市北区梅田2-2-2',
    paymentTerms: '25日締め翌月10日払い',
    creditLimit: 10000000,
    taxType: '内税',
    status: 'active',
    createdDate: '2024-01-12',
    updatedDate: '2024-01-12'
  }
];

// メインアプリケーションコンポーネント
const AppContent = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  
  // 認証フック
  const { isLoggedIn, currentUser } = useAuth();
  const { isFieldWorker } = usePermissions();
  
  // Data hooks
  const { orders, addOrder, updateOrder, deleteOrder, setOrders } = useOrderData();
  const { products, addProduct, updateProduct, deleteProduct, setProducts } = useProductData();
  const { customers, addCustomer, updateCustomer, deleteCustomer, setCustomers } = useCustomerData();

  // Initialize sample data if empty
  useEffect(() => {
    if (orders.length === 0) {
      setOrders(sampleOrders);
    }
    if (products.length === 0) {
      setProducts(sampleProducts);
    }
    if (customers.length === 0) {
      setCustomers(sampleCustomers);
    }
  }, [orders.length, products.length, customers.length, setOrders, setProducts, setCustomers]);

  // Initialize filtered data
  useEffect(() => {
    setFilteredOrders(orders);
  }, [orders]);

  useEffect(() => {
    setFilteredProducts(products);
  }, [products]);

  useEffect(() => {
    setFilteredCustomers(customers);
  }, [customers]);

  // Filter handlers
  const handleOrderFilter = useCallback((filtered) => {
    setFilteredOrders(filtered);
  }, []);

  const handleProductFilter = useCallback((filtered) => {
    setFilteredProducts(filtered);
  }, []);

  const handleCustomerFilter = useCallback((filtered) => {
    setFilteredCustomers(filtered);
  }, []);

  // PDF import handler
  const handlePDFImport = useCallback((extractedData) => {
    if (Array.isArray(extractedData)) {
      extractedData.forEach(data => addOrder(data));
    } else {
      addOrder(extractedData);
    }
  }, [addOrder]);

  // Excel import handler
  const handleExcelImport = useCallback((importedData) => {
    importedData.forEach(data => addOrder(data));
  }, [addOrder]);

  // Calculate dashboard statistics
  const dashboardStats = {
    totalOrders: orders.filter(order => order.status !== 'completed').length,
    totalWeight: orders.reduce((sum, order) => sum + (order.totalWeight || 0), 0),
    urgentOrders: orders.filter(order => {
      const deliveryDate = new Date(order.deliveryDate);
      const today = new Date();
      const daysDiff = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7 && order.status !== 'completed';
    }).length,
    batchCount: Math.ceil(orders.reduce((sum, order) => sum + (order.totalWeight || 0), 0) / 300)
  };

  // ログイン状態によってUIを切り替え
  if (!isLoggedIn) {
    return <LoginPage />;
  }

  // 現場作業者の場合は専用画面を表示
  if (isFieldWorker) {
    return (
      <FieldWorkerDashboard
        orders={orders}
        products={products}
        onUpdateOrder={updateOrder}
      />
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'orders':
        return (
          <OrderManagement
            orders={filteredOrders}
            onFilter={handleOrderFilter}
            onAdd={addOrder}
            onUpdate={updateOrder}
            onDelete={deleteOrder}
            allOrders={orders}
          />
        );
      case 'products':
        return (
          <ProductManagement
            products={filteredProducts}
            onFilter={handleProductFilter}
            onAdd={addProduct}
            onUpdate={updateProduct}
            onDelete={deleteProduct}
            allProducts={products}
          />
        );
      case 'customers':
        return (
          <CustomerManagement
            customers={filteredCustomers}
            onFilter={handleCustomerFilter}
            onAdd={addCustomer}
            onUpdate={updateCustomer}
            onDelete={deleteCustomer}
            allCustomers={customers}
          />
        );
      default:
        return null;
    }
  };

  // 管理者・監督者向けの管理画面
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold">🏭</span>
            </div>
            <h1 className="text-2xl font-bold">ステンレス鋳造管理システム - 管理画面</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-90">
              {currentUser?.name} ({currentUser?.role === 'admin' ? '管理者' : '監督者'})
            </span>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm">システム稼働中</span>
            </div>
          </div>
        </div>
      </header>

      {/* Dashboard */}
      <Dashboard stats={dashboardStats} />

      {/* Tab Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <PDFReader 
            onOrderExtracted={handlePDFImport} 
            onMultipleOrdersExtracted={(orders) => orders.forEach(order => addOrder(order))} 
          />
          <ExcelImporter onOrdersImported={handleExcelImport} />
        </div>

        {/* Tab Content */}
        {renderActiveTab()}
      </main>

      {/* AI Chat */}
      <AIChat 
        orders={orders} 
        products={products} 
        customers={customers}
        onOrdersUpdate={setFilteredOrders}
      />
    </div>
  );
};

// AuthProviderでラップしたメインアプリ
const App = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;