import React from 'react';
import { Package, Users, ShoppingCart } from 'lucide-react';

const TabNavigation = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'orders', name: '📦 注文管理', icon: ShoppingCart },
    { id: 'products', name: '📋 製品管理', icon: Package },
    { id: 'customers', name: '🏢 取引先管理', icon: Users }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4">
      <div className="border-b border-gray-200 bg-white rounded-t-lg shadow-sm">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`py-4 px-6 border-b-2 font-medium text-sm transition-colors duration-200 flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default TabNavigation;