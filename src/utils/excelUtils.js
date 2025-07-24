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
 * ヘッダー行から列マッピングを自動検出
 * @param {string[]} headers - ヘッダー行の配列
 * @returns {object} - 列マッピングオブジェクト
 */
export const autoDetectColumns = (headers) => {
  const mapping = {};
  const patterns = {
    customerCode: ['取引先コード', '顧客コード', '会社コード', 'Customer Code', 'Code', 'ID', '取引先', 'コード'],
    companyName: ['取引先名', '会社名', '企業名', '法人名', 'Company', 'Company Name', '会社', '取引先', '名前'],
    contactPerson: ['担当者', '担当者名', '担当', 'Contact', 'Person', '氏名', '名前'],
    department: ['部署', '部門', '所属', 'Department', 'Division', '課'],
    phone: ['電話', '電話番号', 'Phone', 'Tel', 'TEL', '連絡先'],
    fax: ['FAX', 'Fax', 'ファックス', 'ファクス', 'FAX番号'],
    email: ['メール', 'Email', 'E-mail', 'mail', 'メールアドレス', 'Email Address'],
    postalCode: ['郵便番号', '〒', 'Postal', 'ZIP', 'Zip Code'],
    address: ['住所', 'Address', '所在地', '本社住所'],
    paymentTerms: ['支払条件', '決済条件', 'Payment', 'Payment Terms', '支払'],
    notes: ['備考', '注記', 'Notes', 'Remarks', 'Comment', 'メモ']
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
 * データを処理して取引先形式に変換
 * @param {any[][]} dataRows - データ行の配列
 * @param {object} columnMapping - 列マッピング
 * @returns {object[]} - 処理済みの取引先データ配列
 */
export const processCustomerData = (dataRows, columnMapping) => {
  return dataRows.map((row, index) => {
    const notes = row[columnMapping.notes] || '';
    const excelNote = `Excel取込 行:${index + 2}`;
    const finalNotes = notes ? `${notes} (${excelNote})` : excelNote;
    
    // 住所と郵便番号を組み合わせ
    let fullAddress = '';
    const postalCode = row[columnMapping.postalCode] || '';
    const address = row[columnMapping.address] || '';
    if (postalCode && address) {
      fullAddress = `〒${postalCode} ${address}`;
    } else if (address) {
      fullAddress = address;
    }
    
    return {
      rowIndex: index + 2,
      customerCode: row[columnMapping.customerCode] || `AUTO-${Date.now()}-${index}`,
      companyName: row[columnMapping.companyName] || '不明',
      contactPerson: row[columnMapping.contactPerson] || '',
      department: row[columnMapping.department] || '',
      phone: row[columnMapping.phone] || '',
      fax: row[columnMapping.fax] || '',
      email: row[columnMapping.email] || '',
      postalCode: postalCode,
      address: fullAddress,
      paymentTerms: row[columnMapping.paymentTerms] || '月末締め翌月末払い',
      taxType: 'external',
      customerType: 'direct',
      status: 'active',
      notes: finalNotes
    };
  }).filter(item => item.companyName !== '不明');
};

/**
 * データの妥当性を検証
 * @param {object[]} data - 検証するデータ配列
 * @returns {object} - 検証結果
 */
export const validateCustomerData = (data) => {
  const errors = [];
  const duplicateCheck = new Set();
  
  data.forEach((item, index) => {
    const row = item.rowIndex;
    
    // 必須項目チェック
    if (!item.customerCode.trim()) {
      errors.push({ row, message: '取引先コードが未入力です', field: 'customerCode' });
    }
    if (!item.companyName.trim()) {
      errors.push({ row, message: '会社名が未入力です', field: 'companyName' });
    }
    
    // 重複チェック（ファイル内）
    if (duplicateCheck.has(item.customerCode)) {
      errors.push({ row, message: `取引先コード「${item.customerCode}」が重複しています`, field: 'customerCode' });
    } else {
      duplicateCheck.add(item.customerCode);
    }
    
    // メール形式チェック
    if (item.email && !item.email.includes('@')) {
      errors.push({ row, message: 'メールアドレスの形式が正しくありません', field: 'email' });
    }
    
    // 電話番号チェック（簡易）
    if (item.phone && !/[\d\-\(\)\s]+/.test(item.phone)) {
      errors.push({ row, message: '電話番号の形式が正しくありません', field: 'phone' });
    }
  });
  
  return { 
    errors, 
    validCount: data.length - errors.length,
    totalCount: data.length 
  };
};

/**
 * 既存データとの重複をチェック
 * @param {object[]} newData - 新しいデータ
 * @param {object[]} existingData - 既存データ
 * @returns {object[]} - 重複情報
 */
export const checkDuplicatesWithExisting = (newData, existingData) => {
  const duplicates = [];
  const existingCodes = new Set(existingData.map(item => item.customerCode));
  
  newData.forEach(item => {
    if (existingCodes.has(item.customerCode)) {
      duplicates.push({
        row: item.rowIndex,
        customerCode: item.customerCode,
        companyName: item.companyName
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
 * 取引先データを最終形式に変換
 * @param {object[]} processedData - 処理済みデータ
 * @returns {object[]} - 最終的な取引先データ
 */
export const convertToFinalCustomerFormat = (processedData) => {
  return processedData.map(item => ({
    id: Date.now() + Math.random(),
    customerCode: item.customerCode,
    companyName: item.companyName,
    contactPerson: item.contactPerson,
    department: item.department,
    phone: item.phone,
    email: item.email,
    address: item.address,
    paymentTerms: item.paymentTerms,
    creditLimit: 0,
    taxType: item.taxType,
    status: 'active',
    notes: item.notes,
    createdDate: new Date().toISOString().split('T')[0],
    updatedDate: new Date().toISOString().split('T')[0],
    importedFrom: 'excel'
  }));
};