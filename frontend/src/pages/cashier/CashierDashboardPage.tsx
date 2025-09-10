import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { cashierApi, type CashierData, type Order } from '../../api/cashierApi';
import { OrderColumn } from '../../components/cashier/OrderColumn';
import { OrderDetailsModal } from '../../components/cashier/OrderDetailsModal';
import { OrderSearch } from '../../components/cashier/OrderSearch';
import { CashierNavigation, type CashierViewType } from '../../components/cashier/CashierNavigation';
import { OrdersPage } from '../../components/cashier/OrdersPage';
import { CashierInfo } from '../../components/cashier/CashierInfo';
import { useCashierWebSocket } from '../../hooks/useCashierWebSocket';



export const CashierDashboardPage: React.FC = () => {
  const [cashierData, setCashierData] = useState<CashierData | null>(null);
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


  const handleDashboardUpdate = useCallback((newStats: any) => {
    console.log('📊 Dashboard stats updated via WebSocket:', newStats);
    // Статистика больше не отображается, но логируем для отладки
  }, []);

  // Инициализируем WebSocket
  const {
    isConnected,
    isConnecting,
    error: wsError
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
    console.log('🔍 Checking authentication...');
    const isAuth = cashierApi.isAuthenticated();
    console.log('🔐 Is authenticated:', isAuth);
    
    if (!isAuth) {
      console.log('❌ Not authenticated, redirecting to login...');
      navigate('/cashier/login');
      return;
    }

    const cashierData = cashierApi.getCashierData();
    console.log('👤 Cashier data:', cashierData);
    
    if (!cashierData) {
      console.log('❌ No cashier data, redirecting to login...');
      navigate('/cashier/login');
      return;
    }

    console.log('✅ Authentication successful, setting cashier data...');
    setCashierData(cashierData);
    fetchDashboardData();
  }, [navigate]);

  // Обработчик кнопки "Назад" для PWA - улучшенная версия
  useEffect(() => {
    let backButtonPressed = false;
    
    const handleBackButton = (event: PopStateEvent) => {
      console.log('🔙 Back button pressed in PWA');
      event.preventDefault();
      backButtonPressed = true;
      
      // Проверяем, является ли это PWA или планшет
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isTablet = /Android|iPad|Tablet/i.test(navigator.userAgent);
      const isPWA = isStandalone || isIOSStandalone || isTablet;
      
      console.log('📱 PWA/Tablet detection:', {
        standalone: isStandalone,
        navigatorStandalone: isIOSStandalone,
        isTablet,
        userAgent: navigator.userAgent,
        referrer: document.referrer,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
        isPWA,
        historyLength: window.history.length
      });
      
      if (isPWA) {
        console.log('📱 Attempting to close PWA/Tablet app...');
        
        // Способ 1: Попробуем закрыть окно
        const tryCloseWindow = () => {
          try {
            window.close();
            console.log('✅ window.close() executed');
          } catch (error) {
            console.log('❌ window.close() failed:', error);
          }
        };
        
        // Способ 2: Попробуем открыть пустую страницу
        const tryBlankPage = () => {
          try {
            window.location.replace('about:blank');
            console.log('✅ Redirected to about:blank');
          } catch (error) {
            console.log('❌ about:blank failed:', error);
          }
        };
        
        // Способ 3: Попробуем открыть внешнюю ссылку
        const tryExternalLink = () => {
          try {
            window.location.href = 'https://www.google.com';
            console.log('✅ Redirected to external site');
          } catch (error) {
            console.log('❌ External redirect failed:', error);
          }
        };
        
        // Выполняем все способы последовательно
        tryCloseWindow();
        
        // Если через 100ms не закрылось, пробуем другие способы
        setTimeout(() => {
          if (!backButtonPressed) return;
          tryBlankPage();
        }, 100);
        
        setTimeout(() => {
          if (!backButtonPressed) return;
          tryExternalLink();
        }, 200);
        
      } else {
        console.log('🌐 Not PWA/Tablet, normal back navigation');
        window.history.back();
      }
    };

    // Обработчик изменения видимости страницы
    const handleVisibilityChange = () => {
      if (document.hidden && backButtonPressed) {
        console.log('📱 Page became hidden, PWA might be closing');
        backButtonPressed = false;
      }
    };

    // Обработчик фокуса/блура окна
    const handleWindowBlur = () => {
      if (backButtonPressed) {
        console.log('📱 Window lost focus, PWA might be closing');
        backButtonPressed = false;
      }
    };

    // Обработчик для Android back button через keydown
    const handleKeyDown = (event: KeyboardEvent) => {
      // Android back button обычно имеет keyCode 4 или key 'Backspace'
      if (event.key === 'Backspace' || event.keyCode === 4) {
        console.log('🔙 Android back button detected via keydown');
        event.preventDefault();
        backButtonPressed = true;
        
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        const isIOSStandalone = (window.navigator as any).standalone === true;
        const isTablet = /Android|iPad|Tablet/i.test(navigator.userAgent);
        const isPWA = isStandalone || isIOSStandalone || isTablet;
        
        if (isPWA) {
          console.log('📱 Closing PWA via Android back button...');
          try {
            window.close();
          } catch (error) {
            console.log('❌ Android back button close failed:', error);
          }
        }
      }
    };

    // Обработчик beforeunload для PWA
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone === true;
      const isTablet = /Android|iPad|Tablet/i.test(navigator.userAgent);
      const isPWA = isStandalone || isIOSStandalone || isTablet;
      
      if (isPWA && backButtonPressed) {
        console.log('📱 beforeunload triggered for PWA');
        // Не показываем диалог подтверждения для PWA
        event.preventDefault();
        event.returnValue = '';
      }
    };

    // Добавляем все обработчики
    window.addEventListener('popstate', handleBackButton);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('beforeunload', handleBeforeUnload);

    // Добавляем запись в историю для перехвата кнопки "Назад"
    window.history.pushState({ page: 'cashier-dashboard' }, '', window.location.href);

    return () => {
      window.removeEventListener('popstate', handleBackButton);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const fetchDashboardData = async () => {
    try {
      const ordersData = await cashierApi.getOrders();
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
      
      // Статистика больше не отображается, но логируем действие
      console.log(`⚡ Order action completed: ${action} for order ${orderId}`);
      
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
      {/* Фиксированная верхняя панель */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 py-2 sm:py-3">
          {/* Информация о кассире и ресторане */}
          <div className="flex justify-between items-center mb-3">
            <CashierInfo cashierData={cashierData} />
            
            {/* Статус соединения и кнопка выхода */}
            <div className="flex items-center space-x-3">
              {/* Статус WebSocket - упрощенный */}
              <div className="flex items-center space-x-1">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : isConnecting ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                <span className="text-xs text-gray-600">
                  {isConnected ? 'Онлайн' : isConnecting ? 'Подключение...' : 'Офлайн'}
                </span>
              </div>
              
              {/* Кнопка закрытия PWA (только для PWA) */}
              {(window.matchMedia('(display-mode: standalone)').matches || 
                (window.navigator as any).standalone === true ||
                /Android|iPad|Tablet/i.test(navigator.userAgent)) && (
                <button
                  onClick={() => {
                    console.log('📱 Manual PWA close button pressed');
                    try {
                      window.close();
                    } catch (error) {
                      console.log('❌ Manual close failed:', error);
                      // Fallback: попробуем открыть внешнюю ссылку
                      window.location.href = 'https://www.google.com';
                    }
                  }}
                  className="flex items-center space-x-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-md transition-colors text-xs sm:text-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="hidden sm:inline">Закрыть</span>
                </button>
              )}
              
              {/* Кнопка выхода */}
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 px-2 py-1.5 sm:px-3 sm:py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors text-xs sm:text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span className="hidden sm:inline">Выйти</span>
              </button>
            </div>
          </div>

          {/* Ошибки */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-2 py-1.5 sm:px-3 sm:py-2 rounded-md sm:rounded-lg shadow-sm text-xs sm:text-sm mb-3">
              {error}
            </div>
          )}

          {/* Поиск заказов */}
          <div className="mb-3">
            <OrderSearch
              onSearchResults={handleSearchResults}
              onClearSearch={handleClearSearch}
            />
          </div>

          {/* Навигация */}
          {!isSearchMode && (
            <CashierNavigation
              activeView={activeView}
              onViewChange={handleViewChange}
              preparingCount={preparingOrders.length}
              readyCount={readyOrders.length}
              completedCount={completedOrders.length}
            />
          )}
        </div>
      </div>

      {/* Отступ для фиксированной панели */}
      <div className="h-[200px] sm:h-[220px] md:h-[240px]"></div>

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

