// Простая система уведомлений для оператора
// Работает с локальными уведомлениями, но показывает их даже когда вкладка неактивна

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Типы для уведомлений
export interface NotificationConfig {
  enabled: boolean;
  newOrderNotifications: boolean;
  orderUpdateNotifications: boolean;
  systemNotifications: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export interface NotificationContextType {
  config: NotificationConfig;
  updateConfig: (config: Partial<NotificationConfig>) => void;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  sendNotification: (title: string, options?: NotificationOptions) => Promise<void>;
  sendOrderNotification: (orderId: number, type: 'new' | 'update' | 'system', data?: any) => Promise<void>;
  isSupported: boolean;
  isSubscribed: boolean;
}

// Контекст для уведомлений
const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Провайдер контекста
interface NotificationProviderProps {
  children: React.ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<NotificationConfig>(() => {
    const saved = localStorage.getItem('operator_notification_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Если ошибка парсинга, используем дефолтные настройки
      }
    }
    
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
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Сохраняем настройки в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('operator_notification_config', JSON.stringify(config));
  }, [config]);

  // Обновление конфигурации
  const updateConfig = useCallback((newConfig: Partial<NotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Запрос разрешения на уведомления
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('Notifications not supported');
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
    options: NotificationOptions = {}
  ): Promise<void> => {
    if (!isSupported || !config.enabled || permission !== 'granted') {
      console.warn('Cannot send notification:', { isSupported, enabled: config.enabled, permission });
      return;
    }

    try {
      // Дефолтные опции
      const defaultOptions: NotificationOptions = {
        icon: '/logobabay.png',
        badge: '/logobabay.png',
        tag: 'operator-notification',
        requireInteraction: true,
        silent: !config.soundEnabled,
        ...options
      };

      // Создаем уведомление
      const notification = new Notification(title, defaultOptions);
      
      // Обработка клика по уведомлению
      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Автоматически закрываем через 5 секунд
      setTimeout(() => {
        notification.close();
      }, 5000);

      console.log('📱 Notification sent:', title);
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
    if (!config.enabled) return;

    // Проверяем, включен ли этот тип уведомлений
    switch (type) {
      case 'new':
        if (!config.newOrderNotifications) return;
        break;
      case 'update':
        if (!config.orderUpdateNotifications) return;
        break;
      case 'system':
        if (!config.systemNotifications) return;
        break;
    }

    let title: string;
    let body: string;

    switch (type) {
      case 'new':
        title = '🆕 Новый заказ!';
        body = `Заказ #${orderId} поступил в систему`;
        break;

      case 'update':
        title = '🔄 Заказ обновлен';
        body = `Заказ #${orderId} изменил статус`;
        break;

      case 'system':
        title = '🔔 Системное уведомление';
        body = data?.message || 'Новое системное сообщение';
        break;

      default:
        return;
    }

    await sendNotification(title, {
      body,
      data: {
        orderId,
        type,
        timestamp: Date.now(),
        ...data
      }
    });
  }, [config, sendNotification]);

  const value: NotificationContextType = {
    config,
    updateConfig,
    permission,
    requestPermission,
    sendNotification,
    sendOrderNotification,
    isSupported,
    isSubscribed: permission === 'granted',
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Хук для использования уведомлений
export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

// Компонент для управления настройками уведомлений
export const NotificationSettings: React.FC = () => {
  const { 
    config, 
    updateConfig, 
    permission, 
    requestPermission, 
    isSupported,
    sendOrderNotification
  } = useNotifications();

  const handleRequestPermission = async () => {
    await requestPermission();
  };

  if (!isSupported) {
    return (
      <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <span className="text-red-400 text-lg">⚠️</span>
          <div>
            <h3 className="text-red-300 font-semibold">Уведомления не поддерживаются</h3>
            <p className="text-red-400 text-sm">
              Ваш браузер не поддерживает уведомления
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="mr-2">🔔</span>
        Уведомления
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
          <label className="text-gray-300 font-medium">Включить уведомления</label>
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

        {/* Тест уведомления */}
        <div className="pt-4 border-t border-gray-700">
          <button
            onClick={() => sendOrderNotification(12345, 'new', { test: true })}
            disabled={!config.enabled || permission !== 'granted'}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🔔 Тест уведомления
          </button>
        </div>
      </div>
    </div>
  );
};
