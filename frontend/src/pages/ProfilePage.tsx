import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoriteContext';
import { useClientWebSocket } from '../hooks/useClientWebSocket';
import { PageTransition } from '../components/common/PageTransition';

interface Order {
  id: number;
  total_price: string;
  status: string;
  service_type: string; // 'delivery' или 'pickup'
  created_at: string;
  address: string; // Backend возвращает полный адрес как строку
  delivery_fee?: string;
  discount_amount?: string;
  final_price?: string;
  promo_code?: {
    code: string;
    discount_percent: number;
  };
  items: Array<{
    menu_item_id: number;
    menu_item_name: string; // Backend возвращает menu_item_name
    quantity: number;
    price: string;
    total: string;
  }>;
}

interface ProfilePageProps {
  onClose: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({ onClose }) => {
  const { t } = useLanguage();
  const { state } = useAuth();
  const { favorites } = useFavorites();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all'); // Фильтр по статусу

  // WebSocket обработчики для real-time обновлений заказов
  const handleOrderStatusUpdate = useCallback((orderId: number, status: string, _statusDisplay: string, updatedAt: string) => {
    console.log('🔄 Статус заказа обновлен через WebSocket:', orderId, status);
    
    setOrders(prev => prev.map(order => 
      order.id === orderId 
        ? { ...order, status, updated_at: updatedAt }
        : order
    ));
  }, []);

  const handleOrderDetailsUpdate = useCallback((updatedOrder: any) => {
    console.log('📋 Детали заказа обновлены через WebSocket:', updatedOrder.id);
    
    setOrders(prev => prev.map(order => 
      order.id === updatedOrder.id ? updatedOrder : order
    ));
  }, []);

  // Инициализируем WebSocket для клиента
  const { isConnected, websocketFailed, retryWebSocket } = useClientWebSocket({
    onOrderStatusUpdate: handleOrderStatusUpdate,
    onOrderDetailsUpdate: handleOrderDetailsUpdate,
    enabled: true
  });

  // Загрузка истории заказов
  useEffect(() => {
    const loadOrders = async () => {
      try {
        setLoading(true);
        const telegramId = state.user?.telegram_id;
        console.log('🔍 Загружаем заказы для пользователя:', telegramId);
        
        if (!telegramId) {
          console.log('❌ Пользователь не авторизован');
          setError('Пользователь не авторизован');
          return;
        }

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.babayfood.uz/api';
        const url = `${apiBaseUrl}/orders/?telegram_id=${telegramId}`;
        console.log('🌐 Запрос к API заказов:', url);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true'
          }
        });

        console.log('📡 Статус ответа API заказов:', response.status, response.statusText);

        if (response.ok) {
          const data = await response.json();
          console.log('📋 Ответ API заказов:', data);
          console.log('🔍 Структура первого заказа:', data.orders?.[0]);
          console.log('🔍 Структура элементов первого заказа:', data.orders?.[0]?.items);
          setOrders(data.orders || data || []);
        } else {
          const errorData = await response.json();
          console.error('❌ Ошибка API заказов:', errorData);
          setError(errorData.error || 'Не удалось загрузить историю заказов');
        }
      } catch (err) {
        console.error('❌ Ошибка загрузки заказов:', err);
        setError('Ошибка загрузки данных');
      } finally {
        setLoading(false);
      }
    };

    loadOrders();
  }, [state.user]);

  // Автообновление каждые 60 секунд (fallback для WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      // Обновляем только если WebSocket не подключен или не работает
      if (!isConnected || websocketFailed) {
        console.log('🔄 WebSocket не подключен, обновляем через API...');
        const loadOrders = async () => {
          try {
            const telegramId = state.user?.telegram_id;
            if (!telegramId) return;

            const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://api.babayfood.uz/api';
            const url = `${apiBaseUrl}/orders/?telegram_id=${telegramId}`;
            
            const response = await fetch(url, {
              method: 'GET',
              headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true'
              }
            });

            if (response.ok) {
              const data = await response.json();
              setOrders(data.orders || data || []);
            }
          } catch (err) {
            console.error('❌ Ошибка автообновления заказов:', err);
          }
        };
        loadOrders();
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [isConnected, websocketFailed, state.user]);

  // Фильтрация заказов по статусу
  const filteredOrders = orders.filter(order => {
    if (selectedStatus === 'all') return true;
    return order.status === selectedStatus;
  });

  // Получение всех уникальных статусов
  const allStatuses = ['all', ...Array.from(new Set(orders.map(order => order.status)))];

  // Форматирование статуса заказа
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Ожидание',
      'preparing': 'Готовится',
      'delivering': 'Доставляется',
      'completed': 'Выполнен',
      'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
  };

  // Форматирование типа заказа
  const getServiceTypeText = (serviceType: string) => {
    const serviceTypeMap: Record<string, string> = {
      'delivery': t('delivery'),
      'pickup': t('pickup')
    };
    return serviceTypeMap[serviceType] || serviceType;
  };

  // Получение иконки для типа заказа
  const getServiceTypeIcon = (serviceType: string) => {
    const iconMap: Record<string, string> = {
      'delivery': '🚚',
      'pickup': '🏪'
    };
    return iconMap[serviceType] || '❓';
  };

  // Форматирование статуса заказа для стилей
  const getStatusStyle = (status: string) => {
    const styleMap: Record<string, string> = {
      'pending': 'bg-yellow-600/20 text-yellow-400 border-yellow-600/50',
      'preparing': 'bg-blue-600/20 text-blue-400 border-blue-600/50',
      'delivering': 'bg-purple-600/20 text-purple-400 border-purple-600/50',
      'completed': 'bg-green-600/20 text-green-400 border-green-600/50',
      'cancelled': 'bg-red-600/20 text-red-400 border-red-600/50'
    };
    return styleMap[status] || 'bg-gray-600/20 text-gray-400 border-gray-600/50';
  };

  // Получение иконки для статуса
  const getStatusIcon = (status: string) => {
    const iconMap: Record<string, string> = {
      'pending': '⏳',
      'preparing': '👨‍🍳',
      'delivering': '🚚',
      'completed': '✅',
      'cancelled': '❌'
    };
    return iconMap[status] || '❓';
  };


  // Форматирование даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen text-gray-100">
        <div className="sticky top-0 z-50 bg-dark-800/95 backdrop-blur-lg border-b border-gray-700/50">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
            >
              <span className="text-gray-300 text-lg">←</span>
            </button>
            <h1 className="text-lg font-bold text-gray-100">{t('profile')}</h1>
            <div className="w-10"></div>
          </div>
        </div>
        
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-6"></div>
        </div>
      </div>
    );
  }

  return (
    <PageTransition>
    <div className="min-h-screen text-gray-100">
      {/* CSS анимации */}
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        .animate-fadeInUp {
          animation: fadeInUp 0.6s ease-out forwards;
        }
        
        .animate-fadeInRight {
          animation: fadeInRight 0.4s ease-out forwards;
        }
        
        .animate-slideIn {
          animation: slideIn 0.5s ease-out forwards;
        }
      `}</style>

      {/* Заголовок страницы */}
      <div className="sticky top-0 z-50 bg-dark-800/95 backdrop-blur-lg border-b border-gray-700/50">
        <div className="flex items-center justify-between p-4">
          <button
            onClick={onClose}
            className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center hover:bg-gray-600 transition-colors"
          >
            <span className="text-gray-300 text-lg">←</span>
          </button>
          <h1 className="text-lg font-bold text-gray-100">{t('profile')}</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Основной контент */}
      <div className="pt-4 space-y-6 px-4 pb-24">
        {/* Информация о пользователе */}
        <div className="bg-dark-800 rounded-2xl p-6 border border-gray-700/50 animate-slideIn">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-2xl">
              👤
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-100">
                {state.user?.first_name} {state.user?.last_name}
              </h2>
              {state.user?.username && (
                <p className="text-gray-400">@{state.user.username}</p>
              )}
              <p className="text-sm text-gray-500">
                ID: {state.user?.telegram_id}
              </p>
            </div>
          </div>
          
          {/* Статистика */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4 text-center hover:bg-gray-700/70 transition-colors duration-200">
              <div className="text-2xl font-bold text-primary-400">{orders.length}</div>
              <div className="text-sm text-gray-400">{t('orders')}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 text-center hover:bg-gray-700/70 transition-colors duration-200">
              <div className="text-2xl font-bold text-red-400">{favorites.length}</div>
              <div className="text-sm text-gray-400">{t('favorites')}</div>
            </div>
          </div>
        </div>

        {/* История заказов */}
        <div className="bg-dark-800 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center justify-between">
            <div className="flex items-center">
            <span className="mr-2">📋</span>
            {t('order_history')}
            </div>
            {/* WebSocket статус */}
                          <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 
                  websocketFailed ? 'bg-yellow-500' : 'bg-red-500'
                }`}></div>
                <span className="text-xs text-gray-400">
                  {isConnected ? 'Live' : 
                   websocketFailed ? 'Polling' : 'Offline'}
                </span>
                {websocketFailed && (
                  <button
                    onClick={retryWebSocket}
                    className="text-xs text-blue-400 hover:text-blue-300 underline"
                  >
                    Retry WebSocket
                  </button>
                )}
              </div>
          </h3>
          
          {/* Фильтры по статусам */}
          <div className="mb-6">
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {allStatuses.map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                    selectedStatus === status
                      ? 'bg-primary-600 text-white shadow-lg scale-105'
                      : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600/50 hover:scale-102'
                  }`}
                >
                  {status === 'all' ? t('all_orders') : getStatusText(status)}
                  {status !== 'all' && (
                    <span className="ml-1 sm:ml-2 text-xs">
                      ({orders.filter(order => order.status === status).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
            
            {/* Счетчик отфильтрованных заказов */}
            <div className="mt-3 text-center sm:text-left">
              <span className="text-sm text-gray-400">
                Показано {filteredOrders.length} из {orders.length} заказов
                {selectedStatus !== 'all' && ` ${t('no_orders_with_status')} "${getStatusText(selectedStatus)}"`}
                  </span>
                </div>
          </div>
          
          {error && (
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {filteredOrders && filteredOrders.length > 0 ? (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => (
                <div 
                  key={order.id} 
                  className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50 hover:border-gray-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-gray-900/20"
                  style={{
                    animationDelay: `${index * 100}ms`,
                    animation: 'fadeInUp 0.6s ease-out forwards'
                  }}
                >
                  {/* Заголовок заказа */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">🛒</span>
                      <div>
                      <span className="font-semibold text-gray-100">
                        {t('order')} #{order.id}
                      </span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-400">{getServiceTypeIcon(order.service_type)} {getServiceTypeText(order.service_type)}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-medium border ${getStatusStyle(order.status)} flex items-center space-x-2`}>
                      <span className="text-lg">{getStatusIcon(order.status)}</span>
                      <span>{getStatusText(order.status)}</span>
                    </div>
                  </div>

                  {/* Упрощенный путь заказа */}
                  <div className="mb-4">
                    <div className="flex items-center justify-center">
                      <div className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          order.status === 'pending' || order.status === 'preparing' || order.status === 'delivering' || order.status === 'completed'
                            ? 'bg-yellow-500' : 'bg-gray-400'
                        }`} />
                        <div className="w-8 h-0.5 bg-gray-600"></div>
                        <div className={`w-2 h-2 rounded-full ${
                          order.status === 'preparing' || order.status === 'delivering' || order.status === 'completed'
                            ? 'bg-blue-500' : 'bg-gray-400'
                        }`} />
                        <div className="w-8 h-0.5 bg-gray-600"></div>
                        <div className={`w-2 h-2 rounded-full ${
                          order.status === 'delivering' || order.status === 'completed'
                            ? 'bg-purple-500' : 'bg-gray-400'
                        }`} />
                        <div className="w-8 h-0.5 bg-gray-600"></div>
                        <div className={`w-2 h-2 rounded-full ${
                          order.status === 'completed'
                            ? 'bg-green-500' : 'bg-gray-400'
                        }`} />
                      </div>
                    </div>
                  </div>

                  {/* Детали заказа */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
                    <div className="flex items-center text-sm text-gray-400 bg-gray-800/30 rounded-lg p-3">
                      <span className="mr-2 text-lg">📅</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-300 text-xs sm:text-sm">Дата</div>
                        <div className="text-xs sm:text-sm truncate">{order.created_at && formatDate(order.created_at)}</div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-400 bg-gray-800/30 rounded-lg p-3">
                      <span className="mr-2 text-lg">📍</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-300 text-xs sm:text-sm">Адрес</div>
                        <div className="text-xs sm:text-sm truncate">{order.address || 'Не указан'}</div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-400 bg-gray-800/30 rounded-lg p-3">
                      <span className="mr-2 text-lg">{getServiceTypeIcon(order.service_type)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-300 text-xs sm:text-sm">{t('order_type')}</div>
                        <div className="text-xs sm:text-sm truncate">{getServiceTypeText(order.service_type)}</div>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-400 bg-gray-800/30 rounded-lg p-3">
                      <span className="mr-2 text-lg">💰</span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-gray-300 text-xs sm:text-sm">{t('final_price_label')}</div>
                        <div className="text-primary-400 font-bold text-xs sm:text-sm">
                                                      {order.final_price || order.total_price || '0'} {t('economy_currency')}
                        </div>
                        {order.discount_amount && Number(order.discount_amount) > 0 && (
                                                      <div className="text-xs mt-1">
                              {t('discount_label')}: -{order.discount_amount} {t('economy_currency')}
                            </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Промокод */}
                    {order.promo_code && (
                      <div className="flex items-center text-sm text-gray-400 bg-gray-800/30 rounded-lg p-3">
                        <span className="mr-2 text-lg">🎫</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-300 text-xs sm:text-sm">{t('promo_code')}</div>
                          <div className="text-green-400 text-xs sm:text-sm">
                            {order.promo_code.code} (-{order.promo_code.discount_percent}%)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Информация об экономии */}
                  {order.discount_amount && Number(order.discount_amount) > 0 && (
                    <div className="bg-green-900/20 border border-green-600/30 rounded-lg p-4 mb-4">
                      <div className="flex items-center justify-center space-x-2 text-green-400">
                        <span className="text-2xl">🎉</span>
                        <span className="font-semibold">{t('economy_message')} {order.discount_amount} {t('economy_currency')}!</span>
                        <span className="text-2xl">🎉</span>
                      </div>
                    </div>
                  )}

                  {/* Разбивка по суммам */}
                  {order.discount_amount && Number(order.discount_amount) > 0 ? (
                    <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                        <span className="mr-2">💳</span>
                        {t('order_details')}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">{t('order_amount_without_discount')}:</span>
                          <span className="text-gray-300">{order.total_price} {t('economy_currency')}</span>
                        </div>
                        {order.service_type === 'delivery' && order.delivery_fee && Number(order.delivery_fee) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('delivery_cost_label')}:</span>
                            <span className="text-gray-300">{order.delivery_fee} {t('economy_currency')}</span>
                          </div>
                        )}
                        {order.service_type === 'pickup' && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('order_type')}:</span>
                            <span className="text-gray-300">{t('pickup')}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-green-400">
                          <span>{t('promo_discount_by_promo')}:</span>
                          <span>-{order.discount_amount} {t('economy_currency')}</span>
                        </div>
                        <div className="flex justify-between border-t border-gray-600 pt-2">
                          <span className="text-gray-200 font-semibold">{t('total_to_pay_colon')}</span>
                          <span className="text-primary-400 font-bold">{order.final_price} {t('economy_currency')}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Если промокод не применялся, показываем простую информацию
                    <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                        <span className="mr-2">💳</span>
                        {t('order_details')}
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">{t('order_amount_without_discount')}:</span>
                          <span className="text-gray-300">{order.total_price} {t('economy_currency')}</span>
                        </div>
                        {order.service_type === 'delivery' && order.delivery_fee && Number(order.delivery_fee) > 0 && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('delivery_cost_label')}:</span>
                            <span className="text-gray-300">{order.delivery_fee} {t('economy_currency')}</span>
                          </div>
                        )}
                        {order.service_type === 'pickup' && (
                          <div className="flex justify-between">
                            <span className="text-gray-400">{t('order_type')}:</span>
                            <span className="text-gray-300">{t('pickup')}</span>
                          </div>
                        )}
                        <div className="flex justify-between border-t border-gray-600 pt-2">
                          <span className="text-gray-200 font-semibold">{t('total_to_pay_colon')}</span>
                          <span className="text-primary-400 font-bold">{order.total_price} {t('economy_currency')}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Товары в заказе */}
                  <div className="bg-gray-800/50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                      <span className="mr-2">🍽️</span>
                      {t('order_items')} ({order.items?.length || 0})
                    </h4>
                    <div className="space-y-2">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, itemIndex) => (
                          <div 
                            key={itemIndex} 
                            className="flex items-center justify-between text-sm bg-gray-700/30 rounded-lg p-3 hover:bg-gray-700/50 transition-colors duration-200"
                            style={{
                              animationDelay: `${(index * 100) + (itemIndex * 50)}ms`,
                              animation: 'fadeInRight 0.4s ease-out forwards'
                            }}
                          >
                            <div className="flex items-center space-x-3">
                              <span className="text-lg">🍕</span>
                              <div>
                                <div className="text-gray-300 font-medium">{item.menu_item_name || 'Неизвестное блюдо'}</div>
                                <div className="text-gray-500 text-xs">{t('quantity')}: {item.quantity || 0}</div>
                              </div>
                            </div>
                            <span className="text-gray-300 font-bold">
                              {item.price || '0'} {t('economy_currency')}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 text-sm text-center py-4">{t('items_not_found')}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4 animate-bounce">📦</div>
              <p className="text-gray-400 text-lg mb-2">
                {selectedStatus === 'all' ? t('no_orders_yet') : `Нет заказов со статусом "${getStatusText(selectedStatus)}"`}
              </p>
              <p className="text-gray-500 text-sm">{t('try_change_filter')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
    </PageTransition>
  );
};
