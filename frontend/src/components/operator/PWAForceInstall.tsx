import React, { useState, useEffect } from 'react';

// Компонент для принудительного запуска установки PWA
export const PWAForceInstall: React.FC = () => {
  const [installState, setInstallState] = useState({
    canInstall: false,
    isInstalling: false,
    installError: null as string | null,
    deferredPrompt: null as any,
  });

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallState(prev => ({
        ...prev,
        canInstall: true,
        deferredPrompt: e,
      }));
      console.log('🎯 PWA Force Install: Install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleForceInstall = async () => {
    if (!installState.deferredPrompt) {
      setInstallState(prev => ({
        ...prev,
        installError: 'Install prompt not available. Try manual installation.',
      }));
      return;
    }

    setInstallState(prev => ({ ...prev, isInstalling: true, installError: null }));

    try {
      installState.deferredPrompt.prompt();
      const { outcome } = await installState.deferredPrompt.userChoice;
      
      console.log(`🎯 PWA Force Install: User choice: ${outcome}`);
      
      setInstallState(prev => ({
        ...prev,
        canInstall: false,
        isInstalling: false,
        deferredPrompt: null,
      }));
    } catch (error) {
      console.error('🎯 PWA Force Install: Installation failed:', error);
      setInstallState(prev => ({
        ...prev,
        isInstalling: false,
        installError: 'Installation failed. Please try manual installation.',
      }));
    }
  };

  const showManualInstructions = () => {
    const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isChrome = /Chrome/i.test(navigator.userAgent);
    const isEdge = /Edg/i.test(navigator.userAgent);
    const isFirefox = /Firefox/i.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isMobile && (isChrome || isEdge)) {
      instructions = '📱 Нажмите на меню браузера (⋮) и выберите "Добавить на главный экран"';
    } else if (isMobile && isFirefox) {
      instructions = '📱 Нажмите на меню браузера (⋮) и выберите "Установить"';
    } else if (isChrome || isEdge) {
      instructions = '💻 Нажмите на иконку ⊕ в адресной строке или меню (⋮) → "Установить Babay Оператор"';
    } else if (isFirefox) {
      instructions = '💻 Нажмите на иконку установки в адресной строке или меню → "Установить"';
    } else {
      instructions = 'Для установки PWA рекомендуется использовать Chrome, Edge или Firefox браузер';
    }
    
    alert(instructions);
  };

  return (
    <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg p-6 mb-6 relative overflow-hidden">
      {/* Фоновые элементы */}
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white text-3xl">🚀</span>
            </div>
            
            <div>
              <h3 className="text-white font-bold text-xl mb-2">
                Установите Babay Оператор
              </h3>
              <p className="text-green-100 text-sm mb-4 max-w-md">
                Получите быстрый доступ к системе управления заказами прямо с главного экрана устройства
              </p>
              
              {installState.installError && (
                <div className="bg-red-500/20 border border-red-500/50 rounded p-2 mb-3">
                  <p className="text-red-200 text-xs">{installState.installError}</p>
                </div>
              )}
              
              <div className="flex space-x-3">
                {installState.canInstall ? (
                  <button
                    onClick={handleForceInstall}
                    disabled={installState.isInstalling}
                    className="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors shadow-lg disabled:opacity-50"
                  >
                    {installState.isInstalling ? 'Установка...' : 'Установить приложение'}
                  </button>
                ) : (
                  <button
                    onClick={showManualInstructions}
                    className="bg-white text-green-600 px-6 py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors shadow-lg"
                  >
                    Показать инструкции
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Компонент для проверки и исправления проблем PWA
export const PWAHealthCheck: React.FC = () => {
  const [healthStatus, setHealthStatus] = useState({
    manifestLoaded: false,
    serviceWorkerRegistered: false,
    iconsAvailable: false,
    userInteracted: false,
    installPromptReceived: false,
  });

  useEffect(() => {
    const checkHealth = async () => {
      // Проверяем манифест
      const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
      let manifestLoaded = false;
      
      if (manifestLink) {
        try {
          const response = await fetch(manifestLink.href);
          const manifest = await response.json();
          manifestLoaded = !!manifest.name;
        } catch (error) {
          console.error('Manifest check failed:', error);
        }
      }

      // Проверяем Service Worker
      let serviceWorkerRegistered = false;
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          serviceWorkerRegistered = !!registration;
        } catch (error) {
          console.error('Service Worker check failed:', error);
        }
      }

      // Проверяем иконки
      const iconsAvailable = document.querySelectorAll('link[rel*="icon"]').length > 0;

      setHealthStatus(prev => ({
        ...prev,
        manifestLoaded,
        serviceWorkerRegistered,
        iconsAvailable,
      }));
    };

    checkHealth();

    // Слушаем взаимодействие пользователя
    const handleUserInteraction = () => {
      setHealthStatus(prev => ({ ...prev, userInteracted: true }));
    };

    const events = ['click', 'scroll', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });

    // Слушаем install prompt
    const handleBeforeInstallPrompt = () => {
      setHealthStatus(prev => ({ ...prev, installPromptReceived: true }));
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const allHealthy = Object.values(healthStatus).every(status => status);

  return (
    <div className={`rounded-lg p-4 mb-6 border ${
      allHealthy ? 'bg-green-900/30 border-green-600/50' : 'bg-yellow-900/30 border-yellow-600/50'
    }`}>
      <div className="flex items-center space-x-3 mb-3">
        <span className="text-2xl">{allHealthy ? '✅' : '⚠️'}</span>
        <h3 className={`font-semibold text-lg ${
          allHealthy ? 'text-green-300' : 'text-yellow-300'
        }`}>
          PWA Health Check
        </h3>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-300">Манифест загружен:</span>
          <span className={healthStatus.manifestLoaded ? 'text-green-400' : 'text-red-400'}>
            {healthStatus.manifestLoaded ? '✅' : '❌'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Service Worker зарегистрирован:</span>
          <span className={healthStatus.serviceWorkerRegistered ? 'text-green-400' : 'text-red-400'}>
            {healthStatus.serviceWorkerRegistered ? '✅' : '❌'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Иконки доступны:</span>
          <span className={healthStatus.iconsAvailable ? 'text-green-400' : 'text-red-400'}>
            {healthStatus.iconsAvailable ? '✅' : '❌'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Пользователь взаимодействовал:</span>
          <span className={healthStatus.userInteracted ? 'text-green-400' : 'text-red-400'}>
            {healthStatus.userInteracted ? '✅' : '❌'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Install prompt получен:</span>
          <span className={healthStatus.installPromptReceived ? 'text-green-400' : 'text-red-400'}>
            {healthStatus.installPromptReceived ? '✅' : '❌'}
          </span>
        </div>
      </div>

      {!allHealthy && (
        <div className="mt-4 pt-4 border-t border-yellow-600/50">
          <p className="text-yellow-200 text-sm">
            💡 Взаимодействуйте с сайтом (клики, скролл) и обновите страницу для активации всех функций PWA.
          </p>
        </div>
      )}
    </div>
  );
};
