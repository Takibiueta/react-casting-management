import React, { useState, useEffect, useCallback } from 'react';
import { useOrderData, useProductData, useCustomerData } from './hooks/useLocalStorage';
import Dashboard from './components/Dashboard';
import TabNavigation from './components/TabNavigation';
import OrderManagement from './components/OrderManagement';
import ProductManagement from './components/ProductManagement';
import CustomerManagement from './components/CustomerManagement';
import AIChat from './components/AIChat';
import PDFReader from './PDFReader';
import ExcelImporter from './ExcelImporter';

// サンプルデータ
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
    notes: '枠6W分のみ'
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
    inventory: 25,
    monthlySales: 180000,
    totalSales: 2250000,
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
    inventory: 42,
    monthlySales: 136000,
    totalSales: 1870000,
    description: 'VLNシリーズコネクタ5型',
    specifications: '耐圧: 8MPa, 温度範囲: -20～+120℃',
    drawingNumber: 'DWG-895-163',
    status: 'active',
    createdDate: '2024-01-20',
    updatedDate: '2024-01-20'
  },
  {
    id: '3',
    productCode: 'SCH11',
    productName: 'エアレジメンテ（2個セット）',
    category: 'バルブ',
    material: 'SCS',
    unitWeight: 10.5,
    standardPrice: 22000,
    inventory: 18,
    monthlySales: 352000,
    totalSales: 3520000,
    description: 'エア制御用レジメンテ',
    specifications: '耐圧: 15MPa, 温度範囲: -30～+180℃',
    drawingNumber: 'DWG-SCH-011',
    status: 'active',
    createdDate: '2024-01-10',
    updatedDate: '2024-01-10'
  },
  {
    id: '4',
    productCode: 'F420-80-0250',
    productName: 'フランジ FLG-250A',
    category: 'フランジ',
    material: 'SUS316',
    unitWeight: 28.5,
    standardPrice: 45000,
    inventory: 8,
    monthlySales: 270000,
    totalSales: 1980000,
    description: '250A標準フランジ',
    specifications: '耐圧: 20MPa, 温度範囲: -40～+200℃',
    drawingNumber: 'DWG-F420-250',
    status: 'active',
    createdDate: '2024-01-05',
    updatedDate: '2024-01-05'
  },
  {
    id: '5',
    productCode: 'E180-90-0150',
    productName: 'エルボ 90° 150A',
    category: 'エルボ',
    material: 'SUS304',
    unitWeight: 15.8,
    standardPrice: 28000,
    inventory: 15,
    monthlySales: 168000,
    totalSales: 1456000,
    description: '90度エルボ 150A',
    specifications: '耐圧: 16MPa, 温度範囲: -20～+150℃',
    drawingNumber: 'DWG-E180-150',
    status: 'active',
    createdDate: '2024-01-12',
    updatedDate: '2024-01-12'
  },
  {
    id: '6',
    productCode: 'T300-100-0125',
    productName: 'ティー 等径 125A',
    category: 'ティー',
    material: 'SCS',
    unitWeight: 18.2,
    standardPrice: 35000,
    inventory: 12,
    monthlySales: 210000,
    totalSales: 1750000,
    description: '等径ティー 125A',
    specifications: '耐圧: 18MPa, 温度範囲: -30～+180℃',
    drawingNumber: 'DWG-T300-125',
    status: 'active',
    createdDate: '2024-01-08',
    updatedDate: '2024-01-08'
  },
  {
    id: '7',
    productCode: 'C250-65-0080',
    productName: 'キャップ 80A',
    category: 'キャップ',
    material: 'S14',
    unitWeight: 8.9,
    standardPrice: 12000,
    inventory: 0,
    monthlySales: 72000,
    totalSales: 864000,
    description: 'エンドキャップ 80A',
    specifications: '耐圧: 12MPa, 温度範囲: -20～+120℃',
    drawingNumber: 'DWG-C250-080',
    status: 'inactive',
    createdDate: '2024-01-25',
    updatedDate: '2024-01-25'
  },
  {
    id: '8',
    productCode: 'V500-200-0300',
    productName: 'ボールバルブ 300A',
    category: 'バルブ',
    material: 'FCD400',
    unitWeight: 45.6,
    standardPrice: 85000,
    inventory: 5,
    monthlySales: 510000,
    totalSales: 4250000,
    description: 'ボールバルブ フル口径',
    specifications: '耐圧: 25MPa, 温度範囲: -10～+200℃',
    drawingNumber: 'DWG-V500-300',
    status: 'active',
    createdDate: '2024-01-03',
    updatedDate: '2024-01-03'
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
    customerType: '法人',
    monthlyOrders: 8,
    totalOrderAmount: 2450000,
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
    customerType: '法人',
    monthlyOrders: 12,
    totalOrderAmount: 3680000,
    status: 'active',
    createdDate: '2024-01-12',
    updatedDate: '2024-01-12'
  },
  {
    id: '3',
    customerCode: 'CUST003',
    companyName: 'エア機器株式会社',
    contactPerson: '佐藤健一',
    department: '技術部',
    email: 'sato@air-kiki.co.jp',
    phone: '052-789-0123',
    address: '愛知県名古屋市中区栄3-3-3',
    paymentTerms: '20日締め翌月末払い',
    creditLimit: 8000000,
    taxType: '外税',
    customerType: '法人',
    monthlyOrders: 16,
    totalOrderAmount: 5240000,
    status: 'active',
    createdDate: '2024-01-15',
    updatedDate: '2024-01-15'
  },
  {
    id: '4',
    customerCode: 'CUST004',
    companyName: 'コネクタ工業',
    contactPerson: '高橋美穂',
    department: '調達課',
    email: 'takahashi@connector.co.jp',
    phone: '092-456-7890',
    address: '福岡県福岡市博多区博多駅前4-4-4',
    paymentTerms: '月末締め翌月末払い',
    creditLimit: 6000000,
    taxType: '内税',
    customerType: '法人',
    monthlyOrders: 6,
    totalOrderAmount: 1890000,
    status: 'active',
    createdDate: '2024-01-18',
    updatedDate: '2024-01-18'
  },
  {
    id: '5',
    customerCode: 'CUST005',
    companyName: '北海道機械工業株式会社',
    contactPerson: '山田孝志',
    department: '購買部',
    email: 'yamada@hokkaido-machine.co.jp',
    phone: '011-234-5678',
    address: '北海道札幌市中央区大通西5-5-5',
    paymentTerms: '15日締め翌月20日払い',
    creditLimit: 12000000,
    taxType: '外税',
    customerType: '法人',
    monthlyOrders: 14,
    totalOrderAmount: 4320000,
    status: 'active',
    createdDate: '2024-01-05',
    updatedDate: '2024-01-05'
  },
  {
    id: '6',
    customerCode: 'CUST006',
    companyName: '九州エンジニアリング',
    contactPerson: '林恵子',
    department: '資材部',
    email: 'hayashi@kyushu-eng.co.jp',
    phone: '096-345-6789',
    address: '熊本県熊本市中央区水道町6-6-6',
    paymentTerms: '月末締め翌月末払い',
    creditLimit: 7500000,
    taxType: '内税',
    customerType: '法人',
    monthlyOrders: 10,
    totalOrderAmount: 2980000,
    status: 'active',
    createdDate: '2024-01-08',
    updatedDate: '2024-01-08'
  },
  {
    id: '7',
    customerCode: 'CUST007',
    companyName: '中部プラント工業',
    contactPerson: '小川直樹',
    department: '設計部',
    email: 'ogawa@chubu-plant.co.jp',
    phone: '054-567-8901',
    address: '静岡県静岡市葵区七番町7-7-7',
    paymentTerms: '25日締め翌月10日払い',
    creditLimit: 4500000,
    taxType: '外税',
    customerType: '個人事業主',
    monthlyOrders: 4,
    totalOrderAmount: 1250000,
    status: 'active',
    createdDate: '2024-01-22',
    updatedDate: '2024-01-22'
  },
  {
    id: '8',
    customerCode: 'CUST008',
    companyName: '東北システム株式会社',
    contactPerson: '伊藤誠',
    department: '製造部',
    email: 'ito@tohoku-system.co.jp',
    phone: '022-678-9012',
    address: '宮城県仙台市青葉区一番町8-8-8',
    paymentTerms: '月末締め翌月末払い',
    creditLimit: 3000000,
    taxType: '内税',
    customerType: '法人',
    monthlyOrders: 2,
    totalOrderAmount: 680000,
    status: 'inactive',
    createdDate: '2024-01-25',
    updatedDate: '2024-01-25'
  }
];

const App = () => {
  const [activeTab, setActiveTab] = useState('orders');
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-4 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold">🏭</span>
            </div>
            <h1 className="text-2xl font-bold">ステンレス鋳造管理システム - 完全版</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">システム稼働中</span>
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

export default App;