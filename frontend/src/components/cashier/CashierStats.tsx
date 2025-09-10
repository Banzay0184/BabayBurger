import React from 'react';
import  { type DashboardStats } from '../../api/cashierApi';

interface CashierStatsProps {
  stats: DashboardStats;
  cashierName: string;
  restaurantName: string;
  onLogout: () => void;
}

export const CashierStats: React.FC<CashierStatsProps> = ({
  stats,
  cashierName,
  restaurantName,
  onLogout
}) => {
  const statCards = [
    {
      title: 'Всего заказов',
      value: stats.total_orders,
      color: 'blue',
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    {
      title: 'Готовятся',
      value: stats.preparing_orders,
      color: 'yellow',
      icon: (
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: 'Готовы',
      value: stats.ready_orders,
      color: 'green',
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      )
    },
    {
      title: 'Доставляется',
      value: stats.delivering_orders,
      color: 'orange',
      icon: (
        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    },
    {
      title: 'Завершены',
      value: stats.completed_orders,
      color: 'gray',
      icon: (
        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'yellow':
        return 'bg-yellow-100 text-yellow-600';
      case 'green':
        return 'bg-green-100 text-green-600';
      case 'orange':
        return 'bg-orange-100 text-orange-600';
      case 'gray':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white shadow-sm border-b">
      <div className="max-w-6xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6">
        {/* Заголовок - компактный */}
        <div className="flex justify-between items-center py-2 sm:py-3">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="p-1.5 sm:p-2 bg-orange-100 rounded-md">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">{restaurantName}</h1>
              <p className="text-xs text-gray-500 truncate">{cashierName}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center space-x-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors text-xs sm:text-sm"
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Выйти</span>
          </button>
        </div>

        {/* Статистика - компактная */}
        <div className="grid grid-cols-5 gap-1 sm:gap-2 pb-2 sm:pb-3">
          {statCards.map((stat, index) => (
            <div key={index} className="bg-gray-50 rounded-md p-1.5 sm:p-2">
              <div className="flex flex-col items-center space-y-1">
                <div className={`p-1 rounded-md ${getColorClasses(stat.color)}`}>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {stat.icon.props.children}
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-gray-900">{stat.value}</p>
                  <p className="text-xs text-gray-500 leading-tight">{stat.title}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
