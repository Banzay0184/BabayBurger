import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import type { WebSocketMessage } from './useWebSocket';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types/menu';

export interface ClientWebSocketMessage extends WebSocketMessage {
  type: 'order_status_update' | 'order_details_update' | 'connection_established' | 'subscribed';
  order_id?: number;
  status?: string;
  status_display?: string;
  updated_at?: string;
  order?: Order;
  timestamp?: string;
}

export interface UseClientWebSocketOptions {
  onOrderStatusUpdate?: (orderId: number, status: string, statusDisplay: string, updatedAt: string) => void;
  onOrderDetailsUpdate?: (order: Order) => void;
  enabled?: boolean;
}

export interface UseClientWebSocketReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: any) => void;
  reconnect: () => void;
  disconnect: () => void;
  subscribeToOrder: (orderId: number) => void;
  ping: () => void;
  websocketFailed: boolean;
  retryWebSocket: () => void;
}

export const useClientWebSocket = (options: UseClientWebSocketOptions = {}): UseClientWebSocketReturn => {
  const {
    onOrderStatusUpdate,
    onOrderDetailsUpdate,
    enabled = true
  } = options;

  const { state: authState } = useAuth();
  const [telegramId, setTelegramId] = useState<number | null>(null);

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
    
    if (telegramId) {
      return `${baseUrl}/ws/client/${telegramId}/`;
    }
    return `${baseUrl}/ws/client/`;
  }, [telegramId]);

  // Обработчик сообщений WebSocket
  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('📨 Client WebSocket message:', message);

    switch (message.type) {
      case 'order_status_update':
        if ((message as any).order_id && (message as any).status && (message as any).status_display && (message as any).updated_at && onOrderStatusUpdate) {
          console.log('🔄 Order status updated:', (message as any).order_id, (message as any).status);
          onOrderStatusUpdate((message as any).order_id, (message as any).status, (message as any).status_display, (message as any).updated_at);
        }
        break;

      case 'order_details_update':
        if ((message as any).order && onOrderDetailsUpdate) {
          console.log('📋 Order details updated:', (message as any).order.id);
          onOrderDetailsUpdate((message as any).order);
        }
        break;

      case 'connection_established':
        console.log('✅ Client WebSocket connection established');
        break;

      case 'subscribed':
        console.log('✅ Subscribed to order updates');
        break;

      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }, [onOrderStatusUpdate, onOrderDetailsUpdate]);

  // Обработчики событий WebSocket
  const handleOpen = useCallback(() => {
    console.log('🔌 Client WebSocket connected');
  }, []);

  const handleClose = useCallback(() => {
    console.log('🔌 Client WebSocket disconnected');
  }, []);

  const handleError = useCallback((error: Event) => {
    console.error('❌ Client WebSocket error:', error);
    console.log('🔄 WebSocket не поддерживается, переключаемся на polling...');
    setWebsocketFailed(true);
  }, []);

  // WebSocket включен, но с fallback на polling при ошибках
  const [websocketFailed, setWebsocketFailed] = useState(false);
  const shouldEnableWebSocket = enabled && !!authState.user && !websocketFailed;

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
    enabled: shouldEnableWebSocket,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10
  });

  // Получаем telegram_id из контекста авторизации
  useEffect(() => {
    if (authState.user?.telegram_id) {
      setTelegramId(authState.user.telegram_id);
    }
  }, [authState.user]);

  // Подписка на обновления конкретного заказа
  const subscribeToOrder = useCallback((orderId: number) => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe_order',
        order_id: orderId
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

  // Автоматическая подписка на все заказы пользователя при подключении
  useEffect(() => {
    if (isConnected && telegramId) {
      // Небольшая задержка для стабилизации соединения
      const timer = setTimeout(() => {
        sendMessage({
          type: 'subscribe_user_orders',
          telegram_id: telegramId
        });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isConnected, telegramId, sendMessage]);

  const retryWebSocket = useCallback(() => {
    console.log('🔄 Попытка переподключения WebSocket...');
    setWebsocketFailed(false);
  }, []);

  return {
    isConnected,
    isConnecting,
    error,
    sendMessage,
    reconnect,
    disconnect,
    subscribeToOrder,
    ping,
    websocketFailed,
    retryWebSocket
  };
};
