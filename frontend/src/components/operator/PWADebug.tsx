import React, { useState, useEffect } from 'react';

// Расширенный компонент для отладки PWA статуса
export const PWADebugInfo: React.FC = () => {
  const [pwaInfo, setPwaInfo] = useState({
    isInstallable: false,
    isPWA: false,
    hasServiceWorker: false,
    hasManifest: false,
    isSecure: false,
    deferredPrompt: null as Event | null,
    userInteracted: false,
    manifestValid: false,
    iconsValid: false,
    serviceWorkerActive: false,
  });

  useEffect(() => {
    // Проверяем взаимодействие пользователя
    const handleUserInteraction = () => {
      setPwaInfo(prev => ({ ...prev, userInteracted: true }));
      console.log('🎯 PWA Debug: User interaction detected');
    };

    // Добавляем слушатели взаимодействия
    const events = ['click', 'scroll', 'keydown', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, handleUserInteraction, { once: true });
    });

    // Проверяем PWA статус
    const checkPWAStatus = async () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true;
      
      const hasServiceWorker = 'serviceWorker' in navigator;
      const hasManifest = !!document.querySelector('link[rel="manifest"]');
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost';

      // Проверяем валидность манифеста
      let manifestValid = false;
      let iconsValid = false;
      
      if (hasManifest) {
        try {
          const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
          const response = await fetch(manifestLink.href);
          const manifest = await response.json();
          
          manifestValid = !!(
            manifest.name &&
            manifest.short_name &&
            manifest.start_url &&
            manifest.display &&
            manifest.icons &&
            manifest.icons.length > 0
          );
          
          // Проверяем иконки
          iconsValid = manifest.icons.some((icon: any) => 
            icon.sizes && icon.src && (icon.sizes.includes('192') || icon.sizes.includes('512'))
          );
          
          console.log('🎯 PWA Debug: Manifest validation:', { manifestValid, iconsValid, manifest });
        } catch (error) {
          console.error('🎯 PWA Debug: Manifest validation failed:', error);
        }
      }

      // Проверяем статус Service Worker
      let serviceWorkerActive = false;
      if (hasServiceWorker) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          serviceWorkerActive = !!registration && !!registration.active;
          console.log('🎯 PWA Debug: Service Worker status:', { 
            registered: !!registration, 
            active: serviceWorkerActive 
          });
        } catch (error) {
          console.error('🎯 PWA Debug: Service Worker check failed:', error);
        }
      }

      setPwaInfo(prev => ({
        ...prev,
        isPWA,
        hasServiceWorker,
        hasManifest,
        isSecure,
        manifestValid,
        iconsValid,
        serviceWorkerActive,
      }));
    };

    checkPWAStatus();

    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setPwaInfo(prev => ({
        ...prev,
        isInstallable: true,
        deferredPrompt: e,
      }));
      console.log('🎯 PWA Debug: Install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      events.forEach(event => {
        document.removeEventListener(event, handleUserInteraction);
      });
    };
  }, []);

  const handleInstall = async () => {
    if (pwaInfo.deferredPrompt) {
      try {
        (pwaInfo.deferredPrompt as any).prompt();
        const { outcome } = await (pwaInfo.deferredPrompt as any).userChoice;
        console.log(`🎯 PWA Debug: User choice: ${outcome}`);
        
        setPwaInfo(prev => ({
          ...prev,
          deferredPrompt: null,
          isInstallable: false,
        }));
      } catch (error) {
        console.error('🎯 PWA Debug: Installation failed:', error);
      }
    }
  };

  const getInstallabilityScore = () => {
    let score = 0;
    const maxScore = 8;
    
    if (pwaInfo.hasServiceWorker) score++;
    if (pwaInfo.hasManifest) score++;
    if (pwaInfo.isSecure) score++;
    if (pwaInfo.manifestValid) score++;
    if (pwaInfo.iconsValid) score++;
    if (pwaInfo.serviceWorkerActive) score++;
    if (pwaInfo.userInteracted) score++;
    if (pwaInfo.isInstallable) score++;
    
    return { score, maxScore, percentage: Math.round((score / maxScore) * 100) };
  };

  const score = getInstallabilityScore();

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
      <h3 className="text-white font-semibold mb-3">🔍 PWA Debug Info</h3>
      
      {/* Общий счет */}
      <div className="mb-4 p-3 bg-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <span className="text-gray-300 font-medium">Готовность к установке:</span>
          <span className={`font-bold ${score.percentage >= 75 ? 'text-green-400' : score.percentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
            {score.percentage}% ({score.score}/{score.maxScore})
          </span>
        </div>
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              score.percentage >= 75 ? 'bg-green-500' : score.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${score.percentage}%` }}
          ></div>
        </div>
      </div>
      
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-300">Можно установить:</span>
          <span className={pwaInfo.isInstallable ? 'text-green-400' : 'text-red-400'}>
            {pwaInfo.isInstallable ? '✅ Да' : '❌ Нет'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Запущено как PWA:</span>
          <span className={pwaInfo.isPWA ? 'text-green-400' : 'text-red-400'}>
            {pwaInfo.isPWA ? '✅ Да' : '❌ Нет'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Service Worker:</span>
          <span className={pwaInfo.hasServiceWorker ? 'text-green-400' : 'text-red-400'}>
            {pwaInfo.hasServiceWorker ? '✅ Поддерживается' : '❌ Не поддерживается'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Service Worker активен:</span>
          <span className={pwaInfo.serviceWorkerActive ? 'text-green-400' : 'text-red-400'}>
            {pwaInfo.serviceWorkerActive ? '✅ Да' : '❌ Нет'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Манифест:</span>
          <span className={pwaInfo.hasManifest ? 'text-green-400' : 'text-red-400'}>
            {pwaInfo.hasManifest ? '✅ Найден' : '❌ Не найден'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Манифест валиден:</span>
          <span className={pwaInfo.manifestValid ? 'text-green-400' : 'text-red-400'}>
            {pwaInfo.manifestValid ? '✅ Да' : '❌ Нет'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Иконки валидны:</span>
          <span className={pwaInfo.iconsValid ? 'text-green-400' : 'text-red-400'}>
            {pwaInfo.iconsValid ? '✅ Да' : '❌ Нет'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">HTTPS:</span>
          <span className={pwaInfo.isSecure ? 'text-green-400' : 'text-red-400'}>
            {pwaInfo.isSecure ? '✅ Да' : '❌ Нет'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-300">Пользователь взаимодействовал:</span>
          <span className={pwaInfo.userInteracted ? 'text-green-400' : 'text-red-400'}>
            {pwaInfo.userInteracted ? '✅ Да' : '❌ Нет'}
          </span>
        </div>
      </div>

      {/* Рекомендации */}
      {score.percentage < 75 && (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <h4 className="text-yellow-300 font-semibold text-sm mb-2">💡 Рекомендации:</h4>
          <div className="text-yellow-200 text-xs space-y-1">
            {!pwaInfo.userInteracted && <p>• Взаимодействуйте с сайтом (клики, скролл, ввод)</p>}
            {!pwaInfo.serviceWorkerActive && <p>• Обновите страницу для активации Service Worker</p>}
            {!pwaInfo.manifestValid && <p>• Проверьте корректность манифеста</p>}
            {!pwaInfo.iconsValid && <p>• Добавьте иконки 192x192 и 512x512</p>}
            {score.percentage < 50 && <p>• Подождите несколько минут для полной инициализации</p>}
          </div>
        </div>
      )}

      {pwaInfo.isInstallable && (
        <div className="mt-4 pt-4 border-t border-gray-600">
          <button
            onClick={handleInstall}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            📱 Установить PWA
          </button>
        </div>
      )}
    </div>
  );
};

// Простой компонент для принудительной установки PWA
export const SimplePWAInstallButton: React.FC = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setIsInstallable(true);
      setDeferredPrompt(e);
      console.log('🎯 Simple PWA: Install prompt available');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`🎯 Simple PWA: User choice: ${outcome}`);
        
        setDeferredPrompt(null);
        setIsInstallable(false);
      } catch (error) {
        console.error('🎯 Simple PWA: Installation failed:', error);
      }
    }
  };

  if (!isInstallable) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 mb-6 relative overflow-hidden">
      {/* Фоновые элементы */}
      <div className="absolute inset-0 bg-black/10"></div>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full translate-y-12 -translate-x-12"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center">
              <span className="text-white text-3xl">📱</span>
            </div>
            
            <div>
              <h3 className="text-white font-bold text-xl mb-2">
                Установите Babay Оператор
              </h3>
              <p className="text-blue-100 text-sm mb-4 max-w-md">
                Получите быстрый доступ к системе управления заказами прямо с главного экрана устройства
              </p>
              
              <button
                onClick={handleInstall}
                className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
              >
                Установить приложение
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};