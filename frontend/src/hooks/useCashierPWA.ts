import { useState, useEffect } from 'react';

interface PWAState {
  isInstalled: boolean;
  isOnline: boolean;
  serviceWorkerStatus: 'loading' | 'active' | 'error' | 'unsupported';
  canInstall: boolean;
  installPrompt: any;
}

export const useCashierPWA = (): PWAState => {
  const [state, setState] = useState<PWAState>({
    isInstalled: false,
    isOnline: navigator.onLine,
    serviceWorkerStatus: 'loading',
    canInstall: false,
    installPrompt: null
  });

  useEffect(() => {
    // Проверяем, установлено ли приложение
    const checkIfInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setState(prev => ({ ...prev, isInstalled: true }));
        return;
      }
      
      // Проверяем для iOS
      if ((window.navigator as any).standalone === true) {
        setState(prev => ({ ...prev, isInstalled: true }));
        return;
      }
      
      setState(prev => ({ ...prev, isInstalled: false }));
    };

    checkIfInstalled();

    // Проверяем статус подключения
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Регистрируем Service Worker для кассира
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/cashier-sw.js')
        .then((registration) => {
          console.log('✅ Cashier Service Worker зарегистрирован:', registration);
          setState(prev => ({ ...prev, serviceWorkerStatus: 'active' }));
        })
        .catch((error) => {
          console.error('❌ Ошибка регистрации Cashier Service Worker:', error);
          setState(prev => ({ ...prev, serviceWorkerStatus: 'error' }));
        });
    } else {
      setState(prev => ({ ...prev, serviceWorkerStatus: 'unsupported' }));
    }

    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({ 
        ...prev, 
        canInstall: true, 
        installPrompt: e 
      }));
    };

    // Слушаем событие appinstalled
    const handleAppInstalled = () => {
      console.log('✅ Cashier PWA установлено');
      setState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        canInstall: false, 
        installPrompt: null 
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  return state;
};
