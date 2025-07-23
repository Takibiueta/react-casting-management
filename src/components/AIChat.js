import React, { useState } from 'react';
import { MessageCircle, Send, X, Bot } from 'lucide-react';

const AIChat = ({ orders, products, customers, onOrdersUpdate }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: '1',
      type: 'ai',
      content: 'こんにちは！ステンレス鋳造管理システムのAIアシスタントです。🤖\n\n以下のような質問にお答えできます：\n• "S14材を表示" - 特定材質の検索\n• "緊急の注文は？" - 緊急案件の確認\n• "総重量を教えて" - 統計情報の表示\n\nお気軽にお聞きください！',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const quickActions = [
    'S14材質の注文を表示',
    'SCS材質の注文を表示', 
    '今週中に納期が来る注文を確認',
    '遅延している注文を表示',
    '全注文の統計分析をして'
  ];

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      // Simulate AI processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let response = '';
      let filteredOrders = orders;

      // Simple AI logic based on keywords
      if (currentInput.toLowerCase().includes('s14')) {
        filteredOrders = orders.filter(order => order.material === 'S14');
        response = `S14材質の注文を${filteredOrders.length}件見つけました。\n\n`;
        filteredOrders.slice(0, 3).forEach((order, index) => {
          response += `${index + 1}. ${order.productName} - ${order.totalWeight}kg\n`;
        });
        onOrdersUpdate(filteredOrders);
      } else if (currentInput.toLowerCase().includes('scs')) {
        filteredOrders = orders.filter(order => order.material === 'SCS');
        response = `SCS材質の注文を${filteredOrders.length}件見つけました。\n\n`;
        filteredOrders.slice(0, 3).forEach((order, index) => {
          response += `${index + 1}. ${order.productName} - ${order.totalWeight}kg\n`;
        });
        onOrdersUpdate(filteredOrders);
      } else if (currentInput.toLowerCase().includes('緊急') || currentInput.toLowerCase().includes('今週')) {
        const today = new Date();
        filteredOrders = orders.filter(order => {
          const deliveryDate = new Date(order.deliveryDate);
          const daysDiff = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
          return daysDiff <= 7 && order.status !== 'completed';
        });
        response = `緊急度の高い注文を${filteredOrders.length}件見つけました。\n\n`;
        filteredOrders.forEach((order, index) => {
          const deliveryDate = new Date(order.deliveryDate);
          const daysDiff = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
          response += `${index + 1}. ${order.productName} - 残り${daysDiff}日\n`;
        });
        onOrdersUpdate(filteredOrders);
      } else if (currentInput.toLowerCase().includes('統計') || currentInput.toLowerCase().includes('分析')) {
        const totalWeight = orders.reduce((sum, order) => sum + order.totalWeight, 0);
        const urgentOrders = orders.filter(order => {
          const deliveryDate = new Date(order.deliveryDate);
          const today = new Date();
          const daysDiff = Math.ceil((deliveryDate - today) / (1000 * 60 * 60 * 24));
          return daysDiff <= 7 && order.status !== 'completed';
        });
        response = `📊 注文統計分析結果：\n\n• 総注文数: ${orders.length}件\n• 総重量: ${totalWeight.toFixed(1)}kg\n• 緊急案件: ${urgentOrders.length}件\n• 推奨バッチ数: ${Math.ceil(totalWeight / 300)}`;
      } else {
        response = `「${currentInput}」について確認しました。\n\n現在 ${orders.length}件の注文を管理中です。\n\n💡 ヒント：\n• "S14材を表示"\n• "緊急の注文は？"\n• "統計を教えて"\n\nなどとお聞きください。`;
      }

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, aiMessage]);

    } catch (error) {
      console.error('AI処理エラー:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: '申し訳ございません。処理中にエラーが発生しました。もう一度お試しください。',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

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
            <X className="w-6 h-6 text-white" />
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
              <Bot className="w-5 h-5" />
              <span className="font-semibold">AI アシスタント</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs">オンライン</span>
            </div>
          </div>

          {/* メッセージエリア */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-lg ${
                    message.type === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gradient-to-br from-purple-50 to-blue-50 text-gray-800 border border-purple-200'
                  }`}
                >
                  {message.type === 'ai' && (
                    <div className="flex items-center gap-1 mb-2 text-xs text-purple-600">
                      <Bot className="w-3 h-3" />
                      <span>AI</span>
                    </div>
                  )}
                  <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                  <div className="text-xs mt-1 opacity-50">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  <span className="text-sm text-gray-600">AI思考中...</span>
                </div>
              </div>
            )}
          </div>

          {/* クイックアクション */}
          <div className="p-3 border-t bg-gradient-to-r from-purple-50 to-blue-50">
            <div className="text-xs text-gray-600 mb-2">💬 質問例:</div>
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
                placeholder="質問を入力してください..."
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
              🤖 AIアシスタント: 自然言語で質問可能です
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChat;