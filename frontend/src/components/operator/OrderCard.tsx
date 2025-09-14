import React, { useState } from 'react';
import type { OrderForOperator, OrderStatus } from '../../types/operator';
import { operatorOrdersApi } from '../../api/operatorApi';
import { OrderDetailsModal } from './OrderDetailsModal';
import { EditOrderModal } from './EditOrderModal';
import { ConfirmOrderModal } from './ConfirmOrderModal';
import { RejectOrderModal } from './RejectOrderModal';

interface OrderCardProps {
  order: OrderForOperator;
  onUpdate: (order: OrderForOperator) => void;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, onUpdate }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
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
      case 'in_transit': return 'bg-cyan-500';
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
      case 'in_transit': return 'В пути';
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
          </div>
        </div>

        {/* Основная информация о клиенте - упрощенная версия */}
        <div className="space-y-3 mb-4">
          {/* Клиент и телефон */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-semibold">
                👤 {order.user_info.first_name} {order.user_info.last_name}
              </p>
              <p className="text-gray-400 text-sm">
                📱 {order.address_info.phone_number}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white text-lg font-bold">
                {new Intl.NumberFormat('ru-RU').format(order.total_price)} сум
              </p>
              <div className="flex items-center space-x-1 mt-1">
                <span className="text-sm">{getPaymentMethodIcon(order.payment_method)}</span>
                <span className="text-gray-400 text-xs">{getPaymentMethodText(order.payment_method)}</span>
              </div>
            </div>
          </div>
          
          {/* Адрес и кнопка карты */}
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-gray-300 text-sm">
                📍 {order.address_info.full_address}
              </p>
              <p className="text-gray-400 text-xs">
                🏙️ {order.address_info.city}
              </p>
            </div>
            <button
              onClick={() => {
                const { latitude, longitude } = order.address_info;
                const yandexMapUrl = `https://yandex.ru/maps/?pt=${longitude},${latitude}&z=16&l=map`;
                window.open(yandexMapUrl, '_blank');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 ml-3"
              title="Открыть на Яндекс.Картах"
            >
              <span>🗺️</span>
              <span>Карта</span>
            </button>
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

          {/* Кнопка изменения заказа */}
          {order.status !== 'completed' && order.status !== 'cancelled' && order.status !== 'rejected' && (
            <button
              onClick={() => setShowEditModal(true)}
              disabled={isLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {isLoading ? '...' : '✏️ Изменить'}
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

      {/* Модальное окно редактирования заказа */}
      <EditOrderModal
        order={order}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={onUpdate}
        isLoading={isLoading}
      />
    </>
  );
};
