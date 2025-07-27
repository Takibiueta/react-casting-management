import React, { useState, useRef, useEffect } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { Upload, FileText, Check, X, Loader } from 'lucide-react';
import { generateOrderId } from './utils/uniqueId';

// PDF.js worker設定
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
    console.log('PDF worker configured successfully for pdfjs-dist v4');
  } catch (error) {
    console.warn('PDF Worker setup failed, falling back to main thread:', error);
    // フォールバック：workerを無効化して安全にフォールバック
    try {
      pdfjsLib.GlobalWorkerOptions.workerSrc = null;
    } catch (fallbackError) {
      console.warn('Fallback also failed:', fallbackError);
    }
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
      // Worker が設定されていない場合のフォールバック
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        setupPdfWorker();
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

  // テキストからデータ抽出（index.htmlの詳細なロジックを移植）
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

    try {
      console.log('=== PDF解析開始 ===');
      console.log('抽出テキスト（最初500文字）:', text.substring(0, 500));
      console.log('テキスト長:', text.length);

      // 1. 注文番号抽出 - 受注番号、注文番号の様々なパターン
      const orderPatterns = [
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
      ];

      for (let i = 0; i < orderPatterns.length; i++) {
        const pattern = orderPatterns[i];
        const match = text.match(pattern);
        if (match && match[1]) {
          data.orderNumber = match[1].trim();
          console.log(`注文番号抽出（パターン${i+1}）:`, data.orderNumber);
          break;
        }
      }

      // 2. 顧客名抽出パターン
      const customerPatterns = [
        /得意先名?[:：\s]*([^\n\r]+)/i,                     // 得意先名：XX株式会社
        /顧客名?[:：\s]*([^\n\r]+)/i,                       // 顧客名：XX株式会社
        /お客様[:：\s]*([^\n\r]+)/i,                        // お客様：XX株式会社
        /Customer[:：\s]*([^\n\r]+)/i,                      // Customer: XX Corp
        /([株式会社|有限会社|合同会社][^\s\n\r]{2,20})/,     // 株式会社XXXX
        /([A-Z][a-z]+\s*[A-Z][a-z]+\s*(?:株式会社|Corp|Ltd))/,
        /([株][^\s\n\r]{2,15})/,                           // 株XXXX
        /([\u4e00-\u9faf]+(?:株式会社|有限会社|合同会社))/  // 漢字+会社名
      ];

      for (let i = 0; i < customerPatterns.length; i++) {
        const pattern = customerPatterns[i];
        const match = text.match(pattern);
        if (match && match[1]) {
          data.customerName = match[1].trim();
          console.log(`顧客名抽出（パターン${i+1}）:`, data.customerName);
          break;
        }
      }

      // 3. 品番抽出パターン（index.htmlの詳細パターンを使用）
      const productCodePatterns = [
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
        /^[\s]*([0-9]+\-[A-Z]+[0-9]+[\-ｼ]+[0-9]*)[\s]*$/m,   // 行独立の品番パターン
        /([SCH]\d{1,3})/,                                    // SCH123形式
        /([VLN]-\d{1,2})/                                    // VLN-15形式
      ];

      for (let i = 0; i < productCodePatterns.length; i++) {
        const pattern = productCodePatterns[i];
        const match = text.match(pattern);
        if (match && match[1]) {
          data.productCode = match[1].trim();
          console.log(`品番抽出（パターン${i+1}）:`, data.productCode, 'マッチ:', match[0]);
          break;
        }
      }

      // 4. 品名抽出パターン（index.htmlの詳細パターンを使用）
      const productNamePatterns = [
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
        /(シリンダ[^\n\r]*)/i,                               // シリンダ XXX
        /([ァ-ヴー\s]{3,30})/                                // カタカナ名称
      ];

      for (let i = 0; i < productNamePatterns.length; i++) {
        const pattern = productNamePatterns[i];
        const match = text.match(pattern);
        if (match && match[1]) {
          data.productName = match[1].trim();
          console.log(`品名抽出（パターン${i+1}）:`, data.productName);
          break;
        }
      }

      // 5. 材質抽出パターン（より詳細に）
      const materialPatterns = [
        /材質[:：\s]*(S1[34]|SUS30[0-9]L?|FCD[0-9]{3}|SCPH[0-9]+|SCS1[34]|FC[0-9]{3})/i,
        /材料[:：\s]*(S1[34]|SUS30[0-9]L?|FCD[0-9]{3}|SCPH[0-9]+|SCS1[34]|FC[0-9]{3})/i,
        /Material[:：\s]*(S1[34]|SUS30[0-9]L?|FCD[0-9]{3}|SCPH[0-9]+|SCS1[34]|FC[0-9]{3})/i,
        /(S14|S13|SUS304|SUS316L?|FCD400|FCD450|SCPH2|SCS13|SCS14|FC200|FC250)/g,
        /ステンレス[:：\s]*(S1[34]|SUS30[0-9]L?)/i,
        /(F\s*C\s*D\s*[0-9]+\s*[\-0-9]*|F\s*C\s*[0-9]+\s*[\-0-9]*|S\s*C\s*P\s*H\s*[0-9]+\s*[\-0-9]*)/i
      ];

      for (let i = 0; i < materialPatterns.length; i++) {
        const pattern = materialPatterns[i];
        const match = text.match(pattern);
        if (match && match[1]) {
          data.material = match[1].trim().replace(/\s+/g, '');
          console.log(`材質抽出（パターン${i+1}）:`, data.material);
          break;
        }
      }

      // 6. 重量抽出パターン
      const weightPatterns = [
        /単重量?[:：\s]*([0-9]+\.?[0-9]*)\s*(?:kg|KG|ｋｇ)/i,
        /重量[:：\s]*([0-9]+\.?[0-9]*)\s*(?:kg|KG|ｋｇ)/i,
        /Weight[:：\s]*([0-9]+\.?[0-9]*)\s*(?:kg|KG)/i,
        /([0-9]+\.?[0-9]*)\s*(?:kg|KG|ｋｇ)/i,
        /([0-9]+\.?[0-9]*)\s*㎏/,
        /重[:：\s]*([0-9]+\.?[0-9]*)/i
      ];

      for (let i = 0; i < weightPatterns.length; i++) {
        const pattern = weightPatterns[i];
        const match = text.match(pattern);
        if (match && match[1]) {
          data.unitWeight = parseFloat(match[1]);
          console.log(`重量抽出（パターン${i+1}）:`, data.unitWeight, 'kg');
          break;
        }
      }

      // 7. 数量抽出パターン
      const quantityPatterns = [
        /数量[:：\s]*([0-9]+)\s*(?:個|ケ|pcs?|pieces?)/i,
        /個数[:：\s]*([0-9]+)/i,
        /Quantity[:：\s]*([0-9]+)/i,
        /Qty[:：\s]*([0-9]+)/i,
        /([0-9]+)\s*(?:個|ケ|pcs?|pieces?)/i,
        /×\s*([0-9]+)/i,
        /数[:：\s]*([0-9]+)/i
      ];

      for (let i = 0; i < quantityPatterns.length; i++) {
        const pattern = quantityPatterns[i];
        const match = text.match(pattern);
        if (match && match[1]) {
          data.quantity = parseInt(match[1]);
          console.log(`数量抽出（パターン${i+1}）:`, data.quantity);
          break;
        }
      }

      // 8. 日付抽出パターン（注文日・発注日）
      const orderDatePatterns = [
        /注文日[:：\s]*([0-9]{4}[年\/-][0-9]{1,2}[月\/-][0-9]{1,2}[日]?)/i,
        /受注日[:：\s]*([0-9]{4}[年\/-][0-9]{1,2}[月\/-][0-9]{1,2}[日]?)/i,
        /発注日[:：\s]*([0-9]{4}[年\/-][0-9]{1,2}[月\/-][0-9]{1,2}[日]?)/i,
        /Order\s*Date[:：\s]*([0-9]{4}[年\/-][0-9]{1,2}[月\/-][0-9]{1,2}[日]?)/i
      ];

      for (let i = 0; i < orderDatePatterns.length; i++) {
        const pattern = orderDatePatterns[i];
        const match = text.match(pattern);
        if (match && match[1]) {
          // 日付フォーマットを標準化
          data.orderDate = match[1].replace(/[年月]/g, '-').replace(/日/g, '');
          console.log(`注文日抽出（パターン${i+1}）:`, data.orderDate);
          break;
        }
      }

      // 9. 日付抽出パターン（納期）
      const deliveryDatePatterns = [
        /納期[:：\s]*([0-9]{4}[年\/-][0-9]{1,2}[月\/-][0-9]{1,2}[日]?)/i,
        /納入日[:：\s]*([0-9]{4}[年\/-][0-9]{1,2}[月\/-][0-9]{1,2}[日]?)/i,
        /希望納期[:：\s]*([0-9]{4}[年\/-][0-9]{1,2}[月\/-][0-9]{1,2}[日]?)/i,
        /Delivery\s*Date[:：\s]*([0-9]{4}[年\/-][0-9]{1,2}[月\/-][0-9]{1,2}[日]?)/i
      ];

      for (let i = 0; i < deliveryDatePatterns.length; i++) {
        const pattern = deliveryDatePatterns[i];
        const match = text.match(pattern);
        if (match && match[1]) {
          // 日付フォーマットを標準化
          data.deliveryDate = match[1].replace(/[年月]/g, '-').replace(/日/g, '');
          console.log(`納期抽出（パターン${i+1}）:`, data.deliveryDate);
          break;
        }
      }

      // フォールバック処理（データが不足している場合）
      if (!data.productCode) {
        // より緩い品番パターン
        const codeMatch = text.match(/([0-9]+\-[A-Z]+[0-9]+(?:\-?ｼ)?)/);
        if (codeMatch) {
          data.productCode = codeMatch[1];
          console.log('フォールバック品番:', data.productCode);
        }
      }

      if (!data.productName) {
        // カタカナのみのパターン
        const nameMatch = text.match(/(ｼﾘﾝﾀﾞ\([^)]+\))/);
        if (nameMatch) {
          data.productName = nameMatch[1];
          console.log('フォールバック品名:', data.productName);
        }
      }

      if (!data.material) {
        // スペース入りFCD、FC、SCPH系の材質を探す
        const matMatch = text.match(/(F\s*C\s*D\s*[0-9]+\s*[\-0-9]*|F\s*C\s*[0-9]+\s*[\-0-9]*|S\s*C\s*P\s*H\s*[0-9]+\s*[\-0-9]*)/i);
        if (matMatch) {
          data.material = matMatch[1].replace(/\s+/g, '');
          console.log('フォールバック材質:', data.material);
        }
      }

      console.log('=== 抽出結果 ===', data);
      return data;

    } catch (error) {
      console.error('PDF抽出エラー:', error);
      return data;
    }
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
      id: generateOrderId(),
      priority: 1,
      orderNumber: extractedData.orderNumber || `PDF-${generateOrderId()}`,
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
      id: generateOrderId(),
      priority: index + 1,
      orderNumber: page.extractedData.orderNumber || `PDF-${generateOrderId()}-${index + 1}`,
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