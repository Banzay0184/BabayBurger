import React from 'react';
import type { OrderStatus } from '../../types/operator';

interface CompactOrderFiltersProps {
  selectedStatus: OrderStatus | 'all';
  onStatusChange: (status: OrderStatus | 'all') => void;
}

export const CompactOrderFilters: React.FC<CompactOrderFiltersProps> = ({
  selectedStatus,
  onStatusChange,
}) => {
  // Получение текста статуса
  const getStatusText = (status: OrderStatus | 'all'): string => {
    switch (status) {
      case 'all': return 'Все заказы';
      case 'pending': return 'Ожидают обработки';
      case 'confirmed': return 'Подтвержденные';
      case 'preparing': return 'Готовятся';
      case 'ready_for_delivery': return 'Готов к доставке';
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
      case 'ready_for_delivery': return '📦';
      case 'delivering': return '🚚';
      case 'completed': return '🎉';
      case 'cancelled': return '❌';
      case 'rejected': return '🚫';
      default: return '📋';
    }
  };

  // Список основных статусов для фильтрации
  const mainStatuses: (OrderStatus | 'all')[] = [
    'all',
    'pending',
    'preparing',
    'ready_for_delivery',
    'delivering',
    'completed',
    'cancelled',
    'rejected'
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-2 mb-4">
      <div className="flex flex-wrap items-center gap-1">
        {/* Фильтр по статусам */}
        <div className="flex flex-wrap gap-1">
          {mainStatuses.map((status) => (
            <button
              key={status}
              onClick={() => onStatusChange(status)}
              className={`flex items-center space-x-1 px-3 py-2 rounded text-sm font-medium transition-colors ${
                selectedStatus === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <span className="text-sm">{getStatusIcon(status)}</span>
              <span className="hidden md:inline">{getStatusText(status)}</span>
            </button>
          ))}
        </div>

        {/* Разделитель */}


        {/* Фильтр по зонам */}
        

        {/* Сброс фильтров */}
       
      </div>
    </div>
  );
};
