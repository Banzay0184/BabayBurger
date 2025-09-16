import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/adminApi';

interface DashboardStats {
  users: {
    total: number;
    new_today: number;
    new_week: number;
    new_month: number;
  };
  orders: {
    total: number;
    today: number;
    week: number;
    month: number;
    pending: number;
    preparing: number;
    completed: number;
    cancelled: number;
  };
  revenue: {
    today: number;
    week: number;
    month: number;
  };
  menu: {
    categories: number;
    items: number;
    active_items: number;
    hits: number;
    new_items: number;
  };
  delivery: {
    zones: number;
    drivers: number;
    active_drivers: number;
  };
  staff: {
    cashiers: number;
    operators: number;
  };
}

interface TopItem {
  id: number;
  name: string;
  total_quantity: number;
  total_orders: number;
}

interface DailyStat {
  date: string;
  orders: number;
  revenue: number;
}

export const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        console.log('🔄 Загружаем данные дашборда...');
        const response = await adminApi.getDashboard();
        
        console.log('📊 Ответ от API дашборда:', response);
        
        if (response.error) {
          console.error('❌ Ошибка API дашборда:', response.error);
          setError(response.error);
        } else if (response.data) {
          const data = response.data as any;
          console.log('✅ Данные дашборда получены:', data);
          setStats(data.stats);
          setTopItems(data.top_items || []);
          setDailyStats(data.daily_stats || []);
        }
      } catch (err) {
        console.error('💥 Исключение при загрузке дашборда:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-black">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 font-medium">Ошибка</div>
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8">
        <div className="text-black">Нет данных для отображения</div>
      </div>
    );
  }

  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtitle?: string;
    icon: string;
    color: string;
    link?: string;
  }> = ({ title, value, subtitle, icon, color, link }) => {
    const content = (
      <div className={`p-3 lg:p-4 bg-white rounded-lg lg:rounded-xl border-l-4 ${color} shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5 group`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 lg:w-10 lg:h-10 bg-gradient-to-br from-gray-100 to-gray-200 rounded-md lg:rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <span className="text-lg lg:text-xl">{icon}</span>
            </div>
          </div>
          <div className="ml-2 lg:ml-3 flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">{title}</div>
            <div className="text-lg lg:text-2xl font-bold text-gray-900 mt-0.5 truncate">{value}</div>
            {subtitle && (
              <div className="text-xs text-black mt-0.5 truncate">{subtitle}</div>
            )}
          </div>
        </div>
      </div>
    );

    if (link) {
      return <Link to={link} className="block">{content}</Link>;
    }

    return content;
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* Заголовок */}
      <div className="text-center pb-3 lg:pb-4">
        <div className="inline-flex items-center justify-center w-10 h-10 lg:w-12 lg:h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg lg:rounded-xl mb-2 lg:mb-3 shadow-lg">
          <span className="text-xl lg:text-2xl text-white">📊</span>
        </div>
        <h1 className="text-xl lg:text-2xl font-bold text-gray-900 mb-1">Главная панель</h1>
        <p className="text-black text-sm lg:text-base">Обзор системы и ключевые метрики</p>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          title="Заказы сегодня"
          value={stats.orders.today}
          subtitle={`Всего: ${stats.orders.total}`}
          icon="📋"
          color="border-blue-500"
          link="/admin/orders"
        />
        <StatCard
          title="Выручка сегодня"
          value={`${stats.revenue.today.toLocaleString()} ₽`}
          subtitle={`За месяц: ${stats.revenue.month.toLocaleString()} ₽`}
          icon="💰"
          color="border-green-500"
        />
        <StatCard
          title="Новые пользователи"
          value={stats.users.new_today}
          subtitle={`Всего: ${stats.users.total}`}
          icon="👥"
          color="border-purple-500"
          link="/admin/users"
        />
        <StatCard
          title="Активные товары"
          value={stats.menu.active_items}
          subtitle={`Всего: ${stats.menu.items}`}
          icon="🍽️"
          color="border-orange-500"
          link="/admin/menu"
        />
      </div>

      {/* Статусы заказов */}
      <div className="bg-white rounded-lg lg:rounded-xl shadow-md border border-gray-200/50 p-3 lg:p-4">
        <h3 className="text-base lg:text-lg font-bold text-gray-900 mb-3 lg:mb-4 flex items-center">
          <span className="w-5 h-5 lg:w-6 lg:h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center text-white text-xs mr-2">📋</span>
          Статусы заказов
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border border-yellow-200 rounded-md lg:rounded-lg p-2 lg:p-3 hover:shadow-sm transition-shadow">
            <div className="flex items-center mb-1">
              <span className="text-sm lg:text-base mr-1.5">⏳</span>
              <div className="text-yellow-800 font-semibold text-xs">Ожидают</div>
            </div>
            <div className="text-lg lg:text-xl font-bold text-yellow-900">{stats.orders.pending}</div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-md lg:rounded-lg p-2 lg:p-3 hover:shadow-sm transition-shadow">
            <div className="flex items-center mb-1">
              <span className="text-sm lg:text-base mr-1.5">👨‍🍳</span>
              <div className="text-blue-800 font-semibold text-xs">Готовятся</div>
            </div>
            <div className="text-lg lg:text-xl font-bold text-blue-900">{stats.orders.preparing}</div>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-md lg:rounded-lg p-2 lg:p-3 hover:shadow-sm transition-shadow">
            <div className="flex items-center mb-1">
              <span className="text-sm lg:text-base mr-1.5">✅</span>
              <div className="text-green-800 font-semibold text-xs">Завершены</div>
            </div>
            <div className="text-lg lg:text-xl font-bold text-green-900">{stats.orders.completed}</div>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-pink-50 border border-red-200 rounded-md lg:rounded-lg p-2 lg:p-3 hover:shadow-sm transition-shadow">
            <div className="flex items-center mb-1">
              <span className="text-sm lg:text-base mr-1.5">❌</span>
              <div className="text-red-800 font-semibold text-xs">Отменены</div>
            </div>
            <div className="text-lg lg:text-xl font-bold text-red-900">{stats.orders.cancelled}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-4">
        {/* Топ товары */}
        <div className="bg-white rounded-lg lg:rounded-xl shadow-md border border-gray-200/50 overflow-hidden">
          <div className="p-3 lg:p-4 border-b border-gray-100 bg-gradient-to-r from-yellow-50 to-orange-50">
            <h3 className="text-base lg:text-lg font-bold text-gray-900 flex items-center">
              <span className="w-5 h-5 lg:w-6 lg:h-6 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-md flex items-center justify-center text-white text-xs mr-2">🏆</span>
              Популярные товары
            </h3>
          </div>
          <div className="p-3 lg:p-4">
            {topItems.length > 0 ? (
              <div className="space-y-2">
                {topItems.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md lg:rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center min-w-0 flex-1">
                      <div className="w-5 h-5 lg:w-6 lg:h-6 bg-gradient-to-br from-orange-500 to-red-500 rounded-md flex items-center justify-center text-white text-xs font-bold mr-2 flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-xs font-semibold text-gray-900 truncate">{item.name}</span>
                    </div>
                    <div className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded-full flex-shrink-0">
                      {item.total_quantity} шт.
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                <div className="text-4xl mb-2">📊</div>
                <div>Нет данных</div>
              </div>
            )}
          </div>
        </div>

        {/* Статистика по дням */}
        <div className="bg-white rounded-lg lg:rounded-xl shadow-md border border-gray-200/50 overflow-hidden">
          <div className="p-3 lg:p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-purple-50">
            <h3 className="text-base lg:text-lg font-bold text-gray-900 flex items-center">
              <span className="w-5 h-5 lg:w-6 lg:h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md flex items-center justify-center text-white text-xs mr-2">📈</span>
              Заказы за неделю
            </h3>
          </div>
          <div className="p-3 lg:p-4">
            {dailyStats.length > 0 ? (
              <div className="space-y-3">
                {dailyStats.slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-2 lg:p-3 bg-gray-50 rounded-lg lg:rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="text-xs lg:text-sm font-semibold text-gray-900 min-w-0 flex-1">
                      {new Date(day.date).toLocaleDateString('ru-RU', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="flex items-center space-x-2 lg:space-x-4 flex-shrink-0">
                      <span className="text-xs lg:text-sm text-gray-600 bg-blue-100 px-2 py-1 rounded-full">{day.orders} заказов</span>
                      <span className="text-xs lg:text-sm font-bold text-green-600 bg-green-100 px-2 lg:px-3 py-1 rounded-full">
                        {day.revenue.toLocaleString()} ₽
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                <div className="text-4xl mb-2">📈</div>
                <div>Нет данных</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="bg-white rounded-xl lg:rounded-2xl shadow-lg border border-gray-200/50 overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-emerald-50">
          <h3 className="text-lg lg:text-xl font-bold text-gray-900 flex items-center">
            <span className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-md lg:rounded-lg flex items-center justify-center text-white text-xs lg:text-sm mr-2 lg:mr-3">⚡</span>
            Быстрые действия
          </h3>
        </div>
        <div className="p-4 lg:p-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Link 
              to="/admin/menu" 
              className="p-4 lg:p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg lg:rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-200 hover:shadow-md group"
            >
              <div className="text-center">
                <div className="text-2xl lg:text-3xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">🍽️</div>
                <div className="text-blue-800 font-bold text-xs lg:text-sm">Управление меню</div>
                <div className="text-xs text-blue-600 mt-1">Добавить товар</div>
              </div>
            </Link>
            <Link 
              to="/admin/promocodes" 
              className="p-4 lg:p-6 bg-gradient-to-br from-green-50 to-green-100 border border-green-200 rounded-lg lg:rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-200 hover:shadow-md group"
            >
              <div className="text-center">
                <div className="text-2xl lg:text-3xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">🎫</div>
                <div className="text-green-800 font-bold text-xs lg:text-sm">Создать промокод</div>
                <div className="text-xs text-green-600 mt-1">Новая акция</div>
              </div>
            </Link>
            <Link 
              to="/admin/orders" 
              className="p-4 lg:p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-lg lg:rounded-xl hover:from-purple-100 hover:to-purple-200 transition-all duration-200 hover:shadow-md group"
            >
              <div className="text-center">
                <div className="text-2xl lg:text-3xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">📋</div>
                <div className="text-purple-800 font-bold text-xs lg:text-sm">Заказы</div>
                <div className="text-xs text-purple-600 mt-1">Просмотр заказов</div>
              </div>
            </Link>
            <Link 
              to="/admin/analytics" 
              className="p-4 lg:p-6 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200 rounded-lg lg:rounded-xl hover:from-orange-100 hover:to-orange-200 transition-all duration-200 hover:shadow-md group"
            >
              <div className="text-center">
                <div className="text-2xl lg:text-3xl mb-2 lg:mb-3 group-hover:scale-110 transition-transform">📈</div>
                <div className="text-orange-800 font-bold text-xs lg:text-sm">Аналитика</div>
                <div className="text-xs text-orange-600 mt-1">Подробная статистика</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


