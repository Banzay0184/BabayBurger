import React, { useState } from 'react';
import type { OrderForOperator } from '../../types/operator';
import { operatorOrdersApi } from '../../api/operatorApi';

interface OrderDetailsModalProps {
  order: OrderForOperator;
  onClose: () => void;
  onUpdate: (order: OrderForOperator) => void;
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  order,
  onClose,
  onUpdate
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [notes, setNotes] = useState(order.operator_notes || '');
  const [showNotesForm, setShowNotesForm] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [customerName, setCustomerName] = useState(
    `${order.user_info.first_name} ${order.user_info.last_name || ''}`.trim()
  );

  // Добавление заметок к заказу
  const handleAddNotes = async () => {
    if (!notes.trim()) return;

    try {
      setIsLoading(true);
      const result = await operatorOrdersApi.addNotes(order.id, { notes });
      onUpdate(result.order);
      setShowNotesForm(false);
    } catch (error) {
      console.error('Ошибка добавления заметок:', error);
      alert('Ошибка добавления заметок');
    } finally {
      setIsLoading(false);
    }
  };

  // Обновление имени клиента
  const handleUpdateCustomerName = async () => {
    if (!customerName.trim()) return;

    try {
      setIsLoading(true);
      const result = await operatorOrdersApi.updateCustomerName(order.id, customerName.trim());
      onUpdate(result.order);
      setIsEditingName(false);
    } catch (error) {
      console.error('Ошибка обновления имени клиента:', error);
      alert('Ошибка обновления имени клиента');
    } finally {
      setIsLoading(false);
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Форматирование цены
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум';
  };

  // Получение иконки типа заказа
  const getServiceTypeIcon = (serviceType: string): string => {
    return serviceType === 'delivery' ? '🚚' : '🏪';
  };

  // Получение текста типа заказа
  const getServiceTypeText = (serviceType: string): string => {
    return serviceType === 'delivery' ? 'Доставка' : 'Самовывоз';
  };

  // Получение иконки способа оплаты
  const getPaymentMethodIcon = (paymentMethod: string): string => {
    switch (paymentMethod) {
      case 'cash': return '💵';
      case 'card': return '💳';
      case 'online': return '🌐';
      default: return '💰';
    }
  };

  // Получение текста способа оплаты
  const getPaymentMethodText = (paymentMethod: string): string => {
    switch (paymentMethod) {
      case 'cash': return 'Наличными';
      case 'card': return 'Картой';
      case 'online': return 'Онлайн';
      default: return paymentMethod;
    }
  };

  // Получение иконки ресторана
  const getRestaurantIcon = (): string => {
    return '🏪';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Заголовок */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getServiceTypeIcon(order.service_type)}</span>
            <h2 className="text-xl font-semibold text-white">
              Заказ #{order.id} - {getServiceTypeText(order.service_type)} • {getPaymentMethodIcon(order.payment_method)} {getPaymentMethodText(order.payment_method)}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Содержимое */}
        <div className="overflow-y-auto max-h-[calc(90vh-140px)] p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Левая колонка - основная информация */}
            <div className="space-y-6">
              {/* Статус и время */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Статус заказа</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Текущий статус:</span>
                    <span className="text-white font-medium">{order.status_display}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Создан:</span>
                    <span className="text-gray-300">{formatDate(order.created_at)}</span>
                  </div>
                  {order.delivery_time && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Время доставки:</span>
                      <span className="text-gray-300">{formatDate(order.delivery_time)}</span>
                    </div>
                  )}
                  {order.assigned_at && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Назначен оператору:</span>
                      <span className="text-gray-300">{formatDate(order.assigned_at)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Информация о клиенте */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Информация о клиенте</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Имя:</span>
                    <div className="flex items-center space-x-2">
                      {isEditingName ? (
                        <input
                          type="text"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          disabled={isLoading}
                          className="bg-gray-600 text-white px-3 py-1 rounded text-sm border border-gray-500 focus:border-blue-500 focus:outline-none"
                          placeholder="Имя клиента"
                        />
                      ) : (
                        <span className="text-white">
                          {customerName}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          if (isEditingName) {
                            handleUpdateCustomerName();
                          } else {
                            setIsEditingName(true);
                          }
                        }}
                        disabled={isLoading}
                        className="text-blue-400 hover:text-blue-300 text-sm transition-colors disabled:opacity-50"
                      >
                        {isEditingName ? '✓' : '✏️'}
                      </button>
                      {isEditingName && (
                        <button
                          onClick={() => {
                            setIsEditingName(false);
                            setCustomerName(`${order.user_info.first_name} ${order.user_info.last_name || ''}`.trim());
                          }}
                          disabled={isLoading}
                          className="text-red-400 hover:text-red-300 text-sm transition-colors disabled:opacity-50"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Telegram:</span>
                    <span className="text-blue-400">@{order.user_info.username}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">ID:</span>
                    <span className="text-gray-300">{order.user_info.telegram_id}</span>
                  </div>
                </div>
              </div>

              {/* Адрес доставки */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white font-medium">
                    {order.address_info ? 'Адрес доставки' : 'Информация о заказе'}
                  </h3>
                  {order.address_info && (
                    <button
                      onClick={() => {
                        const { latitude, longitude } = order.address_info!;
                        const yandexMapUrl = `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=16&l=map`;
                        window.open(yandexMapUrl, '_blank');
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center space-x-1"
                    >
                      <span>🗺️</span>
                      <span>Карта</span>
                    </button>
                  )}
                </div>
                <div className="space-y-2">
                  {order.address_info ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Адрес:</span>
                        <span className="text-white text-right max-w-xs">{order.address_info.full_address}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Город:</span>
                        <span className="text-gray-300">{order.address_info.city}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Телефон:</span>
                        <span className="text-green-400">{order.address_info.phone_number}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Тип заказа:</span>
                      <span className="text-white">🏪 Самовывоз</span>
                    </div>
                  )}
                  {order.delivery_zone_info && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Зона доставки:</span>
                      <span className="text-gray-300">{order.delivery_zone_info.name}</span>
                    </div>
                  )}
                  {order.restaurant_info && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">{getRestaurantIcon()} Ресторан:</span>
                      <span className="text-gray-300">{order.restaurant_info.name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Правая колонка - детали заказа */}
            <div className="space-y-6">
              {/* Позиции заказа */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">
                  Позиции заказа ({order.items_details.length})
                </h3>
                <div className="space-y-3">
                  {order.items_details.map((item, index) => (
                    <div key={index} className="border-b border-gray-600 pb-2 last:border-b-0">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-white font-medium">{item.menu_item_name}</span>
                        <span className="text-green-400 font-medium">
                          {formatPrice(item.total_price)}
                        </span>
                      </div>
                      <div className="text-gray-400 text-sm">
                        <span>Количество: {item.quantity}</span>
                        {item.size_option_name && (
                          <span className="ml-2">• Размер: {item.size_option_name}</span>
                        )}
                        {item.add_ons_names.length > 0 && (
                          <span className="ml-2">• Дополнения: {item.add_ons_names.join(', ')}</span>
                        )}
                      </div>
                      <div className="text-gray-500 text-xs">
                        Цена за единицу: {formatPrice(item.menu_item_price)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Финансовая информация */}
              <div className="bg-gray-700 rounded-lg p-4">
                <h3 className="text-white font-medium mb-3">Финансовая информация</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Сумма заказа:</span>
                    <span className="text-white">{formatPrice(order.total_price)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Скидка:</span>
                      <span className="text-green-400">-{formatPrice(order.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-400">Стоимость доставки:</span>
                    <span className="text-white">{formatPrice(order.delivery_fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Способ оплаты:</span>
                    <span className="text-white flex items-center space-x-1">
                      <span>{getPaymentMethodIcon(order.payment_method)}</span>
                      <span>{getPaymentMethodText(order.payment_method)}</span>
                    </span>
                  </div>
                  <div className="border-t border-gray-600 pt-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-white font-medium">Итого к оплате:</span>
                      <span className="text-white font-bold text-lg">{formatPrice(order.final_price)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Заметки */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-white font-medium">Заметки</h3>
                  <button
                    onClick={() => setShowNotesForm(!showNotesForm)}
                    className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                  >
                    {showNotesForm ? 'Отмена' : 'Добавить'}
                  </button>
                </div>
                
                {showNotesForm ? (
                  <div className="space-y-3">
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Введите заметки к заказу..."
                      className="w-full p-3 bg-gray-600 border border-gray-500 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={3}
                    />
                    <div className="flex space-x-2">
                      <button
                        onClick={handleAddNotes}
                        disabled={isLoading || !notes.trim()}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                      >
                        {isLoading ? 'Сохранение...' : 'Сохранить'}
                      </button>
                      <button
                        onClick={() => {
                          setShowNotesForm(false);
                          setNotes(order.operator_notes || '');
                        }}
                        className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    {order.operator_notes ? (
                      <p className="text-gray-300">{order.operator_notes}</p>
                    ) : (
                      <p className="text-gray-500 italic">Заметок нет</p>
                    )}
                  </div>
                )}
              </div>

              {/* Заметки клиента */}
              {order.notes && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-white font-medium mb-3">Заметки клиента</h3>
                  <p className="text-gray-300">{order.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Нижняя панель */}
        <div className="p-6 border-t border-gray-700 bg-gray-800">
          <div className="flex justify-between items-center">
            <div className="text-gray-400 text-sm">
              Заказ создан: {formatDate(order.created_at)}
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
