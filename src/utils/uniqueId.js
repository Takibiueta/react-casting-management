// ユニークID生成ユーティリティ

let idCounter = 0;

/**
 * ユニークなIDを生成する
 * @param {string} prefix - IDのプレフィックス（オプション）
 * @returns {string} ユニークなID
 */
export const generateUniqueId = (prefix = '') => {
  // タイムスタンプ + カウンター + ランダム文字列で確実にユニークなIDを生成
  const timestamp = Date.now();
  const counter = ++idCounter;
  const random = Math.random().toString(36).substr(2, 9);
  
  if (prefix) {
    return `${prefix}-${timestamp}-${counter}-${random}`;
  }
  
  return `${timestamp}-${counter}-${random}`;
};

/**
 * 注文用のユニークIDを生成
 * @returns {string} 注文用のユニークID
 */
export const generateOrderId = () => {
  return generateUniqueId('order');
};

/**
 * 製品用のユニークIDを生成
 * @returns {string} 製品用のユニークID
 */
export const generateProductId = () => {
  return generateUniqueId('product');
};

/**
 * 顧客用のユニークIDを生成
 * @returns {string} 顧客用のユニークID
 */
export const generateCustomerId = () => {
  return generateUniqueId('customer');
};

/**
 * ワークフロー用のユニークIDを生成
 * @returns {string} ワークフロー用のユニークID
 */
export const generateWorkflowId = () => {
  return generateUniqueId('workflow');
};

/**
 * 短縮ユニークIDを生成（表示用）
 * @param {string} prefix - IDのプレフィックス（オプション）
 * @returns {string} 短縮ユニークID
 */
export const generateShortId = (prefix = '') => {
  const timestamp = Date.now().toString(36);
  const counter = (++idCounter).toString(36);
  const random = Math.random().toString(36).substr(2, 4);
  
  if (prefix) {
    return `${prefix}-${timestamp}${counter}${random}`;
  }
  
  return `${timestamp}${counter}${random}`;
};

/**
 * 既存の配列内でユニークなIDを保証
 * @param {Array} existingItems - 既存のアイテム配列
 * @param {string} idField - IDフィールド名（デフォルト: 'id'）
 * @param {string} prefix - IDのプレフィックス（オプション）
 * @returns {string} 既存配列内でユニークなID
 */
export const generateUniqueIdForArray = (existingItems = [], idField = 'id', prefix = '') => {
  let newId;
  let attempts = 0;
  const maxAttempts = 100; // 無限ループ防止
  
  do {
    newId = generateUniqueId(prefix);
    attempts++;
    
    if (attempts > maxAttempts) {
      // フォールバック: タイムスタンプ + カウンター + より長いランダム文字列
      newId = `${prefix || 'fallback'}-${Date.now()}-${++idCounter}-${Math.random().toString(36).substr(2, 12)}`;
      break;
    }
  } while (existingItems.some(item => item[idField] === newId));
  
  return newId;
};

/**
 * IDの検証
 * @param {string} id - 検証するID
 * @returns {boolean} IDが有効かどうか
 */
export const isValidId = (id) => {
  return typeof id === 'string' && id.length > 0 && !id.includes('undefined') && !id.includes('null');
};

/**
 * 配列内のアイテムのIDをユニークにする
 * @param {Array} items - アイテム配列
 * @param {string} idField - IDフィールド名（デフォルト: 'id'）
 * @returns {Array} IDがユニークになったアイテム配列
 */
export const ensureUniqueIds = (items = [], idField = 'id') => {
  const seenIds = new Set();
  
  return items.map((item, index) => {
    let itemId = item[idField];
    
    // IDが無効または重複している場合は新しいIDを生成
    if (!isValidId(itemId) || seenIds.has(itemId)) {
      itemId = generateUniqueIdForArray(items.slice(0, index), idField, 'auto');
    }
    
    seenIds.add(itemId);
    
    return {
      ...item,
      [idField]: itemId
    };
  });
};