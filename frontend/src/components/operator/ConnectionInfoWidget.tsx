import React from 'react';
import type { Operator } from '../../types/operator';

interface ConnectionInfoWidgetProps {
  isConnected: boolean;
  operator: Operator | null;
  className?: string;
}

export const ConnectionInfoWidget: React.FC<ConnectionInfoWidgetProps> = ({ 
  isConnected, 
  operator,
  className = '' 
}) => {
  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
        <span className="mr-2">🔌</span>
        Подключение
      </h3>
      
      <div className="space-y-3">
        {/* WebSocket статус */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">WebSocket:</span>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-300">
              {isConnected ? 'Подключен' : 'Отключен'}
            </span>
          </div>
        </div>

        {/* Оператор */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Оператор:</span>
          <span className="text-sm text-gray-300">
            {operator ? `${operator.first_name} ${operator.last_name}` : 'Не авторизован'}
          </span>
        </div>

        {/* Зоны доставки */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Зоны:</span>
          <span className="text-sm text-gray-300">
            {operator?.assigned_zones?.map(zone => zone.city).join(', ') || 'Не назначены'}
          </span>
        </div>

        {/* Время последнего обновления */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Обновлено:</span>
          <span className="text-sm text-gray-300">
            {new Date().toLocaleTimeString('ru-RU')}
          </span>
        </div>
      </div>

      {/* Индикатор состояния */}
      <div className="mt-4 pt-3 border-t border-gray-600">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Статус системы:</span>
          <div className="flex items-center space-x-1">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-300">
              {isConnected ? 'Онлайн' : 'Офлайн'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
