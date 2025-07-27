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

// 日本語ビジネス文書用の正規表現パターン（index.htmlの詳細パターンを移植）
const REGEX_PATTERNS = {
  // 注文番号（より多様なパターン）
  orderNumber: [
    /受注N[09][:：]?\s*(\d+)/i,                    // 受注N9：12345
    /受注番号[:：]\s*([A-Z0-9\-]+)/i,              // 受注番号：ABC123
    /注文番?号[:：\s]*([A-Z0-9\-]+)/i,             // 注文番号：123-456
    /Order\s*No\.?\s*[:：]?\s*([A-Z0-9\-]+)/i,    // Order No: ORD123
    /発注番?号[:：\s]*([A-Z0-9\-\s]+)/i,           // 発注番号：39 83 81 (スペース含む)
    /発注№[:：\s]*([A-Z0-9\-\s]+)/i,               // 発注№：39 83 81
    /NO\.?\s*[:：]?\s*([A-Z0-9\-]+)/i,            // NO: 123456
    /管理番号[:：\s]*([A-Z0-9\-]+)/i,              // 管理番号：MGT123
    /([0-9]{8})/g,                                // 8桁の数字 (00000142)
    /([0-9]{2}\s+[0-9]{2}\s+[0-9]{2})/g,         // スペース区切りの番号 (39 83 81)
    /(\d{8})/g,                                   // 8桁連続数字の改良版
    /([0-9]+\s+[0-9]+\s+[0-9]+)/g,               // 複数桁スペース区切り番号
    /^[\s]*([0-9]{8,})[\s]*$/m,                  // 行頭から8桁以上の数字
    /発注\s*№?\s*[:：]?\s*([A-Z0-9\-\s]+?)[\s\n]/i, // 発注№の改良版
    /受注\s*N[Oo0]?\s*[:：]?\s*([A-Z0-9\-\s]+?)[\s\n]/i // 受注No の改良版
  ],
  
  // 顧客名・会社名（より詳細）
  customer: [
    /得意先名?[:：\s]*([^\n\r]+)/i,                     // 得意先名：XX株式会社
    /顧客名?[:：\s]*([^\n\r]+)/i,                       // 顧客名：XX株式会社
    /お客様[:：\s]*([^\n\r]+)/i,                        // お客様：XX株式会社
    /Customer[:：\s]*([^\n\r]+)/i,                      // Customer: XX Corp
    /([株式会社|有限会社|合同会社][^\s\n\r]{2,20})/,     // 株式会社XXXX
    /([A-Z][a-z]+\s*[A-Z][a-z]+\s*(?:株式会社|Corp|Ltd))/,
    /([株][^\s\n\r]{2,15})/,                           // 株XXXX
    /([\u4e00-\u9faf]+(?:株式会社|有限会社|合同会社))/  // 漢字+会社名
  ],
  
  // 製品コード（index.htmlの詳細パターン）
  productCode: [
    /品番[:：\s]*([A-Z0-9\-ｼ]+)/i,                       // 品番：7-B7912-2
    /型番[:：\s]*([A-Z0-9\-ｼ]+)/i,                       // 型番：ABC-123
    /Part\s*No\.?\s*[:：]?\s*([A-Z0-9\-ｼ]+)/i,          // Part No: 123-456
    /製品番号[:：\s]*([A-Z0-9\-ｼ]+)/i,                   // 製品番号：PRD123
    /品目\s*\(\s*([0-9]+\-[A-Z]+[0-9]+[\-ｼ]*[0-9]*)\s*\)/i, // 品目 (7-B7912-ｼ) 形式
    /([0-9]+\-[A-Z]+[0-9]+[\-ｼ]*[0-9]*)/g,              // 7-B7912-2 または 7-B7912-ｼ 形式
    /([A-Z]+[0-9]+\-[0-9]+\-[0-9]+)/g,                   // ABC123-45-6 形式
    /([A-Z]+\-[0-9]+\-[A-Z0-9]+)/g,                      // ABC-123-XYZ 形式
    /(P[0-9]+\-[0-9]+\-[0-9]+)/g,                        // P815-110-0162 形式
    /(7\-B7\s*9\s*12[\-ｼ]*)/g,                          // スペース入りパターン 7-B7 9 12-ｼ
    /([0-9]+[\-\s]*[A-Z]+[0-9]+[\-\s]*ｼ)/i,             // 7-B7912-ｼ のような特殊文字含む
    /^[\s]*([0-9]+\-[A-Z]+[0-9]+[\-ｼ]+[0-9]*)[\s]*$/m   // 行独立の品番パターン
  ],
  
  // 製品名（より詳細）
  productName: [
    /品名[:：\s]*([^\n\r]+)/i,                           // 品名：コネクタ VLN-15
    /製品名[:：\s]*([^\n\r]+)/i,                         // 製品名：フランジ
    /部品名[:：\s]*([^\n\r]+)/i,                         // 部品名：ボルト
    /名称[:：\s]*([^\n\r]+)/i,                           // 名称：ガスケット
    /品目[^(]*\([^)]*\)\s*\*?\s*([ｱ-ﾝｼﾘﾝﾀﾞ][^【\n\r]*)/i, // 品目 (7-B7912-ｼ) * ｼﾘﾝﾀﾞ(ﾍｲｶﾞﾜ)
    /(ｼﾘﾝﾀﾞ[^【\n\r]*\([^)]*\))/i,                      // ｼﾘﾝﾀﾞ(ﾍｲｶﾞﾜ) 改良版
    /(ｼﾘﾝﾀﾞ[^【\n\r]*)/i,                              // ｼﾘﾝﾀﾞXXX
    /(コネクタ[^\n\r]*)/i,                               // コネクタ XXX
    /(フランジ[^\n\r]*)/i,                               // フランジ XXX
    /(ボルト[^\n\r]*)/i,                                 // ボルト XXX
    /(ナット[^\n\r]*)/i,                                 // ナット XXX
    /(ガスケット[^\n\r]*)/i,                             // ガスケット XXX
    /(継手[^\n\r]*)/i,                                   // 継手 XXX
    /(バルブ[^\n\r]*)/i,                                 // バルブ XXX
    /(シリンダ[^\n\r]*)/i                                // シリンダ XXX
  ],
  
  // 材質（より詳細）
  material: [
    /材質[:：\s]*(S1[34]|SUS30[0-9]L?|FCD[0-9]{3}|SCPH[0-9]+|SCS1[34]|FC[0-9]{3})/i,
    /材料[:：\s]*(S1[34]|SUS30[0-9]L?|FCD[0-9]{3}|SCPH[0-9]+|SCS1[34]|FC[0-9]{3})/i,
    /Material[:：\s]*(S1[34]|SUS30[0-9]L?|FCD[0-9]{3}|SCPH[0-9]+|SCS1[34]|FC[0-9]{3})/i,
    /(S14|S13|SUS304|SUS316L?|FCD400|FCD450|SCPH2|SCS13|SCS14|FC200|FC250)/g,
    /ステンレス[:：\s]*(S1[34]|SUS30[0-9]L?)/i,
    /(F\s*C\s*D\s*[0-9]+\s*[\-0-9]*|F\s*C\s*[0-9]+\s*[\-0-9]*|S\s*C\s*P\s*H\s*[0-9]+\s*[\-0-9]*)/i
  ],
  
  // 重量（より詳細）
  unitWeight: [
    /単重量?[:：\s]*([0-9]+\.?[0-9]*)\s*(?:kg|KG|ｋｇ)/i,
    /重量[:：\s]*([0-9]+\.?[0-9]*)\s*(?:kg|KG|ｋｇ)/i,
    /Weight[:：\s]*([0-9]+\.?[0-9]*)\s*(?:kg|KG)/i,
    /([0-9]+\.?[0-9]*)\s*(?:kg|KG|ｋｇ)/i,
    /([0-9]+\.?[0-9]*)\s*㎏/,
    /重[:：\s]*([0-9]+\.?[0-9]*)/i
  ],
  
  // 数量（より詳細）
  quantity: [
    /数量[:：\s]*([0-9]+)\s*(?:個|ケ|pcs?|pieces?)/i,
    /個数[:：\s]*([0-9]+)/i,
    /Quantity[:：\s]*([0-9]+)/i,
    /Qty[:：\s]*([0-9]+)/i,
    /([0-9]+)\s*(?:個|ケ|pcs?|pieces?)/i,
    /×\s*([0-9]+)/i,
    /数[:：\s]*([0-9]+)/i
  ],
  
  // 日付
  date: [
    /(\d{4})[年\/-](\d{1,2})[月\/-](\d{1,2})[日]?/,
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/
  ],
  
  // 納期（より詳細）
  deliveryDate: [
    /納期[:：\s]*([0-9]{4}[年\/-][0-9]{1,2}[月\/-][0-9]{1,2}[日]?)/i,
    /納入日[:：\s]*([0-9]{4}[年\/-][0-9]{1,2}[月\/-][0-9]{1,2}[日]?)/i,
    /希望納期[:：\s]*([0-9]{4}[年\/-][0-9]{1,2}[月\/-][0-9]{1,2}[日]?)/i,
    /Delivery\s*Date[:：\s]*([0-9]{4}[年\/-][0-9]{1,2}[月\/-][0-9]{1,2}[日]?)/i
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
 * 抽出されたテキストから注文データを解析（詳細版）
 */
export const parseOrderData = (extractedText) => {
  const { fullText, pages } = extractedText;
  
  try {
    console.log('=== pdfParser解析開始 ===');
    console.log('抽出テキスト（最初500文字）:', fullText.substring(0, 500));
    
    // 基本情報を抽出（より詳細なパターンを使用）
    const orderNumber = extractWithPatterns(fullText, REGEX_PATTERNS.orderNumber) || '';
    const customer = extractWithPatterns(fullText, REGEX_PATTERNS.customer) || '';
    const productCode = extractWithPatterns(fullText, REGEX_PATTERNS.productCode) || '';
    const productName = extractWithPatterns(fullText, REGEX_PATTERNS.productName) || '';
    const material = extractWithPatterns(fullText, REGEX_PATTERNS.material) || 'S14';
    
    console.log('基本抽出結果:', { orderNumber, customer, productCode, productName, material });
    
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