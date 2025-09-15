import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';

interface AnalyticsData {
  period: string;
  start_date: string;
  end_date: string;
  orders_by_status: Array<{
    status: string;
    count: number;
  }>;
  daily_stats: Array<{
    date: string;
    orders: number;
    revenue: number;
  }>;
  top_categories: Array<{
    id: number;
    name: string;
    orders_count: number;
    revenue: number;
  }>;
  top_items: Array<{
    id: number;
    name: string;
    orders_count: number;
    quantity_sold: number;
    revenue: number;
  }>;
}

const statusLabels: { [key: string]: string } = {
  'pending': '⏳ Ожидают',
  'preparing': '👨‍🍳 Готовятся',
  'completed': '✅ Завершены',
  'cancelled': '❌ Отменены',
};

export const AdminAnalyticsPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAnalytics(period);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setData(response.data as AnalyticsData);
      }
    } catch (err) {
      setError('Ошибка загрузки аналитики');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Загрузка аналитики...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">📈 Аналитика</h1>
        <p className="text-gray-600 mt-1">Подробная статистика и аналитика</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Ошибка</div>
          <div className="text-red-600">{error}</div>
        </div>
      )}

      {/* Период */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📅 Период анализа</h3>
        <div className="flex space-x-4">
          {[
            { value: 'day', label: 'День' },
            { value: 'week', label: 'Неделя' },
            { value: 'month', label: 'Месяц' },
            { value: 'year', label: 'Год' },
          ].map((option) => (
            <button
              key={option.value}
              onClick={() => setPeriod(option.value)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                period === option.value
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {data && (
        <>
          {/* Статистика по статусам */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">📊 Статистика по статусам</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {data.orders_by_status.map((status) => (
                  <div key={status.status} className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-900">{status.count}</div>
                    <div className="text-sm text-gray-600">
                      {statusLabels[status.status] || status.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Топ категории */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">🏆 Популярные категории</h3>
              </div>
              <div className="p-6">
                {data.top_categories.length > 0 ? (
                  <div className="space-y-3">
                    {data.top_categories.slice(0, 5).map((category, index) => (
                      <div key={category.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                          <span className="text-sm text-gray-900 ml-2">{category.name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {category.orders_count} заказов
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-500 text-center py-4">Нет данных</div>
                )}
              </div>
            </div>

            {/* Топ товары */}
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">🍽️ Популярные товары</h3>
              </div>
              <div className="p-6">
                {data.top_items.length > 0 ? (
                  <div className="space-y-3">
                    {data.top_items.slice(0, 5).map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 w-6">#{index + 1}</span>
                          <span className="text-sm text-gray-900 ml-2">{item.name}</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {item.quantity_sold} шт.
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

          {/* Статистика по дням */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">📈 Статистика по дням</h3>
            </div>
            <div className="p-6">
              {data.daily_stats.length > 0 ? (
                <div className="space-y-3">
                  {data.daily_stats.map((day) => (
                    <div key={day.date} className="flex items-center justify-between">
                      <div className="text-sm text-gray-900">
                        {new Date(day.date).toLocaleDateString('ru-RU', { 
                          weekday: 'long', 
                          month: 'long', 
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
        </>
      )}
    </div>
  );
};

export default AdminAnalyticsPage;
