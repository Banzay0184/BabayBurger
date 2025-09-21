import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  serviceWorkerStatus: 'none' | 'installing' | 'installed' | 'error';
  deferredPrompt: BeforeInstallPromptEvent | null;
}

interface PWAActions {
  install: () => Promise<void>;
  dismissPrompt: () => void;
  checkForUpdates: () => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
}

export const useCashierPWA = (): PWAState & PWAActions => {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    serviceWorkerStatus: 'none',
    deferredPrompt: null,
  });

  // Проверяем, запущено ли как PWA
  const checkPWAMode = useCallback(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true;
    
    setState(prev => ({ ...prev, isInstalled: isPWA }));
    return isPWA;
  }, []);

  // Регистрация Service Worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      setState(prev => ({ ...prev, serviceWorkerStatus: 'error' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, serviceWorkerStatus: 'installing' }));
      
      const registration = await navigator.serviceWorker.register('/cashier/sw.js');
      
      console.log('💰 PWA Hook: Service Worker registered successfully');
      setState(prev => ({ ...prev, serviceWorkerStatus: 'installed' }));

      // Проверяем обновления каждые 60 секунд
      const updateInterval = setInterval(() => {
        registration.update();
      }, 60000);

      // Слушаем сообщения от Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('💰 PWA Hook: Message from SW:', event.data);
        
        if (event.data.type === 'SYNC_COMPLETE') {
          // Можно обновить UI или показать уведомление
          console.log('💰 PWA Hook: Background sync completed');
        }
      });

      // Очистка интервала при размонтировании
      return () => {
        clearInterval(updateInterval);
      };
      
    } catch (error) {
      console.error('💰 PWA Hook: Service Worker registration failed:', error);
      setState(prev => ({ ...prev, serviceWorkerStatus: 'error' }));
    }
  }, []);

  // Установка PWA
  const install = useCallback(async () => {
    if (!state.deferredPrompt) {
      console.log('💰 PWA Hook: No deferred prompt available');
      return;
    }

    try {
      await state.deferredPrompt.prompt();
      const { outcome } = await state.deferredPrompt.userChoice;
      
      console.log('💰 PWA Hook: User choice:', outcome);
      
      if (outcome === 'accepted') {
        setState(prev => ({ 
          ...prev, 
          isInstalled: true, 
          isInstallable: false,
          deferredPrompt: null 
        }));
      } else {
        setState(prev => ({ ...prev, deferredPrompt: null }));
      }
      
    } catch (error) {
      console.error('💰 PWA Hook: Error during installation:', error);
    }
  }, [state.deferredPrompt]);

  // Отклонить prompt
  const dismissPrompt = useCallback(() => {
    setState(prev => ({ ...prev, isInstallable: false, deferredPrompt: null }));
    localStorage.setItem('cashier-pwa-dismiss-time', Date.now().toString());
  }, []);

  // Проверить обновления
  const checkForUpdates = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.update();
        console.log('💰 PWA Hook: Checked for updates');
      } catch (error) {
        console.error('💰 PWA Hook: Error checking for updates:', error);
      }
    }
  }, []);

  // Запросить разрешение на уведомления
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.log('💰 PWA Hook: Notifications not supported');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    console.log('💰 PWA Hook: Notification permission:', permission);
    return permission;
  }, []);

  useEffect(() => {
    // Проверяем PWA режим при загрузке
    checkPWAMode();

    // Регистрируем Service Worker
    registerServiceWorker();

    // Слушатели для статуса сети
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Слушатель для beforeinstallprompt
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      console.log('💰 PWA Hook: beforeinstallprompt event fired');
      e.preventDefault();
      
      // Проверяем, не был ли prompt отложен недавно
      const dismissTime = localStorage.getItem('cashier-pwa-dismiss-time');
      if (dismissTime) {
        const dayInMs = 24 * 60 * 60 * 1000; // 24 часа
        if (Date.now() - parseInt(dismissTime) < dayInMs) {
          return; // Не показываем prompt в течение 24 часов
        } else {
          localStorage.removeItem('cashier-pwa-dismiss-time');
        }
      }

      setState(prev => ({ 
        ...prev, 
        isInstallable: true, 
        deferredPrompt: e 
      }));
    };

    // Слушатель для appinstalled
    const handleAppInstalled = () => {
      console.log('💰 PWA Hook: App was installed');
      setState(prev => ({ 
        ...prev, 
        isInstalled: true, 
        isInstallable: false,
        deferredPrompt: null 
      }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Запрашиваем разрешение на уведомления через 5 секунд
    const notificationTimer = setTimeout(() => {
      if (Notification.permission === 'default') {
        requestNotificationPermission();
      }
    }, 5000);

    // Очистка
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(notificationTimer);
    };
  }, [checkPWAMode, registerServiceWorker, requestNotificationPermission]);

  return {
    ...state,
    install,
    dismissPrompt,
    checkForUpdates,
    requestNotificationPermission,
  };
};
