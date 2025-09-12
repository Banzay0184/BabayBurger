import React, { useState, useEffect } from 'react';

export const PWAStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isInstalled, setIsInstalled] = useState(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<'loading' | 'active' | 'error'>('loading');

  useEffect(() => {
    // Проверяем статус подключения
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Проверяем, установлено ли приложение
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // Проверяем для iOS
      if ((window.navigator as any).standalone === true) {
        setIsInstalled(true);
        return;
      }
      
      setIsInstalled(false);
    };

    checkIfInstalled();

    // Проверяем статус Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(() => {
        setServiceWorkerStatus('active');
      }).catch(() => {
        setServiceWorkerStatus('error');
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className="flex items-center space-x-2 text-xs">
      {/* Статус подключения */}
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span className="text-gray-400">
          {isOnline ? 'Онлайн' : 'Офлайн'}
        </span>
      </div>

      {/* Статус PWA */}
      {isInstalled && (
        <div className="flex items-center space-x-1">
          <span className="text-blue-400">📱</span>
          <span className="text-gray-400">PWA</span>
        </div>
      )}

      {/* Статус Service Worker */}
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${
          serviceWorkerStatus === 'active' ? 'bg-green-500' : 
          serviceWorkerStatus === 'error' ? 'bg-red-500' : 
          'bg-yellow-500'
        }`}></div>
        <span className="text-gray-400">SW</span>
      </div>
    </div>
  );
};
