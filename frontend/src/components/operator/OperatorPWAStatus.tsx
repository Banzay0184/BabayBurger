import React, { useState, useEffect } from 'react';
import { useOperatorPWA } from '../../hooks/useOperatorPWA';

interface OperatorPWAStatusProps {
  className?: string;
}

export const OperatorPWAStatus: React.FC<OperatorPWAStatusProps> = ({ className = '' }) => {
  const { 
    isOnline, 
    isPWA, 
    isInstallable, 
    serviceWorkerStatus,
    install,
    requestNotificationPermission 
  } = useOperatorPWA();

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleInstall = async () => {
    try {
      await install();
    } catch (error) {
      console.error('Ошибка установки PWA:', error);
    }
  };

  const handleRequestNotification = async () => {
    try {
      const permission = await requestNotificationPermission();
      setNotificationPermission(permission);
    } catch (error) {
      console.error('Ошибка запроса разрешения на уведомления:', error);
    }
  };

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Статус сети */}
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-xs text-gray-400">
          {isOnline ? 'Онлайн' : 'Офлайн'}
        </span>
      </div>

      {/* Статус PWA */}
      <div className="flex items-center space-x-1">
        {isPWA ? (
          <div className="flex items-center space-x-1">
            <span className="text-green-400 text-sm">📱</span>
            <span className="text-xs text-green-400">PWA</span>
          </div>
        ) : (
          <div className="flex items-center space-x-1">
            <span className="text-gray-400 text-sm">🌐</span>
            <span className="text-xs text-gray-400">Браузер</span>
          </div>
        )}
      </div>

      {/* Статус Service Worker */}
      <div className="flex items-center space-x-1">
        {serviceWorkerStatus === 'installed' && (
          <div className="flex items-center space-x-1">
            <span className="text-blue-400 text-sm">⚙️</span>
            <span className="text-xs text-blue-400">SW</span>
          </div>
        )}
        {serviceWorkerStatus === 'error' && (
          <div className="flex items-center space-x-1">
            <span className="text-red-400 text-sm">⚠️</span>
            <span className="text-xs text-red-400">SW</span>
          </div>
        )}
      </div>

      {/* Статус уведомлений */}
      <div className="flex items-center space-x-1">
        {notificationPermission === 'granted' ? (
          <div className="flex items-center space-x-1">
            <span className="text-green-400 text-sm">🔔</span>
            <span className="text-xs text-green-400">Уведомления</span>
          </div>
        ) : notificationPermission === 'denied' ? (
          <div className="flex items-center space-x-1">
            <span className="text-red-400 text-sm">🔕</span>
            <span className="text-xs text-red-400">Уведомления</span>
          </div>
        ) : (
          <button
            onClick={handleRequestNotification}
            className="flex items-center space-x-1 text-yellow-400 hover:text-yellow-300 text-xs transition-colors"
            title="Запросить разрешение на уведомления"
          >
            <span className="text-sm">🔔</span>
            <span>Уведомления</span>
          </button>
        )}
      </div>

      {/* Кнопка установки PWA */}
      {isInstallable && !isPWA && (
        <button
          onClick={handleInstall}
          className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
          title="Установить как приложение"
        >
          📱 Установить
        </button>
      )}
    </div>
  );
};

// Компонент для принудительной установки PWA
export const OperatorPWAForceInstall: React.FC = () => {
  const { isInstallable, install } = useOperatorPWA();

  if (!isInstallable) return null;

  return (
    <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-blue-400 text-2xl">📱</span>
          <div>
            <h3 className="text-blue-300 font-semibold">Установить приложение</h3>
            <p className="text-blue-400 text-sm">
              Установите Babay Оператор как приложение для лучшего опыта работы
            </p>
          </div>
        </div>
        <button
          onClick={install}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Установить
        </button>
      </div>
    </div>
  );
};

// Компонент для показа инструкций по ручной установке
export const OperatorPWAInstallPrompt: React.FC = () => {
  const { isPWA, isInstallable } = useOperatorPWA();

  if (isPWA || isInstallable) return null;

  const showManualInstallInstructions = () => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isMobile && isChrome) {
      instructions = '📱 Нажмите на меню браузера (⋮) и выберите "Добавить на главный экран"';
    } else if (isChrome) {
      instructions = '💻 Нажмите на иконку ⊕ в адресной строке или меню (⋮) → "Установить Babay Оператор"';
    } else {
      instructions = 'Для установки PWA рекомендуется использовать Chrome или Edge браузер';
    }
    
    alert(instructions);
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <span className="text-gray-400 text-2xl">📱</span>
          <div>
            <h3 className="text-gray-300 font-semibold">Установить приложение</h3>
            <p className="text-gray-400 text-sm">
              Установите Babay Оператор как приложение для лучшего опыта работы
            </p>
          </div>
        </div>
        <button
          onClick={showManualInstallInstructions}
          className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Инструкции
        </button>
      </div>
    </div>
  );
};
