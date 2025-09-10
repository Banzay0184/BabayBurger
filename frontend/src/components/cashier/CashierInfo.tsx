import React from 'react';
import type { CashierData } from '../../api/cashierApi';

interface CashierInfoProps {
  cashierData: CashierData | null;
}

export const CashierInfo: React.FC<CashierInfoProps> = ({ cashierData }) => {
  if (!cashierData) {
    return null;
  }

  return (
    <div className="flex items-center space-x-3">
      <div className="p-1.5 sm:p-2 bg-orange-100 rounded-md">
        <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <div>
        <h1 className="text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate max-w-[200px] sm:max-w-none">
          {cashierData.restaurant?.name || 'Ресторан'}
        </h1>
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <span className="truncate">
            Кассир: {cashierData.username}
          </span>
          {cashierData.restaurant?.city && (
            <>
              <span>•</span>
              <span className="truncate">{cashierData.restaurant.city}</span>
            </>
          )}
        </div>
        {(cashierData.restaurant as any)?.address && (
          <div className="text-xs text-gray-400 truncate max-w-[300px]">
            {(cashierData.restaurant as any).address}
          </div>
        )}
        {(cashierData as any).processed_orders_count !== undefined && (
          <div className="text-xs text-blue-600 font-medium">
            Обработано заказов: {(cashierData as any).processed_orders_count}
          </div>
        )}
      </div>
    </div>
  );
};
