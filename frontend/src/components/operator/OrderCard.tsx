import React, { useState } from 'react';
import type { OrderForOperator, OrderStatus, OperatorCallResult } from '../../types/operator';
import { operatorOrdersApi } from '../../api/operatorApi';
import { OrderDetailsModal } from './OrderDetailsModal';
import { ConfirmOrderModal } from './ConfirmOrderModal';
import { RejectOrderModal } from './RejectOrderModal';

interface OrderCardProps {
  order: OrderForOperator;
  onUpdate: (order: OrderForOperator) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showCallResultModal, setShowCallResultModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  // Получение цвета статуса
  const getStatusColor = (status: OrderStatus): string => {
    switch (status) {
      case 'pending': return 'bg-orange-500';
      case 'new': return 'bg-yellow-500';
      case 'assigned': return 'bg-blue-500';
      case 'operator_processing': return 'bg-purple-500';
      case 'confirmed': return 'bg-green-500';
      case 'preparing': return 'bg-indigo-500';
      case 'ready_for_delivery': return 'bg-teal-500';
      case 'delivering': return 'bg-orange-500';
      case 'completed': return 'bg-green-600';
      case 'cancelled': return 'bg-red-500';
      case 'rejected': return 'bg-red-600';
      default: return 'bg-gray-500';
    }
  };

  // Получение текста статуса
  const getStatusText = (status: OrderStatus): string => {
    switch (status) {
      case 'pending': return 'Ожидает обработки';
      case 'new': return 'Новый';
      case 'assigned': return 'Назначен';
      case 'operator_processing': return 'Обрабатывается';
      case 'confirmed': return 'Подтвержден';
      case 'preparing': return 'Готовится';
      case 'ready_for_delivery': return 'Готов к доставке';
      case 'delivering': return 'Доставляется';
      case 'completed': return 'Завершен';
      case 'cancelled': return 'Отменен';
      case 'rejected': return 'Отклонен';
      default: return status;
    }
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



  // Звонить клиенту
  const handleCallCustomer = async () => {
    try {
      setIsLoading(true);
      const result = await operatorOrdersApi.callCustomer(order.id);
      onUpdate(result.order);
    } catch (error) {
      console.error('Ошибка отметки звонка:', error);
      alert('Ошибка отметки звонка');
    } finally {
      setIsLoading(false);
    }
  };

  // Подтвердить заказ
  const handleConfirmOrder = async (customerName?: string, restaurantId?: number) => {
    try {
      setIsLoading(true);
      const result = await operatorOrdersApi.confirmOrder(order.id, customerName, restaurantId);
      
      // Заказ сразу исчезает из списка (не ждем WebSocket)
      onUpdate(result.order);
      setShowConfirmModal(false);
      
      console.log('✅ Заказ подтвержден и передан на кухню');
      
    } catch (error) {
      console.error('Ошибка подтверждения заказа:', error);
      alert('Ошибка подтверждения заказа');
    } finally {
      setIsLoading(false);
    }
  };

  // Отклонить заказ
  const handleRejectOrder = async (reason: string, customerName?: string) => {
    try {
      setIsLoading(true);
      const result = await operatorOrdersApi.rejectOrder(order.id, reason, customerName);
      onUpdate(result.order);
      setShowRejectModal(false);
    } catch (error) {
      console.error('Ошибка отклонения заказа:', error);
      alert('Ошибка отклонения заказа');
    } finally {
      setIsLoading(false);
    }
  };

  // Обновить результат звонка
  const handleUpdateCallResult = async (callResult: OperatorCallResult) => {
    try {
      setIsLoading(true);
      const result = await operatorOrdersApi.updateCallResult(order.id, {
        call_result: callResult
      });
      onUpdate(result.order);
      setShowCallResultModal(false);
    } catch (error) {
      console.error('Ошибка обновления результата звонка:', error);
      alert('Ошибка обновления результата звонка');
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

  return (
    <>
      <div className="bg-gray-700 rounded-xl p-6 border-l-4 border-l-blue-500 hover:bg-gray-600 transition-colors">
        {/* Заголовок карточки - планшетная версия */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center space-x-4">
            <span className="text-4xl">{getServiceTypeIcon(order.service_type)}</span>
            <div>
              <h3 className="text-white font-bold text-xl">
                Заказ #{order.id}
                {order.operator_order_number && (
                  <span className="text-blue-400 ml-2">(№{order.operator_order_number})</span>
                )}
              </h3>
              <p className="text-gray-400 text-lg">
                {getServiceTypeText(order.service_type)} • {getPaymentMethodIcon(order.payment_method)} {getPaymentMethodText(order.payment_method)} • {formatDate(order.created_at)}
              </p>
            </div>
          </div>
          
          {/* Статус - планшетная версия */}
          <div className="flex items-center space-x-3">
            <span className={`${getStatusColor(order.status)} text-white text-sm px-4 py-2 rounded-full font-medium`}>
              {getStatusText(order.status)}
            </span>
            {order.operator_called && (
              <span className="bg-green-500 text-white text-sm px-4 py-2 rounded-full font-medium">
                Звонили
              </span>
            )}
          </div>
        </div>

        {/* Информация о клиенте - планшетная версия */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="space-y-3">
            <p className="text-gray-300 text-lg">
              <span className="font-semibold">Клиент:</span> {order.user_info.first_name} {order.user_info.last_name}
            </p>
            <p className="text-gray-400 text-lg">
              <span className="font-semibold">Telegram:</span> @{order.user_info.username}
            </p>
            <p className="text-gray-400 text-lg">
              <span className="font-semibold">Телефон:</span> {order.address_info.phone_number}
            </p>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-gray-300 text-lg">
                <span className="font-semibold">Адрес:</span> {order.address_info.full_address}
              </p>
              <button
                onClick={() => {
                  const { latitude, longitude } = order.address_info;
                  const yandexMapUrl = `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=16&l=map`;
                  window.open(yandexMapUrl, '_blank');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm font-medium transition-colors flex items-center space-x-1"
                title="Открыть на карте"
              >
                <span>🗺️</span>
                <span>Карта</span>
              </button>
            </div>
            <p className="text-gray-400 text-lg">
              <span className="font-semibold">Город:</span> {order.address_info.city}
            </p>
            {order.delivery_zone_info && (
              <p className="text-gray-400 text-lg">
                <span className="font-semibold">Зона:</span> {order.delivery_zone_info.name}
              </p>
            )}
          </div>
        </div>

        {/* Детали заказа - планшетная версия */}
        <div className="mb-6">
          <p className="text-gray-300 text-lg mb-3">
            <span className="font-semibold">Позиции ({order.items_details.length}):</span>
          </p>
          <div className="space-y-2">
            {order.items_details.slice(0, 3).map((item, index) => (
              <p key={index} className="text-gray-400 text-lg">
                • {item.menu_item_name} x{item.quantity} - {formatPrice(item.total_price)}
              </p>
            ))}
            {order.items_details.length > 3 && (
              <p className="text-gray-500 text-lg">
                ... и еще {order.items_details.length - 3} позиций
              </p>
            )}
          </div>
        </div>

        {/* Цены - планшетная версия */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-lg">
          <div className="space-y-2">
            <p className="text-gray-400">Сумма заказа: <span className="text-white font-semibold">{formatPrice(order.total_price)}</span></p>
            {order.discount_amount > 0 && (
              <p className="text-green-400">Скидка: <span className="font-semibold">{formatPrice(order.discount_amount)}</span></p>
            )}
            <p className="text-gray-400">Доставка: <span className="text-white font-semibold">{formatPrice(order.delivery_fee)}</span></p>
          </div>
          <div className="text-right">
            <p className="text-gray-400">Итого: <span className="text-white font-bold text-2xl">{formatPrice(order.final_price)}</span></p>
          </div>
        </div>

        {/* Заметки - планшетная версия */}
        {order.notes && (
          <div className="mb-6 p-4 bg-gray-600 rounded-xl">
            <p className="text-gray-300 text-lg">
              <span className="font-semibold">Заметки клиента:</span> {order.notes}
            </p>
          </div>
        )}

        {order.operator_notes && (
          <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600/50 rounded-xl">
            <p className="text-blue-300 text-lg">
              <span className="font-semibold">Заметки оператора:</span> {order.operator_notes}
            </p>
          </div>
        )}

        {/* Действия оператора - планшетная версия */}
        <div className="flex flex-wrap gap-4">
          {/* Кнопка деталей */}
          <button
            onClick={() => setShowDetails(true)}
            className="bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-xl text-lg font-medium transition-colors"
          >
            Детали
          </button>

          {/* Действия в зависимости от статуса */}
          {order.status === 'pending' && (
            <>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : 'Подтвердить заказ'}
              </button>
              
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl text-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : 'Отклонить заказ'}
              </button>
            </>
          )}

          {/* Кнопка звонка для любого статуса */}
          {!order.operator_called && order.status !== 'completed' && order.status !== 'cancelled' && (
            <button
              onClick={handleCallCustomer}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-lg font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? '...' : 'Звонить клиенту'}
            </button>
          )}
        </div>
      </div>

      {/* Модальное окно деталей заказа */}
      {showDetails && (
        <OrderDetailsModal
          order={order}
          onClose={() => setShowDetails(false)}
          onUpdate={onUpdate}
        />
      )}

      {/* Модальное окно результата звонка - планшетная версия */}
      {showCallResultModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-8 max-w-lg w-full mx-4">
            <h3 className="text-white text-2xl font-bold mb-6 text-center">Результат звонка клиенту</h3>
            
            <div className="space-y-4 mb-8">
              <button
                onClick={() => handleUpdateCallResult('confirmed')}
                disabled={isLoading}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-6 py-4 rounded-xl text-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : '✅ Подтвердил заказ'}
              </button>
              
              <button
                onClick={() => handleUpdateCallResult('modified')}
                disabled={isLoading}
                className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-4 rounded-xl text-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : '✏️ Изменил заказ'}
              </button>
              
              <button
                onClick={() => handleUpdateCallResult('cancelled')}
                disabled={isLoading}
                className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-xl text-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : '❌ Отменил заказ'}
              </button>
              
              <button
                onClick={() => handleUpdateCallResult('unreachable')}
                disabled={isLoading}
                className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-4 rounded-xl text-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : '📞 Не дозвонились'}
              </button>
              
              <button
                onClick={() => handleUpdateCallResult('wrong_number')}
                disabled={isLoading}
                className="w-full bg-red-800 hover:bg-red-900 text-white px-6 py-4 rounded-xl text-lg font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : '📱 Неверный номер'}
              </button>
            </div>
            
            <button
              onClick={() => setShowCallResultModal(false)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white px-6 py-4 rounded-xl text-lg font-medium transition-colors"
            >
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения заказа */}
      <ConfirmOrderModal
        order={order}
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmOrder}
        isLoading={isLoading}
      />

      {/* Модальное окно отклонения заказа */}
      <RejectOrderModal
        order={order}
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        onReject={handleRejectOrder}
        isLoading={isLoading}
      />
    </>
  );
};
