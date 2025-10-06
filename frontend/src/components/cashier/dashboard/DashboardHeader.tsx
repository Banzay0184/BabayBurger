import React, { memo } from 'react';
import { CashierInfo } from '../../cashier/CashierInfo';
import { OrderSearch } from '../../cashier/OrderSearch';
import { CashierNavigation, type CashierViewType } from '../../cashier/CashierNavigation';
import type { CashierData, Order } from '../../../api/cashierApi';

interface DashboardHeaderProps {
  cashierData: CashierData | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  onOpenStopList: () => void;
  onOpenAddons: () => void;
  onLogout: () => void;
  onSearchResults: (results: Order[]) => void;
  onClearSearch: () => void;
  showNavigation: boolean;
  activeView: CashierViewType;
  counts: { preparing: number; ready: number; completed: number };
  onViewChange: (view: CashierViewType) => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = memo(({
  cashierData,
  isConnected,
  isConnecting,
  error,
  onOpenStopList,
  onOpenAddons,
  onLogout,
  onSearchResults,
  onClearSearch,
  showNavigation,
  activeView,
  counts,
  onViewChange
}) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3">
        <div className="flex justify-between items-center mb-3">
          <CashierInfo cashierData={cashierData} />

          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
              <span className="text-xs text-gray-600">
                {isConnected ? 'Онлайн' : isConnecting ? 'Подключение...' : 'Офлайн'}
              </span>
            </div>

            <button
              onClick={onOpenStopList}
              className="flex items-center space-x-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-md transition-colors text-xs sm:text-sm"
              title="Управление стоп-листом"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Стоп лист</span>
            </button>

            <button
              onClick={onOpenAddons}
              className="flex items-center space-x-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-md transition-colors text-xs sm:text-sm"
              title="Управление дополнениями и размерами"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              <span className="hidden sm:inline">Дополнения</span>
            </button>

            <button
              onClick={onLogout}
              className="flex items-center space-x-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors text-xs sm:text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Выйти</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg shadow-sm text-xs sm:text-sm mb-3">
            {error}
          </div>
        )}

        <div className="mb-3">
          <OrderSearch onSearchResults={onSearchResults} onClearSearch={onClearSearch} />
        </div>

        {showNavigation && (
          <CashierNavigation
            activeView={activeView}
            onViewChange={onViewChange}
            preparingCount={counts.preparing}
            readyCount={counts.ready}
            completedCount={counts.completed}
          />
        )}
      </div>
    </div>
  );
});


