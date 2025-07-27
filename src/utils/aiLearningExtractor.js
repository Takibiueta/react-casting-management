// AI学習型PDF抽出システム

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Gemini AIを使用したPDF情報抽出
 */
export class AILearningExtractor {
  constructor() {
    // Gemini APIの初期化（実際のAPIキーは環境変数から取得）
    const apiKey = process.env.REACT_APP_GEMINI_API_KEY || 'demo-key';
    if (apiKey !== 'demo-key') {
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.model = this.genAI.getGenerativeModel({ model: "gemini-pro" });
    } else {
      console.warn('Gemini API key not found. AI extraction will be simulated.');
      this.genAI = null;
      this.model = null;
    }
    
    // 学習データの履歴
    this.learningHistory = this.loadLearningHistory();
  }

  /**
   * AIを使用してPDFテキストから情報を抽出
   * @param {string} pdfText - PDFから抽出されたテキスト
   * @param {Object} context - 抽出のコンテキスト情報
   * @returns {Promise<Object>} 抽出結果
   */
  async extractWithAI(pdfText, context = {}) {
    if (!this.model) {
      console.log('AI extraction simulated (no API key)');
      return this.simulateAIExtraction(pdfText);
    }

    try {
      const prompt = this.buildExtractionPrompt(pdfText, context);
      console.log('AI抽出プロンプト送信中...');
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // AIの応答をJSONとして解析
      const extractedData = this.parseAIResponse(text);
      
      console.log('AI抽出結果:', extractedData);
      return extractedData;
      
    } catch (error) {
      console.error('AI抽出エラー:', error);
      return this.simulateAIExtraction(pdfText);
    }
  }

  /**
   * 抽出プロンプトを構築
   * @param {string} pdfText - PDFテキスト
   * @param {Object} context - コンテキスト
   * @returns {string} プロンプト
   */
  buildExtractionPrompt(pdfText, context) {
    const examples = this.getRelevantExamples(context);
    
    return `
あなたは鋳造業界の専門家です。以下のPDF文書から注文情報を正確に抽出してください。

【過去の学習例】
${examples}

【抽出するPDF文書】
---
${pdfText.substring(0, 2000)} ${pdfText.length > 2000 ? '...(続く)' : ''}
---

【抽出項目】
以下の情報をJSON形式で返してください：
{
  "orderNumber": "注文番号・受注番号・発注番号",
  "customerName": "顧客名・会社名",
  "productCode": "品番・製品番号・型番",
  "productName": "品名・製品名",
  "material": "材質（S14, SUS304, FCD400など）",
  "unitWeight": "単重量（数値のみ、単位kg）",
  "quantity": "数量（数値のみ）",
  "orderDate": "注文日（YYYY-MM-DD形式）",
  "deliveryDate": "納期（YYYY-MM-DD形式）",
  "confidence": "抽出の信頼度（0-100の数値）",
  "notes": "特記事項・抽出の根拠"
}

【抽出ルール】
1. 日本語の多様な表記に対応してください
2. 数字のスペース区切りや全角・半角の混在に注意してください
3. 材質は鋳造業界の標準的な記号を使用してください
4. 確信が持てない項目は空文字にしてください
5. 抽出根拠を notes に記載してください

JSON形式でのみ返答してください：
`;
  }

  /**
   * AI応答を解析してデータオブジェクトに変換
   * @param {string} aiResponse - AIの応答テキスト
   * @returns {Object} 解析されたデータ
   */
  parseAIResponse(aiResponse) {
    try {
      // JSONブロックを抽出
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        const parsed = JSON.parse(jsonStr);
        
        // データ型を正規化
        return {
          orderNumber: parsed.orderNumber || '',
          customerName: parsed.customerName || '',
          productCode: parsed.productCode || '',
          productName: parsed.productName || '',
          material: parsed.material || '',
          unitWeight: parseFloat(parsed.unitWeight) || 0,
          quantity: parseInt(parsed.quantity) || 0,
          orderDate: parsed.orderDate || '',
          deliveryDate: parsed.deliveryDate || '',
          confidence: parseInt(parsed.confidence) || 0,
          notes: parsed.notes || '',
          extractionMethod: 'AI'
        };
      }
    } catch (error) {
      console.error('AI応答解析エラー:', error);
    }
    
    return {
      orderNumber: '',
      customerName: '',
      productCode: '',
      productName: '',
      material: '',
      unitWeight: 0,
      quantity: 0,
      orderDate: '',
      deliveryDate: '',
      confidence: 0,
      notes: 'AI応答の解析に失敗',
      extractionMethod: 'AI_FAILED'
    };
  }

  /**
   * 関連する学習例を取得
   * @param {Object} context - コンテキスト
   * @returns {string} 学習例のテキスト
   */
  getRelevantExamples(context) {
    const examples = this.learningHistory.slice(-5); // 最新5件
    
    return examples.map((example, index) => `
例${index + 1}:
入力テキスト: "${example.inputText.substring(0, 200)}..."
抽出結果: ${JSON.stringify(example.correctData, null, 2)}
`).join('\n');
  }

  /**
   * 学習データを追加
   * @param {string} pdfText - PDFテキスト
   * @param {Object} correctData - 正解データ
   * @param {string} feedbackType - フィードバック種別
   */
  addLearningData(pdfText, correctData, feedbackType = 'correction') {
    const learningEntry = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      inputText: pdfText,
      correctData: correctData,
      feedbackType: feedbackType,
      textLength: pdfText.length,
      extractionPatterns: this.analyzeExtractionPatterns(pdfText, correctData)
    };
    
    this.learningHistory.push(learningEntry);
    
    // 履歴が多すぎる場合は古いものを削除
    if (this.learningHistory.length > 100) {
      this.learningHistory = this.learningHistory.slice(-50);
    }
    
    this.saveLearningHistory();
    console.log('学習データを追加:', learningEntry.id);
  }

  /**
   * 抽出パターンを分析
   * @param {string} text - PDFテキスト
   * @param {Object} correctData - 正解データ
   * @returns {Object} 分析されたパターン
   */
  analyzeExtractionPatterns(text, correctData) {
    const patterns = {};
    
    Object.keys(correctData).forEach(field => {
      const value = correctData[field];
      if (value && typeof value === 'string') {
        // 値の前後の文脈を探す
        const contextRegex = new RegExp(`([^\\n]{0,30})${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^\\n]{0,30})`, 'gi');
        const matches = [...text.matchAll(contextRegex)];
        
        if (matches.length > 0) {
          patterns[field] = matches.map(match => ({
            before: match[1].trim(),
            after: match[2].trim(),
            fullMatch: match[0].trim()
          }));
        }
      }
    });
    
    return patterns;
  }

  /**
   * AIなしでの抽出をシミュレート（デモ用）
   * @param {string} pdfText - PDFテキスト
   * @returns {Object} シミュレート結果
   */
  simulateAIExtraction(pdfText) {
    // 基本的なパターンマッチングによるシミュレート
    const data = {
      orderNumber: '',
      customerName: '',
      productCode: '',
      productName: '',
      material: '',
      unitWeight: 0,
      quantity: 0,
      orderDate: '',
      deliveryDate: '',
      confidence: 50,
      notes: 'AI APIが利用できないため、基本パターンマッチングを使用',
      extractionMethod: 'SIMULATED'
    };
    
    // 簡単なパターンマッチング
    const orderMatch = pdfText.match(/(?:注文番号|受注番号|発注番号)[:：\s]*([A-Z0-9\-]+)/i);
    if (orderMatch) {
      data.orderNumber = orderMatch[1];
      data.confidence += 10;
    }
    
    const productMatch = pdfText.match(/(?:品番|型番)[:：\s]*([A-Z0-9\-]+)/i);
    if (productMatch) {
      data.productCode = productMatch[1];
      data.confidence += 10;
    }
    
    return data;
  }

  /**
   * 学習履歴を保存
   */
  saveLearningHistory() {
    try {
      localStorage.setItem('aiLearningHistory', JSON.stringify(this.learningHistory));
    } catch (error) {
      console.error('学習履歴保存エラー:', error);
    }
  }

  /**
   * 学習履歴を読み込み
   * @returns {Array} 学習履歴
   */
  loadLearningHistory() {
    try {
      const history = localStorage.getItem('aiLearningHistory');
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('学習履歴読み込みエラー:', error);
      return [];
    }
  }

  /**
   * 学習統計を取得
   * @returns {Object} 学習統計
   */
  getLearningStats() {
    const total = this.learningHistory.length;
    const recentCount = this.learningHistory.filter(entry => {
      const entryDate = new Date(entry.timestamp);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      return entryDate > weekAgo;
    }).length;
    
    return {
      totalLearningEntries: total,
      recentLearningEntries: recentCount,
      averageConfidence: total > 0 ? 
        this.learningHistory.reduce((sum, entry) => sum + (entry.confidence || 50), 0) / total : 0
    };
  }
}

// シングルトンインスタンス
export const aiExtractor = new AILearningExtractor();