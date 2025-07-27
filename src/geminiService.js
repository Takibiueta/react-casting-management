import { GoogleGenerativeAI } from '@google/generative-ai';

// Gemini AI API Key from environment variable
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || 'AIzaSyD81ZvCdPQibUBXag7NmV7deCSJTQjfU-0';

// Initialize the Gemini AI
const genAI = new GoogleGenerativeAI(API_KEY);

// Get the model
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Gemini AI Service for casting management
export class GeminiAIService {
  constructor() {
    this.contextPrompt = `
あなたは日本のステンレス鋳造工場の専門AIアシスタントです。
以下の専門知識を持っています：

🏭 鋳造業務の専門知識:
- ステンレス材質（S13, S14など）の特性
- 鋳造プロセスの最適化
- バッチ管理（300kg目標）
- 納期管理と優先度設定
- 品質管理と検査項目

📊 データ管理機能:
- 注文データのフィルタリング
- 統計分析と傾向予測
- 緊急度の自動判定
- 生産計画の提案

💼 業務効率化:
- 自然言語での指示理解
- 複雑な条件での検索
- レポート生成
- アラート通知

ユーザーからの質問に対して、専門的で実用的なアドバイスを提供してください。
日本語で丁寧に、しかし効率的に回答してください。
`;
  }

  // Generate AI response using Gemini
  async generateResponse(userMessage, orderData) {
    try {
      // Create context with current order data
      const dataContext = `
現在の注文データ:
${JSON.stringify(orderData, null, 2)}

統計情報:
- 総注文数: ${orderData.length}件
- 総重量: ${orderData.reduce((sum, order) => sum + order.totalWeight, 0)}kg
- S14材質: ${orderData.filter(o => o.material === 'S14').length}件
- S13材質: ${orderData.filter(o => o.material === 'S13').length}件
- 緊急注文（7日以内）: ${orderData.filter(o => o.daysRemaining < 7).length}件
- 遅延注文: ${orderData.filter(o => o.daysRemaining < 0).length}件
`;

      const fullPrompt = `
${this.contextPrompt}

${dataContext}

ユーザーの質問: "${userMessage}"

この質問に対して、以下の形式でJSONレスポンスを返してください:

{
  "message": "ユーザーへの回答メッセージ（日本語、改行は\\nで表現）",
  "action": "実行するアクション（filter_material, extend_delivery, show_urgent, batch_optimize, help, analysis など）",
  "data": "フィルタリング結果や更新データ（必要な場合のみ）",
  "suggestions": ["提案1", "提案2", "提案3"]
}

必ず有効なJSONフォーマットで回答してください。
`;

      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const text = response.text();
      
      // Try to parse as JSON
      try {
        const jsonResponse = JSON.parse(text);
        return jsonResponse;
      } catch (parseError) {
        // If JSON parsing fails, create a fallback response
        return {
          message: text,
          action: 'general_response',
          data: null,
          suggestions: ["データを表示", "バッチ最適化", "緊急納期確認"]
        };
      }
    } catch (error) {
      console.error('Gemini AI Error:', error);
      throw new Error(`AI処理エラー: ${error.message}`);
    }
  }

  // Analyze orders and provide insights
  async analyzeOrders(orderData) {
    try {
      const analysisPrompt = `
以下の注文データを分析して、重要な洞察と推奨事項を提供してください:

${JSON.stringify(orderData, null, 2)}

以下の観点で分析してください:
1. 納期リスク分析
2. 材質別の効率性
3. バッチ最適化の提案
4. 生産計画の改善点
5. 緊急対応が必要な項目

JSONフォーマットで回答してください:
{
  "analysis": "詳細な分析結果",
  "risks": ["リスク1", "リスク2"],
  "recommendations": ["推奨事項1", "推奨事項2"],
  "optimizations": ["最適化案1", "最適化案2"]
}
`;

      const result = await model.generateContent(analysisPrompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Analysis Error:', error);
      return {
        analysis: "分析中にエラーが発生しました。",
        risks: ["データ分析エラー"],
        recommendations: ["システム管理者に連絡してください"],
        optimizations: []
      };
    }
  }

  // Generate batch optimization suggestions
  async optimizeBatches(orderData) {
    try {
      const batchPrompt = `
以下の注文データに基づいて、300kg目標でのバッチ最適化を提案してください:

${JSON.stringify(orderData, null, 2)}

考慮事項:
- 同一材質でのグループ化
- 納期の優先度
- 効率的な重量配分
- 品質管理の観点

JSONフォーマットで回答:
{
  "batches": [
    {
      "id": 1,
      "material": "S14",
      "orders": [注文ID配列],
      "totalWeight": 重量,
      "priority": "優先度",
      "recommendedDate": "推奨実行日"
    }
  ],
  "summary": "最適化の概要説明",
  "efficiency": "効率性の評価"
}
`;

      const result = await model.generateContent(batchPrompt);
      const response = await result.response;
      const text = response.text();
      
      return JSON.parse(text);
    } catch (error) {
      console.error('Batch Optimization Error:', error);
      return {
        batches: [],
        summary: "バッチ最適化中にエラーが発生しました。",
        efficiency: "分析不可"
      };
    }
  }
}

// Export singleton instance
export const geminiAI = new GeminiAIService();