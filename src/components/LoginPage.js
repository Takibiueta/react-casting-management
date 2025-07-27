import React, { useState } from 'react';
import { Users, LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const [selectedWorker, setSelectedWorker] = useState('');
  const { login, workers } = useAuth();

  const handleLogin = () => {
    if (selectedWorker && login(selectedWorker)) {
      // ログイン成功時の処理はApp.jsで自動的にリダイレクトされる
    } else {
      alert('ログインに失敗しました');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🏭</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            黒石鋳工所管理システム
          </h1>
          <p className="text-gray-600">
            現場作業者向けログイン
          </p>
        </div>

        {/* 作業者選択 */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Users className="w-4 h-4 inline mr-2" />
              作業者を選択してください
            </label>
            <div className="space-y-2">
              {workers.map((worker) => (
                <label
                  key={worker.id}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    selectedWorker === worker.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="worker"
                    value={worker.id}
                    checked={selectedWorker === worker.id}
                    onChange={(e) => setSelectedWorker(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {worker.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {worker.department} - {worker.role === 'operator' ? '作業者' : 
                       worker.role === 'supervisor' ? '監督者' : '管理者'}
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border-2 ${
                    selectedWorker === worker.id
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}>
                    {selectedWorker === worker.id && (
                      <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* ログインボタン */}
          <button
            onClick={handleLogin}
            disabled={!selectedWorker}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-4 px-6 rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
          >
            <LogIn className="w-5 h-5" />
            ログイン
          </button>
        </div>

        {/* 説明 */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            作業者を選択してログインしてください。<br />
            現場向けの簡素化された画面が表示されます。
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;