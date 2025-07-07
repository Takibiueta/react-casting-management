import React, { useState, useEffect } from 'react';
import { Search, Download, Upload, Zap, Settings, MessageCircle, Send, Loader } from 'lucide-react';

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
      content: 'こんにちは！ステンレス鋳造管理システムのAIアシスタントです。\n\n🎯 できること:\n• 「S14材質を表示して」- フィルタリング\n• 「納期を1週間延長」- データ修正\n• 「バッチを最適化」- 提案生成\n• 「緊急納期を確認」- 優先度確認\n\nお気軽にお声がけください！',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // メッセージ送信処理
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
      // 2秒待機（AI処理のシミュレーション）
      await new Promise(resolve => setTimeout(resolve, 2000));

      let response = { message: '', action: '', data: null };

      // 自然言語解析（簡易版）
      if (currentInput.includes('S14') && (currentInput.includes('表示') || currentInput.includes('フィルタ') || currentInput.includes('見せ'))) {
        const s14Orders = orders.filter(order => order.material === 'S14');
        response = {
          message: `S14材質の注文を表示しました！\n\n📊 結果: ${s14Orders.length}件の注文\n📦 総重量: ${s14Orders.reduce((sum, order) => sum + order.totalWeight, 0)}kg\n\n該当注文:\n${s14Orders.map(order => `• ${order.productName} (${order.totalWeight}kg)`).join('\n')}`,
          action: 'filter_material',
          data: s14Orders
        };
      } 
      else if (currentInput.includes('S13') && (currentInput.includes('表示') || currentInput.includes('フィルタ') || currentInput.includes('見せ'))) {
        const s13Orders = orders.filter(order => order.material === 'S13');
        response = {
          message: `S13材質の注文を表示しました！\n\n📊 結果: ${s13Orders.length}件の注文\n📦 総重量: ${s13Orders.reduce((sum, order) => sum + order.totalWeight, 0)}kg\n\n該当注文:\n${s13Orders.map(order => `• ${order.productName} (${order.totalWeight}kg)`).join('\n')}`,
          action: 'filter_material',
          data: s13Orders
        };
      }
      else if (currentInput.includes('納期') && currentInput.includes('延長')) {
        const extendDays = currentInput.includes('1週間') || currentInput.includes('7日') ? 7 : 
                          currentInput.includes('2週間') || currentInput.includes('14日') ? 14 : 7;
        
        const updatedOrders = orders.map(order => {
          const newDate = new Date(order.deliveryDate);
          newDate.setDate(newDate.getDate() + extendDays);
          return {
            ...order,
            deliveryDate: newDate.toISOString().split('T')[0],
            daysRemaining: order.daysRemaining + extendDays
          };
        });

        response = {
          message: `✅ 全注文の納期を${extendDays}日延長しました！\n\n📅 変更内容:\n${orders.map((order, index) => 
            `• ${order.productName}: ${order.deliveryDate} → ${updatedOrders[index].deliveryDate}`
          ).join('\n')}`,
          action: 'extend_delivery',
          data: updatedOrders
        };
      }
      else if (currentInput.includes('緊急') || currentInput.includes('急ぎ') || currentInput.includes('優先')) {
        const urgentOrders = orders.filter(order => order.daysRemaining < 7);
        response = {
          message: `🚨 緊急納期の注文を確認しました！\n\n⚠️ 緊急件数: ${urgentOrders.length}件\n\n詳細:\n${urgentOrders.map(order => 
            `• ${order.productName}\n  納期: ${order.deliveryDate} (${order.daysRemaining < 0 ? '遅延' : '残り' + order.daysRemaining + '日'})\n  重量: ${order.totalWeight}kg`
          ).join('\n\n')}`,
          action: 'show_urgent',
          data: urgentOrders
        };
      }
      else if (currentInput.includes('バッチ') && (currentInput.includes('最適') || currentInput.includes('提案') || currentInput.includes('作成'))) {
        const s14Total = orders.filter(o => o.material === 'S14').reduce((sum, o) => sum + o.totalWeight, 0);
        const s13Total = orders.filter(o => o.material === 'S13').reduce((sum, o) => sum + o.totalWeight, 0);
        
        response = {
          message: `🎯 バッチ最適化を提案します！\n\n📦 推奨バッチ構成 (300kg目標):\n\n🔵 バッチ1 (S14材質):\n• 総重量: ${s14Total}kg\n• 300kgまで残り: ${Math.max(0, 300 - s14Total)}kg\n\n🟢 バッチ2 (S13材質):\n• 総重量: ${s13Total}kg\n• 300kgまで残り: ${Math.max(0, 300 - s13Total)}kg\n\n💡 提案:\n${s14Total < 300 ? `• S14材質の追加注文を検討 (${300 - s14Total}kg不足)` : '• S14材質は300kg到達済み'}\n${s13Total < 300 ? `• S13材質の追加注文を検討 (${300 - s13Total}kg不足)` : '• S13材質は300kg到達済み'}`,
          action: 'batch_optimize'
        };
      }
      else if (currentInput.includes('リセット') || currentInput.includes('全て') || currentInput.includes('すべて')) {
        response = {
          message: `🔄 フィルターをリセットして全注文を表示しました！\n\n📊 全体概要:\n• 総注文数: ${orders.length}件\n• 総重量: ${orders.reduce((sum, order) => sum + order.totalWeight, 0)}kg\n• S14材質: ${orders.filter(o => o.material === 'S14').length}件\n• S13材質: ${orders.filter(o => o.material === 'S13').length}件`,
          action: 'reset_filter',
          data: orders
        };
      }
      else {
        response = {
          message: `「${currentInput}」について承知いたしました！\n\n🤖 利用可能なコマンド例:\n\n🔍 フィルタリング:\n• 「S14材質を表示」\n• 「S13材質を表示」\n• 「緊急納期を確認」\n\n📅 データ修正:\n• 「納期を1週間延長」\n• 「納期を2週間延長」\n\n🎯 分析・提案:\n• 「バッチを最適化」\n• 「バッチを提案」\n\n🔄 その他:\n• 「全て表示」「リセット」\n\nお気軽にお試しください！`,
          action: 'help'
        };
      }

      // アクション実行
      if (response.data) {
        onOrdersUpdate(response.data);
      }

      const assistantMessage = {
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        actionTaken: response.action
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      const errorMessage = {
        role: 'assistant',
        content: `❌ エラーが発生しました: ${error.message}\n\n💡 ヒント: インターネット接続を確認してください。`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    'S14材質を表示',
    'S13材質を表示', 
    '緊急納期を確認',
    'バッチを最適化',
    '納期を1週間延長',
    '全て表示'
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
              <Zap className="w-5 h-5" />
              <span className="font-semibold">AIアシスタント</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs">オンライン</span>
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
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  {message.actionTaken && (
                    <div className="text-xs mt-2 opacity-70 bg-white bg-opacity-20 rounded px-2 py-1">
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

          {/* クイックアクション */}
          <div className="p-3 border-t bg-gray-50">
            <div className="text-xs text-gray-500 mb-2">📱 クイックアクション:</div>
            <div className="flex flex-wrap gap-1">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => setInputMessage(action)}
                  className="text-xs bg-white hover:bg-blue-50 border rounded px-2 py-1 transition-colors hover:border-blue-300"
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
              💡 例: 「S14を表示」「納期を延長」「バッチ提案」
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

export default CastingManagementApp;
