// 取引先別PDFフォーマット検出・対応システム

/**
 * 取引先フォーマット定義
 */
export const PDF_FORMATS = {
  // 汎用フォーマット（現在の実装）
  GENERIC: {
    id: 'generic',
    name: '汎用フォーマット',
    priority: 0,
    indicators: [], // 特定の指標がない場合のデフォルト
    patterns: {} // 既存のパターンを使用
  },
  
  // 例：A社のフォーマット
  COMPANY_A: {
    id: 'company_a',
    name: 'A社フォーマット',
    priority: 10,
    indicators: [
      /A株式会社/,
      /発注書[\s\n]*A-[0-9]+/,
      /注文伝票.*A社/
    ],
    patterns: {
      orderNumber: [
        /発注番号[:：\s]*A-([0-9]{6})/i,
        /Order\s*No[:：\s]*A([0-9]+)/i
      ],
      customer: [
        /(A株式会社)/
      ],
      productCode: [
        /品番[:：\s]*A-([A-Z0-9\-]+)/i,
        /型式[:：\s]*([A-Z]+[0-9]+A)/i
      ],
      // ... 他のパターン
    }
  },
  
  // 例：B社のフォーマット
  COMPANY_B: {
    id: 'company_b',
    name: 'B社フォーマット',
    priority: 10,
    indicators: [
      /B工業/,
      /受注No[:：\s]*B[0-9]+/,
      /B社発注明細/
    ],
    patterns: {
      orderNumber: [
        /受注No[:：\s]*B([0-9]{8})/i,
        /管理番号[:：\s]*([0-9]{8})/i
      ],
      productCode: [
        /製品番号[:：\s]*B-([A-Z0-9\-]+)/i,
        /([0-9]{2}-[A-Z]{2}[0-9]{4})/g // B社特有の品番フォーマット
      ],
      // ... 他のパターン
    }
  },
  
  // 例：建設機械メーカー
  CONSTRUCTION_MACHINERY: {
    id: 'construction_machinery',
    name: '建設機械メーカー',
    priority: 8,
    indicators: [
      /建機部品/,
      /油圧部品/,
      /ショベル/,
      /ブルドーザー/
    ],
    patterns: {
      productCode: [
        /部品番号[:：\s]*([A-Z]{2}[0-9]{6}[A-Z]{2})/i,
        /Parts?\s*No[:：\s]*([A-Z0-9\-]{8,15})/i
      ],
      productName: [
        /(油圧[^【\n\r]*)/i,
        /(シリンダ[^【\n\r]*)/i,
        /(ピストン[^【\n\r]*)/i
      ]
    }
  },
  
  // 例：自動車部品メーカー
  AUTOMOTIVE: {
    id: 'automotive',
    name: '自動車部品メーカー',
    priority: 8,
    indicators: [
      /自動車部品/,
      /エンジン部品/,
      /トランスミッション/,
      /車両番号/
    ],
    patterns: {
      productCode: [
        /部品番号[:：\s]*([0-9]{5}-[A-Z0-9]{5})/i,
        /P\/N[:：\s]*([A-Z0-9\-]{10,15})/i
      ]
    }
  }
};

/**
 * PDFテキストから適切なフォーマットを検出
 * @param {string} text - 抽出されたPDFテキスト
 * @returns {Object} 検出されたフォーマット情報
 */
export const detectPDFFormat = (text) => {
  console.log('=== PDFフォーマット検出開始 ===');
  
  const candidates = [];
  
  // 各フォーマットの指標をチェック
  Object.values(PDF_FORMATS).forEach(format => {
    if (format.indicators && format.indicators.length > 0) {
      let matchCount = 0;
      
      format.indicators.forEach(indicator => {
        if (text.match(indicator)) {
          matchCount++;
          console.log(`${format.name}: 指標マッチ "${indicator}"`, text.match(indicator)[0]);
        }
      });
      
      if (matchCount > 0) {
        const confidence = (matchCount / format.indicators.length) * format.priority;
        candidates.push({
          format,
          matchCount,
          confidence,
          score: confidence
        });
      }
    }
  });
  
  // 最も適合度の高いフォーマットを選択
  candidates.sort((a, b) => b.score - a.score);
  
  if (candidates.length > 0) {
    console.log('検出されたフォーマット候補:', candidates);
    console.log('選択されたフォーマット:', candidates[0].format.name);
    return candidates[0].format;
  }
  
  // デフォルトは汎用フォーマット
  console.log('汎用フォーマットを使用');
  return PDF_FORMATS.GENERIC;
};

/**
 * 検出されたフォーマットに基づいてデータを抽出
 * @param {string} text - 抽出されたPDFテキスト
 * @param {Object} format - 検出されたフォーマット
 * @returns {Object} 抽出されたデータ
 */
export const extractDataWithFormat = (text, format) => {
  console.log(`=== ${format.name}での抽出開始 ===`);
  
  const data = {
    orderNumber: '',
    customerName: '',
    productCode: '',
    productName: '',
    material: '',
    unitWeight: '',
    quantity: '',
    orderDate: '',
    deliveryDate: '',
    notes: '',
    detectedFormat: format.name
  };
  
  // フォーマット固有のパターンがある場合はそれを使用
  if (format.patterns && Object.keys(format.patterns).length > 0) {
    Object.keys(format.patterns).forEach(field => {
      const patterns = format.patterns[field];
      
      for (let i = 0; i < patterns.length; i++) {
        const pattern = patterns[i];
        const match = text.match(pattern);
        
        if (match && match[1]) {
          data[field] = match[1].trim();
          console.log(`${format.name} ${field}抽出:`, data[field]);
          break;
        }
      }
    });
  }
  
  return data;
};

/**
 * 新しいフォーマットパターンを学習・追加
 * @param {string} text - PDFテキスト
 * @param {Object} correctData - 正解データ
 * @param {string} formatId - フォーマットID
 */
export const learnNewPattern = (text, correctData, formatId) => {
  console.log('=== 新パターン学習 ===');
  
  // 実際の値がテキスト内でどのように表現されているかを逆算
  const learnedPatterns = {};
  
  Object.keys(correctData).forEach(field => {
    if (correctData[field] && typeof correctData[field] === 'string') {
      const value = correctData[field];
      
      // テキスト内でこの値がどのような文脈で出現するかを検索
      const contextPatterns = findValueContext(text, value);
      
      if (contextPatterns.length > 0) {
        learnedPatterns[field] = contextPatterns;
        console.log(`学習パターン ${field}:`, contextPatterns);
      }
    }
  });
  
  return learnedPatterns;
};

/**
 * テキスト内で値の出現文脈を検索
 * @param {string} text - PDFテキスト
 * @param {string} value - 検索する値
 * @returns {Array} 発見されたパターン
 */
const findValueContext = (text, value) => {
  const patterns = [];
  const escapedValue = value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  
  // 前後の文脈を含む検索
  const contextRegex = new RegExp(`([^\\n]{0,20})${escapedValue}([^\\n]{0,20})`, 'gi');
  const matches = [...text.matchAll(contextRegex)];
  
  matches.forEach(match => {
    const before = match[1].trim();
    const after = match[2].trim();
    
    // ラベルパターンを抽出
    if (before) {
      const labelMatch = before.match(/([^\s]+)[:：\s]*$/);
      if (labelMatch) {
        const label = labelMatch[1];
        const pattern = new RegExp(`${label}[:：\\s]*([^\\s\\n]+)`, 'i');
        patterns.push(pattern);
      }
    }
  });
  
  return patterns;
};

/**
 * フォーマット設定をローカルストレージに保存
 * @param {string} formatId - フォーマットID
 * @param {Object} patterns - パターン設定
 */
export const saveFormatSettings = (formatId, patterns) => {
  try {
    const customFormats = JSON.parse(localStorage.getItem('customPDFFormats') || '{}');
    customFormats[formatId] = {
      ...customFormats[formatId],
      patterns,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem('customPDFFormats', JSON.stringify(customFormats));
    console.log('フォーマット設定を保存:', formatId);
  } catch (error) {
    console.error('フォーマット設定保存エラー:', error);
  }
};

/**
 * カスタムフォーマット設定を読み込み
 * @returns {Object} カスタムフォーマット設定
 */
export const loadCustomFormats = () => {
  try {
    const customFormats = JSON.parse(localStorage.getItem('customPDFFormats') || '{}');
    
    // カスタムフォーマットをPDF_FORMATSにマージ
    Object.keys(customFormats).forEach(formatId => {
      if (PDF_FORMATS[formatId.toUpperCase()]) {
        PDF_FORMATS[formatId.toUpperCase()].patterns = {
          ...PDF_FORMATS[formatId.toUpperCase()].patterns,
          ...customFormats[formatId].patterns
        };
      }
    });
    
    return customFormats;
  } catch (error) {
    console.error('カスタムフォーマット読み込みエラー:', error);
    return {};
  }
};

/**
 * 抽出結果の品質を評価
 * @param {Object} data - 抽出されたデータ
 * @returns {Object} 品質評価結果
 */
export const evaluateExtractionQuality = (data) => {
  const fields = ['orderNumber', 'customerName', 'productCode', 'productName', 'material'];
  let filledFields = 0;
  let totalFields = fields.length;
  
  fields.forEach(field => {
    if (data[field] && data[field].toString().trim()) {
      filledFields++;
    }
  });
  
  const quality = Math.round((filledFields / totalFields) * 100);
  
  return {
    quality,
    filledFields,
    totalFields,
    missingFields: fields.filter(field => !data[field] || !data[field].toString().trim()),
    level: quality >= 80 ? 'excellent' : quality >= 60 ? 'good' : quality >= 40 ? 'fair' : 'poor'
  };
};