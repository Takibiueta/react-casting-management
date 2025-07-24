import { useState, useCallback } from 'react';
import {
  readExcelFile,
  autoDetectColumns,
  processCustomerData,
  validateCustomerData,
  checkDuplicatesWithExisting,
  validateFileType,
  validateFileSize,
  convertToFinalCustomerFormat
} from '../utils/excelUtils';

export const useExcelImport = (existingCustomers = []) => {
  // State管理
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileData, setFileData] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rawData, setRawData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [processedData, setProcessedData] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [validationResults, setValidationResults] = useState({ errors: [], validCount: 0 });
  const [duplicateInfo, setDuplicateInfo] = useState([]);
  const [duplicateHandling, setDuplicateHandling] = useState('skip'); // 'skip', 'update'
  const [error, setError] = useState(null);

  // ファイル処理
  const handleFileUpload = useCallback(async (file) => {
    setError(null);
    setIsProcessing(true);

    try {
      // ファイル形式検証
      if (!validateFileType(file)) {
        throw new Error('対応していないファイル形式です。Excel（.xlsx, .xls）またはCSV（.csv）ファイルを選択してください。');
      }

      // ファイルサイズ検証
      if (!validateFileSize(file, 10)) {
        throw new Error('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。');
      }

      // ファイル読み込み
      const { headers: fileHeaders, data: fileData } = await readExcelFile(file);
      
      // 自動列検出
      const detectedMapping = autoDetectColumns(fileHeaders);
      
      // データ処理
      const processed = processCustomerData(fileData, detectedMapping);
      
      // バリデーション
      const validation = validateCustomerData(processed);
      
      // 重複チェック
      const duplicates = checkDuplicatesWithExisting(processed, existingCustomers);

      // State更新
      setFileData(file);
      setHeaders(fileHeaders);
      setRawData(fileData);
      setColumnMapping(detectedMapping);
      setProcessedData(processed);
      setPreviewData(processed.slice(0, 5)); // 最初の5行をプレビュー
      setValidationResults(validation);
      setDuplicateInfo(duplicates);

    } catch (err) {
      setError(err.message);
      resetImportState();
    } finally {
      setIsProcessing(false);
    }
  }, [existingCustomers]);

  // 列マッピング手動変更
  const updateColumnMapping = useCallback((field, columnIndex) => {
    const newMapping = { ...columnMapping, [field]: columnIndex };
    setColumnMapping(newMapping);

    // データ再処理
    const reprocessed = processCustomerData(rawData, newMapping);
    const validation = validateCustomerData(reprocessed);
    const duplicates = checkDuplicatesWithExisting(reprocessed, existingCustomers);

    setProcessedData(reprocessed);
    setPreviewData(reprocessed.slice(0, 5));
    setValidationResults(validation);
    setDuplicateInfo(duplicates);
  }, [columnMapping, rawData, existingCustomers]);

  // 重複処理方法の設定
  const setDuplicateHandlingMode = useCallback((mode) => {
    setDuplicateHandling(mode);
  }, []);

  // データ取り込み実行
  const executeImport = useCallback(() => {
    if (processedData.length === 0) {
      setError('取り込むデータがありません。');
      return { success: false, data: [], updatedData: [] };
    }

    try {
      // 最終形式に変換
      const finalData = convertToFinalCustomerFormat(processedData);
      
      let importedData = [];
      let updatedData = [];
      let skippedCount = 0;
      
      if (duplicateHandling === 'skip') {
        // 重複をスキップ
        importedData = finalData.filter(item => 
          !duplicateInfo.some(dup => dup.customerCode === item.customerCode)
        );
        skippedCount = duplicateInfo.length;
      } else if (duplicateHandling === 'update') {
        // 重複データを更新用として分離
        finalData.forEach(item => {
          const duplicate = duplicateInfo.find(dup => dup.customerCode === item.customerCode);
          if (duplicate) {
            updatedData.push(item);
          } else {
            importedData.push(item);
          }
        });
      }

      return {
        success: true,
        data: importedData,
        updatedData: updatedData,
        importedCount: importedData.length,
        updatedCount: updatedData.length,
        skippedCount: skippedCount,
        totalCount: finalData.length,
        duplicateHandling: duplicateHandling
      };
    } catch (err) {
      setError(`データ取り込み中にエラーが発生しました: ${err.message}`);
      return { success: false, data: [], updatedData: [] };
    }
  }, [processedData, duplicateInfo, duplicateHandling]);

  // 状態リセット
  const resetImportState = useCallback(() => {
    setFileData(null);
    setHeaders([]);
    setRawData([]);
    setColumnMapping({});
    setProcessedData([]);
    setPreviewData([]);
    setValidationResults({ errors: [], validCount: 0 });
    setDuplicateInfo([]);
    setDuplicateHandling('skip');
    setError(null);
    setIsProcessing(false);
  }, []);

  // 利用可能な列の取得
  const getAvailableColumns = useCallback(() => {
    return headers.map((header, index) => ({
      index,
      label: header,
      isUsed: Object.values(columnMapping).includes(index)
    }));
  }, [headers, columnMapping]);

  // マッピング状況の確認
  const getMappingStatus = useCallback(() => {
    const requiredFields = ['customerCode', 'companyName'];
    const optionalFields = ['contactPerson', 'department', 'phone', 'email', 'address'];
    
    return {
      required: requiredFields.map(field => ({
        field,
        label: getFieldLabel(field),
        mapped: columnMapping[field] !== undefined,
        columnIndex: columnMapping[field]
      })),
      optional: optionalFields.map(field => ({
        field,
        label: getFieldLabel(field),
        mapped: columnMapping[field] !== undefined,
        columnIndex: columnMapping[field]
      }))
    };
  }, [columnMapping]);

  // フィールドラベルの取得
  const getFieldLabel = (field) => {
    const labels = {
      customerCode: '取引先コード',
      companyName: '会社名',
      contactPerson: '担当者名',
      department: '部署',
      phone: '電話番号',
      fax: 'FAX番号',
      email: 'メールアドレス',
      postalCode: '郵便番号',
      address: '住所',
      paymentTerms: '支払条件',
      notes: '備考'
    };
    return labels[field] || field;
  };

  // インポート準備完了の確認
  const isReadyForImport = useCallback(() => {
    const requiredFieldsMapped = columnMapping.customerCode !== undefined && 
                                 columnMapping.companyName !== undefined;
    const hasValidData = processedData.length > 0;
    const noProcessingErrors = !isProcessing && !error;
    
    return requiredFieldsMapped && hasValidData && noProcessingErrors;
  }, [columnMapping, processedData, isProcessing, error]);

  return {
    // State
    isProcessing,
    fileData,
    headers,
    columnMapping,
    processedData,
    previewData,
    validationResults,
    duplicateInfo,
    duplicateHandling,
    error,

    // Actions
    handleFileUpload,
    updateColumnMapping,
    executeImport,
    resetImportState,
    setDuplicateHandlingMode,

    // Computed values
    getAvailableColumns,
    getMappingStatus,
    isReadyForImport,
    getFieldLabel,

    // Statistics
    stats: {
      totalRows: processedData.length,
      validRows: validationResults.validCount,
      errorRows: validationResults.errors.length,
      duplicateRows: duplicateInfo.length
    }
  };
};