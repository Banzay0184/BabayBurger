import React, { memo } from 'react';
import { OrdersPage } from '../../cashier/OrdersPage';
import type { Order } from '../../../api/cashierApi';
import type { CashierViewType } from '../../../store/cashierStore';

interface OrdersBoardProps {
  orders: Order[];
  activeView: CashierViewType;
  onOrderAction: (orderId: number, action: string) => void;
  onShowDetails: (order: Order) => void;
  onShowReceipts: (order: Order) => void;
}

export const OrdersBoard: React.FC<OrdersBoardProps> = memo(({
  orders,
  activeView,
  onOrderAction,
  onShowDetails,
  onShowReceipts
}) => {
  return (
    <OrdersPage
      orders={orders}
      title={
        activeView === 'preparing' ? 'Готовятся' :
        activeView === 'ready' ? 'Готовы к выдаче' :
        'Завершенные'
      }
      color={
        activeView === 'preparing' ? '#3b82f6' :
        activeView === 'ready' ? '#f59e0b' :
        '#6b7280'
      }
      icon={
        activeView === 'preparing' ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        ) : activeView === 'ready' ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      }
      onOrderAction={onOrderAction}
      onShowDetails={onShowDetails}
      onShowReceipts={onShowReceipts}
      emptyMessage={
        activeView === 'preparing' ? 'Нет заказов в приготовлении' :
        activeView === 'ready' ? 'Нет готовых заказов' :
        'Нет завершенных заказов'
      }
      emptyIcon={
        activeView === 'preparing' ? '🍳' :
        activeView === 'ready' ? '📦' :
        '✅'
      }
    />
  );
});


