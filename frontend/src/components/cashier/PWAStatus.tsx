import React, { useState, useEffect } from 'react';

interface PWAStatusProps {
  className?: string;
}

export const CashierPWAStatus: React.FC<PWAStatusProps> = ({ className = '' }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isPWA, setIsPWA] = useState(false);
  const [swStatus, setSWStatus] = useState<'installing' | 'installed' | 'error' | 'none'>('none');

  useEffect(() => {
    // Проверяем, запущено ли как PWA
    const checkPWA = () => {
      const isPWAMode = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
      setIsPWA(isPWAMode);
    };

    checkPWA();

    // Слушатели для статуса сети
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Проверяем статус Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then(() => {
          setSWStatus('installed');
        })
        .catch(() => {
          setSWStatus('error');
        });

      // Слушаем сообщения от Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'SW_UPDATED') {
          setSWStatus('installed');
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Статус подключения */}
      <div className="flex items-center space-x-1">
        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`} />
        <span className="text-xs text-gray-600 dark:text-gray-300">
          {isOnline ? 'Онлайн' : 'Офлайн'}
        </span>
      </div>

      {/* PWA статус */}
      {isPWA && (
        <div className="flex items-center space-x-1">
          <span className="text-xs">📱</span>
          <span className="text-xs text-gray-600 dark:text-gray-300">PWA</span>
        </div>
      )}

      {/* Service Worker статус */}
      {swStatus !== 'none' && (
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${
            swStatus === 'installed' ? 'bg-blue-400' : 
            swStatus === 'installing' ? 'bg-yellow-400' : 'bg-red-400'
          }`} />
          <span className="text-xs text-gray-600 dark:text-gray-300">
            {swStatus === 'installed' ? 'SW' : 
             swStatus === 'installing' ? 'SW...' : 'SW!'}
          </span>
        </div>
      )}
    </div>
  );
};
