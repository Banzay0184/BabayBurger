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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex flex-col lg:flex-row">
      {/* Мобильная кнопка меню */}
      <div className="lg:hidden bg-white/95 backdrop-blur-xl border-b border-gray-200/50 p-4 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-500 rounded-lg flex items-center justify-center mr-3">
            <span className="text-lg text-white">🍔</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Babay Burger</h1>
            <div className="text-xs text-gray-600">Админ панель</div>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <span className="text-xl">{isMobileMenuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Боковое меню */}
      <aside className={`${isMobileMenuOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 xl:w-72 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 lg:min-h-screen overflow-y-auto shadow-xl`}>
        {/* Заголовок */}
        <div className="hidden lg:block p-4 border-b border-gray-100 bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-3 backdrop-blur-sm">
              <span className="text-lg">🍔</span>
            </div>
            <div>
              <h1 className="text-lg font-bold">Babay Burger</h1>
              <div className="text-orange-100 text-xs font-medium">Админ панель</div>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2 border border-white/30">
            <div className="text-xs font-medium text-white/90">
              👋 Добро пожаловать, <span className="font-bold">{state.user?.username}</span>
            </div>
          </div>
        </div>
        
        {/* Навигация */}
        <nav className="p-3 lg:p-4 space-y-2">
          <NavLink 
            to="/admin" 
            end 
            onClick={closeMobileMenu}
            className={({ isActive }) => 
              `flex items-center px-3 py-2 lg:px-4 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 border-l-3 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm lg:text-base">📊</span>
            Главная
          </NavLink>
          
          <NavLink 
            to="/admin/menu" 
            onClick={closeMobileMenu}
            className={({ isActive }) => 
              `flex items-center px-3 py-2 lg:px-4 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 border-l-3 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm lg:text-base">🍽️</span>
            Меню
          </NavLink>
          
          <NavLink 
            to="/admin/orders" 
            onClick={closeMobileMenu}
            className={({ isActive }) => 
              `flex items-center px-3 py-2 lg:px-4 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 border-l-3 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm lg:text-base">📋</span>
            Заказы
          </NavLink>
          
          <NavLink 
            to="/admin/users" 
            onClick={closeMobileMenu}
            className={({ isActive }) => 
              `flex items-center px-3 py-2 lg:px-4 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 border-l-3 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm lg:text-base">👥</span>
            Пользователи
          </NavLink>
          
          <NavLink 
            to="/admin/promocodes" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 lg:px-4 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 border-l-3 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm lg:text-base">🎫</span>
            Промокоды
          </NavLink>
          
          <div className="border-t border-gray-200 my-3"></div>
          
          <NavLink 
            to="/admin/delivery-zones" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 lg:px-4 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 border-l-3 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm lg:text-base">🗺️</span>
            Зоны доставки
          </NavLink>
          
          <NavLink 
            to="/admin/restaurants" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 lg:px-4 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 border-l-3 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm lg:text-base">🏪</span>
            Рестораны
          </NavLink>
          
          <NavLink 
            to="/admin/cashiers" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 lg:px-4 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 border-l-3 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm lg:text-base">💰</span>
            Кассиры
          </NavLink>
          
          <NavLink 
            to="/admin/operators" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 lg:px-4 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 border-l-3 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm lg:text-base">📞</span>
            Операторы
          </NavLink>
          
          <NavLink 
            to="/admin/delivery-drivers" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 lg:px-4 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 border-l-3 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm lg:text-base">🚚</span>
            Курьеры
          </NavLink>
          
          <div className="border-t border-gray-200 my-3"></div>
          
          <NavLink 
            to="/admin/analytics" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-3 py-2 lg:px-4 lg:py-3 rounded-lg text-xs lg:text-sm font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25 border-l-3 border-orange-600' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm lg:text-base">📈</span>
            Аналитика
          </NavLink>
        </nav>
        
        {/* Кнопка выхода */}
        <div className="p-4 border-t border-gray-200 mt-auto bg-gradient-to-r from-red-50 to-pink-50">
          <button 
            onClick={() => {
              logout();
              closeMobileMenu();
            }}
            className="w-full px-3 py-2 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-lg text-xs font-bold transition-all duration-200 hover:shadow-md flex items-center justify-center group"
          >
            <span className="mr-2 text-sm group-hover:scale-110 transition-transform">🚪</span>
            Выйти из системы
          </button>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 p-2 sm:p-4">
        <div className="mx-auto h-[100vh]">
          <div className="bg-white/95 backdrop-blur-xl rounded-xl shadow-lg border border-gray-200/50 p-2 sm:p-4">
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


