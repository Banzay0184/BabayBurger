import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import type { WebSocketMessage } from './useWebSocket';
import { useAuth } from '../context/AuthContext';
import type { Order } from '../types/menu';

export interface ClientWebSocketMessage extends WebSocketMessage {
  type: 'order_status_update' | 'order_details_update' | 'menu_item_updated' | 'addon_updated' | 'size_updated' | 'connection_established' | 'subscribed';
  order_id?: number;
  status?: string;
  status_display?: string;
  updated_at?: string;
  order?: Order;
  item_id?: number;
  item_name?: string;
  is_active?: boolean;
  action?: string;
  timestamp?: string;
  addon_id?: number;
  addon_name?: string;
  size_id?: number;
  size_name?: string;
}

export interface UseClientWebSocketOptions {
  onOrderStatusUpdate?: (orderId: number, status: string, statusDisplay: string, updatedAt: string) => void;
  onOrderDetailsUpdate?: (order: Order) => void;
  onMenuUpdate?: (itemId: number, itemName: string, isActive: boolean, action: string) => void;
  onAddonUpdate?: (addonId: number, addonName: string, isActive: boolean, action: string) => void;
  onSizeUpdate?: (sizeId: number, sizeName: string, isActive: boolean, action: string) => void;
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
    onMenuUpdate,
    onAddonUpdate,
    onSizeUpdate,
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
      const productionUrl = import.meta.env.VITE_WEBSOCKET_URL || 'api.babayfood.uz';
      baseUrl = `${protocol}//${productionUrl}`;
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

      case 'menu_item_updated':
        if ((message as any).item_id && (message as any).item_name && onMenuUpdate) {
          console.log('🍽️ Menu item updated:', (message as any).item_name, (message as any).action);
          onMenuUpdate(
            (message as any).item_id,
            (message as any).item_name,
            (message as any).is_active,
            (message as any).action
          );
        }
        break;

      case 'addon_updated':
        if ((message as any).addon_id && (message as any).addon_name && onAddonUpdate) {
          console.log('➕ AddOn updated:', (message as any).addon_name, (message as any).action);
          onAddonUpdate(
            (message as any).addon_id,
            (message as any).addon_name,
            (message as any).is_active,
            (message as any).action
          );
        }
        break;

      case 'size_updated':
        if ((message as any).size_id && (message as any).size_name && onSizeUpdate) {
          console.log('📏 Size updated:', (message as any).size_name, (message as any).action);
          onSizeUpdate(
            (message as any).size_id,
            (message as any).size_name,
            (message as any).is_active,
            (message as any).action
          );
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
  }, [onOrderStatusUpdate, onOrderDetailsUpdate, onMenuUpdate, onAddonUpdate, onSizeUpdate]);

  // Обработчики событий WebSocket
  const handleOpen = useCallback(() => {
    console.log('🔌 Client WebSocket connected');
    // Сбрасываем счетчик ошибок при успешном подключении
    setErrorCount(0);
  }, []);

  const handleClose = useCallback(() => {
    console.log('🔌 Client WebSocket disconnected');
  }, []);

  const handleError = useCallback((error: Event) => {
    console.error('❌ Client WebSocket error:', error);
    
    // Увеличиваем счетчик ошибок
    setErrorCount(prev => {
      const newCount = prev + 1;
      
      // Если слишком много ошибок подряд, отключаем WebSocket
      if (newCount >= 3) {
        console.log('🔄 Слишком много ошибок WebSocket, переключаемся на polling...');
        setWebsocketFailed(true);
      }
      
      return newCount;
    });
  }, []);

  // WebSocket включен, но с fallback на polling при ошибках
  const [websocketFailed, setWebsocketFailed] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const shouldEnableWebSocket = enabled && !!authState.user && !!telegramId && !websocketFailed;
  
  // Логируем текущий счетчик ошибок для отладки
  console.log('🔍 WebSocket error count:', errorCount);
  console.log('🔍 WebSocket should enable:', shouldEnableWebSocket, 'telegramId:', telegramId);

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
    reconnectInterval: 5000, // Увеличиваем интервал до 5 секунд
    maxReconnectAttempts: 5 // Уменьшаем количество попыток
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
    setErrorCount(0); // Сбрасываем счетчик ошибок
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
