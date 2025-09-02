import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import type { WebSocketMessage } from './useWebSocket';
import { useOperatorAuth } from '../context/OperatorAuthContext';
import type { OrderForOperator, OperatorNotification } from '../types/operator';

export interface OperatorWebSocketMessage extends WebSocketMessage {
  type: 'order_created' | 'order_updated' | 'order_assigned' | 'notification' | 'dashboard_update' | 'connection_established' | 'subscribed';
  order?: OrderForOperator;
  order_id?: number;
  status?: string;
  updated_at?: string;
  operator_id?: number;
  operator_name?: string;
  notification?: OperatorNotification;
  stats?: any;
  timestamp?: string;
}

export interface UseOperatorWebSocketOptions {
  onOrderCreated?: (order: OrderForOperator) => void;
  onOrderUpdated?: (orderId: number, order: OrderForOperator | undefined, status: string | undefined) => void;
  onOrderAssigned?: (orderId: number, operatorId: number, operatorName: string) => void;
  onNotification?: (notification: OperatorNotification) => void;
  onDashboardUpdate?: (stats: any) => void;
  enabled?: boolean;
}

export interface UseOperatorWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: any) => void;
  reconnect: () => void;
  disconnect: () => void;
  subscribeToOrders: () => void;
  ping: () => void;
}

export const useOperatorWebSocket = (options: UseOperatorWebSocketOptions = {}): UseOperatorWebSocketReturn => {
  const {
    onOrderCreated,
    onOrderUpdated,
    onOrderAssigned,
    onNotification,
    onDashboardUpdate,
    enabled = true
  } = options;

  const { state: authState } = useOperatorAuth();
  const [operatorId, setOperatorId] = useState<number | null>(null);

  // Определяем URL для WebSocket
  const getWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Используем порт бэкенда (8000) вместо фронтенда (5173)
    const baseUrl = `${protocol}//localhost:8000`;
    
    if (operatorId) {
      return `${baseUrl}/ws/operator/${operatorId}/`;
    }
    return `${baseUrl}/ws/operator/`;
  }, [operatorId]);

  // Обработчик сообщений WebSocket
  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('📨 Operator WebSocket message:', message);

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

      case 'order_assigned':
        if ((message as any).order_id && (message as any).operator_id && (message as any).operator_name && onOrderAssigned) {
          console.log('👤 Order assigned:', (message as any).order_id, (message as any).operator_name);
          onOrderAssigned((message as any).order_id, (message as any).operator_id, (message as any).operator_name);
        }
        break;

      case 'notification':
        if ((message as any).notification && onNotification) {
          console.log('🔔 Notification received:', (message as any).notification);
          onNotification((message as any).notification);
        }
        break;

      case 'dashboard_update':
        if ((message as any).stats && onDashboardUpdate) {
          console.log('📊 Dashboard update received:', (message as any).stats);
          onDashboardUpdate((message as any).stats);
        }
        break;

      case 'connection_established':
        console.log('✅ WebSocket connection established');
        break;

      case 'subscribed':
        console.log('✅ Subscribed to order updates');
        break;

      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }, [onOrderCreated, onOrderUpdated, onOrderAssigned, onNotification, onDashboardUpdate]);

  // Обработчики событий WebSocket
  const handleOpen = useCallback(() => {
    console.log('🔌 Operator WebSocket connected');
  }, []);

  const handleClose = useCallback(() => {
    console.log('🔌 Operator WebSocket disconnected');
  }, []);

  const handleError = useCallback((error: Event) => {
    console.error('❌ Operator WebSocket error:', error);
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
    enabled: enabled && !!authState.operator,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  });

  // Получаем ID оператора из контекста авторизации
  useEffect(() => {
    if (authState.operator?.id) {
      setOperatorId(authState.operator.id);
    }
  }, [authState.operator]);

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
