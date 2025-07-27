import * as XLSX from 'xlsx';

/**
 * Excel/CSVファイルを読み込んでJSONデータに変換
 * @param {File} file - 読み込むファイル
 * @returns {Promise<{headers: string[], data: any[]}>} - ヘッダーとデータの配列
 */
export const readExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // 最初のシートを取得
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // JSONに変換（ヘッダー行を含む）
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
          header: 1,
          defval: '',
          blankrows: false
        });

        if (jsonData.length < 2) {
          reject(new Error('データが不足しています。ヘッダー行とデータ行が必要です。'));
          return;
        }

        const headers = jsonData[0];
        const dataRows = jsonData.slice(1);

        resolve({ headers, data: dataRows });
      } catch (error) {
        reject(new Error(`Excelファイルの読み込みに失敗しました: ${error.message}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('ファイルの読み込み中にエラーが発生しました。'));
    };

    reader.readAsArrayBuffer(file);
  });
};

/**
 * ヘッダー行から列マッピングを自動検出（製品データ用）
 * @param {string[]} headers - ヘッダー行の配列
 * @returns {object} - 列マッピングオブジェクト
 */
export const autoDetectProductColumns = (headers) => {
  const mapping = {};
  const patterns = {
    productCode: [
      '製品コード', '品番', '型番', '部品番号', 'Product Code', 'Code', 'ID', 'productcode', 
      '商品コード', '品目コード', 'アイテムコード', 'Item Code', 'Model', 'model'
    ],
    productName: [
      '製品名', '品名', '商品名', '部品名', 'Product Name', 'Name', 'productname',
      '製品', '品物', '商品', 'Product', 'Item', 'item', 'アイテム名'
    ],
    companyName: [
      '会社名', '取引先', '顧客', '得意先', '依頼先', 'Company', 'Customer', 'Client',
      '会社', '企業', '法人', '取引先名', '顧客名', '得意先名'
    ],
    category: [
      'カテゴリ', '分類', '種別', '種類', 'Category', 'Type', 'Class', 'Group',
      '品目', '区分', '部門', 'Division'
    ],
    material: [
      '材質', '素材', '材料', 'Material', 'Mat', 'Steel', 'Metal',
      'ステンレス', 'SUS', 'S14', 'SCS', '鋼材', '合金'
    ],
    unitWeight: [
      '単重', '重量', '重さ', 'Weight', 'Unit Weight', 'Wt', 'Mass',
      '質量', 'kg', 'gram', 'g'
    ],
    standardPrice: [
      '標準価格', '単価', '価格', 'Price', 'Unit Price', 'Cost', 'Amount',
      '金額', '値段', '料金', '標準単価', 'Standard Price'
    ],
    description: [
      '説明', '備考', '詳細', 'Description', 'Detail', 'Note', 'Notes',
      'Remark', 'Comment', 'メモ', '内容', '概要'
    ],
    specifications: [
      '仕様', '規格', 'Specification', 'Spec', 'Standard', 'Specifications',
      '寸法', '大きさ', 'Size', 'Dimension', '性能', 'Performance'
    ],
    drawingNumber: [
      '図面番号', '図番', 'Drawing Number', 'Drawing No', 'DWG', 'Drawing',
      '設計番号', '図面', 'Blueprint', 'Plan'
    ],
    status: [
      'ステータス', '状態', '状況', 'Status', 'State', 'Condition',
      '有効', '無効', 'Active', 'Inactive'
    ]
  };

  headers.forEach((header, index) => {
    const headerStr = header.toString().trim().toLowerCase();
    Object.keys(patterns).forEach(field => {
      patterns[field].forEach(pattern => {
        const patternLower = pattern.toLowerCase();
        if ((headerStr.includes(patternLower) || patternLower.includes(headerStr)) && !mapping[field]) {
          mapping[field] = index;
        }
      });
    });
  });

  return mapping;
};

/**
 * データを処理して製品形式に変換
 * @param {any[][]} dataRows - データ行の配列
 * @param {object} columnMapping - 列マッピング
 * @returns {object[]} - 処理済みの製品データ配列
 */
export const processProductData = (dataRows, columnMapping) => {
  return dataRows.map((row, index) => {
    const notes = row[columnMapping.description] || '';
    const excelNote = `Excel取込 行:${index + 2}`;
    const finalNotes = notes ? `${notes} (${excelNote})` : excelNote;
    
    // 単価と重量の数値変換
    const parseNumber = (value) => {
      if (value === null || value === undefined || value === '') return 0;
      const num = parseFloat(String(value).replace(/[,¥円]/g, ''));
      return isNaN(num) ? 0 : num;
    };

    // 材質の標準化
    const normalizeMaterial = (material) => {
      if (!material) return 'S14';
      const matStr = String(material).toUpperCase();
      if (matStr.includes('SCS')) return 'SCS';
      if (matStr.includes('SUS304') || matStr.includes('304')) return 'SUS304';
      if (matStr.includes('S14') || matStr.includes('14')) return 'S14';
      return 'S14'; // デフォルト
    };

    return {
      rowIndex: index + 2,
      productCode: row[columnMapping.productCode] || `AUTO-${Date.now()}-${index}`,
      productName: row[columnMapping.productName] || '不明',
      companyName: row[columnMapping.companyName] || '',
      category: row[columnMapping.category] || 'その他',
      material: normalizeMaterial(row[columnMapping.material]),
      unitWeight: parseNumber(row[columnMapping.unitWeight]),
      standardPrice: parseNumber(row[columnMapping.standardPrice]),
      description: row[columnMapping.description] || '',
      specifications: row[columnMapping.specifications] || '',
      drawingNumber: row[columnMapping.drawingNumber] || '',
      status: 'active',
      notes: finalNotes
    };
  }).filter(item => item.productName !== '不明');
};

/**
 * データの妥当性を検証（製品データ用）
 * @param {object[]} data - 検証するデータ配列
 * @returns {object} - 検証結果
 */
export const validateProductData = (data) => {
  const errors = [];
  const duplicateCheck = new Set();
  
  data.forEach((item, index) => {
    const row = item.rowIndex;
    
    // 必須項目チェック
    if (!item.productCode.trim()) {
      errors.push({ row, message: '製品コードが未入力です', field: 'productCode' });
    }
    if (!item.productName.trim()) {
      errors.push({ row, message: '製品名が未入力です', field: 'productName' });
    }
    
    // 重複チェック（ファイル内）
    if (duplicateCheck.has(item.productCode)) {
      errors.push({ row, message: `製品コード「${item.productCode}」が重複しています`, field: 'productCode' });
    } else {
      duplicateCheck.add(item.productCode);
    }
    
    // 数値チェック
    if (item.unitWeight < 0) {
      errors.push({ row, message: '単重は0以上の値を入力してください', field: 'unitWeight' });
    }
    if (item.standardPrice < 0) {
      errors.push({ row, message: '標準価格は0以上の値を入力してください', field: 'standardPrice' });
    }
  });
  
  return { 
    errors, 
    validCount: data.length - errors.length,
    totalCount: data.length 
  };
};

/**
 * 既存データとの重複をチェック（製品データ用）
 * @param {object[]} newData - 新しいデータ
 * @param {object[]} existingData - 既存データ
 * @returns {object[]} - 重複情報
 */
export const checkDuplicatesWithExisting = (newData, existingData) => {
  const duplicates = [];
  const existingCodes = new Set(existingData.map(item => item.productCode));
  
  newData.forEach(item => {
    if (existingCodes.has(item.productCode)) {
      duplicates.push({
        row: item.rowIndex,
        productCode: item.productCode,
        productName: item.productName
      });
    }
  });
  
  return duplicates;
};

/**
 * ファイル形式の検証
 * @param {File} file - 検証するファイル
 * @returns {boolean} - 有効なファイル形式かどうか
 */
export const validateFileType = (file) => {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/csv' // .csv
  ];
  
  return validTypes.includes(file.type) || file.name.endsWith('.csv');
};

/**
 * ファイルサイズの検証
 * @param {File} file - 検証するファイル
 * @param {number} maxSizeMB - 最大サイズ（MB）
 * @returns {boolean} - 有効なファイルサイズかどうか
 */
export const validateFileSize = (file, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

/**
 * 製品データを最終形式に変換
 * @param {object[]} processedData - 処理済みデータ
 * @returns {object[]} - 最終的な製品データ
 */
export const convertToFinalProductFormat = (processedData) => {
  return processedData.map(item => ({
    id: Date.now() + Math.random(),
    productCode: item.productCode,
    productName: item.productName,
    companyName: item.companyName,
    category: item.category,
    material: item.material,
    unitWeight: item.unitWeight,
    standardPrice: item.standardPrice,
    description: item.description,
    specifications: item.specifications,
    drawingNumber: item.drawingNumber,
    status: 'active',
    createdDate: new Date().toISOString().split('T')[0],
    updatedDate: new Date().toISOString().split('T')[0],
    importedFrom: 'excel'
  }));
};