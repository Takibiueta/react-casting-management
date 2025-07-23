import React from 'react';

const CustomerManagement = ({ customers, onFilter, onAdd, onUpdate, onDelete, allCustomers }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4">🏢 取引先管理</h2>
      <p className="text-gray-600 mb-4">取引先管理機能は実装中です。</p>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">{customers.length}</div>
          <div className="text-sm opacity-90">総取引先数</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">{customers.filter(c => c.status === 'active').length}</div>
          <div className="text-sm opacity-90">アクティブ取引先</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">{[...new Set(customers.map(c => c.customerCode?.substring(0, 3)))].length}</div>
          <div className="text-sm opacity-90">グループ数</div>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg text-center">
          <div className="text-2xl font-bold">{customers.filter(c => c.email).length}</div>
          <div className="text-sm opacity-90">連絡先登録済み</div>
        </div>
      </div>

      {customers.length > 0 && (
        <div className="bg-white border rounded-lg overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b">
            <h3 className="font-medium text-gray-900">取引先一覧</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium">取引先コード</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">会社名</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">担当者</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">連絡先</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {customers.map(customer => (
                  <tr key={customer.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-mono">{customer.customerCode}</td>
                    <td className="px-4 py-3 text-sm font-medium">{customer.companyName}</td>
                    <td className="px-4 py-3 text-sm">{customer.contactPerson}</td>
                    <td className="px-4 py-3 text-sm">
                      <div>{customer.phone}</div>
                      <div className="text-xs text-gray-500">{customer.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        customer.status === 'active' ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
                      }`}>
                        {customer.status === 'active' ? 'アクティブ' : '非アクティブ'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;