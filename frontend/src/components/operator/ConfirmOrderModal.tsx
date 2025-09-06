import React, { useState, useEffect } from 'react';
import type { OrderForOperator } from '../../types/operator';
import { operatorOrdersApi } from '../../api/operatorApi';

interface Restaurant {
  id: number;
  name: string;
  city: string;
  address: string;
}

interface ConfirmOrderModalProps {
  order: OrderForOperator;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (customerName?: string, restaurantId?: number) => void;
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
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState<number | null>(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [isChangingRestaurant, setIsChangingRestaurant] = useState(false);
  const [restaurantsError, setRestaurantsError] = useState<string | null>(null);

  // Загружаем рестораны при открытии модального окна
  useEffect(() => {
    if (isOpen && restaurants.length === 0 && order.service_type === 'delivery') {
      loadRestaurants();
    } else if (isOpen && order.service_type === 'pickup' && order.restaurant_info && !isChangingRestaurant) {
      // Для самовывоза используем ресторан из заказа
      setSelectedRestaurantId(order.restaurant_info.id);
    }
  }, [isOpen, order.service_type, order.restaurant_info, isChangingRestaurant]);

  // Загружаем рестораны для самовывоза при изменении ресторана
  useEffect(() => {
    if (isChangingRestaurant && restaurants.length === 0) {
      loadRestaurants();
    }
  }, [isChangingRestaurant]);

  const loadRestaurants = async () => {
    try {
      setLoadingRestaurants(true);
      setRestaurantsError(null);
      console.log(`🔍 Загружаем рестораны для заказа #${order.id} (${order.service_type})`);
      
      // Передаем ID заказа для фильтрации ресторанов по зоне доставки
      const response = await operatorOrdersApi.getRestaurants(order.id);
      console.log('📦 Получены рестораны:', response.restaurants);
      
      setRestaurants(response.restaurants);
      
      // Автоматически выбираем первый ресторан
      if (response.restaurants.length > 0) {
        setSelectedRestaurantId(response.restaurants[0].id);
        console.log(`✅ Автоматически выбран ресторан: ${response.restaurants[0].name}`);
      } else {
        console.warn('⚠️ Рестораны не найдены');
        setRestaurantsError('Рестораны не найдены');
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки ресторанов:', error);
      setRestaurantsError('Ошибка загрузки ресторанов');
    } finally {
      setLoadingRestaurants(false);
    }
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-gray-800 rounded-xl p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h3 className="text-lg sm:text-xl font-bold text-white">Подтвердить заказ</h3>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-gray-400 hover:text-white text-lg sm:text-xl transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Иконка */}
        <div className="text-center mb-3 sm:mb-4">
          <div className="text-3xl sm:text-4xl mb-1 sm:mb-2">✅</div>
          <p className="text-gray-300 text-xs sm:text-sm">
            Вы уверены, что хотите подтвердить этот заказ?
          </p>
        </div>

        {/* Информация о заказе */}
        <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="space-y-1 sm:space-y-2">
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

        {/* Информация о ресторане */}
        <div className="bg-gray-700 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4">
          <h4 className="text-white font-semibold mb-1 sm:mb-2 flex items-center text-xs sm:text-sm">
            <span className="mr-1 sm:mr-2">🍽️</span>
            {order.service_type === 'pickup' ? 'Ресторан для самовывоза' : 'Выберите ресторан'}
          </h4>
          
          {order.service_type === 'pickup' ? (
            // Для самовывоза показываем информацию о ресторане
            <div className="space-y-2">
              {!isChangingRestaurant ? (
                // Показываем текущий ресторан
                <div>
                  {order.restaurant_info ? (
                    <div className="bg-gray-600 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="text-white font-medium">{order.restaurant_info.name}</div>
                          <div className="text-gray-300 text-sm">{order.restaurant_info.address}</div>
                          <div className="text-gray-400 text-xs">{order.restaurant_info.city}</div>
                          {order.restaurant_info.phone && (
                            <div className="text-gray-400 text-xs">📞 {order.restaurant_info.phone}</div>
                          )}
                        </div>
                        <button
                          onClick={() => setIsChangingRestaurant(true)}
                          disabled={isLoading}
                          className="text-blue-400 hover:text-blue-300 text-sm transition-colors disabled:opacity-50 ml-2"
                        >
                          ✏️ Изменить
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-red-400 text-sm">
                      ⚠️ Ресторан не указан для заказа на самовывоз
                    </div>
                  )}
                </div>
              ) : (
                // Показываем выбор ресторана
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-gray-400 text-xs">Выберите новый ресторан для самовывоза</p>
                    <button
                      onClick={() => {
                        setIsChangingRestaurant(false);
                        setSelectedRestaurantId(order.restaurant_info?.id || null);
                      }}
                      disabled={isLoading}
                      className="text-gray-400 hover:text-gray-300 text-sm transition-colors disabled:opacity-50"
                    >
                      ✕ Отмена
                    </button>
                  </div>
                  
                  {loadingRestaurants ? (
                    <div className="text-center py-4">
                      <div className="text-gray-400">Загрузка ресторанов...</div>
                    </div>
                  ) : restaurantsError ? (
                    <div className="text-center py-4">
                      <div className="text-red-400 text-sm mb-2">{restaurantsError}</div>
                      <button
                        onClick={loadRestaurants}
                        disabled={isLoading}
                        className="text-blue-400 hover:text-blue-300 text-sm transition-colors disabled:opacity-50"
                      >
                        🔄 Попробовать снова
                      </button>
                    </div>
                  ) : (
                    <select
                      value={selectedRestaurantId || ''}
                      onChange={(e) => setSelectedRestaurantId(Number(e.target.value))}
                      disabled={isLoading}
                      className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                    >
                      <option value="">Выберите ресторан</option>
                      {restaurants.map((restaurant) => (
                        <option key={restaurant.id} value={restaurant.id}>
                          {restaurant.name} - {restaurant.city}
                        </option>
                      ))}
                    </select>
                  )}
                  
                  {!selectedRestaurantId && !loadingRestaurants && !restaurantsError && (
                    <p className="text-red-400 text-sm mt-2">
                      ⚠️ Необходимо выбрать ресторан
                    </p>
                  )}
                </div>
              )}
            </div>
          ) : (
            // Для доставки показываем выбор ресторана
            <div>
              <p className="text-gray-400 text-xs mb-2 sm:mb-3">
                Показаны только рестораны, которые могут доставить в зону заказа
              </p>
              
              {loadingRestaurants ? (
                <div className="text-center py-4">
                  <div className="text-gray-400">Загрузка ресторанов...</div>
                </div>
              ) : (
                <select
                  value={selectedRestaurantId || ''}
                  onChange={(e) => setSelectedRestaurantId(Number(e.target.value))}
                  disabled={isLoading}
                  className="w-full bg-gray-600 text-white px-3 py-2 rounded-lg border border-gray-500 focus:border-blue-500 focus:outline-none text-sm"
                >
                  <option value="">Выберите ресторан</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant.id} value={restaurant.id}>
                      {restaurant.name} - {restaurant.city}
                    </option>
                  ))}
                </select>
              )}
              
              {!selectedRestaurantId && !loadingRestaurants && (
                <p className="text-red-400 text-sm mt-2">
                  ⚠️ Необходимо выбрать ресторан для подтверждения заказа
                </p>
              )}
            </div>
          )}
        </div>

        {/* Предупреждение */}
        <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-2 sm:p-3 mb-3 sm:mb-4">
          <div className="flex items-center space-x-1 sm:space-x-2">
            <span className="text-blue-400 text-xs sm:text-sm">ℹ️</span>
            <p className="text-blue-300 text-xs">
              После подтверждения заказ перейдет в статус "Готовится" 
              и будет передан на кухню для приготовления.
            </p>
          </div>
        </div>

        {/* Кнопки */}
        <div className="flex space-x-2 sm:space-x-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
          >
            Отмена
          </button>
          <button
            onClick={() => {
              if (order.service_type === 'pickup') {
                // Для самовывоза передаем ID ресторана (из заказа или выбранный)
                const restaurantId = isChangingRestaurant ? selectedRestaurantId : order.restaurant_info?.id;
                onConfirm(customerName, restaurantId || undefined);
              } else {
                // Для доставки передаем выбранный ресторан
                onConfirm(customerName, selectedRestaurantId || undefined);
              }
            }}
            disabled={
              isLoading || 
              (order.service_type === 'delivery' && !selectedRestaurantId) || 
              (order.service_type === 'pickup' && !order.restaurant_info && !isChangingRestaurant) ||
              (order.service_type === 'pickup' && isChangingRestaurant && !selectedRestaurantId)
            }
            className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? 'Подтверждаем...' : '✅ Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
};
