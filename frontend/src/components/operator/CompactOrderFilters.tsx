import React from 'react';
import type { OrderStatus } from '../../types/operator';

interface CompactOrderFiltersProps {
  selectedStatus: OrderStatus | 'all';
  selectedZone: string;
  zones: string[];
  onStatusChange: (status: OrderStatus | 'all') => void;
  onZoneChange: (zone: string) => void;
}

export const CompactOrderFilters: React.FC<CompactOrderFiltersProps> = ({
  selectedStatus,
  selectedZone,
  zones,
  onStatusChange,
  onZoneChange,
}) => {
  // Получение текста статуса
  const getStatusText = (status: OrderStatus | 'all'): string => {
    switch (status) {
      case 'all': return 'Все заказы';
      case 'pending': return 'Ожидают обработки';
      case 'confirmed': return 'Подтвержденные';
      case 'preparing': return 'Готовятся';
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
      case 'confirmed': return '✅';
      case 'preparing': return '👨‍🍳';
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
    'delivering',
    'completed',
    'cancelled',
    'rejected'
  ];

  return (
    <div className="bg-gray-800 rounded-xl p-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        {/* Заголовок */}
        <span className="text-gray-300 text-lg font-semibold mr-4">Фильтры:</span>
        
        {/* Фильтр по статусам */}
        <div className="flex flex-wrap gap-2">
          {allStatuses.map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span className="text-lg">{getStatusIcon(status)}</span>
              <span>{getStatusText(status)}</span>
            </button>
          ))}
        </div>

        {/* Разделитель */}
        <div className="w-px h-8 bg-gray-600 mx-2"></div>

        {/* Фильтр по зонам */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onZoneChange('all')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedZone === 'all'
                ? 'bg-green-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <span className="text-lg">🌍</span>
            <span>Все зоны</span>
          </button>

          {zones.map((zone) => (
            <button
              key={zone}
              onClick={() => onZoneChange(zone)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedZone === zone
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span className="text-lg">📍</span>
              <span>{zone}</span>
            </button>
          ))}
        </div>

        {/* Сброс фильтров */}
        <button
          onClick={() => {
            onStatusChange('all');
            onZoneChange('all');
          }}
          className="flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium bg-gray-600 hover:bg-gray-700 text-gray-300 transition-colors ml-auto"
        >
          <span className="text-lg">🔄</span>
          <span>Сбросить</span>
        </button>
      </div>
    </div>
  );
};
