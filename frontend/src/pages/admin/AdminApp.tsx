import React from 'react';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard } from './AdminDashboard';
import { AdminMenuPage } from './AdminMenuPage';
import { AdminPromoCodesPage } from './AdminPromoCodesPage';
import { AdminOrdersPage } from './AdminOrdersPage';
import { AdminUsersPage } from './AdminUsersPage';
import { AdminDeliveryZonesPage } from './AdminDeliveryZonesPage';
import { AdminRestaurantsPage } from './AdminRestaurantsPage';
import { AdminCashiersPage } from './AdminCashiersPage';
import { AdminOperatorsPage } from './AdminOperatorsPage';
import { AdminDeliveryDriversPage } from './AdminDeliveryDriversPage';
import { AdminAnalyticsPage } from './AdminAnalyticsPage';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex">
      {/* Боковое меню */}
      <aside className="w-72 bg-white/80 backdrop-blur-xl border-r border-white/20 min-h-screen overflow-y-auto shadow-2xl">
        <div className="p-6 border-b border-white/20 bg-gradient-to-r from-yellow-400/10 to-orange-500/10">
          <div className="flex items-center mb-3">
            <div className="text-3xl mr-3 animate-bounce">🍔</div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
                Babay Burger
              </h1>
              <div className="text-sm text-gray-600 font-medium">Админ панель</div>
            </div>
          </div>
          <div className="bg-white/50 backdrop-blur-sm rounded-lg p-3 border border-white/30">
            <div className="text-sm text-gray-700 font-medium">
              👋 Добро пожаловать, <span className="text-orange-600 font-bold">{state.user?.username}</span>
            </div>
          </div>
        </div>
        
        <nav className="p-6 space-y-2">
          <NavLink 
            to="/admin" 
            end 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            <span className="mr-3 text-lg">📊</span>
            Главная
          </NavLink>
          
          <NavLink 
            to="/admin/menu" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            <span className="mr-3 text-lg">🍽️</span>
            Меню
          </NavLink>
          
          <NavLink 
            to="/admin/orders" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            <span className="mr-3 text-lg">📋</span>
            Заказы
          </NavLink>
          
          <NavLink 
            to="/admin/users" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            <span className="mr-3 text-lg">👥</span>
            Пользователи
          </NavLink>
          
          <NavLink 
            to="/admin/promocodes" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            <span className="mr-3 text-lg">🎫</span>
            Промокоды
          </NavLink>
          
          <div className="border-t border-white/20 my-6"></div>
          
          <NavLink 
            to="/admin/delivery-zones" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            <span className="mr-3 text-lg">🗺️</span>
            Зоны доставки
          </NavLink>
          
          <NavLink 
            to="/admin/restaurants" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            <span className="mr-3 text-lg">🏪</span>
            Рестораны
          </NavLink>
          
          <NavLink 
            to="/admin/cashiers" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            <span className="mr-3 text-lg">💰</span>
            Кассиры
          </NavLink>
          
          <NavLink 
            to="/admin/operators" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            <span className="mr-3 text-lg">📞</span>
            Операторы
          </NavLink>
          
          <NavLink 
            to="/admin/delivery-drivers" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            <span className="mr-3 text-lg">🚚</span>
            Курьеры
          </NavLink>
          
          <div className="border-t border-white/20 my-6"></div>
          
          <NavLink 
            to="/admin/analytics" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 ${
                isActive 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-white/60 hover:text-gray-900 hover:shadow-md'
              }`
            }
          >
            <span className="mr-3 text-lg">📈</span>
            Аналитика
          </NavLink>
        </nav>
        
        <div className="p-6 border-t border-white/20 mt-auto bg-gradient-to-r from-red-400/10 to-pink-500/10">
          <button 
            onClick={logout}
            className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 hover:shadow-lg flex items-center justify-center"
          >
            <span className="mr-3 text-lg">🚪</span>
            Выйти из системы
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8">
            {children}
          </div>
        </div>
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
          path="orders"
          element={(
            <AdminGuard>
              <AdminLayout>
                <AdminOrdersPage />
              </AdminLayout>
            </AdminGuard>
          )}
        />
        <Route
          path="users"
          element={(
            <AdminGuard>
              <AdminLayout>
                <AdminUsersPage />
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
        <Route
          path="delivery-zones"
          element={(
            <AdminGuard>
              <AdminLayout>
                <AdminDeliveryZonesPage />
              </AdminLayout>
            </AdminGuard>
          )}
        />
        <Route
          path="restaurants"
          element={(
            <AdminGuard>
              <AdminLayout>
                <AdminRestaurantsPage />
              </AdminLayout>
            </AdminGuard>
          )}
        />
        <Route
          path="cashiers"
          element={(
            <AdminGuard>
              <AdminLayout>
                <AdminCashiersPage />
              </AdminLayout>
            </AdminGuard>
          )}
        />
        <Route
          path="operators"
          element={(
            <AdminGuard>
              <AdminLayout>
                <AdminOperatorsPage />
              </AdminLayout>
            </AdminGuard>
          )}
        />
        <Route
          path="delivery-drivers"
          element={(
            <AdminGuard>
              <AdminLayout>
                <AdminDeliveryDriversPage />
              </AdminLayout>
            </AdminGuard>
          )}
        />
        <Route
          path="analytics"
          element={(
            <AdminGuard>
              <AdminLayout>
                <AdminAnalyticsPage />
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


