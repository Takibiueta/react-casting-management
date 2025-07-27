import * as pdfjsLib from 'pdfjs-dist';
import { generateOrderId } from './uniqueId';

// PDF.js worker を設定
const setupPdfWorker = () => {
  try {
    // pdfjs-dist v4では.mjsファイルを使用
    if (process.env.NODE_ENV === 'production') {
      // 本番環境ではCDNを使用
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
    } else {
      // 開発環境ではローカルファイルを使用
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
    }
    console.log('PDF worker configured successfully in pdfParser for v4');
  } catch (error) {
    console.warn('PDF Worker setup failed in pdfParser, falling back to main thread:', error);
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = null;
    } catch (fallbackError) {
      console.warn('Fallback also failed:', fallbackError);
    }
  }
};

// 初期化時にworkerを設定
setupPdfWorker();

// 日本語ビジネス文書用の正規表現パターン
const REGEX_PATTERNS = {
  // 注文番号
  orderNumber: [
    /注文番?号[\s:：]*([A-Z0-9\-]+)/i,
    /オーダー番?号[\s:：]*([A-Z0-9\-]+)/i,
    /受注番?号[\s:：]*([A-Z0-9\-]+)/i,
    /Order[\s:：]*No[\s.]*([A-Z0-9\-]+)/i,
    /発注番?号[\s:：]*([A-Z0-9\-]+)/i
  ],
  
  // 顧客名・会社名
  customer: [
    /(?:顧客名?|お客様|会社名|取引先)[\s:：]*([^。\n\r]+?)(?:\s|$)/,
    /(?:株式会社|有限会社|合同会社|合資会社|合名会社|一般社団法人|一般財団法人|公益社団法人|公益財団法人)([^。\n\r]+?)(?:\s|$)/,
    /([^\s]+(?:株式会社|有限会社|合同会社|Co\.,?\s*Ltd\.?))/i
  ],
  
  // 製品コード
  productCode: [
    /(?:品番|製品番号|部品番号|型番|Product[\s]*Code)[\s:：]*([A-Z0-9\-\.]+)/i,
    /(?:P|PN|Part[\s]*No)[\s:：\.]*([A-Z0-9\-\.]+)/i,
    /Model[\s:：]*([A-Z0-9\-\.]+)/i
  ],
  
  // 製品名
  productName: [
    /(?:品名|製品名|部品名|商品名|Product[\s]*Name)[\s:：]*([^。\n\r]+?)(?:\s|$)/i,
    /(?:コネクタ|バルブ|フランジ|エルボ|ティー|キャップ|継手)([^。\n\r]*?)(?:\s|$)/
  ],
  
  // 材質
  material: [
    /(S14|SUS304|SUS316L?|SCS13|SCS14|SCS16|FCD400|FCD450|SCPH2|FC200|FC250)/i,
    /材質[\s:：]*([A-Z0-9]+)/i,
    /Material[\s:：]*([A-Z0-9]+)/i
  ],
  
  // 重量
  unitWeight: [
    /(?:単重量?|Unit[\s]*Weight)[\s:：]*([0-9]+\.?[0-9]*)[\s]*(?:kg|KG)/i,
    /重量[\s:：]*([0-9]+\.?[0-9]*)[\s]*(?:kg|KG)/i,
    /([0-9]+\.?[0-9]*)[\s]*(?:kg|KG)/i
  ],
  
  // 数量
  quantity: [
    /(?:数量|個数|Quantity|Qty)[\s:：]*([0-9]+)/i,
    /([0-9]+)[\s]*(?:個|ケ|pcs?|pieces?)/i,
    /×[\s]*([0-9]+)/
  ],
  
  // 日付
  date: [
    /(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})[日]?/,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
  ],
  
  // 納期
  deliveryDate: [
    /(?:納期|納入日|Delivery[\s]*Date)[\s:：]*(\d{4}[年\/-]\d{1,2}[月\/-]\d{1,2}[日]?)/i,
    /(?:納期|納入日|Delivery[\s]*Date)[\s:：]*(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4})/i
  ]
};

/**
 * PDFファイルからテキストを抽出
 */
export const extractTextFromPDF = async (file) => {
  try {
    // Worker が設定されていない場合のフォールバック
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
      setupPdfWorker();
    }
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    
    let fullText = '';
    const pages = [];
    
    // 全ページからテキストを抽出
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      let pageText = '';
      textContent.items.forEach(item => {
        pageText += item.str + ' ';
      });
      
      pages.push({
        pageNum,
        text: pageText.trim()
      });
      
      fullText += pageText + '\n';
    }
    
    return {
      fullText: fullText.trim(),
      pages,
      numPages: pdf.numPages
    };
    
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw new Error(`PDF読み込みエラー: ${error.message}`);
  }
};

/**
 * 正規表現パターンでデータ抽出
 */
const extractWithPatterns = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1] ? match[1].trim() : match[0].trim();
    }
  }
  return null;
};

/**
 * 日付文字列を標準形式に変換
 */
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  // 年月日形式 (2024年12月25日)
  let match = dateStr.match(/(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})[日]?/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // MM/DD/YYYY形式
  match = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (match) {
    const [, month, day, year] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  // YYYY/MM/DD形式
  match = dateStr.match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (match) {
    const [, year, month, day] = match;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  
  return null;
};

/**
 * 抽出されたテキストから注文データを解析
 */
export const parseOrderData = (extractedText) => {
  const { fullText, pages } = extractedText;
  
  try {
    // 基本情報を抽出
    const orderNumber = extractWithPatterns(fullText, REGEX_PATTERNS.orderNumber) || '';
    const customer = extractWithPatterns(fullText, REGEX_PATTERNS.customer) || '';
    const productCode = extractWithPatterns(fullText, REGEX_PATTERNS.productCode) || '';
    const productName = extractWithPatterns(fullText, REGEX_PATTERNS.productName) || '';
    const material = extractWithPatterns(fullText, REGEX_PATTERNS.material) || 'S14';
    
    // 数値データを抽出・変換
    const unitWeightStr = extractWithPatterns(fullText, REGEX_PATTERNS.unitWeight);
    const unitWeight = unitWeightStr ? parseFloat(unitWeightStr) : 0;
    
    const quantityStr = extractWithPatterns(fullText, REGEX_PATTERNS.quantity);
    const quantity = quantityStr ? parseInt(quantityStr) : 1;
    
    // 日付を抽出・変換
    const deliveryDateStr = extractWithPatterns(fullText, REGEX_PATTERNS.deliveryDate);
    let deliveryDate = parseDate(deliveryDateStr);
    
    // 納期が見つからない場合は、一般的な日付パターンを探す
    if (!deliveryDate) {
      const generalDateStr = extractWithPatterns(fullText, REGEX_PATTERNS.date);
      deliveryDate = parseDate(generalDateStr);
    }
    
    // デフォルトの納期を設定（30日後）
    if (!deliveryDate) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      deliveryDate = futureDate.toISOString().split('T')[0];
    }
    
    // 抽出されたデータを返す
    const extractedData = {
      orderNumber: orderNumber || `PDF-${generateOrderId()}`,
      customer: customer || 'PDF抽出顧客',
      productCode: productCode || 'PDF-EXTRACT',
      productName: productName || 'PDF抽出製品',
      material: material.toUpperCase(),
      unitWeight,
      quantity,
      totalWeight: unitWeight * quantity,
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate,
      status: 'pending',
      notes: 'PDFから自動抽出されたデータ'
    };
    
    // 抽出品質の評価
    const extractionQuality = calculateExtractionQuality(extractedData, fullText);
    
    return {
      success: true,
      data: extractedData,
      extractionQuality,
      rawText: fullText,
      pages: pages.length,
      extractedFields: getExtractedFields(extractedData)
    };
    
  } catch (error) {
    console.error('Order data parsing error:', error);
    return {
      success: false,
      error: `データ解析エラー: ${error.message}`,
      rawText: fullText,
      pages: pages.length
    };
  }
};

/**
 * 抽出品質を評価
 */
const calculateExtractionQuality = (data, text) => {
  let score = 0;
  let maxScore = 0;
  
  const checks = [
    { field: 'orderNumber', weight: 15, hasValue: !!data.orderNumber && !data.orderNumber.startsWith('PDF-') },
    { field: 'customer', weight: 20, hasValue: !!data.customer && data.customer !== 'PDF抽出顧客' },
    { field: 'productCode', weight: 15, hasValue: !!data.productCode && data.productCode !== 'PDF-EXTRACT' },
    { field: 'productName', weight: 20, hasValue: !!data.productName && data.productName !== 'PDF抽出製品' },
    { field: 'material', weight: 10, hasValue: !!data.material && data.material !== 'S14' },
    { field: 'unitWeight', weight: 10, hasValue: data.unitWeight > 0 },
    { field: 'quantity', weight: 5, hasValue: data.quantity > 0 },
    { field: 'deliveryDate', weight: 5, hasValue: !!data.deliveryDate }
  ];
  
  checks.forEach(check => {
    maxScore += check.weight;
    if (check.hasValue) {
      score += check.weight;
    }
  });
  
  const percentage = Math.round(score / maxScore * 100);
  
  return {
    score: percentage,
    level: percentage >= 80 ? 'excellent' : percentage >= 60 ? 'good' : percentage >= 40 ? 'fair' : 'poor',
    extractedFieldCount: checks.filter(c => c.hasValue).length,
    totalFieldCount: checks.length
  };
};

/**
 * 抽出されたフィールドの詳細情報
 */
const getExtractedFields = (data) => {
  const fields = [];
  
  if (data.orderNumber && !data.orderNumber.startsWith('PDF-')) {
    fields.push({ name: '注文番号', value: data.orderNumber, confidence: 'high' });
  }
  if (data.customer && data.customer !== 'PDF抽出顧客') {
    fields.push({ name: '顧客名', value: data.customer, confidence: 'high' });
  }
  if (data.productCode && data.productCode !== 'PDF-EXTRACT') {
    fields.push({ name: '品番', value: data.productCode, confidence: 'high' });
  }
  if (data.productName && data.productName !== 'PDF抽出製品') {
    fields.push({ name: '品名', value: data.productName, confidence: 'high' });
  }
  if (data.material && data.material !== 'S14') {
    fields.push({ name: '材質', value: data.material, confidence: 'medium' });
  }
  if (data.unitWeight > 0) {
    fields.push({ name: '単重量', value: `${data.unitWeight}kg`, confidence: 'medium' });
  }
  if (data.quantity > 1) {
    fields.push({ name: '数量', value: `${data.quantity}個`, confidence: 'high' });
  }
  
  return fields;
};

/**
 * 複数ページのPDFから複数の注文データを抽出
 */
export const parseMultipleOrders = (extractedText) => {
  const { pages } = extractedText;
  const orders = [];
  
  // 各ページを個別に解析
  pages.forEach((page, index) => {
    const pageData = parseOrderData({ fullText: page.text, pages: [page] });
    
    if (pageData.success) {
      // ページ番号を注文番号に追加（新しいIDを生成）
      pageData.data.id = generateOrderId();
      pageData.data.orderNumber = `${pageData.data.orderNumber}-P${page.pageNum}`;
      pageData.data.notes = `PDFページ${page.pageNum}から抽出 - ${pageData.data.notes}`;
      orders.push(pageData.data);
    }
  });
  
  return orders.length > 0 ? orders : [parseOrderData(extractedText).data];
};