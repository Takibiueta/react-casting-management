import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, FileText, Check, X, Loader } from 'lucide-react';

// PDF.js worker設定（開発環境用の簡単な設定）
const setupPdfWorker = () => {
  try {
    // 開発環境では Worker を無効化してメインスレッドで実行
    // これにより Worker エラーを回避
    pdfjsLib.GlobalWorkerOptions.workerSrc = false;
    console.log('PDF processing configured for main thread (worker disabled)');
  } catch (error) {
    console.warn('PDF Worker setup failed:', error);
  }
};

const PDFReader = ({ onOrderExtracted, onMultipleOrdersExtracted }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfPages, setPdfPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(0);
  const [extractedData, setExtractedData] = useState({});
  const [extractionQuality, setExtractionQuality] = useState(0);
  const fileInputRef = useRef();

  // PDF.js Worker初期化
  useEffect(() => {
    setupPdfWorker();
  }, []);

  // PDFファイル選択処理
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('PDFファイルを選択してください。');
      return;
    }

    setPdfFile(file);
    processPDF(file);
  };

  // PDF処理メイン関数
  const processPDF = async (file) => {
    setIsProcessing(true);
    try {
      // Worker エラー対策として再度設定
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = false;
      }
      
      const arrayBuffer = await file.arrayBuffer();
      
      // PDF処理のオプション設定（エラー回避）
      const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        // Workerエラー回避のための設定
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true,
        // 追加の安全設定
        stopAtErrors: false,
        maxImageSize: 1024 * 1024,
        cMapPacked: true
      });
      
      const pdf = await loadingTask.promise;
      
      const pages = [];
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const text = textContent.items.map(item => item.str).join(' ');
        
        // ページの画像を生成
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale: 1.5 });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        await page.render({
          canvasContext: context,
          viewport: viewport
        }).promise;
        
        const imageUrl = canvas.toDataURL();
        
        // テキストからデータ抽出
        const extractedPageData = extractDataFromText(text);
        
        pages.push({
          pageNum,
          text,
          imageUrl,
          extractedData: extractedPageData,
          quality: evaluateDataQuality(extractedPageData)
        });
      }
      
      setPdfPages(pages);
      if (pages.length > 0) {
        setSelectedPage(0);
        setExtractedData(pages[0].extractedData);
        setExtractionQuality(pages[0].quality);
      }
    } catch (error) {
      console.error('PDF処理エラー:', error);
      
      // 詳細なエラーメッセージ
      let errorMessage = 'PDFの処理中にエラーが発生しました。';
      if (error.message.includes('Worker')) {
        errorMessage += '\n\nPDF Worker の読み込みに失敗しました。ネットワーク接続を確認してください。';
      } else if (error.message.includes('Invalid PDF')) {
        errorMessage += '\n\n無効なPDFファイルです。正しいPDFファイルを選択してください。';
      } else if (error.message.includes('fetch')) {
        errorMessage += '\n\nネットワークエラーが発生しました。';
      }
      
      alert(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // テキストからデータ抽出（index.htmlの複雑なロジックを移植）
  const extractDataFromText = (text) => {
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
      notes: ''
    };

    // 注文番号抽出パターン
    const orderPatterns = [
      /注文番号[:\s]*([A-Z0-9-]+)/i,
      /受注番号[:\s]*([A-Z0-9-]+)/i,
      /発注番号[:\s]*([A-Z0-9-]+)/i,
      /Order\s*No[:\s]*([A-Z0-9-]+)/i,
      /([A-Z]{2}\d{6}[A-Z]{1,3})/,
      /([M][A-Z]\d{3}[A-Z]{2,3})/
    ];

    for (const pattern of orderPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.orderNumber = match[1];
        break;
      }
    }

    // 顧客名抽出パターン
    const customerPatterns = [
      /([株式会社|有限会社]\s*[^\s\n]{2,20})/,
      /([A-Z][a-z]+\s*[A-Z][a-z]+\s*(?:株式会社|Corp|Ltd))/,
      /得意先[:\s]*([^\s\n]{3,20})/,
      /お客様[:\s]*([^\s\n]{3,20})/,
      /([株][^\s\n]{2,15})/
    ];

    for (const pattern of customerPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.customerName = match[1];
        break;
      }
    }

    // 品番抽出パターン
    const productCodePatterns = [
      /品番[:\s]*([A-Z0-9-]{4,20})/i,
      /型番[:\s]*([A-Z0-9-]{4,20})/i,
      /Part\s*No[:\s]*([A-Z0-9-]{4,20})/i,
      /([P]\d{3}-\d{3}-\d{4})/,
      /([SCH]\d{1,3})/,
      /([VLN]-\d{1,2})/
    ];

    for (const pattern of productCodePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.productCode = match[1];
        break;
      }
    }

    // 品名抽出パターン
    const productNamePatterns = [
      /品名[:\s]*([ァ-ヴー\s]{3,30})/,
      /製品名[:\s]*([ァ-ヴー\s]{3,30})/,
      /(コネクタ[^\s\n]{0,20})/,
      /(バルブ[^\s\n]{0,20})/,
      /(フランジ[^\s\n]{0,20})/,
      /(エルボ[^\s\n]{0,20})/
    ];

    for (const pattern of productNamePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.productName = match[1];
        break;
      }
    }

    // 材質抽出パターン
    const materialPatterns = [
      /材質[:\s]*(S1[34]|SUS30[0-9]|FCD[0-9]{3})/i,
      /材料[:\s]*(S1[34]|SUS30[0-9]|FCD[0-9]{3})/i,
      /(S14|S13|SUS304|SUS316|FCD400|FCD450)/,
      /ステンレス[:\s]*(S1[34])/i
    ];

    for (const pattern of materialPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.material = match[1];
        break;
      }
    }

    // 重量抽出パターン
    const weightPatterns = [
      /単重[:\s]*(\d+\.?\d*)\s*kg/i,
      /重量[:\s]*(\d+\.?\d*)\s*kg/i,
      /(\d+\.?\d*)\s*kg/i,
      /(\d+\.?\d*)\s*㎏/
    ];

    for (const pattern of weightPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.unitWeight = parseFloat(match[1]);
        break;
      }
    }

    // 数量抽出パターン
    const quantityPatterns = [
      /数量[:\s]*(\d+)\s*個/i,
      /個数[:\s]*(\d+)/i,
      /(\d+)\s*個/,
      /(\d+)\s*ケ/,
      /(\d+)\s*pc[s]?/i
    ];

    for (const pattern of quantityPatterns) {
      const match = text.match(pattern);
      if (match) {
        data.quantity = parseInt(match[1]);
        break;
      }
    }

    // 日付抽出パターン（注文日）
    const orderDatePatterns = [
      /注文日[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
      /受注日[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
      /発注日[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/
    ];

    for (const pattern of orderDatePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.orderDate = match[1];
        break;
      }
    }

    // 日付抽出パターン（納期）
    const deliveryDatePatterns = [
      /納期[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
      /納入日[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/,
      /希望納期[:\s]*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/
    ];

    for (const pattern of deliveryDatePatterns) {
      const match = text.match(pattern);
      if (match) {
        data.deliveryDate = match[1];
        break;
      }
    }

    return data;
  };

  // データ品質評価
  const evaluateDataQuality = (data) => {
    let score = 0;
    const fields = ['orderNumber', 'customerName', 'productCode', 'productName', 'material', 'unitWeight', 'quantity'];
    
    fields.forEach(field => {
      if (data[field] && data[field].toString().trim()) {
        score += 1;
      }
    });
    
    return Math.round((score / fields.length) * 100);
  };

  // 注文データとして追加
  const handleAddOrder = () => {
    const orderData = {
      id: Date.now(),
      priority: 1,
      orderNumber: extractedData.orderNumber || `PDF-${Date.now()}`,
      productName: extractedData.productName || '不明',
      productCode: extractedData.productCode || '',
      material: extractedData.material || 'S14',
      unitWeight: extractedData.unitWeight || 0,
      quantity: extractedData.quantity || 1,
      totalWeight: (extractedData.unitWeight || 0) * (extractedData.quantity || 1),
      status: 'waiting',
      deliveryDate: extractedData.deliveryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      orderDate: extractedData.orderDate || new Date().toISOString().split('T')[0],
      customerName: extractedData.customerName || '不明',
      notes: `PDF抽出 (品質: ${extractionQuality}%)`
    };

    // 残日数計算
    const today = new Date();
    const delivery = new Date(orderData.deliveryDate);
    orderData.daysRemaining = Math.ceil((delivery - today) / (1000 * 60 * 60 * 24));

    onOrderExtracted(orderData);
    setIsModalOpen(false);
    resetModal();
  };

  // 全ページから注文を追加
  const handleAddAllOrders = () => {
    const orders = pdfPages.map((page, index) => ({
      id: Date.now() + index,
      priority: index + 1,
      orderNumber: page.extractedData.orderNumber || `PDF-${Date.now()}-${index + 1}`,
      productName: page.extractedData.productName || '不明',
      productCode: page.extractedData.productCode || '',
      material: page.extractedData.material || 'S14',
      unitWeight: page.extractedData.unitWeight || 0,
      quantity: page.extractedData.quantity || 1,
      totalWeight: (page.extractedData.unitWeight || 0) * (page.extractedData.quantity || 1),
      status: 'waiting',
      deliveryDate: page.extractedData.deliveryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      orderDate: page.extractedData.orderDate || new Date().toISOString().split('T')[0],
      customerName: page.extractedData.customerName || '不明',
      notes: `PDF抽出 P${page.pageNum} (品質: ${page.quality}%)`,
      daysRemaining: Math.ceil((new Date(page.extractedData.deliveryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)) - new Date()) / (1000 * 60 * 60 * 24))
    }));

    onMultipleOrdersExtracted(orders);
    setIsModalOpen(false);
    resetModal();
  };

  // モーダルリセット
  const resetModal = () => {
    setPdfFile(null);
    setPdfPages([]);
    setSelectedPage(0);
    setExtractedData({});
    setExtractionQuality(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // ページ切り替え
  const handlePageSelect = (pageIndex) => {
    setSelectedPage(pageIndex);
    setExtractedData(pdfPages[pageIndex].extractedData);
    setExtractionQuality(pdfPages[pageIndex].quality);
  };

  return (
    <>
      {/* PDF読み取りボタン */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md"
      >
        <FileText className="w-4 h-4" />
        📄 PDF読み取り
      </button>

      {/* PDFモーダル */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* モーダルヘッダー */}
            <div className="flex items-center justify-between p-4 border-b bg-orange-500 text-white">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FileText className="w-6 h-6" />
                PDF注文書読み取り
              </h2>
              <button 
                onClick={() => { setIsModalOpen(false); resetModal(); }}
                className="text-white hover:bg-orange-600 p-1 rounded"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {!pdfFile ? (
                /* ファイル選択エリア */
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">PDFファイルを選択</h3>
                  <p className="text-gray-600 mb-4">注文書のPDFファイルをアップロードしてください</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded-lg transition-colors"
                  >
                    ファイルを選択
                  </button>
                </div>
              ) : isProcessing ? (
                /* 処理中表示 */
                <div className="text-center py-16">
                  <Loader className="w-16 h-16 animate-spin mx-auto text-orange-500 mb-4" />
                  <h3 className="text-lg font-medium">PDF処理中...</h3>
                  <p className="text-gray-600">テキストを抽出しています</p>
                </div>
              ) : (
                /* 結果表示 */
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* 左側：PDF表示とページ選択 */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">PDF内容</h3>
                    
                    {/* ページタブ */}
                    {pdfPages.length > 1 && (
                      <div className="flex gap-2 mb-4 overflow-x-auto">
                        {pdfPages.map((page, index) => (
                          <button
                            key={index}
                            onClick={() => handlePageSelect(index)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg whitespace-nowrap ${
                              selectedPage === index
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-100 hover:bg-gray-200'
                            }`}
                          >
                            ページ {page.pageNum}
                            <span className={`text-xs px-2 py-1 rounded ${
                              page.quality >= 70 ? 'bg-green-100 text-green-800' :
                              page.quality >= 50 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {page.quality}%
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* PDF画像表示 */}
                    {pdfPages[selectedPage] && (
                      <div className="border rounded-lg p-2 bg-gray-50">
                        <img
                          src={pdfPages[selectedPage].imageUrl}
                          alt={`Page ${pdfPages[selectedPage].pageNum}`}
                          className="w-full h-auto rounded"
                        />
                      </div>
                    )}
                  </div>

                  {/* 右側：抽出データフォーム */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium">抽出データ</h3>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        extractionQuality >= 70 ? 'bg-green-100 text-green-800' :
                        extractionQuality >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        品質: {extractionQuality}%
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">注文番号</label>
                        <input
                          type="text"
                          value={extractedData.orderNumber || ''}
                          onChange={(e) => setExtractedData({...extractedData, orderNumber: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">顧客名</label>
                        <input
                          type="text"
                          value={extractedData.customerName || ''}
                          onChange={(e) => setExtractedData({...extractedData, customerName: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">品番</label>
                        <input
                          type="text"
                          value={extractedData.productCode || ''}
                          onChange={(e) => setExtractedData({...extractedData, productCode: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">品名</label>
                        <input
                          type="text"
                          value={extractedData.productName || ''}
                          onChange={(e) => setExtractedData({...extractedData, productName: e.target.value})}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">材質</label>
                          <select
                            value={extractedData.material || 'S14'}
                            onChange={(e) => setExtractedData({...extractedData, material: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          >
                            <option value="S14">S14</option>
                            <option value="S13">S13</option>
                            <option value="SUS304">SUS304</option>
                            <option value="SUS316">SUS316</option>
                            <option value="FCD400">FCD400</option>
                            <option value="FCD450">FCD450</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">単重量 (kg)</label>
                          <input
                            type="number"
                            step="0.1"
                            value={extractedData.unitWeight || ''}
                            onChange={(e) => setExtractedData({...extractedData, unitWeight: parseFloat(e.target.value) || 0})}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">数量</label>
                        <input
                          type="number"
                          value={extractedData.quantity || ''}
                          onChange={(e) => setExtractedData({...extractedData, quantity: parseInt(e.target.value) || 1})}
                          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">注文日</label>
                          <input
                            type="date"
                            value={extractedData.orderDate || ''}
                            onChange={(e) => setExtractedData({...extractedData, orderDate: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">納期</label>
                          <input
                            type="date"
                            value={extractedData.deliveryDate || ''}
                            onChange={(e) => setExtractedData({...extractedData, deliveryDate: e.target.value})}
                            className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* モーダルフッター */}
            {pdfPages.length > 0 && (
              <div className="flex items-center justify-between p-4 border-t bg-gray-50">
                <div className="text-sm text-gray-600">
                  {pdfPages.length}ページのPDFから{pdfPages.filter(p => p.quality >= 50).length}ページのデータを検出
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => { setIsModalOpen(false); resetModal(); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    キャンセル
                  </button>
                  {pdfPages.length > 1 && (
                    <button
                      onClick={handleAddAllOrders}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                    >
                      全ページ追加 ({pdfPages.length}件)
                    </button>
                  )}
                  <button
                    onClick={handleAddOrder}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    注文追加
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

export default PDFReader;