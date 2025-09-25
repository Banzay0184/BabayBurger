import React from 'react';
import type { OrderStatus } from '../../types/operator';

interface OrderFiltersProps {
  selectedStatus: OrderStatus | 'all';
  selectedZone: string;
  zones: string[];
  onStatusChange: (status: OrderStatus | 'all') => void;
  onZoneChange: (zone: string) => void;
}

export const OrderFilters: React.FC<OrderFiltersProps> = ({
  selectedStatus,
  selectedZone,
  zones,
  onStatusChange,
  onZoneChange
}) => {
  // Получение текста статуса
  const getStatusText = (status: OrderStatus | 'all'): string => {
    switch (status) {
      case 'all': return 'Все заказы';
      case 'pending': return 'Ожидают обработки';
      case 'new': return 'Новые';
      case 'assigned': return 'Назначенные';
      case 'operator_processing': return 'В обработке';
      case 'confirmed': return 'Подтвержденные';
      case 'preparing': return 'Готовятся';
      case 'ready_for_delivery': return 'Готовы к доставке';
      case 'delivering': return 'Доставляются';
      case 'completed': return 'Завершенные';
      case 'cancelled': return 'Отмененные';
      case 'rejected': return 'Отклоненные';
      default: return status;
    }
  };



  // Получение иконки статуса
  const getStatusIcon = (status: OrderStatus | 'all'): string => {
    switch (status) {
      case 'all': return '📋';
      case 'pending': return '⏳';
      case 'new': return '🆕';
      case 'assigned': return '👤';
      case 'operator_processing': return '⚙️';
      case 'confirmed': return '✅';
      case 'preparing': return '👨‍🍳';
      case 'ready_for_delivery': return '📦';
      case 'delivering': return '🚚';
      case 'completed': return '🎉';
      case 'cancelled': return '❌';
      case 'rejected': return '🚫';
      default: return '📋';
    }
  };

  // Список всех статусов для фильтрации
  const allStatuses: (OrderStatus | 'all')[] = [
    'all',
    'pending',
    'confirmed',
    'preparing',
    'ready_for_delivery',
    'delivering',
    'completed',
    'cancelled',
    'rejected'
  ];

  return (
    <div className="bg-gray-800 rounded-xl p-8">
      {/* Заголовок - планшетная версия */}
      <h3 className="text-2xl font-bold text-white mb-6">Фильтры</h3>

      {/* Фильтр по статусу - планшетная версия */}
      <div className="mb-8">
        <h4 className="text-gray-300 text-lg font-semibold mb-4">Статус заказа</h4>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {allStatuses.map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`w-full flex items-center space-x-4 p-4 rounded-xl text-left transition-colors ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span className="text-2xl">{getStatusIcon(status)}</span>
              <span className="flex-1 text-lg">{getStatusText(status)}</span>
              {selectedStatus === status && (
                <span className="text-blue-200 text-xl">✓</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Фильтр по зонам доставки - планшетная версия */}
      {zones.length > 0 && (
        <div className="mb-8">
          <h4 className="text-gray-300 text-lg font-semibold mb-4">Зона доставки</h4>
          <div className="space-y-3">
            {/* Все зоны */}
            <button
              onClick={() => onZoneChange('all')}
              className={`w-full flex items-center space-x-4 p-4 rounded-xl text-left transition-colors ${
                selectedZone === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span className="text-2xl">🌍</span>
              <span className="flex-1 text-lg">Все зоны</span>
              {selectedZone === 'all' && (
                <span className="text-blue-200 text-xl">✓</span>
              )}
            </button>

            {/* Конкретные зоны */}
            {zones.map((zone) => (
              <button
                key={zone}
                onClick={() => onZoneChange(zone)}
                className={`w-full flex items-center space-x-4 p-4 rounded-xl text-left transition-colors ${
                  selectedZone === zone
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <span className="text-2xl">📍</span>
                <span className="flex-1 text-lg">{zone}</span>
                {selectedZone === zone && (
                  <span className="text-blue-200 text-xl">✓</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Быстрые фильтры - планшетная версия */}
      <div className="mb-8">
        <h4 className="text-gray-300 text-lg font-semibold mb-4">Быстрые фильтры</h4>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onStatusChange('pending')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-xl text-lg font-medium transition-colors"
          >
            ⏳ Ожидают обработки
          </button>
          <button
            onClick={() => onStatusChange('confirmed')}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-xl text-lg font-medium transition-colors"
          >
            ✅ Подтвержденные
          </button>
          <button
            onClick={() => onStatusChange('preparing')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-3 rounded-xl text-lg font-medium transition-colors"
          >
            👨‍🍳 Готовятся
          </button>
          <button
            onClick={() => onStatusChange('ready_for_delivery')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl text-lg font-medium transition-colors"
          >
            📦 Готов к доставке
          </button>
          <button
            onClick={() => onStatusChange('delivering')}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-xl text-lg font-medium transition-colors"
          >
            🚚 Доставляются
          </button>
          <button
            onClick={() => onStatusChange('completed')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl text-lg font-medium transition-colors"
          >
            🎉 Завершенные
          </button>
          <button
            onClick={() => onStatusChange('cancelled')}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl text-lg font-medium transition-colors"
          >
            ❌ Отмененные
          </button>
        </div>
      </div>

      {/* Сброс фильтров - планшетная версия */}
      <div className="pt-6 border-t border-gray-700">
        <button
          onClick={() => {
            onStatusChange('all');
            onZoneChange('all');
          }}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl text-lg font-medium transition-colors"
        >
          🔄 Сбросить фильтры
        </button>
      </div>

      {/* Информация о выбранных фильтрах - планшетная версия */}
      <div className="mt-6 p-4 bg-gray-700 rounded-xl">
        <p className="text-gray-400 text-lg mb-3 font-medium">Активные фильтры:</p>
        <div className="space-y-2">
          <div className="flex items-center space-x-3">
            <span className="text-blue-400 text-lg">📋</span>
            <span className="text-gray-300 text-lg">
              Статус: {getStatusText(selectedStatus)}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-blue-400 text-lg">📍</span>
            <span className="text-gray-300 text-lg">
              Зона: {selectedZone === 'all' ? 'Все зоны' : selectedZone}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
