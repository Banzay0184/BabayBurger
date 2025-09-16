import React from 'react';
import type { Order } from '../../api/cashierApi';

interface OrdersPageProps {
  orders: Order[];
  title: string;
  color: string;
  icon: React.ReactNode;
  onOrderAction: (orderId: number, action: string) => void;
  onShowDetails: (order: Order) => void;
  emptyMessage: string;
  emptyIcon: string;
}

export const OrdersPage: React.FC<OrdersPageProps> = ({
  orders,
  color,
  onOrderAction,
  onShowDetails,
  emptyMessage,
  emptyIcon
}) => {
  return (
    <div className="h-full">
      {/* Заголовок страницы */}


      {/* Список заказов */}
      <div className="h-[calc(100vh-280px)] overflow-y-auto mt-8">
        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="text-6xl mb-4 opacity-50">{emptyIcon}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{emptyMessage}</h3>
            <p className="text-gray-500">Новые заказы появятся здесь автоматически</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                {/* Компактный заголовок заказа */}
                <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        color === '#3b82f6' ? 'bg-blue-100 text-blue-800' :
                        color === '#f59e0b' ? 'bg-orange-100 text-orange-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        #{order.id}
                      </div>
                      {order.operator_order_number && (
                        <div className="px-2 py-1 bg-gray-200 text-gray-700 rounded-full text-xs font-medium">
                          Очередь: {order.operator_order_number}
                        </div>
                      )}
                      <div className="text-sm text-gray-600">
                        {order.user_info?.first_name || 'Неизвестный'} {order.user_info?.last_name || ''}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {(order.final_price || 0).toLocaleString()} сум
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Детали заказа */}
                <div className="p-4">
                  <div className="space-y-2 mb-4">
                    {order.items_details.map((item, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-600">×{item.quantity}</span>
                          <span className="font-medium text-gray-900">{item.menu_item_name}</span>
                        </div>
                        <span className="text-gray-600">
                          {(item.total_price || 0).toLocaleString()} сум
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Адрес доставки */}
                  {order.address_info && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-0.5">📍</span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {order.address_info.full_address}
                          </div>
                          <div className="text-xs text-gray-500">
                            {order.address_info.phone_number}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Кнопки действий */}
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onShowDetails(order)}
                      className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                    >
                      Подробнее
                    </button>
                    
                    {/* Кнопки действий в зависимости от статуса */}
                    {order.status === 'pending' && (
                      <button
                        onClick={() => onOrderAction(order.id, 'start_processing')}
                        className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Начать готовить
                      </button>
                    )}
                    
                    {order.status === 'preparing' && (
                      <button
                        onClick={() => onOrderAction(order.id, 'mark_ready')}
                        className="flex-1 px-3 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Готов
                      </button>
                    )}
                    
                    {order.status === 'ready_for_delivery' && order.service_type === 'delivery' && (
                      <button
                        onClick={() => onOrderAction(order.id, 'mark_delivering')}
                        className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        В доставке
                      </button>
                    )}
                    
                    {(order.status === 'delivering' || (order.status === 'ready_for_delivery' && order.service_type === 'pickup')) && (
                      <button
                        onClick={() => onOrderAction(order.id, 'complete')}
                        className="flex-1 px-3 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        Завершить
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
