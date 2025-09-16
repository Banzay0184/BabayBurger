import React, { useState, useEffect } from 'react';
import { pwaManager } from '../../utils/pwa';

interface PWAStatusProps {
  className?: string;
}

export const PWAStatus: React.FC<PWAStatusProps> = ({ className = '' }) => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'offline' | 'slow'>('online');

  useEffect(() => {
    // Регистрируем Service Worker для кассира
    const registerServiceWorker = async () => {
      try {
        await pwaManager.registerServiceWorker('/cashier-sw.js', '/cashier');
        console.log('✅ Cashier Service Worker зарегистрирован через PWAStatus');
      } catch (error) {
        console.error('❌ Ошибка регистрации Service Worker в PWAStatus:', error);
      }
    };

    registerServiceWorker();

    // Проверяем статус установки
    setIsInstalled(pwaManager.isPWAInstalled());
    setCanInstall(pwaManager.canInstall());
    setConnectionStatus(pwaManager.getConnectionStatus());

    // Обработчик изменения статуса соединения
    const handleConnectionChange = (event: CustomEvent) => {
      setConnectionStatus(event.detail.status);
    };

    window.addEventListener('connectionchange', handleConnectionChange as EventListener);

    // Обработчик beforeinstallprompt
    const handleBeforeInstallPrompt = () => {
      console.log('📱 beforeinstallprompt событие получено');
      setCanInstall(true);
    };

    // Обработчик appinstalled
    const handleAppInstalled = () => {
      console.log('✅ appinstalled событие получено');
      setIsInstalled(true);
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Периодическая проверка статуса
    const checkStatus = () => {
      setIsInstalled(pwaManager.isPWAInstalled());
      setCanInstall(pwaManager.canInstall());
    };

    const interval = setInterval(checkStatus, 2000);

    return () => {
      window.removeEventListener('connectionchange', handleConnectionChange as EventListener);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearInterval(interval);
    };
  }, []);

  const handleInstall = async () => {
    try {
      const success = await pwaManager.installPWA();
      if (success) {
        setIsInstalled(true);
        setCanInstall(false);
      }
    } catch (error) {
      console.error('Installation failed:', error);
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'online':
        return 'bg-green-500';
      case 'slow':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'online':
        return 'Подключено';
      case 'slow':
        return 'Медленное соединение';
      case 'offline':
        return 'Офлайн';
      default:
        return 'Неизвестно';
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'online':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'slow':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'offline':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-12.728 12.728m0-12.728l12.728 12.728" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Статус соединения */}
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`}></div>
        <span className="text-xs text-gray-600">{getStatusText()}</span>
        {getStatusIcon()}
      </div>

      {/* Статус PWA */}
      {isInstalled ? (
        <div className="flex items-center space-x-1 text-green-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-xs">PWA установлено</span>
        </div>
      ) : canInstall ? (
        <button
          onClick={handleInstall}
          className="flex items-center space-x-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs transition-colors"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Установить</span>
        </button>
      ) : (
        <div className="flex items-center space-x-1 text-gray-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-xs">PWA недоступно</span>
        </div>
      )}
    </div>
  );
};
