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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Боковое меню */}
      <aside className="w-64 bg-white border-r min-h-screen overflow-y-auto">
        <div className="p-4 border-b">
          <h1 className="text-lg font-semibold text-gray-800">🍔 Babay Burger</h1>
          <div className="text-sm text-gray-600">Админ панель</div>
          <div className="text-xs text-gray-500 mt-1">Добро пожаловать, {state.user?.username}</div>
        </div>
        
        <nav className="p-4 space-y-1">
          <NavLink 
            to="/admin" 
            end 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">📊</span>
            Главная
          </NavLink>
          
          <NavLink 
            to="/admin/menu" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">🍽️</span>
            Меню
          </NavLink>
          
          <NavLink 
            to="/admin/orders" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">📋</span>
            Заказы
          </NavLink>
          
          <NavLink 
            to="/admin/users" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">👥</span>
            Пользователи
          </NavLink>
          
          <NavLink 
            to="/admin/promocodes" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">🎫</span>
            Промокоды
          </NavLink>
          
          <div className="border-t border-gray-200 my-4"></div>
          
          <NavLink 
            to="/admin/delivery-zones" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">🗺️</span>
            Зоны доставки
          </NavLink>
          
          <NavLink 
            to="/admin/restaurants" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">🏪</span>
            Рестораны
          </NavLink>
          
          <NavLink 
            to="/admin/cashiers" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">💰</span>
            Кассиры
          </NavLink>
          
          <NavLink 
            to="/admin/operators" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">📞</span>
            Операторы
          </NavLink>
          
          <NavLink 
            to="/admin/delivery-drivers" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">🚚</span>
            Курьеры
          </NavLink>
          
          <div className="border-t border-gray-200 my-4"></div>
          
          <NavLink 
            to="/admin/analytics" 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive 
                  ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-500' 
                  : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
              }`
            }
          >
            <span className="mr-3">📈</span>
            Аналитика
          </NavLink>
        </nav>
        
        <div className="p-4 border-t mt-auto">
          <button 
            onClick={logout}
            className="w-full px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors"
          >
            <span className="mr-2">🚪</span>
            Выйти
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          {children}
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


