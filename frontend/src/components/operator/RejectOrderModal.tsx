import React, { useState } from 'react';
import type { OrderForOperator } from '../../types/operator';

interface RejectOrderModalProps {
  order: OrderForOperator;
  isOpen: boolean;
  onClose: () => void;
  onReject: (reason: string, customerName?: string) => void;
  isLoading: boolean;
}

export const RejectOrderModal: React.FC<RejectOrderModalProps> = ({
  order,
  isOpen,
  onClose,
  onReject,
  isLoading
}) => {
  const [reason, setReason] = useState('');
  const [selectedReason, setSelectedReason] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [customerName, setCustomerName] = useState(
    `${order.user_info.first_name} ${order.user_info.last_name || ''}`.trim()
  );

  if (!isOpen) return null;

  // Форматирование цены
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' сум';
  };

  // Форматирование даты (не используется)
  // const _formatDate = (dateString: string): string => {
  //   const date = new Date(dateString);
  //   return date.toLocaleString('ru-RU', {
  //     day: '2-digit',
  //     month: '2-digit',
  //     year: 'numeric',
  //     hour: '2-digit',
  //     minute: '2-digit'
  //   });
  // };

  // Предустановленные причины отклонения
  const predefinedReasons = [
    'Клиент не отвечает на звонки',
    'Неправильный адрес доставки',
    'Клиент отменил заказ',
    'Недоступные позиции в меню',
    'Проблемы с оплатой',
    'Адрес вне зоны доставки',
    'Другая причина'
  ];

  const handleReasonSelect = (predefinedReason: string) => {
    setSelectedReason(predefinedReason);
    if (predefinedReason !== 'Другая причина') {
      setReason(predefinedReason);
    } else {
      setReason('');
    }
  };

  const handleSubmit = () => {
    const finalReason = reason.trim() || selectedReason || 'Отклонен оператором';
    onReject(finalReason, customerName);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Отклонить заказ #{order.id}</h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white text-xl transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Краткая информация о заказе */}
        <div className="bg-gray-700 rounded-lg p-4 mb-4">
          <div className="flex justify-between items-center">
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                {isEditingName ? (
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    disabled={isLoading}
                    className="bg-gray-600 text-white px-2 py-1 rounded text-sm border border-gray-500 focus:border-blue-500 focus:outline-none flex-1"
                    placeholder="Имя клиента"
                  />
                ) : (
                  <p className="text-white font-semibold">
                    {customerName}
                  </p>
                )}
                <button
                  onClick={() => setIsEditingName(!isEditingName)}
                  disabled={isLoading}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors disabled:opacity-50"
                >
                  {isEditingName ? '✓' : '✏️'}
                </button>
              </div>
              <p className="text-gray-400 text-sm">
                {order.service_type === 'delivery' ? '🚚 Доставка' : '🏪 Самовывоз'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-white font-bold text-lg">
                {formatPrice(order.final_price)}
              </p>
            </div>
          </div>
        </div>

        {/* Причина отклонения */}
        <div className="mb-4">
          <label className="block text-gray-300 text-sm font-semibold mb-2">
            Причина отклонения:
          </label>
          
          {/* Предустановленные причины - компактно */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {predefinedReasons.slice(0, 6).map((predefinedReason) => (
              <button
                key={predefinedReason}
                onClick={() => handleReasonSelect(predefinedReason)}
                disabled={isLoading}
                className={`text-left p-2 rounded-lg text-xs transition-colors disabled:opacity-50 ${
                  selectedReason === predefinedReason
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {predefinedReason}
              </button>
            ))}
          </div>

          {/* Поле для произвольной причины */}
          {selectedReason === 'Другая причина' && (
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={isLoading}
              placeholder="Укажите причину отклонения..."
              className="w-full p-2 bg-gray-700 text-white rounded-lg border border-gray-600 focus:border-red-500 focus:outline-none resize-none text-sm"
              rows={2}
            />
          )}
        </div>

        {/* Предупреждение - компактно */}
        <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3 mb-4">
          <div className="flex items-center space-x-2">
            <span className="text-red-400 text-sm">⚠️</span>
            <p className="text-red-300 text-xs">
              Это действие нельзя отменить!
            </p>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={isLoading || (!reason && !selectedReason)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Отклоняем...' : '❌ Отклонить'}
          </button>
        </div>
      </div>
    </div>
  );
};
