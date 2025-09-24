import React, { useState, useEffect } from 'react';

// Простая кнопка установки PWA
export const SimplePWAInstallButton: React.FC = () => {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);

  useEffect(() => {
    // Проверяем, установлено ли приложение
    const checkInstalled = () => {
      const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                    (window.navigator as any).standalone === true;
      setIsInstalled(isPWA);
    };

    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
      console.log('🎯 PWA Install: Install prompt received');
    };

    // Слушаем событие appinstalled
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('🎯 PWA Install: App installed successfully');
    };

    // Добавляем слушатели
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Проверяем статус
    checkInstalled();

    // Очистка
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      // Показываем prompt установки
      (deferredPrompt as any).prompt();
      
      // Ждем результат
      const { outcome } = await (deferredPrompt as any).userChoice;
      
      console.log(`🎯 PWA Install: User choice: ${outcome}`);
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      
      // Очищаем prompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('🎯 PWA Install: Error during installation:', error);
    }
  };

  // Не показываем кнопку, если приложение уже установлено
  if (isInstalled) {
    return (
      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="text-green-300 font-semibold">PWA Installed</h3>
            <p className="text-green-200 text-sm">Приложение успешно установлено!</p>
          </div>
        </div>
      </div>
    );
  }

  // Не показываем кнопку, если приложение нельзя установить
  if (!isInstallable) {
    return null;
  }

  return (
    <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">📱</span>
        <div>
          <h3 className="text-blue-300 font-semibold">Install PWA</h3>
          <p className="text-blue-200 text-sm">Установите приложение для лучшего опыта!</p>
        </div>
      </div>
      
      <button
        onClick={handleInstall}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
      >
        📱 Установить приложение
      </button>
    </div>
  );
};
