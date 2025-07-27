import React, { useState } from 'react';
import { FileText, Upload, X, CheckCircle, AlertCircle, BarChart3 } from 'lucide-react';
import { extractTextFromPDF, parseOrderData } from '../utils/pdfParser';

const PDFProcessor = ({ onDataExtracted }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [file, setFile] = useState(null);
  const [processingResult, setProcessingResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (event) => {
    const selectedFile = event.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.type !== 'application/pdf') {
      alert('PDFファイルを選択してください。');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setError(null);
    setExtractedData(null);
    setProcessingResult(null);

    try {
      // Extract text from PDF using PDF.js
      const extractedText = await extractTextFromPDF(selectedFile);
      
      // Parse the extracted text for order data
      const result = await parseOrderData(extractedText);
      
      setProcessingResult(result);
      
      if (result.success) {
        setExtractedData(result.data);
      } else {
        setError(result.error);
      }
    } catch (error) {
      console.error('PDF処理エラー:', error);
      setError(`PDF処理中にエラーが発生しました: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddExtractedData = () => {
    if (extractedData) {
      onDataExtracted(extractedData);
      setIsModalOpen(false);
      resetModal();
      alert('PDFからのデータを注文に追加しました。');
    }
  };

  const resetModal = () => {
    setFile(null);
    setExtractedData(null);
    setProcessingResult(null);
    setError(null);
    setIsProcessing(false);
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
      >
        <FileText className="w-4 h-4" />
        PDF読み込み
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b bg-blue-500 text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6" />
                PDF読み込み・データ抽出
              </h3>
              <button 
                onClick={() => { setIsModalOpen(false); resetModal(); }}
                className="text-white hover:text-gray-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6">
              {!file && (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">PDFファイルを選択してください</p>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              )}

              {file && isProcessing && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">PDFを解析中...</p>
                  <p className="text-sm text-gray-500 mt-2">ファイル: {file.name}</p>
                  <p className="text-xs text-gray-400 mt-1">テキスト抽出・データ解析実行中...</p>
                </div>
              )}

              {file && error && !isProcessing && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-red-600 mb-4">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-medium">処理エラー</span>
                  </div>
                  
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800 text-sm">{error}</p>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      onClick={() => { setIsModalOpen(false); resetModal(); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      閉じる
                    </button>
                    <button
                      onClick={resetModal}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      再試行
                    </button>
                  </div>
                </div>
              )}

              {file && extractedData && !isProcessing && processingResult && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">データ抽出完了</span>
                    </div>
                    
                    {/* Extraction Quality Badge */}
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium">精度: {processingResult.extractionQuality.score}%</span>
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        processingResult.extractionQuality.level === 'excellent' ? 'bg-green-100 text-green-800' :
                        processingResult.extractionQuality.level === 'good' ? 'bg-blue-100 text-blue-800' :
                        processingResult.extractionQuality.level === 'fair' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {processingResult.extractionQuality.level === 'excellent' ? '優秀' :
                         processingResult.extractionQuality.level === 'good' ? '良好' :
                         processingResult.extractionQuality.level === 'fair' ? '普通' : '要確認'}
                      </span>
                    </div>
                  </div>

                  {/* PDF Processing Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium">処理サマリー</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-blue-700">
                      <div>ページ数: {processingResult.pages}</div>
                      <div>抽出フィールド: {processingResult.extractionQuality.extractedFieldCount}/{processingResult.extractionQuality.totalFieldCount}</div>
                      <div>処理時間: 完了</div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-medium text-green-800 mb-3">抽出されたデータ:</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className={extractedData.orderNumber.startsWith('PDF-') ? 'text-gray-500' : 'text-gray-800'}>
                        <span className="font-medium">注文番号:</span> {extractedData.orderNumber}
                      </div>
                      <div className={extractedData.customer === 'PDF抽出顧客' ? 'text-gray-500' : 'text-gray-800'}>
                        <span className="font-medium">顧客名:</span> {extractedData.customer}
                      </div>
                      <div className={extractedData.productCode === 'PDF-EXTRACT' ? 'text-gray-500' : 'text-gray-800'}>
                        <span className="font-medium">品番:</span> {extractedData.productCode}
                      </div>
                      <div className={extractedData.productName === 'PDF抽出製品' ? 'text-gray-500' : 'text-gray-800'}>
                        <span className="font-medium">品名:</span> {extractedData.productName}
                      </div>
                      <div className={extractedData.material === 'S14' ? 'text-gray-500' : 'text-gray-800'}>
                        <span className="font-medium">材質:</span> {extractedData.material}
                      </div>
                      <div className={extractedData.unitWeight === 0 ? 'text-gray-500' : 'text-gray-800'}>
                        <span className="font-medium">単重量:</span> {extractedData.unitWeight}kg
                      </div>
                      <div className={extractedData.quantity === 1 ? 'text-gray-500' : 'text-gray-800'}>
                        <span className="font-medium">数量:</span> {extractedData.quantity}個
                      </div>
                      <div><span className="font-medium">総重量:</span> {extractedData.unitWeight * extractedData.quantity}kg</div>
                      <div><span className="font-medium">注文日:</span> {extractedData.orderDate}</div>
                      <div><span className="font-medium">納期:</span> {extractedData.deliveryDate}</div>
                    </div>
                    {extractedData.notes && (
                      <div className="mt-3">
                        <span className="font-medium">備考:</span> {extractedData.notes}
                      </div>
                    )}
                  </div>

                  {/* Extracted Fields Details */}
                  {processingResult.extractedFields && processingResult.extractedFields.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <h4 className="font-medium text-gray-800 mb-3">詳細抽出情報:</h4>
                      <div className="space-y-2">
                        {processingResult.extractedFields.map((field, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-700">{field.name}: {field.value}</span>
                            <span className={`px-2 py-1 rounded text-xs ${
                              field.confidence === 'high' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {field.confidence === 'high' ? '高精度' : '中精度'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <button
                      onClick={() => { setIsModalOpen(false); resetModal(); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleAddExtractedData}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      注文として追加
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PDFProcessor;