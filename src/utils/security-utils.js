// セキュリティユーティリティクラス - データ検証、CSRF対策、入力サニタイゼーション
import DOMPurify from 'dompurify';

// データ検証クラス
export class DataValidator {
  // 基本的な検証ルール
  static rules = {
    required: (value) => value !== null && value !== undefined && value !== '',
    email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    phone: (value) => /^[\d\-\+\(\)\s]+$/.test(value),
    number: (value) => !isNaN(Number(value)),
    positiveNumber: (value) => !isNaN(Number(value)) && Number(value) > 0,
    integer: (value) => Number.isInteger(Number(value)),
    date: (value) => !isNaN(Date.parse(value)),
    minLength: (min) => (value) => value && value.length >= min,
    maxLength: (max) => (value) => value && value.length <= max,
    pattern: (regex) => (value) => regex.test(value),
    alphanumeric: (value) => /^[a-zA-Z0-9]+$/.test(value),
    noScript: (value) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(value)
  };

  // 注文データの検証スキーマ
  static orderSchema = {
    orderNumber: [
      DataValidator.rules.required,
      DataValidator.rules.minLength(3),
      DataValidator.rules.maxLength(20),
      DataValidator.rules.alphanumeric
    ],
    customer: [
      DataValidator.rules.required,
      DataValidator.rules.minLength(2),
      DataValidator.rules.maxLength(100),
      DataValidator.rules.noScript
    ],
    productCode: [
      DataValidator.rules.required,
      DataValidator.rules.minLength(3),
      DataValidator.rules.maxLength(30),
      DataValidator.rules.pattern(/^[A-Z0-9\-_]+$/)
    ],
    productName: [
      DataValidator.rules.required,
      DataValidator.rules.minLength(2),
      DataValidator.rules.maxLength(200),
      DataValidator.rules.noScript
    ],
    material: [
      DataValidator.rules.required,
      (value) => ['S14', 'SCS', 'SUS304', 'SUS316', 'FCD400'].includes(value)
    ],
    unitWeight: [
      DataValidator.rules.required,
      DataValidator.rules.positiveNumber,
      (value) => Number(value) <= 10000 // 最大重量制限
    ],
    quantity: [
      DataValidator.rules.required,
      DataValidator.rules.integer,
      DataValidator.rules.positiveNumber,
      (value) => Number(value) <= 1000 // 最大数量制限
    ],
    orderDate: [
      DataValidator.rules.required,
      DataValidator.rules.date,
      (value) => new Date(value) <= new Date() // 未来日不可
    ],
    deliveryDate: [
      DataValidator.rules.required,
      DataValidator.rules.date,
      (value) => new Date(value) >= new Date() // 過去日不可
    ],
    status: [
      DataValidator.rules.required,
      (value) => ['pending', 'processing', 'completed', 'cancelled'].includes(value)
    ],
    notes: [
      DataValidator.rules.maxLength(500),
      DataValidator.rules.noScript
    ]
  };

  // 顧客データの検証スキーマ
  static customerSchema = {
    customerCode: [
      DataValidator.rules.required,
      DataValidator.rules.minLength(4),
      DataValidator.rules.maxLength(20),
      DataValidator.rules.pattern(/^CUST\d{3,}$/)
    ],
    companyName: [
      DataValidator.rules.required,
      DataValidator.rules.minLength(2),
      DataValidator.rules.maxLength(100),
      DataValidator.rules.noScript
    ],
    contactPerson: [
      DataValidator.rules.required,
      DataValidator.rules.minLength(2),
      DataValidator.rules.maxLength(50),
      DataValidator.rules.noScript
    ],
    email: [
      DataValidator.rules.required,
      DataValidator.rules.email
    ],
    phone: [
      DataValidator.rules.required,
      DataValidator.rules.phone
    ],
    address: [
      DataValidator.rules.required,
      DataValidator.rules.minLength(10),
      DataValidator.rules.maxLength(200),
      DataValidator.rules.noScript
    ]
  };

  // 製品データの検証スキーマ
  static productSchema = {
    productCode: [
      DataValidator.rules.required,
      DataValidator.rules.minLength(3),
      DataValidator.rules.maxLength(30),
      DataValidator.rules.pattern(/^P\d{3}-\d{3}-\d{4}$/)
    ],
    productName: [
      DataValidator.rules.required,
      DataValidator.rules.minLength(2),
      DataValidator.rules.maxLength(200),
      DataValidator.rules.noScript
    ],
    category: [
      DataValidator.rules.required,
      DataValidator.rules.minLength(2),
      DataValidator.rules.maxLength(50)
    ],
    unitWeight: [
      DataValidator.rules.required,
      DataValidator.rules.positiveNumber,
      (value) => Number(value) <= 10000
    ],
    standardPrice: [
      DataValidator.rules.required,
      DataValidator.rules.positiveNumber,
      (value) => Number(value) <= 10000000
    ]
  };

  // データ検証の実行
  static validate(data, schema) {
    const errors = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const fieldErrors = [];

      for (const rule of rules) {
        try {
          if (!rule(value)) {
            fieldErrors.push(this.getErrorMessage(field, rule, value));
            isValid = false;
          }
        } catch (error) {
          fieldErrors.push(`${field}: 検証エラー`);
          isValid = false;
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    return { isValid, errors };
  }

  // エラーメッセージの生成
  static getErrorMessage(field, rule, value) {
    const fieldNames = {
      orderNumber: '注文番号',
      customer: '顧客名',
      productCode: '品番',
      productName: '品名',
      material: '材質',
      unitWeight: '単重量',
      quantity: '数量',
      orderDate: '注文日',
      deliveryDate: '納期',
      status: 'ステータス',
      notes: '備考',
      customerCode: '顧客コード',
      companyName: '会社名',
      contactPerson: '担当者名',
      email: 'メールアドレス',
      phone: '電話番号',
      address: '住所'
    };

    const fieldName = fieldNames[field] || field;

    if (rule === DataValidator.rules.required) {
      return `${fieldName}は必須です`;
    }
    if (rule === DataValidator.rules.email) {
      return `${fieldName}の形式が正しくありません`;
    }
    if (rule === DataValidator.rules.phone) {
      return `${fieldName}の形式が正しくありません`;
    }
    if (rule === DataValidator.rules.positiveNumber) {
      return `${fieldName}は正の数値を入力してください`;
    }

    return `${fieldName}の値が無効です`;
  }

  // 注文データの検証
  static validateOrder(orderData) {
    return this.validate(orderData, this.orderSchema);
  }

  // 顧客データの検証
  static validateCustomer(customerData) {
    return this.validate(customerData, this.customerSchema);
  }

  // 製品データの検証
  static validateProduct(productData) {
    return this.validate(productData, this.productSchema);
  }
}

// 入力サニタイゼーションクラス
export class InputSanitizer {
  // HTMLの無害化
  static sanitizeHtml(input) {
    if (typeof input !== 'string') return input;
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }

  // SQLインジェクション対策
  static sanitizeSql(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/['";\\]/g, '');
  }

  // XSS対策
  static sanitizeXss(input) {
    if (typeof input !== 'string') return input;
    return input
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  // 数値の正規化
  static sanitizeNumber(input) {
    const number = parseFloat(input);
    return isNaN(number) ? 0 : number;
  }

  // 文字列の正規化
  static sanitizeString(input, maxLength = 1000) {
    if (typeof input !== 'string') return '';
    return this.sanitizeXss(input.trim().substring(0, maxLength));
  }

  // 注文データの一括サニタイゼーション
  static sanitizeOrderData(orderData) {
    return {
      orderNumber: this.sanitizeString(orderData.orderNumber, 20),
      customer: this.sanitizeString(orderData.customer, 100),
      productCode: this.sanitizeString(orderData.productCode, 30),
      productName: this.sanitizeString(orderData.productName, 200),
      material: this.sanitizeString(orderData.material, 20),
      unitWeight: this.sanitizeNumber(orderData.unitWeight),
      quantity: Math.floor(this.sanitizeNumber(orderData.quantity)),
      orderDate: orderData.orderDate,
      deliveryDate: orderData.deliveryDate,
      status: this.sanitizeString(orderData.status, 20),
      notes: this.sanitizeString(orderData.notes, 500)
    };
  }

  // 顧客データの一括サニタイゼーション
  static sanitizeCustomerData(customerData) {
    return {
      customerCode: this.sanitizeString(customerData.customerCode, 20),
      companyName: this.sanitizeString(customerData.companyName, 100),
      contactPerson: this.sanitizeString(customerData.contactPerson, 50),
      department: this.sanitizeString(customerData.department, 50),
      email: this.sanitizeString(customerData.email, 100),
      phone: this.sanitizeString(customerData.phone, 20),
      address: this.sanitizeString(customerData.address, 200),
      paymentTerms: this.sanitizeString(customerData.paymentTerms, 100),
      creditLimit: this.sanitizeNumber(customerData.creditLimit),
      taxType: this.sanitizeString(customerData.taxType, 10)
    };
  }
}

// CSRF保護クラス
export class CSRFProtection {
  static tokenKey = 'csrf_token';
  static tokenHeaderName = 'X-CSRF-Token';

  // CSRFトークンの生成
  static generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  // CSRFトークンの設定
  static setToken() {
    const token = this.generateToken();
    sessionStorage.setItem(this.tokenKey, token);
    return token;
  }

  // CSRFトークンの取得
  static getToken() {
    let token = sessionStorage.getItem(this.tokenKey);
    if (!token) {
      token = this.setToken();
    }
    return token;
  }

  // CSRFトークンの検証
  static verifyToken(receivedToken) {
    const storedToken = sessionStorage.getItem(this.tokenKey);
    return storedToken && receivedToken && storedToken === receivedToken;
  }

  // APIリクエストにCSRFトークンを追加
  static addTokenToRequest(requestOptions = {}) {
    const token = this.getToken();
    return {
      ...requestOptions,
      headers: {
        ...requestOptions.headers,
        [this.tokenHeaderName]: token
      }
    };
  }

  // フォームデータにCSRFトークンを追加
  static addTokenToFormData(formData) {
    const token = this.getToken();
    if (formData instanceof FormData) {
      formData.append(this.tokenKey, token);
    } else {
      formData[this.tokenKey] = token;
    }
    return formData;
  }
}

// セキュアなローカルストレージクラス
export class SecureStorage {
  static keyPrefix = 'secure_';
  static encryptionKey = null;

  // 暗号化キーの初期化
  static async initializeKey() {
    if (!this.encryptionKey) {
      this.encryptionKey = await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    }
  }

  // データの暗号化
  static async encrypt(data) {
    await this.initializeKey();
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(JSON.stringify(data));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encryptedData = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      dataBuffer
    );

    return {
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(encryptedData))
    };
  }

  // データの復号化
  static async decrypt(encryptedObj) {
    await this.initializeKey();
    const iv = new Uint8Array(encryptedObj.iv);
    const data = new Uint8Array(encryptedObj.data);

    const decryptedData = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      this.encryptionKey,
      data
    );

    const decoder = new TextDecoder();
    return JSON.parse(decoder.decode(decryptedData));
  }

  // セキュアなデータ保存
  static async setItem(key, value) {
    try {
      const encryptedData = await this.encrypt(value);
      localStorage.setItem(this.keyPrefix + key, JSON.stringify(encryptedData));
    } catch (error) {
      console.error('セキュアストレージ保存エラー:', error);
      // フォールバック：暗号化なしで保存（開発環境のみ）
      if (process.env.NODE_ENV === 'development') {
        localStorage.setItem(key, JSON.stringify(value));
      }
    }
  }

  // セキュアなデータ取得
  static async getItem(key) {
    try {
      const encryptedDataStr = localStorage.getItem(this.keyPrefix + key);
      if (!encryptedDataStr) return null;

      const encryptedData = JSON.parse(encryptedDataStr);
      return await this.decrypt(encryptedData);
    } catch (error) {
      console.error('セキュアストレージ取得エラー:', error);
      // フォールバック：通常のローカルストレージから取得
      const fallbackData = localStorage.getItem(key);
      return fallbackData ? JSON.parse(fallbackData) : null;
    }
  }

  // セキュアなデータ削除
  static removeItem(key) {
    localStorage.removeItem(this.keyPrefix + key);
    localStorage.removeItem(key); // フォールバック用も削除
  }
}

// セキュリティ監査クラス
export class SecurityAuditor {
  static violations = [];
  static maxViolations = 100;

  // セキュリティ違反の記録
  static recordViolation(type, details) {
    const violation = {
      type,
      details,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    this.violations.unshift(violation);
    if (this.violations.length > this.maxViolations) {
      this.violations = this.violations.slice(0, this.maxViolations);
    }

    // 重要な違反はコンソールに出力
    if (['xss_attempt', 'sql_injection', 'csrf_violation'].includes(type)) {
      console.warn('セキュリティ違反検出:', violation);
    }
  }

  // 入力値の監査
  static auditInput(input, context) {
    if (typeof input !== 'string') return;

    // XSS攻撃の検出
    if (/<script|javascript:|on\w+=/i.test(input)) {
      this.recordViolation('xss_attempt', { input, context });
    }

    // SQLインジェクションの検出
    if (/(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b)/i.test(input)) {
      this.recordViolation('sql_injection', { input, context });
    }

    // 異常に長い入力の検出
    if (input.length > 10000) {
      this.recordViolation('excessive_input', { length: input.length, context });
    }
  }

  // 違反履歴の取得
  static getViolations(type = null) {
    if (type) {
      return this.violations.filter(v => v.type === type);
    }
    return this.violations;
  }

  // 違反履歴のクリア
  static clearViolations() {
    this.violations = [];
  }
}

// セキュリティ初期化関数
export const initializeSecurity = () => {
  // CSRFトークンの初期化
  CSRFProtection.setToken();

  // セキュアストレージの初期化
  SecureStorage.initializeKey().catch(error => {
    console.warn('セキュアストレージの初期化に失敗しました:', error);
  });

  // グローバルなセキュリティイベントリスナーの設定
  window.addEventListener('beforeunload', () => {
    // ページ離脱時のクリーンアップ
    CSRFProtection.setToken(); // 新しいトークンを生成
  });

  // 開発環境でのセキュリティ警告表示
  if (process.env.NODE_ENV === 'development') {
    console.log('🔒 セキュリティ機能が初期化されました');
  }
};

// セキュリティヘルパー関数
export const securityHelpers = {
  // 安全なJSONパース
  safeJsonParse: (jsonString, defaultValue = null) => {
    try {
      const parsed = JSON.parse(jsonString);
      SecurityAuditor.auditInput(jsonString, 'json_parse');
      return parsed;
    } catch (error) {
      console.warn('JSON解析エラー:', error);
      return defaultValue;
    }
  },

  // 安全なURL構築
  buildSafeUrl: (baseUrl, params = {}) => {
    const url = new URL(baseUrl);
    Object.keys(params).forEach(key => {
      const value = InputSanitizer.sanitizeString(params[key]);
      url.searchParams.append(key, value);
    });
    return url.toString();
  },

  // レート制限チェック
  checkRateLimit: (key, maxRequests = 10, timeWindow = 60000) => {
    const now = Date.now();
    const requests = JSON.parse(sessionStorage.getItem(`rate_limit_${key}`) || '[]');
    
    // 時間窓外のリクエストを削除
    const validRequests = requests.filter(timestamp => now - timestamp < timeWindow);
    
    if (validRequests.length >= maxRequests) {
      SecurityAuditor.recordViolation('rate_limit_exceeded', { key, requests: validRequests.length });
      return false;
    }

    validRequests.push(now);
    sessionStorage.setItem(`rate_limit_${key}`, JSON.stringify(validRequests));
    return true;
  }
};