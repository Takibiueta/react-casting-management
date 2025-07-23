import { useState, useEffect, useCallback } from 'react';

// 初期データ
const initialOrders = [
  {
    id: 1,
    priority: 1,
    orderNumber: 'MN002BUV',
    customerName: '株式会社テクノロジー',
    productCode: 'P815-110-0162',
    productName: 'コネクタ VLN-15',
    material: 'S14',
    unitWeight: 13.2,
    quantity: 2,
    totalWeight: 26.4,
    orderDate: '2025-01-15',
    deliveryDate: '2025-01-31',
    daysRemaining: -4,
    status: 'waiting',
    notes: '25.4.9在庫3ケ仕上済'
  },
  {
    id: 2,
    priority: 2,
    orderNumber: 'MH002BVD',
    customerName: '山田工業株式会社',
    productCode: 'P895-110-0163',
    productName: 'コネクタ VLN-5',
    material: 'S14',
    unitWeight: 7.3,
    quantity: 16,
    totalWeight: 116.8,
    orderDate: '2025-01-10',
    deliveryDate: '2025-02-28',
    daysRemaining: 24,
    status: 'waiting',
    notes: ''
  },
  {
    id: 3,
    priority: 3,
    orderNumber: '-',
    customerName: '鈴木製作所',
    productCode: 'SCH11',
    productName: 'エアレジメンテ（2個セット）',
    material: 'S13',
    unitWeight: 10.5,
    quantity: 16,
    totalWeight: 168.0,
    orderDate: '2025-01-05',
    deliveryDate: '2025-03-21',
    daysRemaining: 45,
    status: 'waiting',
    notes: ''
  }
];

const initialProducts = [
  {
    id: 1,
    productCode: 'P815-110-0162',
    productName: 'コネクタ VLN-15',
    category: 'コネクタ',
    material: 'S14',
    unitWeight: 13.2,
    standardPrice: 15000,
    description: '高圧用ステンレスコネクタ',
    specifications: 'φ15mm, 耐圧1.5MPa',
    drawingNumber: 'D-VLN-15-001',
    status: 'active',
    createdDate: '2024-01-15',
    modifiedDate: '2024-12-01'
  },
  {
    id: 2,
    productCode: 'P895-110-0163',
    productName: 'コネクタ VLN-5',
    category: 'コネクタ',
    material: 'S14',
    unitWeight: 7.3,
    standardPrice: 8500,
    description: '中圧用ステンレスコネクタ',
    specifications: 'φ5mm, 耐圧1.0MPa',
    drawingNumber: 'D-VLN-5-001',
    status: 'active',
    createdDate: '2024-02-10',
    modifiedDate: '2024-11-15'
  },
  {
    id: 3,
    productCode: 'SCH11',
    productName: 'エアレジメンテ（2個セット）',
    category: 'バルブ',
    material: 'S13',
    unitWeight: 10.5,
    standardPrice: 22000,
    description: 'エア調整用レジデューサ',
    specifications: '2個1組、φ8mm',
    drawingNumber: 'D-SCH11-001',
    status: 'active',
    createdDate: '2024-03-05',
    modifiedDate: '2024-10-20'
  },
  {
    id: 4,
    productCode: 'P893-110-0162',
    productName: 'コネクタ VLN-3（4個セット）',
    category: 'コネクタ',
    material: 'S13',
    unitWeight: 6.0,
    standardPrice: 18000,
    description: '小径ステンレスコネクタセット',
    specifications: 'φ3mm×4個, 耐圧0.8MPa',
    drawingNumber: 'D-VLN-3-001',
    status: 'active',
    createdDate: '2024-04-20',
    modifiedDate: '2024-09-30'
  }
];

const initialCustomers = [
  {
    id: 1,
    customerCode: 'TECH001',
    companyName: '株式会社テクノロジー',
    contactPerson: '田中太郎',
    department: '調達部',
    phoneNumber: '03-1234-5678',
    email: 'tanaka@technology.co.jp',
    address: '東京都港区芝1-2-3',
    customerType: 'direct',
    paymentTerms: 'net30',
    status: 'active',
    notes: '主力取引先',
    totalOrders: 15,
    lastOrderDate: '2025-01-15',
    createdDate: '2024-01-10',
    modifiedDate: '2024-12-15'
  },
  {
    id: 2,
    customerCode: 'YAMA002',
    companyName: '山田工業株式会社',
    contactPerson: '山田花子',
    department: '購買課',
    phoneNumber: '06-2345-6789',
    email: 'yamada@yamada-ind.co.jp',
    address: '大阪府大阪市北区梅田2-3-4',
    customerType: 'direct',
    paymentTerms: 'net60',
    status: 'active',
    notes: '月次定期発注',
    totalOrders: 8,
    lastOrderDate: '2025-01-10',
    createdDate: '2024-02-20',
    modifiedDate: '2024-11-10'
  },
  {
    id: 3,
    customerCode: 'SUZU003',
    companyName: '鈴木製作所',
    contactPerson: '鈴木一郎',
    department: '製造部',
    phoneNumber: '052-3456-7890',
    email: 'suzuki@suzuki-mfg.co.jp',
    address: '愛知県名古屋市中区栄3-4-5',
    customerType: 'distributor',
    paymentTerms: 'net30',
    status: 'active',
    notes: '特注品対応可能',
    totalOrders: 12,
    lastOrderDate: '2025-01-05',
    createdDate: '2024-03-15',
    modifiedDate: '2024-10-25'
  }
];

const useDataManager = () => {
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);

  // LocalStorage キー
  const STORAGE_KEYS = {
    ORDERS: 'castingOrders',
    PRODUCTS: 'castingProducts',
    CUSTOMERS: 'castingCustomers'
  };

  // データ読み込み
  const loadData = useCallback(() => {
    try {
      const savedOrders = localStorage.getItem(STORAGE_KEYS.ORDERS);
      const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const savedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);

      const ordersData = savedOrders ? JSON.parse(savedOrders) : initialOrders;
      const productsData = savedProducts ? JSON.parse(savedProducts) : initialProducts;
      const customersData = savedCustomers ? JSON.parse(savedCustomers) : initialCustomers;

      // 残日数を再計算
      const updatedOrders = ordersData.map(order => ({
        ...order,
        daysRemaining: Math.ceil((new Date(order.deliveryDate) - new Date()) / (1000 * 60 * 60 * 24))
      }));

      setOrders(updatedOrders);
      setProducts(productsData);
      setCustomers(customersData);
      setFilteredOrders(updatedOrders);
      setFilteredProducts(productsData);
      setFilteredCustomers(customersData);

    } catch (error) {
      console.error('データ読み込みエラー:', error);
      // エラー時は初期データを使用
      setOrders(initialOrders);
      setProducts(initialProducts);
      setCustomers(initialCustomers);
      setFilteredOrders(initialOrders);
      setFilteredProducts(initialProducts);
      setFilteredCustomers(initialCustomers);
    }
  }, [STORAGE_KEYS.ORDERS, STORAGE_KEYS.PRODUCTS, STORAGE_KEYS.CUSTOMERS]);

  // データ保存
  const saveData = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.ORDERS, JSON.stringify(orders));
      localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    } catch (error) {
      console.error('データ保存エラー:', error);
    }
  }, [orders, products, customers, STORAGE_KEYS]);

  // 初期化
  useEffect(() => {
    loadData();
  }, [loadData]);

  // データ変更時の自動保存
  useEffect(() => {
    if (orders.length > 0 || products.length > 0 || customers.length > 0) {
      saveData();
    }
  }, [orders, products, customers, saveData]);

  // 注文管理
  const addOrder = useCallback((newOrder) => {
    const orderWithId = {
      ...newOrder,
      id: Math.max(...orders.map(o => o.id), 0) + 1,
      daysRemaining: Math.ceil((new Date(newOrder.deliveryDate) - new Date()) / (1000 * 60 * 60 * 24))
    };
    const updatedOrders = [...orders, orderWithId];
    setOrders(updatedOrders);
    setFilteredOrders(updatedOrders);
  }, [orders]);

  const updateOrder = useCallback((updatedOrder) => {
    const orderWithDays = {
      ...updatedOrder,
      daysRemaining: Math.ceil((new Date(updatedOrder.deliveryDate) - new Date()) / (1000 * 60 * 60 * 24))
    };
    const updatedOrders = orders.map(order => 
      order.id === updatedOrder.id ? orderWithDays : order
    );
    setOrders(updatedOrders);
    setFilteredOrders(updatedOrders);
  }, [orders]);

  const deleteOrder = useCallback((orderId) => {
    const updatedOrders = orders.filter(order => order.id !== orderId);
    setOrders(updatedOrders);
    setFilteredOrders(updatedOrders);
  }, [orders]);

  // 製品管理
  const addProduct = useCallback((newProduct) => {
    const productWithId = {
      ...newProduct,
      id: Math.max(...products.map(p => p.id), 0) + 1,
      createdDate: new Date().toISOString().split('T')[0],
      modifiedDate: new Date().toISOString().split('T')[0]
    };
    const updatedProducts = [...products, productWithId];
    setProducts(updatedProducts);
    setFilteredProducts(updatedProducts);
  }, [products]);

  const updateProduct = useCallback((updatedProduct) => {
    const productWithDate = {
      ...updatedProduct,
      modifiedDate: new Date().toISOString().split('T')[0]
    };
    const updatedProducts = products.map(product => 
      product.id === updatedProduct.id ? productWithDate : product
    );
    setProducts(updatedProducts);
    setFilteredProducts(updatedProducts);
  }, [products]);

  const deleteProduct = useCallback((productId) => {
    const updatedProducts = products.filter(product => product.id !== productId);
    setProducts(updatedProducts);
    setFilteredProducts(updatedProducts);
  }, [products]);

  // 取引先管理
  const addCustomer = useCallback((newCustomer) => {
    const customerWithId = {
      ...newCustomer,
      id: Math.max(...customers.map(c => c.id), 0) + 1,
      totalOrders: 0,
      lastOrderDate: null,
      createdDate: new Date().toISOString().split('T')[0],
      modifiedDate: new Date().toISOString().split('T')[0]
    };
    const updatedCustomers = [...customers, customerWithId];
    setCustomers(updatedCustomers);
    setFilteredCustomers(updatedCustomers);
  }, [customers]);

  const updateCustomer = useCallback((updatedCustomer) => {
    const customerWithDate = {
      ...updatedCustomer,
      modifiedDate: new Date().toISOString().split('T')[0]
    };
    const updatedCustomers = customers.map(customer => 
      customer.id === updatedCustomer.id ? customerWithDate : customer
    );
    setCustomers(updatedCustomers);
    setFilteredCustomers(updatedCustomers);
  }, [customers]);

  const deleteCustomer = useCallback((customerId) => {
    const updatedCustomers = customers.filter(customer => customer.id !== customerId);
    setCustomers(updatedCustomers);
    setFilteredCustomers(updatedCustomers);
  }, [customers]);

  // 統計計算
  const calculateStatistics = useCallback((data) => {
    if (!data || data.length === 0) {
      return {
        totalItems: 0,
        totalWeight: 0,
        urgentOrders: 0,
        overdueOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        inProgressOrders: 0,
        recommendedBatches: 0,
        materialBreakdown: {},
        averageWeight: 0,
        averageDeliveryDays: 0
      };
    }

    const stats = {
      totalItems: data.length,
      totalWeight: data.reduce((sum, item) => sum + (item.totalWeight || 0), 0),
      urgentOrders: data.filter(item => item.daysRemaining < 7).length,
      overdueOrders: data.filter(item => item.daysRemaining < 0).length,
      completedOrders: data.filter(item => item.status === 'completed').length,
      pendingOrders: data.filter(item => item.status === 'waiting').length,
      inProgressOrders: data.filter(item => item.status === 'in-progress').length,
      materialBreakdown: {},
      averageWeight: 0,
      averageDeliveryDays: 0
    };

    // 材質別集計
    data.forEach(item => {
      const material = item.material || 'Unknown';
      if (!stats.materialBreakdown[material]) {
        stats.materialBreakdown[material] = { count: 0, totalWeight: 0 };
      }
      stats.materialBreakdown[material].count++;
      stats.materialBreakdown[material].totalWeight += item.totalWeight || 0;
    });

    // 平均値計算
    if (data.length > 0) {
      stats.averageWeight = stats.totalWeight / data.length;
      stats.averageDeliveryDays = data.reduce((sum, item) => sum + (item.daysRemaining || 0), 0) / data.length;
    }

    // 推奨バッチ数（300kg単位）
    stats.recommendedBatches = Math.ceil(stats.totalWeight / 300);

    return stats;
  }, []);

  // CSV エクスポート
  const exportToCSV = useCallback((data, type) => {
    let headers = [];
    let rows = [];

    switch (type) {
      case 'orders':
        headers = [
          '優先度', '注文番号', '顧客名', '品名', '品番', '材質', 
          '単重量(kg)', '数量', '総重量(kg)', 'ステータス', 
          '注文日', '納期', '残日数', '備考'
        ];
        rows = data.map(order => [
          order.priority,
          `"${order.orderNumber || ''}"`,
          `"${order.customerName || ''}"`,
          `"${order.productName || ''}"`,
          `"${order.productCode || ''}"`,
          order.material,
          order.unitWeight,
          order.quantity,
          order.totalWeight,
          order.status === 'waiting' ? '未着手' : 
          order.status === 'in-progress' ? '進行中' : '完了',
          order.orderDate,
          order.deliveryDate,
          order.daysRemaining,
          `"${order.notes || ''}"`
        ]);
        break;
      case 'products':
        headers = [
          'ID', '製品コード', '製品名', 'カテゴリ', '材質',
          '単重量(kg)', '標準価格', '説明', '仕様', '図面番号',
          'ステータス', '作成日', '更新日'
        ];
        rows = data.map(product => [
          product.id,
          `"${product.productCode || ''}"`,
          `"${product.productName || ''}"`,
          product.category,
          product.material,
          product.unitWeight,
          product.standardPrice,
          `"${product.description || ''}"`,
          `"${product.specifications || ''}"`,
          `"${product.drawingNumber || ''}"`,
          product.status === 'active' ? 'アクティブ' : '非アクティブ',
          product.createdDate,
          product.modifiedDate
        ]);
        break;
      case 'customers':
        headers = [
          'ID', '取引先コード', '会社名', '担当者', '部署', '電話番号',
          'メール', '住所', '取引先種別', '支払条件', 'ステータス',
          '総注文数', '最終注文日', '備考', '作成日', '更新日'
        ];
        rows = data.map(customer => [
          customer.id,
          `"${customer.customerCode || ''}"`,
          `"${customer.companyName || ''}"`,
          `"${customer.contactPerson || ''}"`,
          `"${customer.department || ''}"`,
          `"${customer.phoneNumber || ''}"`,
          `"${customer.email || ''}"`,
          `"${customer.address || ''}"`,
          customer.customerType,
          customer.paymentTerms,
          customer.status === 'active' ? 'アクティブ' : '非アクティブ',
          customer.totalOrders,
          customer.lastOrderDate || '',
          `"${customer.notes || ''}"`,
          customer.createdDate,
          customer.modifiedDate
        ]);
        break;
      default:
        return '';
    }

    const csvContent = [
      '\uFEFF' + headers.join(','), // BOM付きヘッダー
      ...rows.map(row => row.join(','))
    ].join('\n');

    return csvContent;
  }, []);

  const downloadCSV = useCallback((csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }, []);

  return {
    // データ
    orders,
    products,
    customers,
    filteredOrders,
    filteredProducts,
    filteredCustomers,
    setFilteredOrders,
    setFilteredProducts,
    setFilteredCustomers,
    
    // CRUD操作
    addOrder,
    updateOrder,
    deleteOrder,
    addProduct,
    updateProduct,
    deleteProduct,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    
    // ユーティリティ
    calculateStatistics,
    exportToCSV,
    downloadCSV,
    loadData,
    saveData
  };
};

export default useDataManager;