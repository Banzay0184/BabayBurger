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
        const response = await adminApi.getDashboard();
        
        if (response.error) {
          setError(response.error);
        } else if (response.data) {
          const data = response.data as any;
          setStats(data.stats);
          setTopItems(data.top_items || []);
          setDailyStats(data.daily_stats || []);
        }
      } catch (err) {
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
        <div className="text-lg text-gray-600">Загрузка...</div>
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
        <div className="text-gray-600">Нет данных для отображения</div>
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
      <div className={`p-6 bg-white rounded-lg border-l-4 ${color} shadow-sm hover:shadow-md transition-shadow`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-2xl">{icon}</span>
          </div>
          <div className="ml-4 flex-1">
            <div className="text-sm font-medium text-gray-500">{title}</div>
            <div className="text-2xl font-bold text-gray-900">{value}</div>
            {subtitle && (
              <div className="text-sm text-gray-600">{subtitle}</div>
            )}
          </div>
        </div>
      </div>
    );

    if (link) {
      return <Link to={link}>{content}</Link>;
    }

    return content;
  };

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">📊 Главная панель</h1>
        <p className="text-gray-600 mt-1">Обзор системы и ключевые метрики</p>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800 font-medium">⏳ Ожидают</div>
          <div className="text-2xl font-bold text-yellow-900">{stats.orders.pending}</div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-blue-800 font-medium">👨‍🍳 Готовятся</div>
          <div className="text-2xl font-bold text-blue-900">{stats.orders.preparing}</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-green-800 font-medium">✅ Завершены</div>
          <div className="text-2xl font-bold text-green-900">{stats.orders.completed}</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">❌ Отменены</div>
          <div className="text-2xl font-bold text-red-900">{stats.orders.cancelled}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Топ товары */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">🏆 Популярные товары</h3>
          </div>
          <div className="p-6">
            {topItems.length > 0 ? (
              <div className="space-y-3">
                {topItems.slice(0, 5).map((item, index) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                      <span className="text-sm text-gray-900 ml-2">{item.name}</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      {item.total_quantity} шт.
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">Нет данных</div>
            )}
          </div>
        </div>

        {/* Статистика по дням */}
        <div className="bg-white rounded-lg border shadow-sm">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">📈 Заказы за неделю</h3>
          </div>
          <div className="p-6">
            {dailyStats.length > 0 ? (
              <div className="space-y-3">
                {dailyStats.slice(-7).map((day) => (
                  <div key={day.date} className="flex items-center justify-between">
                    <div className="text-sm text-gray-900">
                      {new Date(day.date).toLocaleDateString('ru-RU', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600">{day.orders} заказов</span>
                      <span className="text-sm font-medium text-gray-900">
                        {day.revenue.toLocaleString()} ₽
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-4">Нет данных</div>
            )}
          </div>
        </div>
      </div>

      {/* Быстрые действия */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">⚡ Быстрые действия</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              to="/admin/menu" 
              className="p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
            >
              <div className="text-blue-800 font-medium">🍽️ Управление меню</div>
              <div className="text-sm text-blue-600 mt-1">Добавить товар</div>
            </Link>
            <Link 
              to="/admin/promocodes" 
              className="p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
            >
              <div className="text-green-800 font-medium">🎫 Создать промокод</div>
              <div className="text-sm text-green-600 mt-1">Новая акция</div>
            </Link>
            <Link 
              to="/admin/orders" 
              className="p-4 bg-purple-50 border border-purple-200 rounded-lg hover:bg-purple-100 transition-colors"
            >
              <div className="text-purple-800 font-medium">📋 Заказы</div>
              <div className="text-sm text-purple-600 mt-1">Просмотр заказов</div>
            </Link>
            <Link 
              to="/admin/analytics" 
              className="p-4 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
            >
              <div className="text-orange-800 font-medium">📈 Аналитика</div>
              <div className="text-sm text-orange-600 mt-1">Подробная статистика</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;


