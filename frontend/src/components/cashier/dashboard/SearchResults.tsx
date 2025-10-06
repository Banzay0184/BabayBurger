import React, { memo } from 'react';
import { OrderColumn } from '../../cashier/OrderColumn';
import type { Order } from '../../../api/cashierApi';

interface SearchResultsProps {
  results: Order[];
  onOrderAction: (orderId: number, action: string) => void;
  onShowDetails: (order: Order) => void;
  onShowReceipts: (order: Order) => void;
}

export const SearchResults: React.FC<SearchResultsProps> = memo(({
  results,
  onOrderAction,
  onShowDetails,
  onShowReceipts
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Результаты поиска</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
        <OrderColumn
          title="Готовятся"
          orders={results.filter(order => order.status === 'preparing')}
          onOrderAction={onOrderAction}
          onShowDetails={onShowDetails}
          onShowReceipts={onShowReceipts}
          color="#3b82f6"
          icon={
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <OrderColumn
          title="Готовы к выдаче"
          orders={results.filter(order => 
            order.status === 'delivering' || 
            (order.status === 'ready_for_delivery' && order.service_type === 'delivery')
          )}
          onOrderAction={onOrderAction}
          onShowDetails={onShowDetails}
          onShowReceipts={onShowReceipts}
          color="#f59e0b"
          icon={
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
          }
        />
        <OrderColumn
          title="Завершенные"
          orders={results.filter(order => 
            order.status === 'completed' || 
            (order.status === 'ready_for_delivery' && order.service_type === 'pickup')
          )}
          onOrderAction={onOrderAction}
          onShowDetails={onShowDetails}
          onShowReceipts={onShowReceipts}
          color="#10b981"
          icon={
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          }
        />
      </div>
    </div>
  );
});


