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
  
  // Показываем загрузку во время проверки аутентификации
  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="text-center">
            <div className="text-4xl mb-4 animate-bounce">🍔</div>
            <div className="text-lg font-medium text-gray-700 mb-4">Проверка авторизации...</div>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!state.isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return <>{children}</>;
};

const AdminLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout, state } = useAdminAuth();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex">
      {/* Боковое меню */}
      <aside className="w-80 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 min-h-screen overflow-y-auto shadow-xl">
        {/* Заголовок */}
        <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mr-4 backdrop-blur-sm">
              <span className="text-2xl">🍔</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">Babay Burger</h1>
              <div className="text-orange-100 text-sm font-medium">Админ панель</div>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
            <div className="text-sm font-medium text-white/90">
              👋 Добро пожаловать, <span className="font-bold">{state.user?.username}</span>
            </div>
          </div>
        </div>
        
        {/* Навигация */}
        <nav className="p-6 space-y-3">
          <NavLink 
            to="/admin" 
            end 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-3 text-lg">📊</span>
            Главная
          </NavLink>
          
          <NavLink 
            to="/admin/menu" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-3 text-lg">🍽️</span>
            Меню
          </NavLink>
          
          <NavLink 
            to="/admin/orders" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-3 text-lg">📋</span>
            Заказы
          </NavLink>
          
          <NavLink 
            to="/admin/users" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-3 text-lg">👥</span>
            Пользователи
          </NavLink>
          
          <NavLink 
            to="/admin/promocodes" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-3 text-lg">🎫</span>
            Промокоды
          </NavLink>
          
          <div className="border-t border-gray-200 my-6"></div>
          
          <NavLink 
            to="/admin/delivery-zones" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-3 text-lg">🗺️</span>
            Зоны доставки
          </NavLink>
          
          <NavLink 
            to="/admin/restaurants" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-3 text-lg">🏪</span>
            Рестораны
          </NavLink>
          
          <NavLink 
            to="/admin/cashiers" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-3 text-lg">💰</span>
            Кассиры
          </NavLink>
          
          <NavLink 
            to="/admin/operators" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-3 text-lg">📞</span>
            Операторы
          </NavLink>
          
          <NavLink 
            to="/admin/delivery-drivers" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-3 text-lg">🚚</span>
            Курьеры
          </NavLink>
          
          <div className="border-t border-gray-200 my-6"></div>
          
          <NavLink 
            to="/admin/analytics" 
            className={({ isActive }) => 
              `flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg shadow-orange-500/25 border-l-4 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-3 text-lg">📈</span>
            Аналитика
          </NavLink>
        </nav>
        
        {/* Кнопка выхода */}
        <div className="p-6 border-t border-gray-200 mt-auto bg-gradient-to-r from-red-50 to-pink-50">
          <button 
            onClick={logout}
            className="w-full px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-xl text-sm font-bold transition-all duration-200 hover:shadow-lg flex items-center justify-center group"
          >
            <span className="mr-3 text-lg group-hover:scale-110 transition-transform">🚪</span>
            Выйти из системы
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200/50 p-8">
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


