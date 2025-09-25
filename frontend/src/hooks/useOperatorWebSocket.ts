import { useCallback, useEffect, useState } from 'react';
import { useWebSocket } from './useWebSocket';
import type { WebSocketMessage } from './useWebSocket';
import { useOperatorAuth } from '../context/OperatorAuthContext';
import { useSoundNotifications } from '../components/operator/SoundNotificationManager';
import { usePWASound } from './usePWASound';
import { useMobileSound } from './useMobileSound';
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
  const { playSoundSafe, isPWA } = usePWASound();
  const { playSoundSafe: playMobileSoundSafe, isMobile } = useMobileSound();
  const { playSound: playSimpleMobileSound } = useSimpleMobileSound();
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
    console.log('📨 Device info:', { isMobile, isPWA });
    console.log('📨 Sound config:', { enabled: config?.enabled });

    switch (message.type) {
      case 'order_created':
        if ((message as any).order) {
          console.log('🆕 New order received:', (message as any).order);
          // Воспроизводим звук для нового заказа (независимо от наличия callback)
          if (config?.enabled) {
            try {
              console.log('🔊 Attempting to play new order sound...');
              console.log('🔊 Device detection:', { isMobile, isPWA });
              console.log('🔊 Available sound functions:', {
                playSound: typeof playSound,
                playSoundSafe: typeof playSoundSafe,
                playMobileSoundSafe: typeof playMobileSoundSafe,
                playSimpleMobileSound: typeof playSimpleMobileSound,
                windowPlayMobileSound: typeof (window as any).playMobileSound
              });
              console.log('🔊 Sound settings:', {
                newOrderSound: config?.newOrderSound,
                orderUpdateSound: config?.orderUpdateSound,
                notificationSound: config?.notificationSound,
                volume: config?.volume
              });
              console.log('🔊 Initialization status:', {
                pwaInitialized: localStorage.getItem('pwa_sound_initialized'),
                mobileInitialized: localStorage.getItem('mobile_sound_initialized'),
                mobileSimpleInitialized: localStorage.getItem('mobile_sound_simple_initialized')
              });
              console.log('🔊 AudioContext status:', {
                exists: !!window.audioContext,
                state: window.audioContext?.state,
                sampleRate: window.audioContext?.sampleRate
              });
              
              if (isMobile) {
                console.log('🔊 Using mobile sound system...');
                
                // Пробуем простую мобильную систему сначала
                console.log('🔊 Calling playSimpleMobileSound...');
                try {
                  playSimpleMobileSound('new_order');
                  console.log('🔊 playSimpleMobileSound called successfully');
                } catch (error) {
                  console.error('🔊 playSimpleMobileSound failed:', error);
                }
                
                // Также пробуем сложную систему как fallback
                console.log('🔊 Calling playMobileSoundSafe...');
                try {
                  playMobileSoundSafe('new_order');
                  console.log('🔊 playMobileSoundSafe called successfully');
                } catch (error) {
                  console.error('🔊 playMobileSoundSafe failed:', error);
                }
                
                // Дополнительный fallback к глобальной функции
                if ((window as any).playMobileSound) {
                  console.log('🔊 Calling global playMobileSound...');
                  try {
                    (window as any).playMobileSound('new_order');
                    console.log('🔊 Global playMobileSound called successfully');
                  } catch (error) {
                    console.error('🔊 Global playMobileSound failed:', error);
                  }
                } else {
                  console.warn('🔊 Global playMobileSound not available');
                }
              } else if (isPWA) {
                console.log('🔊 Using PWA sound system...');
                playSoundSafe('new_order');
              } else {
                console.log('🔊 Using desktop sound system...');
                playSound('new_order');
              }
              
              // Дополнительная проверка для мобильных PWA
              if (isPWA && !isMobile) {
                console.log('🔊 PWA mode detected, checking if mobile...');
                const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
                const screenMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
                const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
                const isActuallyMobile = userAgentMobile || (screenMobile && hasTouch);
                
                if (isActuallyMobile) {
                  console.log('🔊 Actually mobile device in PWA mode, using mobile sounds...');
                  try {
                    playSimpleMobileSound('new_order');
                    playMobileSoundSafe('new_order');
                    if ((window as any).playMobileSound) {
                      (window as any).playMobileSound('new_order');
                    }
                  } catch (error) {
                    console.error('🔊 Mobile PWA sound failed:', error);
                  }
                }
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
          // Воспроизводим звук для обновления заказа (независимо от наличия callback)
          if (config?.enabled) {
            try {
              console.log('🔊 Attempting to play order update sound...');
              if (isMobile) {
                // Пробуем простую мобильную систему сначала
                playSimpleMobileSound('order_update');
                // Также пробуем сложную систему как fallback
                playMobileSoundSafe('order_update');
              } else if (isPWA) {
                playSoundSafe('order_update');
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
              if (isMobile) {
                // Пробуем простую мобильную систему сначала
                playSimpleMobileSound('notification');
                // Также пробуем сложную систему как fallback
                playMobileSoundSafe('notification');
              } else if (isPWA) {
                playSoundSafe('notification');
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
          // Воспроизводим звук для системных уведомлений (независимо от наличия callback)
          if (config?.enabled) {
            try {
              console.log('🔊 Attempting to play notification sound...');
              if (isMobile) {
                // Пробуем простую мобильную систему сначала
                playSimpleMobileSound('notification');
                // Также пробуем сложную систему как fallback
                playMobileSoundSafe('notification');
              } else if (isPWA) {
                playSoundSafe('notification');
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
  }, [onOrderCreated, onOrderUpdated, onOrderAssigned, onNotification, onDashboardUpdate, playSound, playSoundSafe, isPWA, playMobileSoundSafe, isMobile, playSimpleMobileSound]);

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
      console.log('🔊 Device detection:', { isMobile, isPWA });
      console.log('🔊 Sound config:', { enabled: config?.enabled });
      
      if (config?.enabled) {
        if (isMobile) {
          console.log('🔊 Testing mobile sound...');
          if ((window as any).playMobileSound) {
            (window as any).playMobileSound(type);
          } else {
            console.warn('🔊 Global playMobileSound not available');
          }
        } else if (isPWA) {
          console.log('🔊 Testing PWA sound...');
          playSoundSafe(type);
        } else {
          console.log('🔊 Testing desktop sound...');
          playSound(type);
        }
      } else {
        console.log('🔊 Sound disabled');
      }
    };
    
    console.log('🔊 testOperatorSound function exported to window');
  }, [isMobile, isPWA, config?.enabled, playSound, playSoundSafe]);

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
