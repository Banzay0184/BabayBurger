import React, { useState } from 'react';
import type { OrderForOperator } from '../../types/operator';

interface ConfirmOrderModalProps {
  order: OrderForOperator;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customerName?: string) => void;
  isLoading: boolean;
}

export const ConfirmOrderModal: React.FC<ConfirmOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onConfirm,
  isLoading
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [customerName, setCustomerName] = useState(
    `${order.user_info.first_name} ${order.user_info.last_name || ''}`.trim()
  );

  if (!isOpen) return null;

  // Форматирование цены
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум';
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-white">Подтвердить заказ</h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white text-2xl transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Иконка */}
        <div className="text-center mb-6">
          <div className="text-6xl mb-4">✅</div>
          <p className="text-gray-300 text-lg">
            Вы уверены, что хотите подтвердить этот заказ?
          </p>
        </div>

        {/* Информация о заказе */}
        <div className="bg-gray-700 rounded-lg p-6 mb-6">
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Номер заказа:</span>
              <span className="text-white font-semibold">#{order.id}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Клиент:</span>
              <div className="flex items-center space-x-2">
                {isEditingName ? (
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={isLoading}
                    className="bg-gray-600 text-white px-2 py-1 rounded text-sm border border-gray-500 focus:border-blue-500 focus:outline-none"
                    placeholder="Имя клиента"
                  />
                ) : (
                  <span className="text-white font-semibold">
                    {customerName}
                  </span>
                )}
                <button
                  onClick={() => setIsEditingName(!isEditingName)}
                  disabled={isLoading}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors disabled:opacity-50"
                >
                  {isEditingName ? '✓' : '✏️'}
                </button>
              </div>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Тип заказа:</span>
              <span className="text-white font-semibold">
                {order.service_type === 'delivery' ? '🚚 Доставка' : '🏪 Самовывоз'}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Сумма:</span>
              <span className="text-white font-semibold text-lg">
                {formatPrice(order.final_price)}
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-gray-400">Дата создания:</span>
              <span className="text-white font-semibold">
                {formatDate(order.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Предупреждение */}
        <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <span className="text-blue-400 text-xl">ℹ️</span>
            <p className="text-blue-300 text-sm">
              После подтверждения заказ перейдет в статус "Подтвержден клиентом" 
              и будет передан на кухню для приготовления.
            </p>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-xl text-lg font-medium transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={() => onConfirm(customerName)}
            disabled={isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl text-lg font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Подтверждаем...' : '✅ Подтвердить заказ'}
          </button>
        </div>
      </div>
    </div>
  );
};
