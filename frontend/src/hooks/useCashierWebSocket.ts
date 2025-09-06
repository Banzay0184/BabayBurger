import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import type { WebSocketMessage } from './useWebSocket';
import { cashierApi, type Order, type DashboardStats } from '../api/cashierApi';

export interface CashierWebSocketMessage extends WebSocketMessage {
  type: 'order_created' | 'order_updated' | 'order_status_changed' | 'dashboard_update' | 'connection_established' | 'subscribed';
  order?: Order;
  order_id?: number;
  status?: string;
  updated_at?: string;
  stats?: DashboardStats;
  timestamp?: string;
}

export interface UseCashierWebSocketOptions {
  onOrderCreated?: (order: Order) => void;
  onOrderUpdated?: (orderId: number, order: Order | undefined, status: string | undefined) => void;
  onOrderStatusChanged?: (orderId: number, newStatus: string, orderData?: Order) => void;
  onDashboardUpdate?: (stats: DashboardStats) => void;
  enabled?: boolean;
}

export interface UseCashierWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: any) => void;
  reconnect: () => void;
  disconnect: () => void;
  subscribeToOrders: () => void;
  ping: () => void;
}

export const useCashierWebSocket = (options: UseCashierWebSocketOptions = {}): UseCashierWebSocketReturn => {
  const {
    onOrderCreated,
    onOrderUpdated,
    onOrderStatusChanged,
    onDashboardUpdate,
    enabled = true
  } = options;

  const [cashierId, setCashierId] = useState<number | null>(null);

  // Получаем данные кассира
  useEffect(() => {
    const cashierData = cashierApi.getCashierData();
    if (cashierData?.id) {
      setCashierId(cashierData.id);
    }
  }, []);

  // Определяем URL для WebSocket
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    // Всегда используем ngrok URL для WebSocket (бэкенд на ngrok)
    let baseUrl: string;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // В режиме разработки используем localhost:8000
      baseUrl = `${protocol}//localhost:8000`;
    } else {
      // В продакшене используем ngrok URL для WebSocket (бэкенд на ngrok)
      const ngrokUrl = import.meta.env.VITE_WEBSOCKET_URL || '3e3f35c1758a.ngrok-free.app';
      baseUrl = `${protocol}//${ngrokUrl}`;
    }
    
    if (cashierId) {
      return `${baseUrl}/ws/cashier/${cashierId}/`;
    }
    return `${baseUrl}/ws/cashier/`;
  }, [cashierId]);

  // Обработчик сообщений WebSocket
  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('📨 Cashier WebSocket message:', message);
    console.log('📨 Message type:', message.type);
    console.log('📨 Message data:', JSON.stringify(message, null, 2));

    switch (message.type) {
      case 'order_created':
        if ((message as any).order && onOrderCreated) {
          console.log('🆕 New order received:', (message as any).order);
          onOrderCreated((message as any).order);
        }
        break;

      case 'order_updated':
        if ((message as any).order_id && onOrderUpdated) {
          console.log('🔄 Order updated:', (message as any).order_id, (message as any).status);
          onOrderUpdated((message as any).order_id, (message as any).order, (message as any).status);
        }
        break;

      case 'order_status_changed':
        if ((message as any).order_id && (message as any).status && onOrderStatusChanged) {
          console.log('📊 Order status changed:', (message as any).order_id, (message as any).status, (message as any).order);
          console.log('📊 Calling onOrderStatusChanged with:', {
            orderId: (message as any).order_id,
            newStatus: (message as any).status,
            orderData: (message as any).order
          });
          onOrderStatusChanged((message as any).order_id, (message as any).status, (message as any).order);
        } else {
          console.log('❌ order_status_changed message missing required fields:', {
            order_id: (message as any).order_id,
            status: (message as any).status,
            hasCallback: !!onOrderStatusChanged
          });
        }
        break;

      case 'dashboard_update':
        if ((message as any).stats && onDashboardUpdate) {
          console.log('📊 Dashboard update received:', (message as any).stats);
          onDashboardUpdate((message as any).stats);
        }
        break;

      case 'connection_established':
        console.log('✅ Cashier WebSocket connection established');
        break;

      case 'subscribed':
        console.log('✅ Subscribed to cashier order updates');
        break;

      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }, [onOrderCreated, onOrderUpdated, onOrderStatusChanged, onDashboardUpdate]);

  // Обработчики событий WebSocket
  const handleOpen = useCallback(() => {
    console.log('🔌 Cashier WebSocket connected');
  }, []);

  const handleClose = useCallback(() => {
    console.log('🔌 Cashier WebSocket disconnected');
  }, []);

  const handleError = useCallback((error: Event) => {
    console.error('❌ Cashier WebSocket error:', error);
  }, []);

  // Инициализируем WebSocket
  const {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    reconnect,
    disconnect
  } = useWebSocket({
    url: getWebSocketUrl(),
    onMessage: handleMessage,
    onOpen: handleOpen,
    onClose: handleClose,
    onError: handleError,
    enabled: enabled && !!cashierId && cashierApi.isAuthenticated(),
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  });

  // Подписка на обновления заказов
  const subscribeToOrders = useCallback(() => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe_orders'
      });
    }
  }, [isConnected, sendMessage]);

  // Ping для проверки соединения
  const ping = useCallback(() => {
    if (isConnected) {
      sendMessage({
        type: 'ping',
        timestamp: Date.now()
      });
    }
  }, [isConnected, sendMessage]);

  // Автоматическая подписка на заказы при подключении
  useEffect(() => {
    if (isConnected) {
      // Небольшая задержка для стабилизации соединения
      const timer = setTimeout(() => {
        subscribeToOrders();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isConnected, subscribeToOrders]);

  return {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    reconnect,
    disconnect,
    subscribeToOrders,
    ping
  };
};

