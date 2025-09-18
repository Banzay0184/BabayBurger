import React from 'react';
import { type Order } from '../../api/cashierApi';

interface OrderDetailsModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  isOpen,
  onClose
}) => {
  if (!isOpen || !order) return null;

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', { 
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'preparing':
        return 'bg-blue-100 text-blue-800';
      case 'ready_for_delivery':
        return 'bg-green-100 text-green-800';
      case 'delivering':
        return 'bg-orange-100 text-orange-800';
      case 'completed':
        return 'bg-gray-100 text-gray-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Ожидает';
      case 'preparing':
        return 'Готовится';
      case 'ready_for_delivery':
        return 'Готов к доставке';
      case 'delivering':
        return 'Доставляется';
      case 'completed':
        return 'Завершен';
      case 'cancelled':
        return 'Отменен';
      case 'rejected':
        return 'Отклонен';
      default:
        return status;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Заголовок модального окна */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold">Заказ #{order.id}</h2>
                {order.operator_order_number && (
                  <span className="px-2 py-1 bg-purple-200 text-purple-800 text-sm font-medium rounded-full">
                    #{order.operator_order_number}
                  </span>
                )}
              </div>
              <p className="text-blue-100 text-sm">{formatTime(order.created_at)}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Содержимое модального окна */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Левая колонка - Основная информация */}
            <div className="space-y-6">
              {/* Статус и тип заказа */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Статус заказа</h3>
                <div className="flex items-center space-x-3">
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(order.status)}`}>
                    {getStatusText(order.status)}
                  </span>
                  <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                    order.service_type === 'pickup' 
                      ? 'bg-orange-100 text-orange-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {order.service_type === 'pickup' ? '🍽️ Самовывоз' : '🚚 Доставка'}
                  </span>
                </div>
              </div>

              {/* Информация о клиенте */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Информация о клиенте</h3>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 font-bold text-lg">
                        {order.user_info?.first_name?.charAt(0) || '?'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {order.user_info?.first_name || 'Неизвестный'} {order.user_info?.last_name || ''}
                      </p>
                      <p className="text-sm text-gray-600">@{order.user_info?.username || 'нет username'}</p>
                    </div>
                  </div>
                  
                  <div className="ml-15 space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-gray-500">📞</span>
                      <span className="text-gray-900">{order.phone}</span>
                    </div>
                    
                    {order.address_info && (
                      <div className="flex items-start space-x-2">
                        <span className="text-gray-500 mt-1">📍</span>
                        <div>
                          <p className="text-gray-900 font-medium">Адрес доставки:</p>
                          <p className="text-gray-700">{order.address_info.full_address}</p>
                          <p className="text-sm text-gray-500">{order.address_info.city}</p>
                          {order.address_info.phone_number && (
                            <p className="text-sm text-gray-500">📞 {order.address_info.phone_number}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Информация о ресторане */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Ресторан</h3>
                <div className="space-y-2">
                  <p className="font-semibold text-gray-900">{order.restaurant_info.name}</p>
                  <p className="text-gray-700">{order.restaurant_info.address}</p>
                  <p className="text-gray-600">{order.restaurant_info.city}</p>
                  {order.restaurant_info.phone && (
                    <p className="text-gray-600">📞 {order.restaurant_info.phone}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Правая колонка - Детали заказа */}
            <div className="space-y-6">
              {/* Список блюд */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Состав заказа</h3>
                <div className="space-y-3">
                  {order.items_details && order.items_details.length > 0 ? (
                    order.items_details.map((item, index) => (
                      <div key={index} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{item.menu_item_name || 'Товар'}</h4>
                            {item.size_option_name && (
                              <p className="text-sm text-gray-600">Размер: {item.size_option_name}</p>
                            )}
                            <p className="text-sm text-gray-600">Количество: {item.quantity}</p>
                          </div>
                          <span className="font-bold text-gray-900">
                            {(item.total_price || 0).toLocaleString()} сум
                          </span>
                        </div>
                        
                        {item.add_ons_names && item.add_ons_names.length > 0 && (
                          <div className="mt-2">
                            <p className="text-sm font-medium text-gray-700 mb-1">Дополнения:</p>
                            <div className="flex flex-wrap gap-1">
                              {item.add_ons_names.map((addon, addonIndex) => (
                                <span 
                                  key={addonIndex}
                                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                >
                                  {addon}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <div className="text-gray-500 mb-2">⏳ Загрузка товаров...</div>
                      <p className="text-sm text-gray-400">Товары будут отображены после загрузки</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Финансовая информация */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Финансовая информация</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Сумма заказа:</span>
                    <span className="font-medium">
                      {order.total_price && parseFloat(order.total_price) > 0 
                        ? `${Number(order.total_price).toLocaleString()} сум`
                        : '⏳ Загрузка...'
                      }
                    </span>
                  </div>
                  
                  {(order.delivery_fee || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Стоимость доставки:</span>
                      <span className="font-medium">{(order.delivery_fee || 0).toLocaleString()} сум</span>
                    </div>
                  )}
                  
                  {(order.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Скидка:</span>
                      <span className="font-medium">-{(order.discount_amount || 0).toLocaleString()} сум</span>
                    </div>
                  )}
                  
                  {order.promo_code_info && (
                    <div className="flex justify-between text-blue-600">
                      <span>Промокод ({order.promo_code_info.code}):</span>
                      <span className="font-medium">-{(order.discount_amount || 0).toLocaleString()} сум</span>
                    </div>
                  )}
                  
                  <hr className="my-2" />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Итого к оплате:</span>
                    <span className="text-green-600">
                      {order.final_price && parseFloat(order.final_price) > 0 
                        ? `${Number(order.final_price).toLocaleString()} сум`
                        : order.total_price && parseFloat(order.total_price) > 0
                          ? `${Number(order.total_price).toLocaleString()} сум`
                          : '⏳ Загрузка...'
                      }
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2 mt-3">
                    <span className="text-lg">
                      {order.payment_method === 'cash' ? '💵' : 
                       order.payment_method === 'card' ? '💳' : '🌐'}
                    </span>
                    <span className="font-medium">
                      {order.payment_method === 'cash' ? 'Оплата наличными' : 
                       order.payment_method === 'card' ? 'Оплата картой' : 'Онлайн оплата'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Заметки */}
              {order.notes && (
                <div className="bg-yellow-50 rounded-lg p-4 border-l-4 border-yellow-400">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Заметки к заказу</h3>
                  <p className="text-gray-700">{order.notes}</p>
                </div>
              )}

              {/* Дополнительная информация */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Дополнительная информация</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ID заказа:</span>
                    <span className="font-mono">{order.id}</span>
                  </div>
                  {order.operator_order_number && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Номер очереди:</span>
                      <span className="font-medium text-purple-600">#{order.operator_order_number}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Создан:</span>
                    <span>{formatTime(order.created_at)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Обновлен:</span>
                    <span>{formatTime(order.updated_at)}</span>
                  </div>
                  {order.cashier_processing_status && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Статус обработки:</span>
                      <span className="font-medium">{order.cashier_processing_status}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Футер модального окна */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
