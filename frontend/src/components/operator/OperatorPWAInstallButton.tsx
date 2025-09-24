import React, { useState, useEffect } from 'react';
import { useOperatorPWA } from '../../hooks/useOperatorPWA';

// Компонент для заметной кнопки установки PWA
export const OperatorPWAInstallButton: React.FC = () => {
  const { isInstallable, isPWA, install } = useOperatorPWA();
  const [showPrompt, setShowPrompt] = useState(false);

  // Показываем промпт только если PWA можно установить и не установлено
  useEffect(() => {
    if (isInstallable && !isPWA) {
      setShowPrompt(true);
    } else {
      setShowPrompt(false);
    }
  }, [isInstallable, isPWA]);

  const handleInstall = async () => {
    try {
      await install();
      setShowPrompt(false);
    } catch (error) {
      console.error('Ошибка установки PWA:', error);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-4 border border-blue-500/30">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📱</span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm mb-1">
              Установить приложение
            </h3>
            <p className="text-blue-100 text-xs mb-3">
              Установите Babay Оператор для быстрого доступа и лучшего опыта работы
            </p>
            
            <div className="flex space-x-2">
              <button
                onClick={handleInstall}
                className="bg-white text-blue-600 px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-50 transition-colors"
              >
                Установить
              </button>
              <button
                onClick={handleDismiss}
                className="text-blue-200 hover:text-white text-xs font-medium transition-colors"
              >
                Позже
              </button>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-blue-200 hover:text-white transition-colors"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Компонент для кнопки установки в шапке
export const OperatorPWAHeaderButton: React.FC = () => {
  const { isInstallable, isPWA, install } = useOperatorPWA();

  if (!isInstallable || isPWA) return null;

  return (
    <button
      onClick={install}
      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
      title="Установить как приложение"
    >
      <span className="flex items-center space-x-2">
        <span>📱</span>
        <span>Установить</span>
      </span>
    </button>
  );
};

// Компонент для плавающей кнопки установки
export const OperatorPWAFloatingButton: React.FC = () => {
  const { isInstallable, isPWA, install } = useOperatorPWA();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isInstallable && !isPWA) {
      // Показываем кнопку через 3 секунды после загрузки
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isInstallable, isPWA]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={install}
        className="bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110 animate-pulse"
        title="Установить Babay Оператор как приложение"
      >
        <span className="text-2xl">📱</span>
      </button>
    </div>
  );
};

// Компонент для баннера установки
export const OperatorPWABanner: React.FC = () => {
  const { isInstallable, isPWA, install } = useOperatorPWA();
  const [isDismissed, setIsDismissed] = useState(false);

  // Проверяем, был ли баннер отклонен ранее
  useEffect(() => {
    const dismissed = localStorage.getItem('operator_pwa_banner_dismissed');
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const handleInstall = async () => {
    try {
      await install();
      setIsDismissed(true);
    } catch (error) {
      console.error('Ошибка установки PWA:', error);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('operator_pwa_banner_dismissed', 'true');
  };

  if (!isInstallable || isPWA || isDismissed) return null;

  return (
    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-lg p-6 mb-6 relative overflow-hidden">
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
              
              <div className="flex space-x-3">
                <button
                  onClick={handleInstall}
                  className="bg-white text-blue-600 px-6 py-2 rounded-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
                >
                  Установить приложение
                </button>
                <button
                  onClick={handleDismiss}
                  className="text-blue-200 hover:text-white font-medium transition-colors"
                >
                  Позже
                </button>
              </div>
            </div>
          </div>
          
          <button
            onClick={handleDismiss}
            className="text-blue-200 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
};
