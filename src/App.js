import React, { useState, useEffect } from 'react';
import { Search, Download, Upload, Zap, Settings, MessageCircle, Send, Loader, Brain, TrendingUp, AlertTriangle } from 'lucide-react';
import { geminiAI } from './geminiService';

// サンプルデータ
const initialOrders = [
  {
    id: 1,
    priority: 1,
    deliveryDate: '2025-01-31',
    daysRemaining: -4,
    productName: 'コネクタ VLN-15',
    productCode: 'P815-110-0162',
    unitWeight: 13.2,
    quantity: 2,
    totalWeight: 26.4,
    status: 'waiting',
    orderNumber: 'MN002BUV',
    notes: '25.4.9在庫3ケ仕上済',
    material: 'S14'
  },
  {
    id: 2,
    priority: 2,
    deliveryDate: '2025-02-28',
    daysRemaining: 24,
    productName: 'コネクタ VLN-5',
    productCode: 'P895-110-0163',
    unitWeight: 7.3,
    quantity: 16,
    totalWeight: 116.8,
    status: 'waiting',
    orderNumber: 'MH002BVD',
    notes: '',
    material: 'S14'
  },
  {
    id: 3,
    priority: 3,
    deliveryDate: '2025-03-21',
    daysRemaining: 45,
    productName: 'エアレジメンテ（2個セット）',
    productCode: 'SCH11',
    unitWeight: 10.5,
    quantity: 16,
    totalWeight: 168.0,
    status: 'waiting',
    orderNumber: '-',
    notes: '',
    material: 'S13'
  },
  {
    id: 4,
    priority: 4,
    deliveryDate: '2025-03-21',
    daysRemaining: 45,
    productName: 'コネクタ VLN-3（4個セット）',
    productCode: 'P893-110-0162',
    unitWeight: 6.0,
    quantity: 14,
    totalWeight: 84.0,
    status: 'waiting',
    orderNumber: 'MH002BV3',
    notes: '枠6W分のみ',
    material: 'S13'
  }
];

// AIアシスタントコンポーネント
const AIAssistant = ({ orders, onOrdersUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'こんにちは！Gemini AI搭載のステンレス鋳造管理システムです。🤖\n\n🎯 新機能:\n• 自然言語での複雑な質問対応\n• 高度なデータ分析と予測\n• インテリジェントなバッチ最適化\n• リアルタイム品質管理アドバイス\n• 生産効率の改善提案\n\n💡 例: 「S14材質で緊急度の高い注文を分析して」\n「来週の生産計画を最適化して」\n\nお気軽にご質問ください！',
      timestamp: new Date(),
      isGemini: true
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisMode, setAnalysisMode] = useState(false);

  // Gemini AI メッセージ送信処理
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Gemini AI による高度な自然言語処理
      const aiResponse = await geminiAI.generateResponse(currentInput, orders);
      
      // データ処理とアクション実行
      let processedData = null;
      
      switch (aiResponse.action) {
        case 'filter_material':
          if (currentInput.includes('S14')) {
            processedData = orders.filter(order => order.material === 'S14');
          } else if (currentInput.includes('S13')) {
            processedData = orders.filter(order => order.material === 'S13');
          }
          break;
        
        case 'show_urgent':
          processedData = orders.filter(order => order.daysRemaining < 7);
          break;
        
        case 'extend_delivery':
          const extendDays = currentInput.includes('1週間') || currentInput.includes('7日') ? 7 : 
                            currentInput.includes('2週間') || currentInput.includes('14日') ? 14 : 7;
          processedData = orders.map(order => {
            const newDate = new Date(order.deliveryDate);
            newDate.setDate(newDate.getDate() + extendDays);
            return {
              ...order,
              deliveryDate: newDate.toISOString().split('T')[0],
              daysRemaining: order.daysRemaining + extendDays
            };
          });
          break;
        
        case 'reset_filter':
          processedData = orders;
          break;
        
        default:
          processedData = aiResponse.data;
      }

      // アクション実行
      if (processedData) {
        onOrdersUpdate(processedData);
      }

      const assistantMessage = {
        role: 'assistant',
        content: aiResponse.message,
        timestamp: new Date(),
        actionTaken: aiResponse.action,
        suggestions: aiResponse.suggestions,
        isGemini: true
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Gemini AI Error:', error);
      const errorMessage = {
        role: 'assistant',
        content: `❌ Gemini AI処理エラー: ${error.message}\n\n💡 ヒント: \n• API接続を確認してください\n• しばらく待ってから再試行してください\n• シンプルな質問から始めてみてください`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // データ分析機能
  const handleAnalyzeOrders = async () => {
    setAnalysisMode(true);
    setIsLoading(true);
    
    try {
      const analysis = await geminiAI.analyzeOrders(orders);
      
      const analysisMessage = {
        role: 'assistant',
        content: `📊 **データ分析結果**\n\n${analysis.analysis}\n\n⚠️ **リスク要因:**\n${analysis.risks.map(risk => `• ${risk}`).join('\n')}\n\n💡 **推奨事項:**\n${analysis.recommendations.map(rec => `• ${rec}`).join('\n')}\n\n🔧 **最適化案:**\n${analysis.optimizations.map(opt => `• ${opt}`).join('\n')}`,
        timestamp: new Date(),
        actionTaken: 'analysis',
        isGemini: true,
        isAnalysis: true
      };
      
      setMessages(prev => [...prev, analysisMessage]);
    } catch (error) {
      console.error('Analysis Error:', error);
    } finally {
      setIsLoading(false);
      setAnalysisMode(false);
    }
  };

  // バッチ最適化機能
  const handleOptimizeBatches = async () => {
    setIsLoading(true);
    
    try {
      const optimization = await geminiAI.optimizeBatches(orders);
      
      const optimizationMessage = {
        role: 'assistant',
        content: `🎯 **バッチ最適化提案**\n\n${optimization.summary}\n\n📦 **推奨バッチ構成:**\n${optimization.batches.map((batch, index) => 
          `**バッチ${batch.id || index + 1}** (${batch.material})\n• 重量: ${batch.totalWeight}kg\n• 優先度: ${batch.priority}\n• 推奨実行日: ${batch.recommendedDate}\n`
        ).join('\n')}\n\n⚡ **効率性評価:** ${optimization.efficiency}`,
        timestamp: new Date(),
        actionTaken: 'batch_optimization',
        isGemini: true,
        isBatchOptimization: true
      };
      
      setMessages(prev => [...prev, optimizationMessage]);
    } catch (error) {
      console.error('Batch Optimization Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    'S14材質で緊急度の高い注文を分析して',
    'S13材質を表示', 
    '今週中に納期が来る注文を確認',
    'バッチを最適化して生産効率を上げて',
    '遅延している注文の対策を提案して',
    '全注文の統計分析をして'
  ];

  const advancedActions = [
    { label: '📊 深度分析', action: handleAnalyzeOrders, icon: TrendingUp },
    { label: '🎯 バッチ最適化', action: handleOptimizeBatches, icon: Zap },
  ];

  return (
    <>
      {/* AIアシスタントボタン */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
            isOpen 
              ? 'bg-red-500 hover:bg-red-600' 
              : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 animate-pulse'
          }`}
        >
          {isOpen ? (
            <span className="text-white text-xl">✕</span>
          ) : (
            <div className="text-center text-white">
              <MessageCircle className="w-6 h-6 mx-auto" />
              <div className="text-xs mt-1">AI</div>
            </div>
          )}
        </button>
      </div>

      {/* AIチャットパネル */}
      {isOpen && (
        <div className="fixed bottom-28 right-6 w-96 h-[32rem] bg-white rounded-lg shadow-2xl border z-40 flex flex-col">
          {/* ヘッダー */}
          <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-t-lg">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              <span className="font-semibold">Gemini AI アシスタント</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs">Gemini Pro</span>
            </div>
          </div>

          {/* メッセージエリア */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : message.isError
                      ? 'bg-red-100 text-red-800 border border-red-300'
                      : message.isGemini
                      ? 'bg-gradient-to-br from-purple-50 to-blue-50 text-gray-800 border border-purple-200'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {message.isGemini && (
                    <div className="flex items-center gap-1 mb-2 text-xs text-purple-600">
                      <Brain className="w-3 h-3" />
                      <span>Gemini AI</span>
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  {message.suggestions && (
                    <div className="mt-3 p-2 bg-white bg-opacity-60 rounded border-l-2 border-purple-300">
                      <div className="text-xs text-purple-700 font-medium mb-1">💡 関連する提案:</div>
                      <div className="flex flex-wrap gap-1">
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => setInputMessage(suggestion)}
                            className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded transition-colors"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {message.actionTaken && (
                    <div className="text-xs mt-2 opacity-70 bg-white bg-opacity-30 rounded px-2 py-1">
                      ✅ アクション: {message.actionTaken}
                    </div>
                  )}
                  <div className="text-xs mt-1 opacity-50">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-2">
                  <Loader className="w-4 h-4 animate-spin" />
                  <span className="text-sm text-gray-600">AI思考中...</span>
                </div>
              </div>
            )}
          </div>

          {/* 高度なアクション */}
          <div className="p-3 border-t bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="text-xs text-gray-600 mb-2">🚀 AI分析ツール:</div>
            <div className="flex gap-2 mb-3">
              {advancedActions.map((action, index) => {
                const IconComponent = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.action}
                    disabled={isLoading}
                    className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white text-xs py-2 rounded transition-all disabled:opacity-50"
                  >
                    <IconComponent className="w-3 h-3" />
                    {action.label}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-gray-500 mb-2">💬 質問例:</div>
            <div className="flex flex-wrap gap-1">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(action)}
                  className="text-xs bg-white hover:bg-purple-50 border rounded px-2 py-1 transition-colors hover:border-purple-300"
                >
                  {action}
                </button>
              ))}
            </div>
          </div>

          {/* 入力エリア */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="自然言語で指示してください..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputMessage.trim()}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              🤖 Gemini AI: 自然言語で複雑な分析や質問も可能です
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// メインアプリコンポーネント
const CastingManagementApp = () => {
  const [orders, setOrders] = useState(initialOrders);
  const [displayedOrders, setDisplayedOrders] = useState(initialOrders);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // AIアシスタントからの注文更新
  const handleOrdersUpdate = (newOrders) => {
    setDisplayedOrders(newOrders);
  };

  // 統計計算
  const stats = {
    totalOrders: displayedOrders.length,
    totalWeight: displayedOrders.reduce((sum, order) => sum + order.totalWeight, 0),
    urgentOrders: displayedOrders.filter(order => order.daysRemaining < 7).length,
    recommendedBatches: Math.ceil(displayedOrders.reduce((sum, order) => sum + order.totalWeight, 0) / 300)
  };

  // フィルター処理
  useEffect(() => {
    let filtered = orders;
    
    if (filter === 'urgent') {
      filtered = filtered.filter(order => order.daysRemaining < 7);
    } else if (filter === 'small') {
      filtered = filtered.filter(order => order.unitWeight < 10);
    } else if (filter === 'large') {
      filtered = filtered.filter(order => order.unitWeight >= 10);
    }
    
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.productCode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setDisplayedOrders(filtered);
  }, [orders, filter, searchTerm]);

  const getStatusBadge = (status) => {
    const styles = {
      waiting: 'bg-orange-500 text-white',
      'in-progress': 'bg-blue-500 text-white',
      completed: 'bg-green-500 text-white'
    };
    
    const labels = {
      waiting: '未着手',
      'in-progress': '進行中',
      completed: '完了'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-bold ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  const getPriorityIcon = (priority, daysRemaining) => {
    if (daysRemaining < 0) return '🔴';
    if (daysRemaining < 7) return '🟡';
    return '🟢';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-700 text-white p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Settings className="w-8 h-8" />
            <h1 className="text-2xl font-bold">ステンレス鋳造管理システム</h1>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm">システム稼働中</span>
          </div>
        </div>
      </div>

      {/* アクションボタン */}
      <div className="max-w-7xl mx-auto p-4">
        <div className="flex flex-wrap gap-3 mb-6">
          <button className="flex items-center gap-2 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md">
            <Upload className="w-4 h-4" />
            新規注文追加
          </button>
          <button className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md">
            📄 PDF読み取り
          </button>
          <button className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md">
            📊 Excel取込
          </button>
          <button className="flex items-center gap-2 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md">
            <Download className="w-4 h-4" />
            CSVエクスポート
          </button>
          <button className="flex items-center gap-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors shadow-md">
            <Zap className="w-4 h-4" />
            バッチ最適化
          </button>
        </div>

        {/* 統計カード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg text-center shadow-md">
            <div className="text-3xl font-bold">{stats.totalOrders}</div>
            <div className="text-sm opacity-90">未完了注文</div>
          </div>
          <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white p-4 rounded-lg text-center shadow-md">
            <div className="text-3xl font-bold">{stats.totalWeight.toFixed(1)}kg</div>
            <div className="text-sm opacity-90">総重量</div>
          </div>
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg text-center shadow-md">
            <div className="text-3xl font-bold">{stats.urgentOrders}</div>
            <div className="text-sm opacity-90">緊急納期</div>
          </div>
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg text-center shadow-md">
            <div className="text-3xl font-bold">{stats.recommendedBatches}</div>
            <div className="text-sm opacity-90">推奨バッチ数</div>
          </div>
        </div>

        {/* フィルター・検索 */}
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium">フィルター・検索：</span>
            </div>
            <select 
              value={filter} 
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">すべて</option>
              <option value="urgent">緊急（7日以内）</option>
              <option value="small">10kg未満</option>
              <option value="large">10kg以上</option>
            </select>
            <input
              type="text"
              placeholder="品名で検索..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              onClick={() => {setFilter('all'); setSearchTerm(''); setDisplayedOrders(orders);}}
              className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              リセット
            </button>
          </div>
        </div>

        {/* 注文一覧テーブル */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-4 border-b bg-gray-50">
            <h2 className="text-lg font-semibold">📊 統合注文管理（すべてステンレス材）</h2>
            <div className="text-sm text-gray-600 mt-1">
              表示中: {displayedOrders.length}件 / 全{orders.length}件
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">優先</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">納期</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">残日数</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">品名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">品番</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">材質</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">単重量</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">残数</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">総重量</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">ステータス</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">注番</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">備考</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className={`border-b hover:bg-gray-50 transition-colors ${
                      order.daysRemaining < 0 ? 'bg-red-50' : 
                      order.daysRemaining < 7 ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {getPriorityIcon(order.priority, order.daysRemaining)}
                        <span className="text-sm font-medium">{order.priority}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">{order.deliveryDate}</td>
                    <td className="px-4 py-3 text-sm font-medium">
                      {order.daysRemaining < 0 ? 
                        <span className="text-red-600 font-bold">{order.daysRemaining}日</span> :
                        `${order.daysRemaining}日`
                      }
                    </td>
                    <td className="px-4 py-3 text-sm">{order.productName}</td>
                    <td className="px-4 py-3 text-sm font-mono bg-gray-50">{order.productCode}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        order.material === 'S14' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {order.material}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={order.unitWeight < 10 ? 'bg-green-100 px-2 py-1 rounded' : ''}>
                        {order.unitWeight}kg
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{order.quantity}個</td>
                    <td className="px-4 py-3 text-sm font-bold">{order.totalWeight}kg</td>
                    <td className="px-4 py-3">{getStatusBadge(order.status)}</td>
                    <td className="px-4 py-3 text-sm font-mono">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{order.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* AIアシスタント */}
      <AIAssistant orders={orders} onOrdersUpdate={handleOrdersUpdate} />
    </div>
  );
};

// Export both the main component and as default
export { CastingManagementApp };
export default CastingManagementApp;
