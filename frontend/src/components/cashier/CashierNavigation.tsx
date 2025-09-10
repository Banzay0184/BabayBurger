import React from 'react';

export type CashierViewType = 'preparing' | 'ready' | 'completed';

interface CashierNavigationProps {
  activeView: CashierViewType;
  onViewChange: (view: CashierViewType) => void;
  preparingCount: number;
  readyCount: number;
  completedCount: number;
}

export const CashierNavigation: React.FC<CashierNavigationProps> = ({
  activeView,
  onViewChange,
  preparingCount,
  readyCount,
  completedCount
}) => {
  const navigationItems = [
    {
      id: 'preparing' as CashierViewType,
      title: 'Готовятся',
      count: preparingCount,
      color: 'blue',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 'ready' as CashierViewType,
      title: 'Готовы к выдаче',
      count: readyCount,
      color: 'orange',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      )
    },
    {
      id: 'completed' as CashierViewType,
      title: 'Завершенные',
      count: completedCount,
      color: 'gray',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  const getButtonClasses = (item: typeof navigationItems[0]) => {
    const baseClasses = "flex items-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all duration-300 flex-1";
    
    if (activeView === item.id) {
      switch (item.color) {
        case 'blue':
          return `${baseClasses} bg-blue-500 text-white shadow-lg scale-105`;
        case 'orange':
          return `${baseClasses} bg-orange-500 text-white shadow-lg scale-105`;
        case 'gray':
          return `${baseClasses} bg-gray-500 text-white shadow-lg scale-105`;
        default:
          return `${baseClasses} bg-gray-500 text-white shadow-lg scale-105`;
      }
    } else {
      return `${baseClasses} bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-102`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-2 mb-4">
      <div className="flex space-x-2">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id)}
            className={getButtonClasses(item)}
          >
            <div className={`${activeView === item.id ? 'text-white' : 'text-gray-600'}`}>
              {item.icon}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm font-semibold">{item.title}</span>
              <span className={`text-xs ${activeView === item.id ? 'text-blue-100' : 'text-gray-500'}`}>
                {item.count} заказ{item.count === 1 ? '' : item.count < 5 ? 'а' : 'ов'}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
