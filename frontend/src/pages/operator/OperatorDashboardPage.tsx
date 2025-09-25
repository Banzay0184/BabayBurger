import React, { useState, useEffect, useCallback } from 'react';
import { useOperatorAuth } from '../../context/OperatorAuthContext';
import { operatorOrdersApi, operatorNotificationsApi } from '../../api/operatorApi';
import type { OperatorDashboard, OrderForOperator, OrderStatus, OperatorNotification } from '../../types/operator';

// Типы для страниц
type OperatorPage = 'login' | 'dashboard' | 'stats';

interface OperatorDashboardPageProps {
  onNavigate?: (page: OperatorPage) => void;
}
import { OrderCard } from '../../components/operator/OrderCard';
import { CompactOrderFilters } from '../../components/operator/CompactOrderFilters';
import { OrderSearch } from '../../components/operator/OrderSearch';
import { NotificationsPanel } from '../../components/operator/NotificationsPanel';
import { WebSocketStatus } from '../../components/operator/WebSocketStatus';
import { SoundSettingsPanel } from '../../components/operator/SoundNotificationManager';
import { SimpleMobileSoundManager } from '../../components/operator/SimpleMobileSoundManager';
import { useOperatorWebSocket } from '../../hooks/useOperatorWebSocket';

export const OperatorDashboardPage: React.FC<OperatorDashboardPageProps> = ({ onNavigate }) => {
  const { state: authState, logout } = useOperatorAuth();
  const [dashboard, setDashboard] = useState<OperatorDashboard | null>(null);
  const [orders, setOrders] = useState<OrderForOperator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSoundSettings, setShowSoundSettings] = useState(false);

  // WebSocket обработчики для real-time обновлений
  const handleNewOrder = useCallback((newOrder: OrderForOperator) => {
    console.log('🆕 Получен новый заказ через WebSocket:', newOrder);
    
    // Проверяем, есть ли полные данные заказа
    const hasCompleteData = newOrder.items_details && 
                           newOrder.items_details.length > 0 && 
                           newOrder.user_info && 
                           newOrder.address_info;
    
    if (!hasCompleteData) {
      console.log('⚠️ Данные заказа неполные, загружаем через API...');
      // Загружаем полные данные заказа через API
      operatorOrdersApi.getOrder(newOrder.id)
        .then(fullOrder => {
          console.log('✅ Полные данные заказа загружены:', fullOrder);
          setOrders(prev => {
            // Проверяем, нет ли уже такого заказа
            const exists = prev.some(order => order.id === fullOrder.id);
            if (exists) return prev;
            
            // Добавляем новый заказ в начало списка
            return [fullOrder, ...prev];
          });
          
          // Обновляем дашборд
          setDashboard(prev => prev ? {
            ...prev,
            recent_orders: [fullOrder, ...(prev.recent_orders || [])]
          } : null);
        })
        .catch(error => {
          console.error('❌ Ошибка загрузки полных данных заказа:', error);
          // В случае ошибки добавляем заказ как есть
          setOrders(prev => {
            const exists = prev.some(order => order.id === newOrder.id);
            if (exists) return prev;
            return [newOrder, ...prev];
          });
        });
    } else {
      // Данные полные, добавляем заказ
      setOrders(prev => {
        // Проверяем, нет ли уже такого заказа
        const exists = prev.some(order => order.id === newOrder.id);
        if (exists) return prev;
        
        // Добавляем новый заказ в начало списка
        return [newOrder, ...prev];
      });
      
      // Обновляем дашборд
      setDashboard(prev => prev ? {
        ...prev,
        recent_orders: [newOrder, ...(prev.recent_orders || [])]
      } : null);
    }
  }, []);

  const handleOrderUpdated = useCallback((orderId: number, updatedOrder: OrderForOperator | undefined, status: string | undefined) => {
    console.log('🔄 Заказ обновлен через WebSocket:', orderId, status);
    console.log('🔍 Текущий фильтр статуса:', selectedStatus);
    
    if (updatedOrder) {
      // Обновляем заказ в списке без фильтрации
      setOrders(prev => {
        const updatedList = prev.map(order => 
          order.id === orderId ? updatedOrder : order
        );
        
        console.log(`📋 Заказ ${orderId} обновлен в списке, статус: ${updatedOrder.status}`);
        return updatedList;
      });
      
      // Обновляем дашборд
      setDashboard(prev => prev ? {
        ...prev,
        recent_orders: (prev.recent_orders || []).map(order => 
          order.id === orderId ? updatedOrder : order
        )
      } : null);
    } else {
      // Если нет полных данных заказа, перезагружаем список
      loadOrders();
    }
  }, []);

  const handleNotification = useCallback((notification: OperatorNotification) => {
    console.log('🔔 Получено уведомление через WebSocket:', notification);
    
    // Обновляем дашборд с новым уведомлением
    setDashboard(prev => prev ? {
      ...prev,
      notifications: [notification, ...(prev.notifications || [])]
    } : null);
  }, []);

  // Инициализируем WebSocket
  const { isConnected } = useOperatorWebSocket({
    onOrderCreated: handleNewOrder,
    onOrderUpdated: handleOrderUpdated,
    onNotification: handleNotification,
    enabled: true
  });


  // Принудительное обновление при подключении WebSocket
  useEffect(() => {
    if (isConnected) {
      console.log('🔌 WebSocket подключен, принудительно обновляем данные...');
      loadDashboard();
      loadOrders();
    }
  }, [isConnected]);


  // Загрузка дашборда
  const loadDashboard = async () => {
    try {
      setIsLoading(true);
      const dashboardData = await operatorOrdersApi.getDashboard();
      
      // Убеждаемся, что все поля являются массивами
      if (dashboardData) {
        if (!Array.isArray(dashboardData.recent_orders)) {
          dashboardData.recent_orders = [];
        }
        if (!Array.isArray(dashboardData.notifications)) {
          dashboardData.notifications = [];
        }
        if (!Array.isArray(dashboardData.assigned_zones)) {
          dashboardData.assigned_zones = [];
        }
      }
      
      setDashboard(dashboardData);
    } catch (err) {
      setError('Ошибка загрузки дашборда');
      console.error('Ошибка загрузки дашборда:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка заказов
  const loadOrders = async () => {
    try {
      const filters: any = {};
      if (selectedStatus !== 'all') filters.status = selectedStatus;
      if (searchQuery.trim()) filters.search = searchQuery.trim();
      
      console.log('🔍 Загружаем заказы с фильтрами:', filters);
      const ordersData = await operatorOrdersApi.getOrders(filters);
      console.log('🔍 Получены данные заказов:', ordersData);
      console.log('🔍 Тип данных:', typeof ordersData, 'Является массивом:', Array.isArray(ordersData));
      
      // Убеждаемся, что ordersData - это массив
      const ordersArray = Array.isArray(ordersData) ? ordersData : [];
      console.log('🔍 Устанавливаем заказы:', ordersArray);
      setOrders(ordersArray);
    } catch (err) {
      setError('Ошибка загрузки заказов');
      console.error('Ошибка загрузки заказов:', err);
      // В случае ошибки устанавливаем пустой массив
      setOrders([]);
    }
  };

  // Обновление заказа (после действий оператора)
  const updateOrder = useCallback((updatedOrder: OrderForOperator) => {
    console.log('🔄 Обновление заказа после действия оператора:', updatedOrder.id, updatedOrder.status);
    
    // Обновляем заказ в списке без фильтрации
    setOrders(prev => {
      if (!prev) return [updatedOrder];
      
      const updatedList = prev.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      );
      
      console.log(`📋 Заказ ${updatedOrder.id} обновлен в списке, статус: ${updatedOrder.status}`);
      return updatedList;
    });
    
    // Обновляем дашборд
    if (dashboard) {
      setDashboard(prev => prev ? {
        ...prev,
        recent_orders: Array.isArray(prev.recent_orders) 
          ? prev.recent_orders.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            )
          : [updatedOrder]
      } : null);
    }
  }, [dashboard]);

  // Обработчики поиска
  const handleSearch = useCallback((query: string) => {
    console.log('🔍 Поиск заказов:', query);
    setSearchQuery(query);
  }, []);

  const handleClearSearch = useCallback(() => {
    console.log('🧹 Очистка поиска');
    setSearchQuery('');
  }, []);

  // Загрузка данных при монтировании
  useEffect(() => {
    loadDashboard();
    loadOrders();
  }, []);

  // Перезагрузка заказов при изменении фильтров
  useEffect(() => {
    loadOrders();
  }, [selectedStatus, searchQuery]);

  // Автообновление каждые 30 секунд (fallback для WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      // Обновляем только если WebSocket не подключен
      if (!isConnected) {
        console.log('🔄 WebSocket не подключен, обновляем через API...');
        loadDashboard();
        loadOrders();
      } else {
        // Если WebSocket подключен, обновляем только дашборд (заказы приходят через WebSocket)
        console.log('🔄 WebSocket подключен, обновляем только дашборд...');
        loadDashboard();
      }
    }, 30000); // Уменьшено с 60 до 30 секунд

    return () => clearInterval(interval);
  }, [isConnected]);

  // Фильтрация заказов для отображения
  const filteredOrders = React.useMemo(() => {
    if (!orders || orders.length === 0) return [];
    
    let filtered = orders;
    
    // Фильтр по статусу
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(order => order.status === selectedStatus);
    }
    
    // Фильтр по поиску
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(order => 
        order.id.toString().includes(query) ||
        order.user_info?.first_name?.toLowerCase().includes(query) ||
        order.user_info?.last_name?.toLowerCase().includes(query) ||
        order.address_info?.phone_number?.includes(query) ||
        order.address_info?.full_address?.toLowerCase().includes(query)
      );
    }
    
    console.log(`🔍 Фильтрация: ${orders.length} → ${filtered.length} заказов`);
    return filtered;
  }, [orders, selectedStatus, searchQuery]);

  // Обработка выхода
  const handleLogout = async () => {
    try {
      await logout();
      // Выход обрабатывается автоматически через контекст
    } catch (error) {
      console.error('Ошибка при выходе:', error);
    }
  };


  if (isLoading && !dashboard) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Загрузка дашборда...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-6 max-w-md">
            <p className="text-red-400 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                loadDashboard();
                loadOrders();
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Попробовать снова
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Упрощенная верхняя панель */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-full mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Логотип и название */}
            <div className="flex items-center">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white text-xl">👨‍💼</span>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Оператор</h1>
                <div className="flex items-center space-x-2">
                  <WebSocketStatus />
                </div>
              </div>
            </div>

            {/* Информация об операторе и кнопка выхода */}
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-300 font-medium">
                  {authState.operator?.first_name} {authState.operator?.last_name}
                </p>
                <p className="text-xs text-gray-400">
                  {authState.operator?.assigned_zones_names || 'Зоны не назначены'}
                </p>
              </div>
              
              {/* Кнопка выхода */}
              <button
                onClick={handleLogout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Основной контент - планшетная версия с двумя колонками */}
      <main className="max-w-full mx-auto px-4 py-4">
        {/* Простая мобильная звуковая система */}
        <SimpleMobileSoundManager />
        
        {/* Поиск заказов */}
        <OrderSearch
          onSearch={handleSearch}
          onClear={handleClearSearch}
          isLoading={isLoading}
          searchQuery={searchQuery}
        />

        {/* Компактная панель фильтрации */}
        <CompactOrderFilters
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        {/* Заказы - одноколоночный макет */}
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-3">
              <h2 className="text-lg font-semibold text-white">
                Заказы {selectedStatus !== 'all' && `(${selectedStatus})`}
                {searchQuery && (
                  <span className="ml-2 text-sm text-blue-400">
                    - "{searchQuery}"
                  </span>
                )}
              </h2>
              
              {/* Статус WebSocket */}
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-400">
                  {isConnected ? 'WS' : 'OFF'}
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Кнопки действий */}
              <div className="flex space-x-1">
                <button
                  onClick={() => {
                    console.log('🔄 Принудительное обновление всех данных...');
                    loadDashboard();
                    loadOrders();
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                >
                  🔄
                </button>
                <button
                  onClick={() => {
                    if (onNavigate) {
                      onNavigate('stats');
                    }
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                >
                  📊
                </button>
                <button
                  onClick={() => setShowSoundSettings(true)}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                  title="Настройки звука"
                >
                  🔊
                </button>
              </div>
            </div>
          </div>

          {/* Список заказов */}
          {!filteredOrders || filteredOrders.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-4xl mb-3">📋</div>
              <p className="text-gray-400 text-sm mb-1">Нет заказов</p>
              <p className="text-gray-500 text-xs">
                {searchQuery 
                  ? `По запросу "${searchQuery}" ничего не найдено`
                  : selectedStatus !== 'all' 
                    ? 'Попробуйте изменить фильтры' 
                    : 'Новые заказы появятся здесь автоматически'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar">
              {filteredOrders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onUpdate={updateOrder}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Панель уведомлений */}
      {showNotifications && (
        <NotificationsPanel
          notifications={dashboard?.notifications || []}
          onClose={() => setShowNotifications(false)}
          onMarkAsRead={operatorNotificationsApi.markAsRead}
        />
      )}

      {/* Панель настроек звука */}
      {showSoundSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Настройки звука</h2>
              <button
                onClick={() => setShowSoundSettings(false)}
                className="text-gray-400 hover:text-white text-2xl transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-6">
              <SoundSettingsPanel />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
