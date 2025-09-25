import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Типы для Push-уведомлений
export interface PushNotificationConfig {
  enabled: boolean;
  newOrderNotifications: boolean;
  orderUpdateNotifications: boolean;
  systemNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

// Расширенный интерфейс для уведомлений с дополнительными опциями
export interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  actions?: NotificationAction[];
  timestamp?: number;
}

export interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

export interface PushNotificationContextType {
  config: PushNotificationConfig;
  updateConfig: (config: Partial<PushNotificationConfig>) => void;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  sendNotification: (title: string, options?: ExtendedNotificationOptions) => Promise<void>;
  sendOrderNotification: (orderId: number, type: 'new' | 'update' | 'system', data?: any) => Promise<void>;
  isSupported: boolean;
}

// Контекст для Push-уведомлений
const PushNotificationContext = createContext<PushNotificationContextType | undefined>(undefined);

// Провайдер контекста
interface PushNotificationProviderProps {
  children: React.ReactNode;
}

export const PushNotificationProvider: React.FC<PushNotificationProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<PushNotificationConfig>(() => {
    // Загружаем настройки из localStorage
    const saved = localStorage.getItem('operator_push_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Если ошибка парсинга, используем дефолтные настройки
      }
    }
    
    // Дефолтные настройки
    return {
      enabled: true,
      newOrderNotifications: true,
      orderUpdateNotifications: false,
      systemNotifications: true,
      soundEnabled: true,
      vibrationEnabled: true,
    };
  });

  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);

  // Проверяем поддержку уведомлений
  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Сохраняем настройки в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('operator_push_config', JSON.stringify(config));
  }, [config]);

  // Обновление конфигурации
  const updateConfig = useCallback((newConfig: Partial<PushNotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Запрос разрешения на уведомления
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('Push notifications not supported');
      return 'denied';
    }

    try {
      const newPermission = await Notification.requestPermission();
      setPermission(newPermission);
      console.log('Notification permission:', newPermission);
      return newPermission;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return 'denied';
    }
  }, [isSupported]);

  // Отправка обычного уведомления
  const sendNotification = useCallback(async (
    title: string, 
    options: ExtendedNotificationOptions = {}
  ): Promise<void> => {
    console.log('📱 sendNotification called:', { title, isSupported, enabled: config.enabled, permission });
    
    if (!isSupported || !config.enabled || permission !== 'granted') {
      console.warn('Cannot send notification:', { isSupported, enabled: config.enabled, permission });
      return;
    }

    try {
      // Дефолтные опции
      const defaultOptions: ExtendedNotificationOptions = {
        icon: '/logobabay.png',
        badge: '/logobabay.png',
        tag: 'operator-notification',
        requireInteraction: true,
        silent: !config.soundEnabled,
        vibrate: config.vibrationEnabled ? [200, 100, 200] : undefined,
        timestamp: Date.now(),
        ...options
      };

      // Если есть Service Worker, используем его
      if ('serviceWorker' in navigator) {
        console.log('📱 Using Service Worker for notification');
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, defaultOptions);
        console.log('📱 Service Worker notification sent:', title);
      } else {
        console.log('📱 Using fallback Notification API');
        // Fallback к обычным уведомлениям (без расширенных опций)
        const basicOptions: NotificationOptions = {
          icon: defaultOptions.icon,
          badge: defaultOptions.badge,
          tag: defaultOptions.tag,
          requireInteraction: defaultOptions.requireInteraction,
          silent: defaultOptions.silent,
        };
        new Notification(title, basicOptions);
        console.log('📱 Fallback notification sent:', title);
      }

      console.log('📱 Push notification sent successfully:', title);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [isSupported, config, permission]);

  // Отправка уведомления о заказе
  const sendOrderNotification = useCallback(async (
    orderId: number,
    type: 'new' | 'update' | 'system',
    data?: any
  ): Promise<void> => {
    console.log('📱 sendOrderNotification called:', { orderId, type, config, permission, isSupported });
    
    if (!config.enabled) {
      console.log('📱 Push notifications disabled in config');
      return;
    }

    // Проверяем, включен ли этот тип уведомлений
    switch (type) {
      case 'new':
        if (!config.newOrderNotifications) {
          console.log('📱 New order notifications disabled');
          return;
        }
        break;
      case 'update':
        if (!config.orderUpdateNotifications) {
          console.log('📱 Order update notifications disabled');
          return;
        }
        break;
      case 'system':
        if (!config.systemNotifications) {
          console.log('📱 System notifications disabled');
          return;
        }
        break;
    }

    let title: string;
    let body: string;
    let icon: string;
    let actions: NotificationAction[] = [];

    switch (type) {
      case 'new':
        title = '🆕 Новый заказ!';
        body = `Заказ #${orderId} поступил в систему`;
        icon = '/logobabay.png';
        actions = [
          { action: 'view', title: 'Посмотреть заказ', icon: '/logobabay.png' },
          { action: 'dismiss', title: 'Закрыть' }
        ];
        break;

      case 'update':
        title = '🔄 Заказ обновлен';
        body = `Заказ #${orderId} изменил статус`;
        icon = '/logobabay.png';
        actions = [
          { action: 'view', title: 'Посмотреть заказ', icon: '/logobabay.png' },
          { action: 'dismiss', title: 'Закрыть' }
        ];
        break;

      case 'system':
        title = '🔔 Системное уведомление';
        body = data?.message || 'Новое системное сообщение';
        icon = '/logobabay.png';
        actions = [
          { action: 'view', title: 'Открыть панель', icon: '/logobabay.png' },
          { action: 'dismiss', title: 'Закрыть' }
        ];
        break;

      default:
        return;
    }

    console.log('📱 About to send notification:', { title, body, orderId, type });
    
    await sendNotification(title, {
      body,
      icon,
      actions,
      data: {
        orderId,
        type,
        timestamp: Date.now(),
        ...data
      }
    });
    
    console.log('📱 Notification sent successfully for order:', orderId);
  }, [config, sendNotification]);

  const value: PushNotificationContextType = {
    config,
    updateConfig,
    permission,
    requestPermission,
    sendNotification,
    sendOrderNotification,
    isSupported,
  };

  return (
    <PushNotificationContext.Provider value={value}>
      {children}
    </PushNotificationContext.Provider>
  );
};

// Хук для использования Push-уведомлений
export const usePushNotifications = (): PushNotificationContextType => {
  const context = useContext(PushNotificationContext);
  if (context === undefined) {
    throw new Error('usePushNotifications must be used within a PushNotificationProvider');
  }
  return context;
};

// Компонент для управления настройками Push-уведомлений
export const PushNotificationSettings: React.FC = () => {
  const { 
    config, 
    updateConfig, 
    permission, 
    requestPermission, 
    isSupported,
    sendOrderNotification
  } = usePushNotifications();

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  if (!isSupported) {
    return (
      <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-red-400 text-lg">⚠️</span>
          <div>
            <h3 className="text-red-300 font-semibold">Push-уведомления не поддерживаются</h3>
            <p className="text-red-400 text-sm">
              Ваш браузер не поддерживает Push-уведомления или Service Worker
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="mr-2">📱</span>
        Push-уведомления
      </h3>
      
      <div className="space-y-4">
        {/* Статус разрешений */}
        <div className="bg-gray-700 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-300 font-medium">Разрешения браузера</span>
            <div className="flex items-center space-x-2">
              {permission === 'granted' ? (
                <span className="text-green-400 text-sm">✅ Разрешено</span>
              ) : permission === 'denied' ? (
                <span className="text-red-400 text-sm">❌ Запрещено</span>
              ) : (
                <span className="text-yellow-400 text-sm">⚠️ Не запрошено</span>
              )}
              {permission !== 'granted' && (
                <button
                  onClick={handleRequestPermission}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors"
                >
                  Запросить
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Основной переключатель */}
        <div className="flex items-center justify-between">
          <label className="text-gray-300 font-medium">Включить Push-уведомления</label>
          <button
            onClick={() => updateConfig({ enabled: !config.enabled })}
            disabled={permission !== 'granted'}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.enabled && permission === 'granted' ? 'bg-blue-600' : 'bg-gray-600'
            } ${permission !== 'granted' ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.enabled && permission === 'granted' ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Типы уведомлений */}
        <div className="space-y-3">
          <h4 className="text-gray-300 font-medium">Типы уведомлений</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">Новые заказы</label>
              <button
                onClick={() => updateConfig({ newOrderNotifications: !config.newOrderNotifications })}
                disabled={!config.enabled || permission !== 'granted'}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  config.newOrderNotifications && config.enabled && permission === 'granted' ? 'bg-green-600' : 'bg-gray-600'
                } ${!config.enabled || permission !== 'granted' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    config.newOrderNotifications && config.enabled && permission === 'granted' ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">Обновления заказов</label>
              <button
                onClick={() => updateConfig({ orderUpdateNotifications: !config.orderUpdateNotifications })}
                disabled={!config.enabled || permission !== 'granted'}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  config.orderUpdateNotifications && config.enabled && permission === 'granted' ? 'bg-green-600' : 'bg-gray-600'
                } ${!config.enabled || permission !== 'granted' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    config.orderUpdateNotifications && config.enabled && permission === 'granted' ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">Системные уведомления</label>
              <button
                onClick={() => updateConfig({ systemNotifications: !config.systemNotifications })}
                disabled={!config.enabled || permission !== 'granted'}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  config.systemNotifications && config.enabled && permission === 'granted' ? 'bg-green-600' : 'bg-gray-600'
                } ${!config.enabled || permission !== 'granted' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    config.systemNotifications && config.enabled && permission === 'granted' ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Дополнительные настройки */}
        <div className="space-y-3">
          <h4 className="text-gray-300 font-medium">Дополнительные настройки</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">Звук в уведомлениях</label>
              <button
                onClick={() => updateConfig({ soundEnabled: !config.soundEnabled })}
                disabled={!config.enabled || permission !== 'granted'}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  config.soundEnabled && config.enabled && permission === 'granted' ? 'bg-green-600' : 'bg-gray-600'
                } ${!config.enabled || permission !== 'granted' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    config.soundEnabled && config.enabled && permission === 'granted' ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">Вибрация</label>
              <button
                onClick={() => updateConfig({ vibrationEnabled: !config.vibrationEnabled })}
                disabled={!config.enabled || permission !== 'granted'}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  config.vibrationEnabled && config.enabled && permission === 'granted' ? 'bg-green-600' : 'bg-gray-600'
                } ${!config.enabled || permission !== 'granted' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    config.vibrationEnabled && config.enabled && permission === 'granted' ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Тест уведомления */}
        <div className="pt-4 border-t border-gray-700">
          <button
            onClick={() => sendOrderNotification(12345, 'new', { test: true })}
            disabled={!config.enabled || permission !== 'granted'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            📱 Тест уведомления
          </button>
        </div>
      </div>
    </div>
  );
};
