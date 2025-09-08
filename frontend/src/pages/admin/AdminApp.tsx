import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';
import { AdminMenuPage } from './AdminMenuPage';
import { AdminPromoCodesPage } from './AdminPromoCodesPage';
import { AdminAuthProvider, useAdminAuth } from '../../context/AdminAuthContext';
import { AdminLoginPage } from './AdminLoginPage';

const AdminGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { state } = useAdminAuth();
  if (!state.isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  return <>{children}</>;
};

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, state } = useAdminAuth();
  
  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Боковое меню */}
      <aside className="w-64 bg-white border-r min-h-screen">
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold">Админ панель</h1>
          <div className="text-sm text-gray-600">Добро пожаловать, {state.user?.username}</div>
        </div>
        <nav className="p-4 space-y-2">
          <NavLink 
            to="/admin" 
            end 
            className={({ isActive }) => 
              `block px-3 py-2 rounded ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`
            }
          >
            📊 Главная
          </NavLink>
          <NavLink 
            to="/admin/menu" 
            className={({ isActive }) => 
              `block px-3 py-2 rounded ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`
            }
          >
            🍽️ Меню
          </NavLink>
          <NavLink 
            to="/admin/promocodes" 
            className={({ isActive }) => 
              `block px-3 py-2 rounded ${isActive ? 'bg-blue-100 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`
            }
          >
            🎫 Промокоды
          </NavLink>
        </nav>
        <div className="p-4 border-t mt-auto">
          <button 
            onClick={logout}
            className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded"
          >
            Выйти
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 p-6">
        {children}
      </main>
    </div>
  );
};

export const AdminApp: React.FC = () => {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route
          path=""
          element={(
            <AdminGuard>
              <AdminLayout>
                <AdminDashboard />
              </AdminLayout>
            </AdminGuard>
          )}
        />
        <Route
          path="menu"
          element={(
            <AdminGuard>
              <AdminLayout>
                <AdminMenuPage />
              </AdminLayout>
            </AdminGuard>
          )}
        />
        <Route
          path="promocodes"
          element={(
            <AdminGuard>
              <AdminLayout>
                <AdminPromoCodesPage />
              </AdminLayout>
            </AdminGuard>
          )}
        />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminAuthProvider>
  );
};

export default AdminApp;


