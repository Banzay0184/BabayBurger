import React, { useState, useEffect } from 'react';

export const PWAForceInstall: React.FC = () => {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    // Проверяем, запущено ли как PWA
    const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
                  (window.navigator as any).standalone === true;
    
    setIsInstalled(isPWA);

    if (isPWA) return;

    // Слушаем beforeinstallprompt
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Если событие не сработало через 5 секунд, показываем принудительную установку
    const timer = setTimeout(() => {
      if (!canInstall && !isPWA) {
        setCanInstall(true);
      }
    }, 5000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      clearTimeout(timer);
    };
  }, [canInstall]);

  const handleInstall = async () => {
    if (installPrompt) {
      try {
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setCanInstall(false);
        }
        setInstallPrompt(null);
      } catch (error) {
        console.error('PWA Installation error:', error);
        // Fallback - показываем инструкцию
        showManualInstallInstructions();
      }
    } else {
      // Показываем инструкцию для ручной установки
      showManualInstallInstructions();
    }
  };

  const showManualInstallInstructions = () => {
    const isChrome = /Chrome/.test(navigator.userAgent);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
    
    let instructions = '';
    
    if (isChrome) {
      instructions = `
📱 Для установки PWA в Chrome:
1. Нажмите на иконку ⊕ в адресной строке
2. Или: Меню (⋮) → "Установить Babay Кассир"
3. Подтвердите установку

Если иконки нет:
1. Меню (⋮) → "Добавить на главный экран"
2. Или попробуйте в режиме инкогнито
      `.trim();
    } else if (isSafari) {
      instructions = `
📱 Для установки в Safari:
1. Нажмите кнопку "Поделиться" 
2. Выберите "На экран Домой"
3. Нажмите "Добавить"
      `.trim();
    } else {
      instructions = `
📱 Для установки PWA:
1. Найдите опцию "Добавить на главный экран" в меню браузера
2. Или попробуйте открыть в Chrome/Edge
      `.trim();
    }
    
    alert(instructions);
  };

  if (isInstalled) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-3 py-2 rounded text-sm">
        ✅ PWA установлено
      </div>
    );
  }

  if (!canInstall) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <span className="text-2xl">📱</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-900">
            Установить как приложение
          </h3>
          <p className="text-xs text-blue-700 mt-1">
            Установите Babay Кассир как PWA для удобной работы
          </p>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={handleInstall}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-2 rounded-md transition-colors duration-200"
          >
            Установить
          </button>
        </div>
      </div>
    </div>
  );
};
