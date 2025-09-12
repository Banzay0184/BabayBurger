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

  // Получение иконки ресторана
  const getRestaurantIcon = (): string => {
    return '🏪';
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
      
      // Оптимистичное обновление - сразу обновляем статус заказа
      const optimisticOrder = {
        ...order,
        status: 'preparing' as OrderStatus,
        updated_at: new Date().toISOString()
      };
      onUpdate(optimisticOrder);
      setShowConfirmModal(false);
      
      console.log('⚡ Optimistic update: order confirmed, status changed to preparing');
      
      // Выполняем API вызов
      const result = await operatorOrdersApi.confirmOrder(order.id, customerName, restaurantId);
      
      // Обновляем с реальными данными с сервера
      onUpdate(result.order);
      
      console.log('✅ Заказ подтвержден и передан на кухню');
      
    } catch (error) {
      console.error('Ошибка подтверждения заказа:', error);
      alert('Ошибка подтверждения заказа');
      
      // В случае ошибки откатываем изменения
      onUpdate(order);
    } finally {
      setIsLoading(false);
    }
  };

  // Отклонить заказ
  const handleRejectOrder = async (reason: string, customerName?: string) => {
    try {
      setIsLoading(true);
      
      // Оптимистичное обновление - сразу обновляем статус заказа
      const optimisticOrder = {
        ...order,
        status: 'rejected' as OrderStatus,
        updated_at: new Date().toISOString()
      };
      onUpdate(optimisticOrder);
      setShowRejectModal(false);
      
      console.log('⚡ Optimistic update: order rejected, status changed to rejected');
      
      // Выполняем API вызов
      const result = await operatorOrdersApi.rejectOrder(order.id, reason, customerName);
      
      // Обновляем с реальными данными с сервера
      onUpdate(result.order);
      
    } catch (error) {
      console.error('Ошибка отклонения заказа:', error);
      alert('Ошибка отклонения заказа');
      
      // В случае ошибки откатываем изменения
      onUpdate(order);
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
      <div className="bg-gray-700 rounded-xl p-4 border-l-4 border-l-blue-500 hover:bg-gray-600 transition-colors">
        {/* Заголовок карточки - компактная планшетная версия */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getServiceTypeIcon(order.service_type)}</span>
            <div>
              <h3 className="text-white font-bold text-lg">
                Заказ #{order.id}
                {order.operator_order_number && (
                  <span className="text-blue-400 ml-1">(№{order.operator_order_number})</span>
                )}
              </h3>
              <p className="text-gray-400 text-sm">
                {getServiceTypeText(order.service_type)} • {formatDate(order.created_at)}
              </p>
            </div>
          </div>
          
          {/* Статус и быстрые действия - компактная версия */}
          <div className="flex items-center space-x-2">
            <span className={`${getStatusColor(order.status)} text-white text-xs px-3 py-1 rounded-full font-medium`}>
              {getStatusText(order.status)}
            </span>
            {order.operator_called && (
              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                ✓
              </span>
            )}
          </div>
        </div>

        {/* Информация о клиенте - компактная планшетная версия */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-gray-300 text-sm">
              <span className="font-semibold">👤 Клиент:</span> {order.user_info.first_name} {order.user_info.last_name}
            </p>
            <p className="text-gray-400 text-sm">
              <span className="font-semibold">📱 Телефон:</span> {order.address_info.phone_number}
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <p className="text-gray-300 text-sm truncate">
                <span className="font-semibold">📍 Адрес:</span> {order.address_info.full_address}
              </p>
              <button
                onClick={() => {
                  const { latitude, longitude } = order.address_info;
                  const yandexMapUrl = `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=16&l=map`;
                  window.open(yandexMapUrl, '_blank');
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors flex items-center space-x-1 ml-2"
                title="Открыть на карте"
              >
                <span>🗺️</span>
              </button>
            </div>
            <p className="text-gray-400 text-sm">
              <span className="font-semibold">🏙️ Город:</span> {order.address_info.city}
            </p>
          </div>

          <div className="space-y-1">
            {order.delivery_zone_info && (
              <p className="text-gray-400 text-sm">
                <span className="font-semibold">🌍 Зона:</span> {order.delivery_zone_info.name}
              </p>
            )}
            {order.restaurant_info && (
              <p className="text-gray-400 text-sm">
                <span className="font-semibold">{getRestaurantIcon()} Ресторан:</span> {order.restaurant_info.name}
              </p>
            )}
            <div className="flex items-center space-x-1">
              <span className="text-sm">{getPaymentMethodIcon(order.payment_method)}</span>
              <span className="text-gray-300 text-sm font-medium">{getPaymentMethodText(order.payment_method)}</span>
            </div>
          </div>
        </div>


        {/* Заметки - компактная версия */}
        {(order.notes || order.operator_notes) && (
          <div className="mb-4 space-y-2">
            {order.notes && (
              <div className="p-3 bg-gray-600 rounded-lg">
                <p className="text-gray-300 text-sm">
                  <span className="font-semibold">💬 Клиент:</span> {order.notes}
                </p>
              </div>
            )}
            {order.operator_notes && (
              <div className="p-3 bg-blue-900/30 border border-blue-600/50 rounded-lg">
                <p className="text-blue-300 text-sm">
                  <span className="font-semibold">📝 Оператор:</span> {order.operator_notes}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Действия оператора - компактная планшетная версия */}
        <div className="flex flex-wrap gap-2">
          {/* Кнопка деталей */}
          <button
            onClick={() => setShowDetails(true)}
            className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            📋 Детали
          </button>

          {/* Действия в зависимости от статуса */}
          {order.status === 'pending' && (
            <>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : '✅ Подтвердить'}
              </button>
              
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={isLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isLoading ? '...' : '❌ Отклонить'}
              </button>
            </>
          )}

          {/* Кнопка звонка для любого статуса */}
          {!order.operator_called && order.status !== 'completed' && order.status !== 'cancelled' && (
            <button
              onClick={handleCallCustomer}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? '...' : '📞 Звонить'}
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
