import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cashierApi, type CashierData, type DashboardStats, type Order } from '../../api/cashierApi';
import { CashierStats } from '../../components/cashier/CashierStats';
import { OrderColumn } from '../../components/cashier/OrderColumn';
import { OrderDetailsModal } from '../../components/cashier/OrderDetailsModal';
import { OrderSearch } from '../../components/cashier/OrderSearch';
import { CashierNavigation, type CashierViewType } from '../../components/cashier/CashierNavigation';
import { OrdersPage } from '../../components/cashier/OrdersPage';
import { useCashierWebSocket } from '../../hooks/useCashierWebSocket';



export const CashierDashboardPage: React.FC = () => {
  const [cashierData, setCashierData] = useState<CashierData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [activeView, setActiveView] = useState<CashierViewType>('preparing');
  const navigate = useNavigate();

  // WebSocket обработчики
  const fetchOrderDetails = useCallback(async (orderId: number) => {
    try {
      console.log(`🔍 Fetching details for order ${orderId}...`);
      const orderDetails = await cashierApi.getOrderDetails(orderId);
      console.log('📦 Order details fetched:', orderDetails);
      
      setOrders(prevOrders => {
        // Проверяем, нет ли уже такого заказа
        const existingOrder = prevOrders.find(order => order.id === orderId);
        if (existingOrder) {
          return prevOrders;
        }
        // Добавляем новый заказ в начало списка
        return [orderDetails, ...prevOrders];
      });
    } catch (err) {
      console.error('❌ Error fetching order details:', err);
    }
  }, []);

  const handleOrderCreated = useCallback((newOrder: Order) => {
    console.log('🆕 New order received via WebSocket:', newOrder);
    setOrders(prevOrders => {
      // Проверяем, нет ли уже такого заказа
      const existingOrder = prevOrders.find(order => order.id === newOrder.id);
      if (existingOrder) {
        return prevOrders;
      }
      // Добавляем новый заказ в начало списка
      return [newOrder, ...prevOrders];
    });
  }, []);

  const handleOrderUpdated = useCallback((orderId: number, updatedOrder: Order | undefined, status: string | undefined) => {
    console.log('🔄 Order updated via WebSocket:', orderId, status);
    if (updatedOrder) {
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? updatedOrder : order
        )
      );
    } else if (status) {
      // Если получили только статус, обновляем его
      setOrders(prevOrders => 
        prevOrders.map(order => 
          order.id === orderId ? { ...order, status } : order
        )
      );
    }
  }, []);

  const handleOrderStatusChanged = useCallback((orderId: number, newStatus: string, orderData?: Order) => {
    console.log('📊 Order status changed via WebSocket:', orderId, newStatus, orderData);
    
    setOrders(prevOrders => {
      // Проверяем, есть ли заказ в списке
      const existingOrder = prevOrders.find(order => order.id === orderId);
      
      if (existingOrder) {
        // Если заказ есть, обновляем его статус только если он отличается
        if (existingOrder.status !== newStatus) {
          console.log(`🔄 WebSocket update: order #${orderId} status ${existingOrder.status} → ${newStatus}`);
          return prevOrders.map(order => 
            order.id === orderId ? { ...order, status: newStatus } : order
          );
        } else {
          console.log(`✅ WebSocket update: order #${orderId} already has status ${newStatus}`);
          return prevOrders; // Не обновляем, если статус уже правильный
        }
      } else {
        // Если заказа нет в списке
        if (orderData) {
          // Если получили полные данные заказа, добавляем его
          console.log('🆕 Adding new order from WebSocket:', orderData);
          return [orderData, ...prevOrders];
        } else if (newStatus === 'preparing' || newStatus === 'ready_for_delivery') {
          // Если статус 'preparing' или 'ready_for_delivery' но нет данных, загружаем заказ
          console.log(`🆕 Order not in list but status is ${newStatus}, fetching order details...`);
          fetchOrderDetails(orderId);
        }
        return prevOrders;
      }
    });
  }, [fetchOrderDetails]);

  // Обработчики поиска
  const handleSearchResults = useCallback((results: Order[]) => {
    setSearchResults(results);
    setIsSearchMode(true);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchResults([]);
    setIsSearchMode(false);
  }, []);

  const handleViewChange = useCallback((view: CashierViewType) => {
    setActiveView(view);
    setIsSearchMode(false); // Выходим из режима поиска при смене вида
  }, []);


  const handleDashboardUpdate = useCallback((newStats: DashboardStats) => {
    console.log('📊 Dashboard stats updated via WebSocket:', newStats);
    setStats(newStats);
  }, []);

  // Инициализируем WebSocket
  const {
    isConnected,
    isConnecting,
    error: wsError,
    reconnect: wsReconnect
  } = useCashierWebSocket({
    onOrderCreated: handleOrderCreated,
    onOrderUpdated: handleOrderUpdated,
    onOrderStatusChanged: handleOrderStatusChanged,
    onDashboardUpdate: handleDashboardUpdate,
    enabled: true
  });

  // Логируем статус WebSocket соединения
  useEffect(() => {
    console.log('🔌 WebSocket status changed:', { isConnected, isConnecting, wsError });
  }, [isConnected, isConnecting, wsError]);

  useEffect(() => {
    if (!cashierApi.isAuthenticated()) {
      navigate('/cashier/login');
      return;
    }

    const cashierData = cashierApi.getCashierData();
    if (!cashierData) {
      navigate('/cashier/login');
      return;
    }

    setCashierData(cashierData);
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    try {
      const [statsData, ordersData] = await Promise.all([
        cashierApi.getDashboardStats(),
        cashierApi.getOrders()
      ]);
      
      setStats(statsData);
      setOrders(ordersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };


  const handleLogout = () => {
    cashierApi.logout();
    navigate('/cashier/login');
  };

  const handleOrderAction = async (orderId: number, action: string) => {
    try {
      console.log(`🎯 Starting action ${action} for order ${orderId}`);
      console.log(`🔌 WebSocket status: isConnected=${isConnected}, isConnecting=${isConnecting}, error=${wsError}`);
      
      switch (action) {
        case 'start_processing':
          await cashierApi.startProcessingOrder(orderId);
          break;
        case 'mark_ready':
          await cashierApi.markOrderReady(orderId);
          break;
        case 'mark_delivering':
          await cashierApi.markOrderDelivering(orderId);
          break;
        case 'complete':
          await cashierApi.completeOrder(orderId);
          break;
      }
      
      // WebSocket автоматически обновит данные, поэтому не нужно вызывать fetchDashboardData()
      console.log(`✅ Action ${action} completed for order ${orderId}`);
      console.log(`⏳ Waiting for WebSocket update...`);
      
      // Немедленное обновление UI для оптимизации
      console.log(`⚡ Optimistically updating UI for order ${orderId}...`);
      
      // Оптимистичное обновление - сразу обновляем UI
      setOrders(prevOrders => {
        return prevOrders.map(order => {
          if (order.id === orderId) {
            let newStatus = order.status;
            switch (action) {
              case 'start_processing':
                newStatus = 'preparing';
                break;
              case 'mark_ready':
                newStatus = 'ready_for_delivery';
                break;
              case 'mark_delivering':
                newStatus = 'delivering';
                break;
              case 'complete':
                newStatus = 'completed';
                break;
            }
            console.log(`⚡ Optimistic update: order ${orderId} status ${order.status} → ${newStatus}`);
            return { ...order, status: newStatus };
          }
          return order;
        });
      });
      
      // Также обновляем статистику дашборда оптимистично
      setStats(prevStats => {
        if (!prevStats) return prevStats;
        
        const newStats = { ...prevStats };
        switch (action) {
          case 'start_processing':
            newStats.preparing_orders = (newStats.preparing_orders || 0) + 1;
            break;
          case 'mark_ready':
            newStats.ready_orders = (newStats.ready_orders || 0) + 1;
            newStats.preparing_orders = Math.max(0, (newStats.preparing_orders || 0) - 1);
            break;
          case 'mark_delivering':
            newStats.delivering_orders = (newStats.delivering_orders || 0) + 1;
            newStats.ready_orders = Math.max(0, (newStats.ready_orders || 0) - 1);
            break;
          case 'complete':
            newStats.completed_orders = (newStats.completed_orders || 0) + 1;
            newStats.delivering_orders = Math.max(0, (newStats.delivering_orders || 0) - 1);
            break;
        }
        console.log(`⚡ Optimistic stats update:`, newStats);
        return newStats;
      });
      
      // Fallback: если WebSocket не подключен, обновляем данные вручную (без задержки)
      if (!isConnected) {
        console.log(`⚠️ WebSocket not connected, updating data immediately...`);
        // Используем requestIdleCallback для неблокирующего обновления
        if ((window as any).requestIdleCallback) {
          (window as any).requestIdleCallback(() => fetchDashboardData());
        } else {
          setTimeout(() => fetchDashboardData(), 0);
        }
      } else {
        // Если WebSocket подключен, но через 300ms не пришло обновление, обновляем вручную
        setTimeout(() => {
          console.log(`⏰ Quick timeout reached, refreshing data...`);
          if ((window as any).requestIdleCallback) {
            (window as any).requestIdleCallback(() => fetchDashboardData());
          } else {
            fetchDashboardData();
          }
        }, 300); // Уменьшено с 500ms до 300ms
      }
    } catch (err) {
      console.error(`❌ Error in action ${action} for order ${orderId}:`, err);
      setError(err instanceof Error ? err.message : 'Ошибка выполнения действия');
    }
  };

  const handleShowDetails = useCallback((order: Order) => {
    setSelectedOrder(order);
    setIsDetailsModalOpen(true);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setIsDetailsModalOpen(false);
    setSelectedOrder(null);
  }, []);

  // Группируем заказы по статусам
  const preparingOrders = orders.filter(order => order.status === 'preparing');
  const readyOrders = orders.filter(order => 
    order.status === 'delivering' || 
    (order.status === 'ready_for_delivery' && order.service_type === 'delivery')
  );
  const completedOrders = orders.filter(order => 
    order.status === 'completed' || 
    (order.status === 'ready_for_delivery' && order.service_type === 'pickup')
  );

  // Получаем заказы для текущего вида
  const getCurrentOrders = () => {
    switch (activeView) {
      case 'preparing':
        return preparingOrders;
      case 'ready':
        return readyOrders;
      case 'completed':
        return completedOrders;
      default:
        return preparingOrders;
    }
  };

  const currentOrders = getCurrentOrders();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Статистика в верхней части */}
      {stats && cashierData && (
        <CashierStats
          stats={stats}
          cashierName={`${cashierData.first_name} ${cashierData.last_name}`}
          restaurantName={cashierData.restaurant.name}
          onLogout={handleLogout}
        />
      )}

      {/* Ошибки и статус WebSocket */}
      <div className="max-w-6xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 pt-1 sm:pt-2 space-y-1 sm:space-y-2">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg shadow-sm text-xs sm:text-sm">
            {error}
          </div>
        )}
        
        {/* Статус WebSocket */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 sm:space-x-2">
            <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
            <span className="text-xs text-gray-600">
              {isConnected ? 'Подключено' : isConnecting ? 'Подключение...' : 'Отключено'}
            </span>
            {wsError && (
              <span className="text-xs text-red-600">({wsError})</span>
            )}
          </div>
          
          {!isConnected && !isConnecting && (
            <button
              onClick={wsReconnect}
              className="text-xs text-blue-600 hover:text-blue-800 underline"
            >
              Переподключиться
            </button>
          )}
        </div>
      </div>

      {/* Поиск заказов */}
      <div className="max-w-6xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3">
        <OrderSearch
          onSearchResults={handleSearchResults}
          onClearSearch={handleClearSearch}
        />
      </div>

      {/* Навигация и контент */}
      <div className="max-w-6xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 pb-2 sm:pb-4">
        {isSearchMode ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Результаты поиска</h2>
              <button
                onClick={handleClearSearch}
                className="text-xs sm:text-sm text-gray-500 hover:text-gray-700 underline"
              >
                Показать все заказы
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
              <OrderColumn
                title="Готовятся"
                orders={searchResults.filter(order => order.status === 'preparing')}
                onOrderAction={handleOrderAction}
                onShowDetails={handleShowDetails}
                color="#3b82f6"
                icon={
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <OrderColumn
                title="Готовы к выдаче"
                orders={searchResults.filter(order => 
                  order.status === 'delivering' || 
                  (order.status === 'ready_for_delivery' && order.service_type === 'delivery')
                )}
                onOrderAction={handleOrderAction}
                onShowDetails={handleShowDetails}
                color="#f59e0b"
                icon={
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                }
              />
              <OrderColumn
                title="Завершенные"
                orders={searchResults.filter(order => 
                  order.status === 'completed' || 
                  (order.status === 'ready_for_delivery' && order.service_type === 'pickup')
                )}
                onOrderAction={handleOrderAction}
                onShowDetails={handleShowDetails}
                color="#10b981"
                icon={
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                }
              />
            </div>
          </div>
        ) : (
          <>
            {/* Навигация */}
            <CashierNavigation
              activeView={activeView}
              onViewChange={handleViewChange}
              preparingCount={preparingOrders.length}
              readyCount={readyOrders.length}
              completedCount={completedOrders.length}
            />

            {/* Контент страницы */}
            <OrdersPage
              orders={currentOrders}
              title={
                activeView === 'preparing' ? 'Готовятся' :
                activeView === 'ready' ? 'Готовы к выдаче' :
                'Завершенные'
              }
              color={
                activeView === 'preparing' ? '#3b82f6' :
                activeView === 'ready' ? '#f59e0b' :
                '#6b7280'
              }
              icon={
                activeView === 'preparing' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ) : activeView === 'ready' ? (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                )
              }
              onOrderAction={handleOrderAction}
              onShowDetails={handleShowDetails}
              emptyMessage={
                activeView === 'preparing' ? 'Нет заказов в приготовлении' :
                activeView === 'ready' ? 'Нет готовых заказов' :
                'Нет завершенных заказов'
              }
              emptyIcon={
                activeView === 'preparing' ? '🍳' :
                activeView === 'ready' ? '📦' :
                '✅'
              }
            />
          </>
        )}
      </div>

      {/* Модальное окно с деталями заказа */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetails}
      />
    </div>
  );
};

export default CashierDashboardPage;
