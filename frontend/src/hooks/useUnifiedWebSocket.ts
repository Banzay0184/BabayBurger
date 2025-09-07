import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface UseUnifiedWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enabled?: boolean;
  // Дополнительные опции для разных типов WebSocket
  authType?: 'client' | 'operator' | 'cashier';
  userId?: number | string;
}

export interface UseUnifiedWebSocketReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: any) => void;
  reconnect: () => void;
  disconnect: () => void;
  subscribeToOrders: () => void;
  subscribeToOrder: (orderId: number) => void;
  subscribeToUserOrders: (userId: number | string) => void;
  ping: () => void;
}

export const useUnifiedWebSocket = (options: UseUnifiedWebSocketOptions): UseUnifiedWebSocketReturn => {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    enabled = true,
    authType = 'client',
    userId
  } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Генерируем URL для WebSocket в зависимости от типа
  const generateWebSocketUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    
    let baseUrl: string;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      baseUrl = `${protocol}//localhost:8000`;
    } else {
      // В продакшене используем ваш развернутый API
      const productionUrl = import.meta.env.VITE_WEBSOCKET_URL || 'api.babayfood.uz';
      baseUrl = `${protocol}//${productionUrl}`;
    }

    // Если передан кастомный URL, используем его
    if (url) {
      return url;
    }

    // Генерируем URL в зависимости от типа авторизации
    switch (authType) {
      case 'client':
        return userId ? `${baseUrl}/ws/client/${userId}/` : `${baseUrl}/ws/client/`;
      case 'operator':
        return userId ? `${baseUrl}/ws/operator/${userId}/` : `${baseUrl}/ws/operator/`;
      case 'cashier':
        return userId ? `${baseUrl}/ws/cashier/${userId}/` : `${baseUrl}/ws/cashier/`;
      default:
        return baseUrl;
    }
  }, [url, authType, userId]);

  const connect = useCallback(() => {
    if (!enabled || socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const wsUrl = generateWebSocketUrl();
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log(`🔌 ${authType} WebSocket connected:`, wsUrl);
        setIsConnected(true);
        setIsConnecting(false);
        setError(null);
        reconnectAttempts.current = 0;
        
        // Отправляем ping для проверки соединения
        const pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
              type: 'ping',
              timestamp: Date.now()
            }));
          }
        }, 30000); // каждые 30 секунд
        
        pingIntervalRef.current = pingInterval;
        
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          // Обрабатываем pong ответы
          if (message.type === 'pong') {
            console.log('🏓 WebSocket pong received');
            return;
          }
          
          console.log(`📨 ${authType} WebSocket message received:`, message);
          onMessage?.(message);
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log(`🔌 ${authType} WebSocket disconnected:`, event.code, event.reason);
        setIsConnected(false);
        setIsConnecting(false);
        setSocket(null);
        socketRef.current = null;
        
        // Очищаем ping интервал
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        onClose?.();
        
        // Автоматическое переподключение
        if (enabled && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          console.log(`🔄 Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Не удалось подключиться к серверу после нескольких попыток');
        }
      };

      ws.onerror = (event) => {
        console.error(`❌ ${authType} WebSocket error:`, event);
        setError('Ошибка WebSocket соединения');
        setIsConnecting(false);
        onError?.(event);
      };

      setSocket(ws);
    } catch (err) {
      console.error('❌ Error creating WebSocket:', err);
      setError('Ошибка создания WebSocket соединения');
      setIsConnecting(false);
    }
  }, [enabled, generateWebSocketUrl, authType, onMessage, onOpen, onClose, onError, reconnectInterval, maxReconnectAttempts]);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        socketRef.current.send(messageStr);
        console.log(`📤 ${authType} WebSocket message sent:`, message);
      } catch (err) {
        console.error('❌ Error sending WebSocket message:', err);
        setError('Ошибка отправки сообщения');
      }
    } else {
      console.warn('⚠️ WebSocket is not connected, cannot send message');
      setError('WebSocket не подключен');
    }
  }, [authType]);

  const reconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close();
    }
    
    reconnectAttempts.current = 0;
    connect();
  }, [connect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
    
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }
    
    setIsConnected(false);
    setIsConnecting(false);
    setSocket(null);
  }, []);

  // Специфичные методы для подписки
  const subscribeToOrders = useCallback(() => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe_orders'
      });
    }
  }, [isConnected, sendMessage]);

  const subscribeToOrder = useCallback((orderId: number) => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe_order',
        order_id: orderId
      });
    }
  }, [isConnected, sendMessage]);

  const subscribeToUserOrders = useCallback((userId: number | string) => {
    if (isConnected) {
      sendMessage({
        type: 'subscribe_user_orders',
        user_id: userId
      });
    }
  }, [isConnected, sendMessage]);

  const ping = useCallback(() => {
    if (isConnected) {
      sendMessage({
        type: 'ping',
        timestamp: Date.now()
      });
    }
  }, [isConnected, sendMessage]);

  useEffect(() => {
    if (enabled) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [enabled, connect, disconnect]);

  return {
    socket,
    isConnected,
    isConnecting,
    error,
    sendMessage,
    reconnect,
    disconnect,
    subscribeToOrders,
    subscribeToOrder,
    subscribeToUserOrders,
    ping
  };
};
