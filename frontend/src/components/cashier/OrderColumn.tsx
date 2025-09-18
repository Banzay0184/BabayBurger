import React from 'react';
import { Button } from '../ui/Button';
import { type Order } from '../../api/cashierApi';
import { formatCurrency } from '../../utils/format';

interface OrderColumnProps {
  title: string;
  orders: Order[];
  onOrderAction: (orderId: number, action: string) => void;
  onShowDetails: (order: Order) => void;
  onShowReceiptPhotos?: (order: Order) => void;
  color: string;
  icon: React.ReactNode;
}

export const OrderColumn: React.FC<OrderColumnProps> = ({
  title,
  orders,
  onOrderAction,
  onShowDetails,
  onShowReceiptPhotos,
  color,
  icon
}) => {
  const getActionButton = (order: Order) => {
    switch (order.status) {
      case 'pending':
        return (
          <Button
            onClick={() => onOrderAction(order.id, 'start_processing')}
            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white text-xs py-1 sm:py-1.5 rounded font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            🍳 Начать
          </Button>
        );
      case 'preparing':
        return (
          <Button
            onClick={() => onOrderAction(order.id, 'mark_ready')}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs py-1 sm:py-1.5 rounded font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            ✅ Готов
          </Button>
        );
      case 'ready_for_delivery':
        // Для заказов на доставку показываем "Отправить"
        if (order.service_type === 'delivery') {
          return (
            <Button
              onClick={() => onOrderAction(order.id, 'mark_delivering')}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white text-xs py-1 sm:py-1.5 rounded font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              🚚 Отправить
            </Button>
          );
        }
        // Для заказов самовывоз показываем "Отдать клиенту"
        else if (order.service_type === 'pickup') {
          return (
            <Button
              onClick={() => onOrderAction(order.id, 'complete')}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white text-xs py-1 sm:py-1.5 rounded font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              🤝 Отдать
            </Button>
          );
        }
        return null;
      case 'delivering':
        return (
          <Button
            onClick={() => onOrderAction(order.id, 'complete')}
            className="w-full bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white text-xs py-1 sm:py-1.5 rounded font-medium shadow-md hover:shadow-lg transition-all duration-200"
          >
            ✅ Завершить
          </Button>
        );
      default:
        return null;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const hasReceiptPhotos = (order: Order) => {
    return order.receipt_photos && order.receipt_photos.length > 0;
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl border border-white/20 overflow-hidden">
      {/* Заголовок колонки */}
      <div className="p-2 sm:p-3 md:p-4 bg-gradient-to-r from-white/90 to-white/70 border-b border-gray-100">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div className="p-1.5 sm:p-2 rounded-lg shadow-md" style={{ backgroundColor: `${color}15` }}>
            {icon}
          </div>
          <div>
            <h3 className="text-sm sm:text-base md:text-lg font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-600 font-medium">{orders.length} заказов</p>
          </div>
        </div>
      </div>

      {/* Список заказов */}
      <div className="p-2 sm:p-3 space-y-1.5 sm:space-y-2 overflow-y-auto max-h-[calc(100vh-180px)] sm:max-h-[calc(100vh-220px)] md:max-h-[calc(100vh-280px)] scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
        {orders.length === 0 ? (
          <div className="text-center py-8 sm:py-12 text-gray-500">
            <div className="text-4xl sm:text-6xl mb-3 sm:mb-4 opacity-50">📋</div>
            <p className="text-sm sm:text-base md:text-lg font-medium">Нет заказов</p>
            <p className="text-xs sm:text-sm text-gray-400 mt-1">Новые заказы появятся здесь</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="bg-white/90 backdrop-blur-sm rounded-lg sm:rounded-xl border border-gray-200/50 hover:shadow-lg hover:scale-[1.01] sm:hover:scale-[1.02] transition-all duration-200 hover:border-gray-300/50">
              {/* Компактный заголовок */}
              <div className="px-2 sm:px-3 py-1.5 sm:py-2 bg-gradient-to-r from-gray-50/80 to-gray-100/80 border-b border-gray-200/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <span className="font-bold text-gray-900 text-sm sm:text-base">#{order.id}</span>
                    {order.operator_order_number && (
                      <span className="px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-purple-100 to-purple-200 text-purple-800 text-xs font-bold rounded-full">
                        #{order.operator_order_number}
                      </span>
                    )}
                    <span className={`px-1.5 sm:px-2 py-0.5 text-xs font-bold rounded-full ${
                      order.service_type === 'pickup' 
                        ? 'bg-gradient-to-r from-orange-100 to-orange-200 text-orange-800' 
                        : 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800'
                    }`}>
                      {order.service_type === 'pickup' ? '🍽️' : '🚚'}
                    </span>
                  </div>
                  <span className="text-xs text-gray-600 font-medium bg-white/60 px-1.5 sm:px-2 py-0.5 rounded-full">
                    {formatTime(order.created_at)}
                  </span>
                </div>
              </div>

              {/* Компактная информация */}
              <div className="p-2 sm:p-3">
                {/* Клиент и телефон */}
                <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                  <div className="flex items-center space-x-1.5 sm:space-x-2">
                    <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gradient-to-br from-blue-100 to-blue-200 rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-blue-700 text-xs font-bold">
                        {order.user_info?.first_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-gray-900 block">
                        {order.user_info?.first_name || 'Неизвестный'} {order.user_info?.last_name || ''}
                      </span>
                      <span className="text-xs text-gray-500">📞 {order.phone}</span>
                    </div>
                  </div>
                </div>

                {/* Адрес только для доставки */}
                {order.service_type === 'delivery' && order.address_info && (
                  <div className="mb-1.5 sm:mb-2 p-1.5 sm:p-2 bg-gradient-to-r from-green-50 to-green-100 rounded border border-green-200/50">
                    <div className="flex items-start space-x-1">
                      <span className="text-green-600 text-xs">📍</span>
                      <span className="text-xs text-green-800">{order.address_info.full_address}</span>
                    </div>
                  </div>
                )}

                {/* Краткий список блюд */}
                <div className="mb-1.5 sm:mb-2">
                  <div className="text-xs text-gray-500 mb-1 font-medium">
                    🍽️ {order.items_details?.length || 0} позиций
                  </div>
                  <div className="space-y-0.5 sm:space-y-1 max-h-10 sm:max-h-12 overflow-y-auto">
                    {order.items_details && order.items_details.length > 0 ? (
                      order.items_details.slice(0, 2).map((item, index) => (
                        <div key={index} className="text-xs text-gray-700 bg-gray-50/50 px-1.5 sm:px-2 py-0.5 rounded flex justify-between">
                          <span>
                            <span className="font-medium">{item.quantity}x</span> {item.menu_item_name || 'Товар'}
                            {item.size_option_name && <span className="text-gray-500"> ({item.size_option_name})</span>}
                          </span>
                          <span className="font-bold text-gray-900">
                            {formatCurrency(item.total_price)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 bg-yellow-50 px-1.5 sm:px-2 py-0.5 rounded">
                        ⏳ Загрузка товаров...
                      </div>
                    )}
                    {order.items_details && order.items_details.length > 2 && (
                      <p className="text-xs text-blue-600 font-medium">
                        +{order.items_details.length - 2} еще...
                      </p>
                    )}
                  </div>
                </div>

                {/* Цена и оплата */}
                <div className="mb-1.5 sm:mb-2 p-1.5 sm:p-2 bg-gradient-to-r from-green-50 to-green-100 rounded border border-green-200/50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-1">
                      <span className="text-xs sm:text-sm">
                        {order.payment_method === 'cash' ? '💵' : 
                         order.payment_method === 'card' ? '💳' : '🌐'}
                      </span>
                      <span className="text-xs font-medium text-gray-700">
                        {order.payment_method === 'cash' ? 'Наличные' : 
                         order.payment_method === 'card' ? 'Карта' : 'Онлайн'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-green-700 text-xs sm:text-sm block">
                        {order.final_price && parseFloat(order.final_price) > 0 
                          ? formatCurrency(Number(order.final_price))
                          : order.total_price && parseFloat(order.total_price) > 0
                            ? formatCurrency(Number(order.total_price))
                            : '⏳ Загрузка...'
                        }
                      </span>
                      {(order.discount_amount || 0) > 0 && (
                        <span className="text-xs text-green-600">
                          -{formatCurrency(order.discount_amount)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Заметки */}
                {order.notes && (
                  <div className="mb-1.5 sm:mb-2 p-1.5 sm:p-2 bg-gradient-to-r from-yellow-50 to-yellow-100 rounded border border-yellow-200/50">
                    <div className="flex items-start space-x-1">
                      <span className="text-yellow-600 text-xs">📝</span>
                      <p className="text-xs text-yellow-800">{order.notes}</p>
                    </div>
                  </div>
                )}

                {/* Кнопки действий */}
                <div className="space-y-1">
                  {getActionButton(order)}
                  <Button
                    onClick={() => onShowDetails(order)}
                    className="w-full bg-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 text-xs py-1 sm:py-1.5 border border-gray-300/50 rounded font-medium shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    📋 Подробности
                  </Button>
                  {/* Кнопка для просмотра фотографий чека (только для завершенных заказов с фотографиями) */}
                  {(order.status === 'completed' || (order.status === 'ready_for_delivery' && order.service_type === 'pickup')) && 
                   hasReceiptPhotos(order) && onShowReceiptPhotos && (
                    <Button
                      onClick={() => onShowReceiptPhotos(order)}
                      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white text-xs py-1 sm:py-1.5 rounded font-medium shadow-md hover:shadow-lg transition-all duration-200"
                    >
                      📷 Фото чека
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
