import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import type { WebSocketMessage } from './useWebSocket';
import { useOperatorAuth } from '../context/OperatorAuthContext';
import { useSoundNotifications } from '../components/operator/SoundNotificationManager';
import { useNotifications } from '../components/operator/SimpleNotificationManager';
import { useSimpleMobileSound } from './useSimpleMobileSound';
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
  const { playSound, config } = useSoundNotifications();
  const { playSound: playSimpleMobileSound } = useSimpleMobileSound();
  const { sendOrderNotification } = useNotifications();
  const [operatorId, setOperatorId] = useState<number | null>(null);

  const buildWsBase = (override?: string): string => {
    const isHttps = window.location.protocol === 'https:';
    const wsProtocol = isHttps ? 'wss:' : 'ws:';

    if (override && override.trim()) {
      const raw = override.trim();
      if (raw.startsWith('ws://') || raw.startsWith('wss://')) {
        return raw.replace(/^http(s)?:/, wsProtocol);
      }
      if (raw.startsWith('http://') || raw.startsWith('https://')) {
        try {
          const u = new URL(raw);
          return `${wsProtocol}//${u.host}`;
        } catch {
          return `${wsProtocol}//${raw.replace(/^\/*/, '')}`;
        }
      }
      return `${wsProtocol}//${raw.replace(/^\/*/, '')}`;
    }

    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `${wsProtocol}//localhost:8000`;
    }

    return `${wsProtocol}//api.babayfood.uz`;
  };

  // Определяем URL для WebSocket
  const getWebSocketUrl = useCallback(() => {
    const envWs = (import.meta as any)?.env?.VITE_WEBSOCKET_URL as string | undefined;
    const baseUrl = buildWsBase(envWs);

    if (operatorId) {
      return `${baseUrl}/ws/operator/${operatorId}/`;
    }
    return `${baseUrl}/ws/operator/`;
  }, [operatorId]);

  // Обработчик сообщений WebSocket
  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('📨 Operator WebSocket message:', message);
    console.log('📨 Message type:', message.type);
    console.log('📨 Sound config:', { enabled: config?.enabled });

    switch (message.type) {
      case 'order_created':
        if ((message as any).order) {
          console.log('🆕 New order received:', (message as any).order);
          
          // Отправляем Push-уведомление
          const order = (message as any).order;
          sendOrderNotification(order.id, 'new', {
            orderData: order,
            timestamp: Date.now()
          });
          
          // Воспроизводим звук для нового заказа (независимо от наличия callback)
          if (config?.enabled) {
            try {
              console.log('🔊 Attempting to play new order sound...');
              
              // Определяем тип устройства
              const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              const screenMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
              const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
              const isMobile = userAgentMobile || (screenMobile && hasTouch);
              
              if (isMobile) {
                console.log('🔊 Using mobile sound system...');
                playSimpleMobileSound('new_order');
              } else {
                console.log('🔊 Using desktop sound system...');
                playSound('new_order');
              }
              
              console.log('🔊 New order sound played successfully');
            } catch (error) {
              console.error('🔊 Error playing new order sound:', error);
            }
          } else {
            console.log('🔊 Sound disabled, skipping new order sound');
          }
          
          // Вызываем callback если он есть
          if (onOrderCreated) {
            onOrderCreated((message as any).order);
          }
        }
        break;

      case 'order_updated':
        if ((message as any).order_id) {
          console.log('🔄 Order updated:', (message as any).order_id, (message as any).status);
          
          // Отправляем Push-уведомление
          const orderId = (message as any).order_id;
          const status = (message as any).status;
          sendOrderNotification(orderId, 'update', {
            status,
            timestamp: Date.now()
          });
          
          // Воспроизводим звук для обновления заказа (независимо от наличия callback)
          if (config?.enabled) {
            try {
              console.log('🔊 Attempting to play order update sound...');
              
              // Определяем тип устройства
              const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              const screenMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
              const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
              const isMobile = userAgentMobile || (screenMobile && hasTouch);
              
              if (isMobile) {
                playSimpleMobileSound('order_update');
              } else {
                playSound('order_update');
              }
              
              console.log('🔊 Order update sound played successfully');
            } catch (error) {
              console.error('🔊 Error playing order update sound:', error);
            }
          } else {
            console.log('🔊 Sound disabled, skipping order update sound');
          }
          
          // Вызываем callback если он есть
          if (onOrderUpdated) {
            onOrderUpdated((message as any).order_id, (message as any).order, (message as any).status);
          }
        }
        break;

      case 'order_assigned':
        if ((message as any).order_id && (message as any).operator_id && (message as any).operator_name) {
          console.log('👤 Order assigned:', (message as any).order_id, (message as any).operator_name);
          // Воспроизводим звук для назначения заказа (независимо от наличия callback)
          if (config?.enabled) {
            try {
              console.log('🔊 Attempting to play assignment sound...');
              
              // Определяем тип устройства
              const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              const screenMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
              const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
              const isMobile = userAgentMobile || (screenMobile && hasTouch);
              
              if (isMobile) {
                playSimpleMobileSound('notification');
              } else {
                playSound('notification');
              }
              
              console.log('🔊 Assignment sound played successfully');
            } catch (error) {
              console.error('🔊 Error playing assignment sound:', error);
            }
          } else {
            console.log('🔊 Sound disabled, skipping assignment sound');
          }
          
          // Вызываем callback если он есть
          if (onOrderAssigned) {
            onOrderAssigned((message as any).order_id, (message as any).operator_id, (message as any).operator_name);
          }
        }
        break;

      case 'notification':
        if ((message as any).notification) {
          console.log('🔔 Notification received:', (message as any).notification);
          
          // Отправляем Push-уведомление
          const notification = (message as any).notification;
          sendOrderNotification(0, 'system', {
            notification,
            timestamp: Date.now()
          });
          
          // Воспроизводим звук для системных уведомлений (независимо от наличия callback)
          if (config?.enabled) {
            try {
              console.log('🔊 Attempting to play notification sound...');
              
              // Определяем тип устройства
              const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
              const screenMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
              const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
              const isMobile = userAgentMobile || (screenMobile && hasTouch);
              
              if (isMobile) {
                playSimpleMobileSound('notification');
              } else {
                playSound('notification');
              }
              
              console.log('🔊 Notification sound played successfully');
            } catch (error) {
              console.error('🔊 Error playing notification sound:', error);
            }
          } else {
            console.log('🔊 Sound disabled, skipping notification sound');
          }
          
          // Вызываем callback если он есть
          if (onNotification) {
            onNotification((message as any).notification);
          }
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
  }, [onOrderCreated, onOrderUpdated, onOrderAssigned, onNotification, onDashboardUpdate, playSound, playSimpleMobileSound, config?.enabled, operatorId]);

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
      const timer = setTimeout(() => {
        subscribeToOrders();
      }, 1000);

    return () => clearTimeout(timer);
    }
  }, [isConnected, subscribeToOrders]);

  // Экспортируем функции для отладки
  useEffect(() => {
    (window as any).testOperatorSound = (type: 'new_order' | 'order_update' | 'notification' = 'new_order') => {
      console.log('🔊 Testing operator sound:', type);
      console.log('🔊 Sound config:', { enabled: config?.enabled });
      
      if (config?.enabled) {
        // Определяем тип устройства
        const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const screenMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const isMobile = userAgentMobile || (screenMobile && hasTouch);
        
        if (isMobile) {
          console.log('🔊 Testing mobile sound...');
          playSimpleMobileSound(type);
        } else {
          console.log('🔊 Testing desktop sound...');
          playSound(type);
        }
      } else {
        console.log('🔊 Sound disabled');
      }
    };
    
    console.log('🔊 testOperatorSound function exported to window');
  }, [config?.enabled, playSound, playSimpleMobileSound]);

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
