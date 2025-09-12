import React from 'react';
import type { OrderStatus } from '../../types/operator';

interface QuickActionsWidgetProps {
  onStatusChange: (status: OrderStatus | 'all') => void;
  onRefresh: () => void;
  onNavigate?: (page: 'login' | 'dashboard' | 'stats') => void;
  className?: string;
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({ 
  onStatusChange, 
  onRefresh, 
  onNavigate,
  className = '' 
}) => {
  const quickActions = [
    {
      id: 'pending',
      label: '⏳ Ожидающие заказы',
      description: 'Показать заказы, ожидающие обработки',
      color: 'bg-orange-600 hover:bg-orange-700',
      action: () => onStatusChange('pending')
    },
    {
      id: 'all',
      label: '📋 Все заказы',
      description: 'Показать все заказы',
      color: 'bg-blue-600 hover:bg-blue-700',
      action: () => onStatusChange('all')
    },
    {
      id: 'refresh',
      label: '🔄 Обновить данные',
      description: 'Принудительно обновить все данные',
      color: 'bg-green-600 hover:bg-green-700',
      action: onRefresh
    },
    {
      id: 'stats',
      label: '📊 Статистика',
      description: 'Перейти к детальной статистике',
      color: 'bg-purple-600 hover:bg-purple-700',
      action: () => onNavigate?.('stats')
    }
  ];

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
        <span className="mr-2">⚡</span>
        Быстрые действия
      </h3>
      
      <div className="space-y-2">
        {quickActions.map((action) => (
          <button
            key={action.id}
            onClick={action.action}
            className={`w-full ${action.color} text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left`}
            title={action.description}
          >
            <div className="flex items-center justify-between">
              <span>{action.label}</span>
              <span className="text-xs opacity-75">→</span>
            </div>
          </button>
        ))}
      </div>

      {/* Дополнительные быстрые фильтры */}
      <div className="mt-4 pt-3 border-t border-gray-600">
        <h4 className="text-sm font-medium text-gray-300 mb-2">🚀 Быстрые фильтры</h4>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onStatusChange('confirmed')}
            className="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
          >
            ✅ Подтверждены
          </button>
          <button
            onClick={() => onStatusChange('preparing')}
            className="bg-green-500 hover:bg-green-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
          >
            👨‍🍳 Готовятся
          </button>
          <button
            onClick={() => onStatusChange('delivering')}
            className="bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
          >
            🚚 Доставляются
          </button>
          <button
            onClick={() => onStatusChange('completed')}
            className="bg-gray-500 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
          >
            🎉 Завершены
          </button>
        </div>
      </div>
    </div>
  );
};
