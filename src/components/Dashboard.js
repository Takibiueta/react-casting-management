import React from 'react';

const Dashboard = ({ stats }) => {
  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* 未完了注文数 */}
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg text-center shadow-md hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold" id="orderCount">{stats.totalOrders}</div>
          <div className="text-sm opacity-90">未完了注文</div>
        </div>
        
        {/* 総重量 */}
        <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 text-white p-4 rounded-lg text-center shadow-md hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold" id="totalWeight">{stats.totalWeight.toFixed(1)}kg</div>
          <div className="text-sm opacity-90">総重量</div>
        </div>
        
        {/* 緊急納期 */}
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg text-center shadow-md hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold" id="urgentCount">{stats.urgentOrders}</div>
          <div className="text-sm opacity-90">緊急納期 (7日以内)</div>
        </div>
        
        {/* 推奨バッチ数 */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg text-center shadow-md hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold" id="batchCount">{stats.batchCount}</div>
          <div className="text-sm opacity-90">推奨バッチ数</div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;