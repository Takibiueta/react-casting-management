import { useState, useEffect, createContext, useContext } from 'react';

// 認証コンテキスト
const AuthContext = createContext();

// 現場作業者のサンプルデータ
const WORKERS = [
  { id: 'worker1', name: '田中太郎', role: 'operator', department: '鋳造部' },
  { id: 'worker2', name: '佐藤花子', role: 'operator', department: '仕上部' },
  { id: 'worker3', name: '山田次郎', role: 'supervisor', department: '鋳造部' },
  { id: 'admin', name: '管理者', role: 'admin', department: '管理部' }
];

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // ローカルストレージから認証情報を復元
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      setIsLoggedIn(true);
    }
  }, []);

  const login = (workerId) => {
    const worker = WORKERS.find(w => w.id === workerId);
    if (worker) {
      setCurrentUser(worker);
      setIsLoggedIn(true);
      localStorage.setItem('currentUser', JSON.stringify(worker));
      return true;
    }
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setIsLoggedIn(false);
    localStorage.removeItem('currentUser');
  };

  const value = {
    currentUser,
    isLoggedIn,
    login,
    logout,
    workers: WORKERS
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// 現場作業者向けの権限チェック
export const usePermissions = () => {
  const { currentUser } = useAuth();
  
  const canEditOrders = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';
  const canViewAllOrders = currentUser?.role === 'admin' || currentUser?.role === 'supervisor';
  const canManageProducts = currentUser?.role === 'admin';
  const canManageCustomers = currentUser?.role === 'admin';
  const canUpdateStatus = true; // 全員がステータス更新可能
  
  return {
    canEditOrders,
    canViewAllOrders,
    canManageProducts,
    canManageCustomers,
    canUpdateStatus,
    isFieldWorker: currentUser?.role === 'operator'
  };
};