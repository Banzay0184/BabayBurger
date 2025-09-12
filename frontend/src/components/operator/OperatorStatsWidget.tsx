import React from 'react';
import type { OrderForOperator } from '../../types/operator';

interface OperatorStatsWidgetProps {
  orders: OrderForOperator[];
  className?: string;
}

export const OperatorStatsWidget: React.FC<OperatorStatsWidgetProps> = ({ 
  orders, 
  className = '' 
}) => {
  // Подсчет статистики
  const stats = {
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    preparing: orders.filter(o => o.status === 'preparing').length,
    delivering: orders.filter(o => o.status === 'delivering').length,
    completed: orders.filter(o => o.status === 'completed').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length,
    rejected: orders.filter(o => o.status === 'rejected').length,
    total: orders.length
  };

  // Получение цвета для статистики
  const getStatColor = (status: string): string => {
    switch (status) {
      case 'pending': return 'text-orange-500';
      case 'confirmed': return 'text-blue-500';
      case 'preparing': return 'text-green-500';
      case 'delivering': return 'text-purple-500';
      case 'completed': return 'text-green-600';
      case 'cancelled': return 'text-red-500';
      case 'rejected': return 'text-red-600';
      case 'total': return 'text-gray-300';
      default: return 'text-gray-400';
    }
  };

  // Получение иконки для статистики
  const getStatIcon = (status: string): string => {
    switch (status) {
      case 'pending': return '⏳';
      case 'confirmed': return '✅';
      case 'preparing': return '👨‍🍳';
      case 'delivering': return '🚚';
      case 'completed': return '🎉';
      case 'cancelled': return '❌';
      case 'rejected': return '🚫';
      case 'total': return '📊';
      default: return '📋';
    }
  };

  // Получение текста для статистики
  const getStatText = (status: string): string => {
    switch (status) {
      case 'pending': return 'Ожидают';
      case 'confirmed': return 'Подтверждены';
      case 'preparing': return 'Готовятся';
      case 'delivering': return 'Доставляются';
      case 'completed': return 'Завершены';
      case 'cancelled': return 'Отменены';
      case 'rejected': return 'Отклонены';
      case 'total': return 'Всего';
      default: return status;
    }
  };

  return (
    <div className={`bg-gray-800 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
        <span className="mr-2">📊</span>
        Статистика заказов
      </h3>
      
      <div className="grid grid-cols-2 gap-3">
        {/* Основные статусы */}
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${getStatColor('pending')}`}>
            {stats.pending}
          </div>
          <div className="text-xs text-gray-400 flex items-center justify-center mt-1">
            <span className="mr-1">{getStatIcon('pending')}</span>
            {getStatText('pending')}
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${getStatColor('confirmed')}`}>
            {stats.confirmed}
          </div>
          <div className="text-xs text-gray-400 flex items-center justify-center mt-1">
            <span className="mr-1">{getStatIcon('confirmed')}</span>
            {getStatText('confirmed')}
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${getStatColor('preparing')}`}>
            {stats.preparing}
          </div>
          <div className="text-xs text-gray-400 flex items-center justify-center mt-1">
            <span className="mr-1">{getStatIcon('preparing')}</span>
            {getStatText('preparing')}
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3 text-center">
          <div className={`text-2xl font-bold ${getStatColor('delivering')}`}>
            {stats.delivering}
          </div>
          <div className="text-xs text-gray-400 flex items-center justify-center mt-1">
            <span className="mr-1">{getStatIcon('delivering')}</span>
            {getStatText('delivering')}
          </div>
        </div>
      </div>

      {/* Дополнительная статистика */}
      <div className="mt-3 pt-3 border-t border-gray-600">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className={`text-lg font-bold ${getStatColor('completed')}`}>
              {stats.completed}
            </div>
            <div className="text-xs text-gray-400">{getStatText('completed')}</div>
          </div>
          
          <div>
            <div className={`text-lg font-bold ${getStatColor('cancelled')}`}>
              {stats.cancelled}
            </div>
            <div className="text-xs text-gray-400">{getStatText('cancelled')}</div>
          </div>
          
          <div>
            <div className={`text-lg font-bold ${getStatColor('total')}`}>
              {stats.total}
            </div>
            <div className="text-xs text-gray-400">{getStatText('total')}</div>
          </div>
        </div>
      </div>

      {/* Прогресс-бар для активных заказов */}
      {stats.total > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-600">
          <div className="text-xs text-gray-400 mb-2">Прогресс обработки</div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full transition-all duration-500"
              style={{ 
                width: `${((stats.completed + stats.delivering) / stats.total) * 100}%` 
              }}
            ></div>
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {Math.round(((stats.completed + stats.delivering) / stats.total) * 100)}% завершено
          </div>
        </div>
      )}
    </div>
  );
};
