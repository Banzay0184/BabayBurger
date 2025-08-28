import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoriteContext';

interface Order {
  id: number;
  total_price: string;
  status: string;
  created_at: string;
  address: string; // Backend возвращает полный адрес как строку
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

        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'https://3e3f35c1758a.ngrok-free.app';
        const url = `${apiBaseUrl}/api/orders/?telegram_id=${telegramId}`;
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

  // Форматирование статуса заказа
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      'pending': 'Ожидает',
      'preparing': 'Готовится',
      'delivering': 'Доставляется',
      'completed': 'Выполнен',
      'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
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
    <div className="min-h-screen text-gray-100">
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
        <div className="bg-dark-800 rounded-2xl p-6 border border-gray-700/50">
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
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-primary-400">{orders.length}</div>
              <div className="text-sm text-gray-400">{t('orders')}</div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-red-400">{favorites.length}</div>
              <div className="text-sm text-gray-400">{t('favorites')}</div>
            </div>
          </div>
        </div>

        {/* История заказов */}
        <div className="bg-dark-800 rounded-2xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-bold text-gray-100 mb-4 flex items-center">
            <span className="mr-2">📋</span>
            {t('order_history')}
          </h3>
          
          {error && (
            <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-4">
              <p className="text-red-400">{error}</p>
            </div>
          )}

          {orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => (
                <div key={order.id} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50">
                  {/* Заголовок заказа */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">🛒</span>
                      <span className="font-semibold text-gray-100">
                        {t('order')} #{order.id}
                      </span>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusStyle(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>

                  {/* Детали заказа */}
                  <div className="space-y-2 mb-3">
                    <div className="flex items-center text-sm text-gray-400">
                      <span className="mr-2">📅</span>
                      {order.created_at && formatDate(order.created_at)}
                    </div>
                    <div className="flex items-center text-sm text-gray-400">
                      <span className="mr-2">📍</span>
                      {order.address || 'Адрес не указан'}
                    </div>
                    <div className="flex items-center text-sm text-gray-400">
                      <span className="mr-2">💰</span>
                      {order.total_price || '0'} сум
                    </div>
                  </div>

                  {/* Товары в заказе */}
                  <div className="bg-gray-800/50 rounded-lg p-3">
                    <h4 className="text-sm font-medium text-gray-300 mb-2">{t('order_items')}:</h4>
                    <div className="space-y-1">
                      {order.items && order.items.length > 0 ? (
                        order.items.map((item, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <span className="text-gray-400">
                              {item.quantity || 0}x {item.menu_item_name || 'Неизвестное блюдо'}
                            </span>
                            <span className="text-gray-300 font-medium">
                              {item.price || '0'} сум
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="text-gray-500 text-sm">Товары не найдены</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📦</div>
              <p className="text-gray-400">{t('no_orders_yet')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
