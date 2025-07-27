import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { FileSpreadsheet, Check, X, Loader, AlertTriangle } from 'lucide-react';

const ExcelImporter = ({ onOrdersImported }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [excelFile, setExcelFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const fileInputRef = useRef();

  // ファイル選択処理
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv' // .csv
    ];

    if (!validTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      alert('Excel（.xlsx, .xls）またはCSV（.csv）ファイルを選択してください。');
      return;
    }

    setExcelFile(file);
    processExcelFile(file);
  };

  // Excelファイル処理
  const processExcelFile = async (file) => {
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // 最初のシートを取得
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      
      // JSONに変換（ヘッダー行を含む）
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1,
        defval: '',
        blankrows: false
      });

      if (jsonData.length < 2) {
        alert('データが不足しています。ヘッダー行とデータ行が必要です。');
        return;
      }

      // ヘッダー行とデータ行を分離
      const headers = jsonData[0];
      const dataRows = jsonData.slice(1);

      // 列マッピングを自動検出
      const mapping = autoDetectColumnMapping(headers);
      setColumnMapping(mapping);

      // データをパース
      const parsed = parseExcelData(dataRows, headers, mapping);
      setParsedData(parsed);
      
      // プレビュー用に最初の5行を設定
      setPreviewData(parsed.slice(0, 5));

      // データ検証
      validateImportData(parsed);

    } catch (error) {
      console.error('Excel処理エラー:', error);
      alert('Excelファイルの処理中にエラーが発生しました。');
    } finally {
      setIsProcessing(false);
    }
  };

  // 列マッピング自動検出
  const autoDetectColumnMapping = (headers) => {
    const mapping = {};
    
    const mappingRules = {
      // 注文番号のパターン
      orderNumber: ['注文番号', '受注番号', '発注番号', 'Order No', 'OrderNo', '注文No'],
      // 顧客名のパターン
      customerName: ['顧客名', 'お客様', '得意先', 'Customer', '会社名', '顧客'],
      // 品番のパターン
      productCode: ['品番', '型番', 'Part No', 'PartNo', '製品番号', '品目コード'],
      // 品名のパターン
      productName: ['品名', '製品名', 'Product', '商品名', '品目名'],
      // 材質のパターン
      material: ['材質', '材料', 'Material', '鋼種'],
      // 単重量のパターン
      unitWeight: ['単重', '単重量', 'Unit Weight', '重量', 'Weight'],
      // 数量のパターン
      quantity: ['数量', '個数', 'Quantity', 'Qty', '注文数'],
      // 注文日のパターン
      orderDate: ['注文日', '受注日', 'Order Date', '発注日'],
      // 納期のパターン
      deliveryDate: ['納期', '納入日', 'Delivery Date', '希望納期', '納期日'],
      // 備考のパターン
      notes: ['備考', '注記', 'Notes', 'Remarks', 'Comment']
    };

    headers.forEach((header, index) => {
      const headerStr = header.toString().trim();
      
      Object.keys(mappingRules).forEach(field => {
        mappingRules[field].forEach(pattern => {
          if (headerStr.includes(pattern) || pattern.includes(headerStr)) {
            if (!mapping[field]) { // 最初にマッチしたものを使用
              mapping[field] = index;
            }
          }
        });
      });
    });

    return mapping;
  };

  // Excelデータパース
  const parseExcelData = (dataRows, headers, mapping) => {
    return dataRows.map((row, index) => {
      const data = {
        rowIndex: index + 2, // Excelの行番号（ヘッダー分+1）
        orderNumber: row[mapping.orderNumber] || `EXCEL-${Date.now()}-${index + 1}`,
        customerName: row[mapping.customerName] || '不明',
        productCode: row[mapping.productCode] || '',
        productName: row[mapping.productName] || '不明',
        material: row[mapping.material] || 'S14',
        unitWeight: parseFloat(row[mapping.unitWeight]) || 0,
        quantity: parseInt(row[mapping.quantity]) || 1,
        orderDate: parseExcelDate(row[mapping.orderDate]) || new Date().toISOString().split('T')[0],
        deliveryDate: parseExcelDate(row[mapping.deliveryDate]) || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: row[mapping.notes] || 'Excel取込'
      };

      // 総重量計算
      data.totalWeight = data.unitWeight * data.quantity;

      // 残日数計算
      const today = new Date();
      const delivery = new Date(data.deliveryDate);
      data.daysRemaining = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));

      return data;
    });
  };

  // Excel日付パース
  const parseExcelDate = (dateValue) => {
    if (!dateValue) return null;

    // Excelシリアル日付の場合
    if (typeof dateValue === 'number') {
      const excelEpoch = new Date(1900, 0, 1); // 1900年1月1日
      const date = new Date(excelEpoch.getTime() + (dateValue - 2) * 24 * 60 * 60 * 1000); // -2は1900年問題の調整
      return date.toISOString().split('T')[0];
    }

    // 文字列日付の場合
    const dateStr = dateValue.toString().trim();
    const dateFormats = [
      /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/, // YYYY-MM-DD, YYYY/MM/DD
      /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/, // MM-DD-YYYY, MM/DD/YYYY
      /^(\d{2})(\d{2})(\d{2})$/ // YYMMDD
    ];

    for (const format of dateFormats) {
      const match = dateStr.match(format);
      if (match) {
        let year, month, day;
        
        if (format.source.includes('\\d{4}')) {
          // YYYY-MM-DD format
          [, year, month, day] = match;
        } else if (format.source.includes('\\d{1,2}.*\\d{4}')) {
          // MM-DD-YYYY format
          [, month, day, year] = match;
        } else {
          // YYMMDD format
          [, year, month, day] = match;
          year = parseInt(year) + (parseInt(year) > 50 ? 1900 : 2000);
        }
        
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }

    return null;
  };

  // データ検証
  const validateImportData = (data) => {
    const errors = [];
    
    data.forEach((row, index) => {
      const rowErrors = [];
      
      // 必須項目チェック
      if (!row.productName || row.productName.trim() === '') {
        rowErrors.push('品名が未入力');
      }
      
      if (row.unitWeight <= 0) {
        rowErrors.push('単重量が無効');
      }
      
      if (row.quantity <= 0) {
        rowErrors.push('数量が無効');
      }

      // 日付チェック
      if (!row.deliveryDate) {
        rowErrors.push('納期が無効');
      }

      // 材質チェック
      const validMaterials = ['S14', 'S13', 'SUS304', 'SUS316', 'FCD400', 'FCD450'];
      if (!validMaterials.includes(row.material)) {
        rowErrors.push('材質が無効');
      }

      if (rowErrors.length > 0) {
        errors.push({
          row: row.rowIndex,
          errors: rowErrors,
          data: row
        });
      }
    });

    setValidationErrors(errors);
  };

  // インポート実行
  const handleImport = () => {
    if (validationErrors.length > 0) {
      if (!window.confirm(`${validationErrors.length}件のエラーがありますが、続行しますか？`)) {
        return;
      }
    }

    const orders = parsedData.map(data => ({
      id: Date.now() + Math.random(),
      priority: data.rowIndex,
      orderNumber: data.orderNumber,
      productName: data.productName,
      productCode: data.productCode,
      material: data.material,
      unitWeight: data.unitWeight,
      quantity: data.quantity,
      totalWeight: data.totalWeight,
      status: 'waiting',
      deliveryDate: data.deliveryDate,
      orderDate: data.orderDate,
      customerName: data.customerName,
      daysRemaining: data.daysRemaining,
      notes: `${data.notes} (Excel取込 行:${data.rowIndex})`
    }));

    onOrdersImported(orders);
    setIsModalOpen(false);
    resetModal();
  };

  // モーダルリセット
  const resetModal = () => {
    setExcelFile(null);
    setParsedData([]);
    setPreviewData([]);
    setColumnMapping({});
    setValidationErrors([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* Excel取込ボタン */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
      >
        <FileSpreadsheet className="w-4 h-4" />
        📊 Excel取込
      </button>

      {/* Excelモーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between p-4 border-b bg-blue-500 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileSpreadsheet className="w-6 h-6" />
                Excel/CSV データ取込
              </h2>
              <button 
                onClick={() => { setIsModalOpen(false); resetModal(); }}
                className="text-white hover:bg-blue-600 p-1 rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!excelFile ? (
                /* ファイル選択エリア */
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <FileSpreadsheet className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Excel/CSVファイルを選択</h3>
                  <p className="text-gray-600 mb-4">注文データを含むExcelまたはCSVファイルをアップロードしてください</p>
                  <div className="text-sm text-gray-500 mb-4">
                    対応形式: .xlsx, .xls, .csv<br/>
                    必要な列: 品名、数量、単重量、納期など
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    ファイルを選択
                  </button>
                </div>
              ) : isProcessing ? (
                /* 処理中表示 */
                <div className="text-center py-16">
                  <Loader className="w-16 h-16 animate-spin mx-auto text-blue-500 mb-4" />
                  <h3 className="text-lg font-medium">Excel処理中...</h3>
                  <p className="text-gray-600">データを読み込んでいます</p>
                </div>
              ) : (
                /* 結果表示 */
                <div className="space-y-6">
                  {/* サマリー情報 */}
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="text-lg font-medium mb-2">取込結果</h3>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">総件数:</span> {parsedData.length}件
                      </div>
                      <div>
                        <span className="font-medium">有効件数:</span> {parsedData.length - validationErrors.length}件
                      </div>
                      <div>
                        <span className="font-medium">エラー件数:</span> 
                        <span className={validationErrors.length > 0 ? 'text-red-600 font-bold' : 'text-green-600'}>
                          {validationErrors.length}件
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* エラー表示 */}
                  {validationErrors.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="flex items-center gap-2 text-red-800 font-medium mb-3">
                        <AlertTriangle className="w-5 h-5" />
                        データエラー ({validationErrors.length}件)
                      </h4>
                      <div className="max-h-32 overflow-y-auto space-y-2">
                        {validationErrors.slice(0, 5).map((error, index) => (
                          <div key={index} className="text-sm text-red-700">
                            <span className="font-medium">行{error.row}:</span> {error.errors.join(', ')}
                          </div>
                        ))}
                        {validationErrors.length > 5 && (
                          <div className="text-sm text-red-600 font-medium">
                            ...他 {validationErrors.length - 5}件
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* プレビューテーブル */}
                  <div>
                    <h4 className="text-lg font-medium mb-3">データプレビュー（最初の5件）</h4>
                    <div className="overflow-x-auto border rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">行</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">注文番号</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">顧客名</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">品名</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">品番</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">材質</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">単重量</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">数量</th>
                            <th className="px-3 py-2 text-left font-medium text-gray-700">納期</th>
                          </tr>
                        </thead>
                        <tbody>
                          {previewData.map((row, index) => {
                            const hasError = validationErrors.some(error => error.row === row.rowIndex);
                            return (
                              <tr key={index} className={hasError ? 'bg-red-50' : 'hover:bg-gray-50'}>
                                <td className="px-3 py-2">{row.rowIndex}</td>
                                <td className="px-3 py-2">{row.orderNumber}</td>
                                <td className="px-3 py-2">{row.customerName}</td>
                                <td className="px-3 py-2">{row.productName}</td>
                                <td className="px-3 py-2">{row.productCode}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                                    row.material === 'S14' ? 'bg-blue-100 text-blue-800' : 
                                    row.material === 'S13' ? 'bg-green-100 text-green-800' :
                                    'bg-gray-100 text-gray-800'
                                  }`}>
                                    {row.material}
                                  </span>
                                </td>
                                <td className="px-3 py-2">{row.unitWeight}kg</td>
                                <td className="px-3 py-2">{row.quantity}個</td>
                                <td className="px-3 py-2">{row.deliveryDate}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {parsedData.length > 5 && (
                      <div className="text-sm text-gray-500 mt-2">
                        ...他 {parsedData.length - 5}件のデータがあります
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* モーダルフッター */}
            {parsedData.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                <div className="text-sm text-gray-600">
                  {parsedData.length}件のデータを取込準備完了
                  {validationErrors.length > 0 && (
                    <span className="text-red-600 ml-2">
                      ({validationErrors.length}件のエラーあり)
                    </span>
                  )}
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setIsModalOpen(false); resetModal(); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  <button
                    onClick={handleImport}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    データ取込 ({parsedData.length}件)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ExcelImporter;