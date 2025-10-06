import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { cashierApi, type Order } from '../../api/cashierApi';
import { OrderDetailsModal } from '../../components/cashier/OrderDetailsModal';
import type { CashierViewType } from '../../components/cashier/CashierNavigation';
import { StopListModal } from '../../components/cashier/StopListModal';
import { AddOnManagementModal } from '../../components/cashier/AddOnManagementModal';
import { ReceiptPhotosModal } from '../../components/cashier/ReceiptPhotosModal';
import { useCashierWebSocket } from '../../hooks/useCashierWebSocket';
import { useCashierStore } from '../../store/cashierStore';
import { DashboardHeader } from '../../components/cashier/dashboard/DashboardHeader';
import { SearchResults } from '../../components/cashier/dashboard/SearchResults';
import { OrdersBoard } from '../../components/cashier/dashboard/OrdersBoard';



export const CashierDashboardPage: React.FC = () => {
  const cashierData = useCashierStore((s) => s.cashier);
  const orders = useCashierStore((s) => s.orders);
  const loading = useCashierStore((s) => s.loading);
  const error = useCashierStore((s) => s.error);
  const activeView = useCashierStore((s) => s.activeView);
  const setCashier = useCashierStore((s) => s.setCashier);
  const addOrUpdateOrder = useCashierStore((s) => s.addOrUpdateOrder);
  const updateOrderStatus = useCashierStore((s) => s.updateOrderStatus);
  const setActiveView = useCashierStore((s) => s.setActiveView);
  const setError = useCashierStore((s) => s.setError);
  const fetchOrders = useCashierStore((s) => s.fetchOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Order[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isStopListModalOpen, setIsStopListModalOpen] = useState(false);
  const [isAddOnManagementModalOpen, setIsAddOnManagementModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [selectedOrderForReceipts, setSelectedOrderForReceipts] = useState<Order | null>(null);
  const navigate = useNavigate();

  // WebSocket обработчики
  const fetchOrderDetails = useCallback(async (orderId: number) => {
    try {
      console.log(`🔍 Fetching details for order ${orderId}...`);
      const orderDetails = await cashierApi.getOrderDetails(orderId);
      console.log('📦 Order details fetched:', orderDetails);
      
      addOrUpdateOrder(orderDetails);
    } catch (err) {
      console.error('❌ Error fetching order details:', err);
    }
  }, []);

  const handleOrderCreated = useCallback((newOrder: Order) => {
    console.log('🆕 New order received via WebSocket:', newOrder);
    
    // Проверяем, есть ли полные данные заказа (товары и сумма)
    const hasCompleteData = newOrder.items_details && 
                           newOrder.items_details.length > 0 && 
                           newOrder.total_price && 
                           parseFloat(newOrder.total_price) > 0;
    
    if (!hasCompleteData) {
      console.log('⚠️ Данные заказа неполные, загружаем через API...');
      // Загружаем полные данные заказа через API
      fetchOrderDetails(newOrder.id);
      return;
    }
    
    addOrUpdateOrder(newOrder);
  }, [fetchOrderDetails]);

  const handleOrderUpdated = useCallback((orderId: number, updatedOrder: Order | undefined, status: string | undefined) => {
    console.log('🔄 Order updated via WebSocket:', orderId, status);
    if (updatedOrder) {
      addOrUpdateOrder(updatedOrder);
    } else if (status) {
      updateOrderStatus(orderId, status);
    }
  }, []);

  const handleOrderStatusChanged = useCallback((orderId: number, newStatus: string, orderData?: Order) => {
    console.log('📊 Order status changed via WebSocket:', orderId, newStatus, orderData);
    
    const existingOrder = orders.find(order => order.id === orderId);
    if (existingOrder) {
      if (existingOrder.status !== newStatus) {
        console.log(`🔄 WebSocket update: order #${orderId} status ${existingOrder.status} → ${newStatus}`);
        updateOrderStatus(orderId, newStatus);
      } else {
        console.log(`✅ WebSocket update: order #${orderId} already has status ${newStatus}`);
      }
    } else {
      if (orderData) {
        console.log('🆕 Adding new order from WebSocket:', orderData);
        addOrUpdateOrder(orderData);
      } else if (newStatus === 'preparing' || newStatus === 'ready_for_delivery') {
        console.log(`🆕 Order not in list but status is ${newStatus}, fetching order details...`);
        fetchOrderDetails(orderId);
      }
    }
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
    setCashier(cashierData);
    fetchOrders();
  }, [navigate]);


  const fetchDashboardData = async () => {
    await fetchOrders();
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
      const current = orders.find(o => o.id === orderId);
      if (current) {
        let newStatus = current.status;
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
        console.log(`⚡ Optimistic update: order ${orderId} status ${current.status} → ${newStatus}`);
        updateOrderStatus(orderId, newStatus);
      }
      
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

  const handleShowReceipts = useCallback((order: Order) => {
    setSelectedOrderForReceipts(order);
    setIsReceiptModalOpen(true);
  }, []);

  const handleCloseReceipts = useCallback(() => {
    setIsReceiptModalOpen(false);
    setSelectedOrderForReceipts(null);
  }, []);

  // Группируем заказы по статусам (мемоизируем выборки)
  const preparingOrders = useMemo(() => orders.filter((order: Order) => order.status === 'preparing'), [orders]);
  const readyOrders = useMemo(() => orders.filter((order: Order) => 
    order.status === 'delivering' || 
    (order.status === 'ready_for_delivery' && order.service_type === 'delivery')
  ), [orders]);
  const completedOrders = useMemo(() => orders.filter((order: Order) => 
    order.status === 'completed' || 
    (order.status === 'ready_for_delivery' && order.service_type === 'pickup')
  ), [orders]);

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

  const currentOrders = useMemo(() => getCurrentOrders(), [activeView, preparingOrders, readyOrders, completedOrders]);

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
      <DashboardHeader
        cashierData={cashierData}
        isConnected={isConnected}
        isConnecting={isConnecting}
        error={error}
        onOpenStopList={() => setIsStopListModalOpen(true)}
        onOpenAddons={() => setIsAddOnManagementModalOpen(true)}
        onLogout={handleLogout}
        onSearchResults={handleSearchResults}
        onClearSearch={handleClearSearch}
        showNavigation={!isSearchMode}
        activeView={activeView}
        counts={{
          preparing: preparingOrders.length,
          ready: readyOrders.length,
          completed: completedOrders.length
        }}
        onViewChange={handleViewChange}
      />

      {/* Отступ для фиксированной панели */}
      <div className="h-[200px] sm:h-[220px] md:h-[240px]"></div>

      {/* Навигация и контент */}
      <div className="max-w-6xl mx-auto px-2 sm:px-3 md:px-4 lg:px-6 pb-2 sm:pb-4">
        {isSearchMode ? (
          <SearchResults
            results={searchResults}
            onOrderAction={handleOrderAction}
            onShowDetails={handleShowDetails}
            onShowReceipts={handleShowReceipts}
          />
        ) : (
          <OrdersBoard
            orders={currentOrders}
            activeView={activeView}
            onOrderAction={handleOrderAction}
            onShowDetails={handleShowDetails}
            onShowReceipts={handleShowReceipts}
          />
        )}
      </div>

      {/* Модальное окно с деталями заказа */}
      <OrderDetailsModal
        order={selectedOrder}
        isOpen={isDetailsModalOpen}
        onClose={handleCloseDetails}
      />

      {/* Модальное окно стоп-листа */}
      <StopListModal
        isOpen={isStopListModalOpen}
        onClose={() => setIsStopListModalOpen(false)}
      />

      {/* Модальное окно управления дополнениями */}
      <AddOnManagementModal
        isOpen={isAddOnManagementModalOpen}
        onClose={() => setIsAddOnManagementModalOpen(false)}
      />

      {/* Модальное окно с фотографиями чеков */}
      <ReceiptPhotosModal
        isOpen={isReceiptModalOpen}
        onClose={handleCloseReceipts}
        receiptPhotos={selectedOrderForReceipts?.receipt_photos || []}
        orderId={selectedOrderForReceipts?.id || 0}
      />
    </div>
  );
};

export default CashierDashboardPage;

