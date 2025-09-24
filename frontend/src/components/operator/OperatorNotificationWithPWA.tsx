import React, { useState, useEffect } from 'react';
import { useOperatorPWA } from '../../hooks/useOperatorPWA';

// Компонент для уведомления о новом заказе с предложением установки PWA
export const OperatorNewOrderNotification: React.FC<{
  orderId: number;
  onClose: () => void;
  visible: boolean;
}> = ({ orderId, onClose, visible }) => {
  const { isPWA, isInstallable, install } = useOperatorPWA();
  const [showPWAOffer, setShowPWAOffer] = useState(false);

  useEffect(() => {
    if (visible) {
      // Показываем уведомление на 5 секунд
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      // Если не PWA и можно установить, показываем предложение через 2 секунды
      if (!isPWA && isInstallable) {
        const pwaTimer = setTimeout(() => {
          setShowPWAOffer(true);
        }, 2000);

        return () => {
          clearTimeout(timer);
          clearTimeout(pwaTimer);
        };
      }

      return () => clearTimeout(timer);
    }
  }, [visible, isPWA, isInstallable, onClose]);

  const handleInstallPWA = async () => {
    try {
      await install();
      setShowPWAOffer(false);
    } catch (error) {
      console.error('Ошибка установки PWA:', error);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-lg shadow-lg p-4 border border-green-500/30">
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center animate-bounce">
              <span className="text-white text-xl">🆕</span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm mb-1">
              Новый заказ!
            </h3>
            <p className="text-green-100 text-xs mb-3">
              Заказ #{orderId} поступил в систему
            </p>
            
            {showPWAOffer && (
              <div className="bg-white/10 rounded p-2 mb-3">
                <p className="text-white text-xs mb-2">
                  📱 Установите приложение для мгновенных уведомлений
                </p>
                <button
                  onClick={handleInstallPWA}
                  className="bg-white text-green-600 px-2 py-1 rounded text-xs font-medium hover:bg-green-50 transition-colors"
                >
                  Установить
                </button>
              </div>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="bg-white text-green-600 px-3 py-1.5 rounded text-xs font-medium hover:bg-green-50 transition-colors"
              >
                Понятно
              </button>
              {showPWAOffer && (
                <button
                  onClick={() => setShowPWAOffer(false)}
                  className="text-green-200 hover:text-white text-xs font-medium transition-colors"
                >
                  Позже
                </button>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="flex-shrink-0 text-green-200 hover:text-white transition-colors"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Компонент для системного уведомления с PWA предложением
export const OperatorSystemNotification: React.FC<{
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  onClose: () => void;
  visible: boolean;
}> = ({ message, type, onClose, visible }) => {
  const { isPWA, isInstallable, install } = useOperatorPWA();
  const [showPWAOffer, setShowPWAOffer] = useState(false);

  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);

      // Если не PWA и можно установить, показываем предложение
      if (!isPWA && isInstallable) {
        const pwaTimer = setTimeout(() => {
          setShowPWAOffer(true);
        }, 1500);

        return () => {
          clearTimeout(timer);
          clearTimeout(pwaTimer);
        };
      }

      return () => clearTimeout(timer);
    }
  }, [visible, isPWA, isInstallable, onClose]);

  const handleInstallPWA = async () => {
    try {
      await install();
      setShowPWAOffer(false);
    } catch (error) {
      console.error('Ошибка установки PWA:', error);
    }
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'from-green-600 to-green-500 border-green-500/30';
      case 'warning':
        return 'from-yellow-600 to-orange-500 border-yellow-500/30';
      case 'error':
        return 'from-red-600 to-red-500 border-red-500/30';
      default:
        return 'from-blue-600 to-blue-500 border-blue-500/30';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed top-4 left-4 z-50 max-w-sm">
      <div className={`bg-gradient-to-r ${getTypeStyles()} rounded-lg shadow-lg p-4 border`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">{getIcon()}</span>
            </div>
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm mb-1">
              Системное уведомление
            </h3>
            <p className="text-white/90 text-xs mb-3">
              {message}
            </p>
            
            {showPWAOffer && (
              <div className="bg-white/10 rounded p-2 mb-3">
                <p className="text-white text-xs mb-2">
                  📱 Установите приложение для лучшего опыта
                </p>
                <button
                  onClick={handleInstallPWA}
                  className="bg-white text-blue-600 px-2 py-1 rounded text-xs font-medium hover:bg-blue-50 transition-colors"
                >
                  Установить
                </button>
              </div>
            )}
            
            <div className="flex space-x-2">
              <button
                onClick={onClose}
                className="bg-white text-blue-600 px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-50 transition-colors"
              >
                Понятно
              </button>
              {showPWAOffer && (
                <button
                  onClick={() => setShowPWAOffer(false)}
                  className="text-white/70 hover:text-white text-xs font-medium transition-colors"
                >
                  Позже
                </button>
              )}
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="flex-shrink-0 text-white/70 hover:text-white transition-colors"
          >
            <span className="text-lg">×</span>
          </button>
        </div>
      </div>
    </div>
  );
};
