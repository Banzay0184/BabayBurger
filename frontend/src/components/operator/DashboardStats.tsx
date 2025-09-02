import React from 'react';
import type { OperatorDashboard } from '../../types/operator';

interface DashboardStatsProps {
  stats: OperatorDashboard;
  onRefresh: () => void;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ stats, onRefresh }) => {

  return (
    <div className="bg-gray-800 rounded-xl p-8">
      {/* Заголовок - планшетная версия */}
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-bold text-white">Статистика</h3>
        <button
          onClick={onRefresh}
          className="text-blue-400 hover:text-blue-300 text-lg transition-colors bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-xl"
        >
          🔄 Обновить
        </button>
      </div>

      {/* Основные метрики - планшетная версия */}
      <div className="space-y-6">
        {/* Общее количество заказов */}
        <div className="bg-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-4xl">📋</span>
              <div>
                <p className="text-gray-300 text-lg">Всего заказов</p>
                <p className="text-white text-3xl font-bold">{stats.total_orders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Новые заказы */}
        <div className="bg-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-4xl">🆕</span>
              <div>
                <p className="text-gray-300 text-lg">Новые заказы</p>
                <p className="text-yellow-400 text-3xl font-bold">{stats.new_orders}</p>
              </div>
            </div>
            {stats.new_orders > 0 && (
              <span className="bg-yellow-500 text-white text-sm px-3 py-2 rounded-full animate-pulse font-medium">
                Новые!
              </span>
            )}
          </div>
        </div>

        {/* Обрабатываемые заказы */}
        <div className="bg-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-4xl">⚙️</span>
              <div>
                <p className="text-gray-300 text-lg">В обработке</p>
                <p className="text-purple-400 text-3xl font-bold">{stats.processing_orders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Подтвержденные заказы */}
        <div className="bg-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-4xl">✅</span>
              <div>
                <p className="text-gray-300 text-lg">Подтверждено</p>
                <p className="text-green-400 text-3xl font-bold">{stats.confirmed_orders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Завершенные заказы */}
        <div className="bg-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-4xl">🎉</span>
              <div>
                <p className="text-gray-300 text-lg">Завершено</p>
                <p className="text-blue-400 text-3xl font-bold">{stats.completed_orders}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Отмененные заказы */}
        <div className="bg-gray-700 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-4xl">❌</span>
              <div>
                <p className="text-gray-300 text-lg">Отменено</p>
                <p className="text-red-400 text-3xl font-bold">{stats.cancelled_orders}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Зоны доставки - планшетная версия */}
      {stats.assigned_zones && stats.assigned_zones.length > 0 && (
        <div className="mt-8">
          <h4 className="text-white font-bold text-xl mb-4">Ваши зоны доставки</h4>
          <div className="space-y-3">
            {stats.assigned_zones.map((zone, index) => (
              <div key={index} className="bg-gray-700 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-lg">📍 {zone}</span>
                  <span className="text-blue-400 text-sm font-medium">Активна</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Прогресс выполнения - планшетная версия */}
      <div className="mt-8">
        <h4 className="text-white font-bold text-xl mb-4">Прогресс выполнения</h4>
        <div className="space-y-4">
          {/* Прогресс-бар для новых заказов */}
          {stats.total_orders > 0 && (
            <div>
              <div className="flex justify-between text-lg mb-2">
                <span className="text-gray-400">Новые заказы</span>
                <span className="text-yellow-400 font-medium">{stats.new_orders}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-yellow-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.new_orders / stats.total_orders) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Прогресс-бар для обработки */}
          {stats.total_orders > 0 && (
            <div>
              <div className="flex justify-between text-lg mb-2">
                <span className="text-gray-400">В обработке</span>
                <span className="text-purple-400 font-medium">{stats.processing_orders}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-purple-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.processing_orders / stats.total_orders) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Прогресс-бар для подтвержденных */}
          {stats.total_orders > 0 && (
            <div>
              <div className="flex justify-between text-lg mb-2">
                <span className="text-gray-400">Подтверждено</span>
                <span className="text-green-400 font-medium">{stats.confirmed_orders}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-green-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.confirmed_orders / stats.total_orders) * 100}%` }}
                ></div>
              </div>
            </div>
          )}

          {/* Прогресс-бар для завершенных */}
          {stats.total_orders > 0 && (
            <div>
              <div className="flex justify-between text-lg mb-2">
                <span className="text-gray-400">Завершено</span>
                <span className="text-blue-400 font-medium">{stats.completed_orders}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(stats.completed_orders / stats.total_orders) * 100}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Время последнего обновления - планшетная версия */}
      <div className="mt-8 text-center">
        <p className="text-gray-500 text-lg">
          Обновлено: {new Date().toLocaleTimeString('ru-RU')}
        </p>
      </div>
    </div>
  );
};
