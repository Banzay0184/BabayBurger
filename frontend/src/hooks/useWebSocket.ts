import { useEffect, useRef, useState, useCallback } from 'react';

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface UseWebSocketOptions {
  url: string;
  onMessage?: (message: WebSocketMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enabled?: boolean;
}

export interface UseWebSocketReturn {
  socket: WebSocket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  sendMessage: (message: any) => void;
  reconnect: () => void;
  disconnect: () => void;
}

export const useWebSocket = (options: UseWebSocketOptions): UseWebSocketReturn => {
  const {
    url,
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
    enabled = true
  } = options;

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const pingIntervalRef = useRef<number | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    if (!enabled || socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const ws = new WebSocket(url);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('🔌 WebSocket connected:', url);
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
          
          console.log('📨 WebSocket message received:', message);
          onMessage?.(message);
        } catch (err) {
          console.error('❌ Error parsing WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
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
        
        // Автоматическое переподключение только для определенных кодов ошибок
        const shouldReconnect = enabled && 
          reconnectAttempts.current < maxReconnectAttempts &&
          event.code !== 1000 && // Нормальное закрытие
          event.code !== 1001 && // Уход со страницы
          event.code !== 1005;   // Нет кода статуса
        
        if (shouldReconnect) {
          reconnectAttempts.current++;
          console.log(`🔄 Attempting to reconnect (${reconnectAttempts.current}/${maxReconnectAttempts})...`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        } else if (reconnectAttempts.current >= maxReconnectAttempts) {
          setError('Не удалось подключиться к серверу после нескольких попыток');
        } else if (event.code === 1000) {
          console.log('✅ WebSocket закрыт нормально');
        }
      };

      ws.onerror = (event) => {
        console.error('❌ WebSocket error:', event);
        
        // Проверяем тип ошибки
        const ws = event.target as WebSocket;
        if (ws && ws.readyState === WebSocket.CLOSED) {
          setError('WebSocket соединение закрыто');
        } else {
          setError('Ошибка WebSocket соединения');
        }
        
        setIsConnecting(false);
        onError?.(event);
      };

      setSocket(ws);
    } catch (err) {
      console.error('❌ Error creating WebSocket:', err);
      setError('Ошибка создания WebSocket соединения');
      setIsConnecting(false);
    }
  }, [url, onMessage, onOpen, onClose, onError, reconnectInterval, maxReconnectAttempts, enabled]);

  const sendMessage = useCallback((message: any) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      try {
        const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
        socketRef.current.send(messageStr);
        console.log('📤 WebSocket message sent:', message);
      } catch (err) {
        console.error('❌ Error sending WebSocket message:', err);
        setError('Ошибка отправки сообщения');
      }
    } else {
      console.warn('⚠️ WebSocket is not connected, cannot send message');
      setError('WebSocket не подключен');
    }
  }, []);

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
    disconnect
  };
};
