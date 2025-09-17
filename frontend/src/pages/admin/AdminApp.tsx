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
import AdminDeliveryAssignmentsPage from './AdminDeliveryAssignmentsPage';
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
            <div className="text-lg font-medium text-black mb-4">Проверка авторизации...</div>
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
      <div className="lg:hidden bg-white/95 backdrop-blur-xl border-b border-gray-200/50 p-3 flex items-center justify-between">
        <div className="flex items-center">
          <div className="w-6 h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-md flex items-center justify-center mr-2">
            <span className="text-sm text-white">🍔</span>
          </div>
          <div>
            <h1 className="text-base font-bold text-gray-900">Babay Burger</h1>
            <div className="text-xs text-black">Админ панель</div>
          </div>
        </div>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          <span className="text-lg">{isMobileMenuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Боковое меню */}
      <aside className={`${isMobileMenuOpen ? 'block' : 'hidden'} lg:block w-full lg:w-56 xl:w-64 bg-white/95 backdrop-blur-xl border-r border-gray-200/50 shadow-xl lg:fixed lg:top-0 lg:left-0 lg:h-screen overflow-y-auto`}>
      <div className='flex flex-col h-full'>
        {/* Заголовок */}
        <div className="hidden lg:block p-3 border-b border-gray-100 bg-gradient-to-br from-orange-500 to-red-500 text-white">
          <div className="flex items-center mb-2">
            <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center mr-2 backdrop-blur-sm">
              <span className="text-sm">🍔</span>
            </div>
            <div>
              <h1 className="text-sm font-bold">Babay Burger</h1>
              <div className="text-orange-100 text-xs font-medium">Админ панель</div>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-md p-1.5 border border-white/30">
            <div className="text-xs font-medium text-white/90">
              👋 <span className="font-bold">{state.user?.username}</span>
            </div>
          </div>
        </div>
        
        {/* Навигация */}
        <nav className="p-2 lg:p-3 space-y-1">
          <NavLink 
            to="/admin" 
            end 
            onClick={closeMobileMenu}
            className={({ isActive }) => 
              `flex items-center px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm">📊</span>
            Главная
          </NavLink>
          
          <NavLink 
            to="/admin/menu" 
            onClick={closeMobileMenu}
            className={({ isActive }) => 
              `flex items-center px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm">🍽️</span>
            Меню
          </NavLink>
          
          <NavLink 
            to="/admin/orders" 
            onClick={closeMobileMenu}
            className={({ isActive }) => 
              `flex items-center px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm">📋</span>
            Заказы
          </NavLink>
          
          <NavLink 
            to="/admin/users" 
            onClick={closeMobileMenu}
            className={({ isActive }) => 
              `flex items-center px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm">👥</span>
            Пользователи
          </NavLink>
          
          <NavLink 
            to="/admin/promocodes" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm">🎫</span>
            Промокоды
          </NavLink>
          
          <div className="border-t border-gray-200 my-2"></div>
          
          <NavLink 
            to="/admin/delivery-zones" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm">🗺️</span>
            Зоны доставки
          </NavLink>
          
          <NavLink 
            to="/admin/restaurants" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm">🏪</span>
            Рестораны
          </NavLink>
          
          <NavLink 
            to="/admin/cashiers" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm">💰</span>
            Кассиры
          </NavLink>
          
          <NavLink 
            to="/admin/operators" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm">📞</span>
            Операторы
          </NavLink>
          
          <NavLink 
            to="/admin/delivery-drivers" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm">🚚</span>
            Курьеры
          </NavLink>
          
          <NavLink 
            to="/admin/delivery-assignments" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm">📦</span>
            Назначения
          </NavLink>
          
          <div className="border-t border-gray-200 my-2"></div>
          
          <NavLink 
            to="/admin/analytics" 
            onClick={closeMobileMenu} 
            className={({ isActive }) => 
              `flex items-center px-2 py-1.5 lg:px-3 lg:py-2 rounded-md text-xs font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-md shadow-orange-500/25' 
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm'
              }`
            }
          >
            <span className="mr-2 text-sm">📈</span>
            Аналитика
          </NavLink>
        </nav>
        
        {/* Кнопка выхода */}
        <div className="p-2 lg:p-3 border-t border-gray-200 mt-auto bg-gradient-to-r from-red-50 to-pink-50">
          <button 
            onClick={() => {
              logout();
              closeMobileMenu();
            }}
            className="w-full px-2 py-1.5 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white rounded-md text-xs font-bold transition-all duration-200 hover:shadow-md flex items-center justify-center group"
          >
            <span className="mr-1.5 text-sm group-hover:scale-110 transition-transform">🚪</span>
            Выйти
          </button>
        </div>
        </div>
      </aside>
      {/* Основной контент */}
      <main className="flex-1 p-2 sm:p-3 lg:p-4 lg:ml-56 xl:ml-64 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/95 backdrop-blur-xl rounded-lg shadow-lg border border-gray-200/50 p-3 lg:p-4">
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
          path="delivery-assignments"
          element={(
            <AdminGuard>
              <AdminLayout>
                <AdminDeliveryAssignmentsPage />
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


