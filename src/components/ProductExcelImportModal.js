import React, { useRef, useState } from 'react';
import { 
  Upload, 
  FileSpreadsheet, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Download,
  Loader,
  Eye,
  Settings,
  Package
} from 'lucide-react';
import { useProductExcelImport } from '../hooks/useProductExcelImport';

const ProductExcelImportModal = ({ 
  isOpen, 
  onClose, 
  onImportSuccess, 
  existingProducts = [] 
}) => {
  const fileInputRef = useRef();
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'preview', 'mapping'
  
  const {
    isProcessing,
    fileData,
    headers,
    columnMapping,
    previewData,
    validationResults,
    duplicateInfo,
    duplicateHandling,
    error,
    handleFileUpload,
    updateColumnMapping,
    executeImport,
    resetImportState,
    setDuplicateHandlingMode,
    getAvailableColumns,
    getMappingStatus,
    isReadyForImport,
    getFieldLabel,
    stats
  } = useProductExcelImport(existingProducts);

  // ファイル選択処理
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      handleFileUpload(file);
      setActiveTab('preview');
    }
  };

  // ドラッグ&ドロップ処理
  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
      setActiveTab('preview');
    }
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  // インポート実行
  const handleImport = () => {
    const result = executeImport();
    if (result.success) {
      onImportSuccess(result.data, result.updatedData, {
        imported: result.importedCount,
        updated: result.updatedCount || 0,
        skipped: result.skippedCount,
        total: result.totalCount,
        duplicateHandling: result.duplicateHandling
      });
      onClose();
      resetImportState();
    }
  };

  // モーダルクローズ
  const handleClose = () => {
    onClose();
    resetImportState();
    setActiveTab('upload');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b bg-green-500 text-white">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Package className="w-6 h-6" />
            製品データ Excel/CSV 一括取り込み
          </h2>
          <button 
            onClick={handleClose}
            className="text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* タブナビゲーション */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'upload'
                ? 'border-b-2 border-green-500 bg-white text-green-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Upload className="w-4 h-4 inline mr-2" />
            ファイル選択
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            disabled={!fileData}
            className={`px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'preview'
                ? 'border-b-2 border-green-500 bg-white text-green-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Eye className="w-4 h-4 inline mr-2" />
            プレビュー
          </button>
          <button
            onClick={() => setActiveTab('mapping')}
            disabled={!fileData}
            className={`px-6 py-3 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'mapping'
                ? 'border-b-2 border-green-500 bg-white text-green-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            列マッピング
          </button>
        </div>

        {/* メインコンテンツ */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* エラー表示 */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-red-800">エラーが発生しました</h4>
                <p className="text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* ファイル選択タブ */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-800 mb-2">📦 製品データ取り込み手順</h3>
                <ol className="list-decimal list-inside text-green-700 space-y-1">
                  <li>Excel（.xlsx, .xls）またはCSV（.csv）ファイルを選択</li>
                  <li>データのプレビューを確認</li>
                  <li>必要に応じて列マッピングを調整</li>
                  <li>取り込み実行</li>
                </ol>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">✅ 必須項目</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 製品コード</li>
                    <li>• 製品名</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">📝 任意項目</h4>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• 会社名、カテゴリ、材質</li>
                    <li>• 単重、標準価格</li>
                    <li>• 説明、仕様、図面番号</li>
                  </ul>
                </div>
              </div>

              {/* ファイルアップロードエリア */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-400 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                {isProcessing ? (
                  <div className="flex flex-col items-center">
                    <Loader className="w-12 h-12 text-green-500 animate-spin mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">ファイル処理中...</h3>
                    <p className="text-gray-600">データを読み込んでいます</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <Upload className="w-12 h-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      ファイルを選択またはドラッグ&ドロップ
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Excel（.xlsx, .xls）またはCSV（.csv）ファイル
                    </p>
                    <p className="text-sm text-gray-500">最大ファイルサイズ: 10MB</p>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* サンプルファイルダウンロード */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  サンプルファイル形式：製品コード, 製品名, 会社名, カテゴリ, 材質, 単重, 標準価格
                </p>
              </div>
            </div>
          )}

          {/* プレビュータブ */}
          {activeTab === 'preview' && fileData && (
            <div className="space-y-6">
              {/* 統計情報 */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.totalRows}</div>
                  <div className="text-sm text-green-800">総データ数</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.validRows}</div>
                  <div className="text-sm text-blue-800">有効データ</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.errorRows}</div>
                  <div className="text-sm text-yellow-800">エラー</div>
                </div>
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.duplicateRows}</div>
                  <div className="text-sm text-red-800">重複</div>
                </div>
              </div>

              {/* エラー詳細 */}
              {validationResults.errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h4 className="flex items-center gap-2 font-medium text-yellow-800 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    データエラー ({validationResults.errors.length}件)
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {validationResults.errors.slice(0, 5).map((error, index) => (
                      <div key={index} className="text-sm text-yellow-700">
                        行{error.row}: {error.message}
                      </div>
                    ))}
                    {validationResults.errors.length > 5 && (
                      <div className="text-sm text-yellow-600 font-medium">
                        ...他 {validationResults.errors.length - 5}件
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 重複情報と処理選択 */}
              {duplicateInfo.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="flex items-center gap-2 font-medium text-orange-800 mb-3">
                    <AlertTriangle className="w-5 h-5" />
                    重複データ ({duplicateInfo.length}件)
                  </h4>
                  
                  {/* 重複処理オプション */}
                  <div className="mb-4 p-3 bg-white rounded border">
                    <h5 className="text-sm font-medium text-gray-800 mb-2">重複データの処理方法を選択してください：</h5>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="duplicateHandling"
                          value="skip"
                          checked={duplicateHandling === 'skip'}
                          onChange={(e) => setDuplicateHandlingMode(e.target.value)}
                          className="w-4 h-4 text-green-600"
                        />
                        <span className="text-sm text-gray-700">
                          <strong>スキップ</strong> - 重複データは取り込まない (推奨)
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="duplicateHandling"
                          value="update"
                          checked={duplicateHandling === 'update'}
                          onChange={(e) => setDuplicateHandlingMode(e.target.value)}
                          className="w-4 h-4 text-green-600"
                        />
                        <span className="text-sm text-gray-700">
                          <strong>更新</strong> - 既存データを新しいデータで置き換える
                        </span>
                      </label>
                    </div>
                  </div>
                  
                  {/* 重複データ一覧 */}
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {duplicateInfo.slice(0, 3).map((dup, index) => (
                      <div key={index} className="text-sm text-orange-700">
                        行{dup.row}: {dup.productName} (コード: {dup.productCode}) は既に登録されています
                      </div>
                    ))}
                    {duplicateInfo.length > 3 && (
                      <div className="text-sm text-orange-600 font-medium">
                        ...他 {duplicateInfo.length - 3}件
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* プレビューテーブル */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">データプレビュー（最初の5行）</h4>
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">行</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">製品コード</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">製品名</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">会社名</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">材質</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">単重</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-700">価格</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((item, index) => {
                        const hasError = validationResults.errors.some(error => error.row === item.rowIndex);
                        const isDuplicate = duplicateInfo.some(dup => dup.row === item.rowIndex);
                        return (
                          <tr 
                            key={index} 
                            className={`${
                              hasError ? 'bg-red-50' : 
                              isDuplicate ? 'bg-yellow-50' : 
                              'hover:bg-gray-50'
                            }`}
                          >
                            <td className="px-3 py-2">{item.rowIndex}</td>
                            <td className="px-3 py-2 font-mono text-xs">{item.productCode}</td>
                            <td className="px-3 py-2 font-medium">{item.productName}</td>
                            <td className="px-3 py-2 text-xs max-w-32 truncate">{item.companyName || '-'}</td>
                            <td className="px-3 py-2 text-xs">{item.material || '-'}</td>
                            <td className="px-3 py-2 text-xs">{item.unitWeight || '-'}</td>
                            <td className="px-3 py-2 text-xs">{item.standardPrice ? `¥${item.standardPrice.toLocaleString()}` : '-'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {stats.totalRows > 5 && (
                  <p className="text-sm text-gray-500 mt-2">
                    ...他 {stats.totalRows - 5}件のデータがあります
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 列マッピングタブ */}
          {activeTab === 'mapping' && fileData && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">列マッピング設定</h3>
                <p className="text-sm text-gray-600">
                  Excelの列と製品データの項目を対応付けてください。自動検出された設定を手動で調整できます。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 必須項目 */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">✅ 必須項目</h4>
                  <div className="space-y-3">
                    {getMappingStatus().required.map((field) => (
                      <div key={field.field} className="flex items-center gap-3">
                        <label className="w-24 text-sm font-medium text-gray-700">
                          {field.label}
                        </label>
                        <select
                          value={field.columnIndex ?? ''}
                          onChange={(e) => updateColumnMapping(field.field, e.target.value ? parseInt(e.target.value) : undefined)}
                          className={`flex-1 px-3 py-2 border rounded-lg text-sm ${
                            field.mapped ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                          }`}
                        >
                          <option value="">選択してください</option>
                          {headers.map((header, index) => (
                            <option key={index} value={index}>
                              {header} (列{index + 1})
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 任意項目 */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">📝 任意項目</h4>
                  <div className="space-y-3">
                    {getMappingStatus().optional.map((field) => (
                      <div key={field.field} className="flex items-center gap-3">
                        <label className="w-24 text-sm font-medium text-gray-700">
                          {field.label}
                        </label>
                        <select
                          value={field.columnIndex ?? ''}
                          onChange={(e) => updateColumnMapping(field.field, e.target.value ? parseInt(e.target.value) : undefined)}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">選択しない</option>
                          {headers.map((header, index) => (
                            <option key={index} value={index}>
                              {header} (列{index + 1})
                            </option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Excel列一覧 */}
              <div>
                <h4 className="font-medium text-gray-800 mb-3">📊 Excelファイルの列</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {headers.map((header, index) => {
                    const isUsed = Object.values(columnMapping).includes(index);
                    return (
                      <div
                        key={index}
                        className={`p-2 rounded text-sm border ${
                          isUsed ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-300 bg-gray-50'
                        }`}
                      >
                        <div className="font-medium">列{index + 1}</div>
                        <div className="truncate">{header}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="text-sm text-gray-600">
            {fileData && (
              <span>
                {stats.totalRows}件のデータ (有効: {stats.validRows}件, 
                エラー: {stats.errorRows}件, 重複: {stats.duplicateRows}件
                {duplicateInfo.length > 0 && (
                  <span className="ml-2 text-orange-600">
                    → {duplicateHandling === 'skip' ? 'スキップ' : '更新'}
                  </span>
                )}
                )
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            {fileData && (
              <button
                onClick={handleImport}
                disabled={!isReadyForImport()}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                {duplicateHandling === 'skip' 
                  ? `データ取り込み (${stats.validRows - stats.duplicateRows}件)` 
                  : `データ取り込み (新規: ${stats.validRows - stats.duplicateRows}件, 更新: ${stats.duplicateRows}件)`
                }
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductExcelImportModal;