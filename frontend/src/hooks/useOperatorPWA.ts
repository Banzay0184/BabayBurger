import { useState, useEffect, useCallback } from 'react';

// Интерфейс для состояния PWA
interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isPWA: boolean;
  isOnline: boolean;
  serviceWorkerStatus: 'installing' | 'installed' | 'error' | 'none';
  deferredPrompt: any;
}

// Интерфейс для действий PWA
interface PWAActions {
  install: () => Promise<void>;
  updateServiceWorker: () => Promise<void>;
  requestNotificationPermission: () => Promise<NotificationPermission>;
}

export const useOperatorPWA = (): PWAState & PWAActions => {
  const [state, setState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isPWA: false,
    isOnline: navigator.onLine,
    serviceWorkerStatus: 'none',
    deferredPrompt: null,
  });

  // Проверяем, запущено ли как PWA
  const checkPWAMode = useCallback(() => {
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true;
    
    setState(prev => ({ ...prev, isInstalled: isPWA, isPWA }));
  }, []);

  // Регистрация Service Worker
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      setState(prev => ({ ...prev, serviceWorkerStatus: 'error' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, serviceWorkerStatus: 'installing' }));
      
      const registration = await navigator.serviceWorker.register('/operator/sw.js');
      
      console.log('🎯 Operator PWA: Service Worker registered successfully');
      setState(prev => ({ ...prev, serviceWorkerStatus: 'installed' }));

      // Проверяем обновления каждые 60 секунд
      const updateInterval = setInterval(() => {
        registration.update();
      }, 60000);

      // Слушаем сообщения от Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        console.log('🎯 Operator PWA: Message from SW:', event.data);
        
        if (event.data.type === 'SYNC_COMPLETE') {
          console.log('🎯 Operator PWA: Background sync completed');
        }
        
        if (event.data.type === 'PLAY_SOUND') {
          // Делегируем воспроизведение звука основному потоку
          window.dispatchEvent(new CustomEvent('playSoundFromSW', {
            detail: { soundType: event.data.soundType }
          }));
        }
      });

      // Очистка интервала при размонтировании
      return () => {
        clearInterval(updateInterval);
      };
      
    } catch (error) {
      console.error('🎯 Operator PWA: Service Worker registration failed:', error);
      setState(prev => ({ ...prev, serviceWorkerStatus: 'error' }));
    }
  }, []);

  // Установка PWA
  const install = useCallback(async () => {
    if (!state.deferredPrompt) {
      console.warn('🎯 Operator PWA: No deferred prompt available');
      return;
    }

    try {
      // Показываем prompt установки
      state.deferredPrompt.prompt();
      
      // Ждем результата
      const { outcome } = await state.deferredPrompt.userChoice;
      
      console.log(`🎯 Operator PWA: User choice: ${outcome}`);
      
      // Очищаем deferred prompt
      setState(prev => ({ ...prev, deferredPrompt: null, isInstallable: false }));
      
    } catch (error) {
      console.error('🎯 Operator PWA: Installation failed:', error);
    }
  }, [state.deferredPrompt]);

  // Обновление Service Worker
  const updateServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) return;

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
        console.log('🎯 Operator PWA: Service Worker updated');
      }
    } catch (error) {
      console.error('🎯 Operator PWA: Service Worker update failed:', error);
    }
  }, []);

  // Запрос разрешения на уведомления
  const requestNotificationPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!('Notification' in window)) {
      console.warn('🎯 Operator PWA: Notifications not supported');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      console.log('🎯 Operator PWA: Notification permission:', permission);
      return permission;
    } catch (error) {
      console.error('🎯 Operator PWA: Notification permission request failed:', error);
      return 'denied';
    }
  }, []);

  // Инициализация PWA
  useEffect(() => {
    checkPWAMode();
    registerServiceWorker();

    // Слушатели для статуса сети
    const handleOnline = () => setState(prev => ({ ...prev, isOnline: true }));
    const handleOffline = () => setState(prev => ({ ...prev, isOnline: false }));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Слушатель для beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setState(prev => ({ ...prev, deferredPrompt: e, isInstallable: true }));
      console.log('🎯 Operator PWA: Install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Слушатель для appinstalled
    const handleAppInstalled = () => {
      setState(prev => ({ ...prev, isInstalled: true, isPWA: true, isInstallable: false }));
      console.log('🎯 Operator PWA: App installed successfully');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Слушатель для звуков от Service Worker
    const handlePlaySoundFromSW = (event: CustomEvent) => {
      console.log('🎯 Operator PWA: Playing sound from SW:', event.detail.soundType);
      // Здесь можно интегрировать с нашей системой звуков
      window.dispatchEvent(new CustomEvent('soundPlayed', {
        detail: { type: event.detail.soundType, timestamp: Date.now() }
      }));
    };

    window.addEventListener('playSoundFromSW', handlePlaySoundFromSW as EventListener);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('playSoundFromSW', handlePlaySoundFromSW as EventListener);
    };
  }, [checkPWAMode, registerServiceWorker]);

  return {
    ...state,
    install,
    updateServiceWorker,
    requestNotificationPermission,
  };
};
