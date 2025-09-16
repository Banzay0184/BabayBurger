import React, { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Проверяем, установлено ли уже приложение
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone;
      setIsInstalled(isStandalone || isIOSStandalone);
    };

    checkIfInstalled();

    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Слушаем событие установки
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ Пользователь принял установку PWA');
      } else {
        console.log('❌ Пользователь отклонил установку PWA');
      }
      
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('❌ Ошибка при установке PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  // Не показываем, если уже установлено
  if (isInstalled) {
    return (
      <div className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-2 rounded-lg shadow-lg z-50">
        ✅ PWA установлено
      </div>
    );
  }

  // Не показываем, если нет события установки
  if (!showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 bg-blue-600 text-white rounded-lg shadow-lg z-50 max-w-sm">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">📱</div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg mb-1">Установить приложение</h3>
            <p className="text-blue-100 text-sm mb-3">
              Установите Babay Кассир для быстрого доступа и работы в офлайн режиме.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleInstallClick}
                className="bg-white text-blue-600 px-4 py-2 rounded font-medium hover:bg-blue-50 transition-colors"
              >
                Установить
              </button>
              <button
                onClick={handleDismiss}
                className="text-blue-200 hover:text-white px-4 py-2 transition-colors"
              >
                Позже
              </button>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-blue-200 hover:text-white text-xl leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallPrompt;
