import React, { useState, useEffect } from 'react';
import { useSoundNotifications } from './SoundNotificationManager';

// Компонент для отображения статуса звуковых уведомлений
export const SoundStatusIndicator: React.FC = () => {
  const { config } = useSoundNotifications();
  const [isPlaying, setIsPlaying] = useState(false);

  // Эффект для показа анимации при воспроизведении звука
  useEffect(() => {
    const handleSoundPlay = () => {
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 1000);
    };

    // Слушаем события воспроизведения звука
    window.addEventListener('soundPlayed', handleSoundPlay);
    
    return () => {
      window.removeEventListener('soundPlayed', handleSoundPlay);
    };
  }, []);

  if (!config.enabled) {
    return (
      <div className="flex items-center space-x-1 text-gray-500">
        <span className="text-sm">🔇</span>
        <span className="text-xs">Звук выключен</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-1">
      <div className={`relative ${isPlaying ? 'animate-pulse' : ''}`}>
        <span className="text-sm">🔊</span>
        {isPlaying && (
          <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
        )}
      </div>
      <span className="text-xs text-gray-400">
        {Math.round(config.volume * 100)}%
      </span>
    </div>
  );
};

// Компонент для быстрого переключения звука
export const SoundToggleButton: React.FC = () => {
  const { config, updateConfig } = useSoundNotifications();

  const handleToggle = () => {
    updateConfig({ enabled: !config.enabled });
  };

  return (
    <button
      onClick={handleToggle}
      className={`p-2 rounded-lg transition-colors ${
        config.enabled 
          ? 'bg-green-600 hover:bg-green-700 text-white' 
          : 'bg-gray-600 hover:bg-gray-700 text-gray-300'
      }`}
      title={config.enabled ? 'Выключить звук' : 'Включить звук'}
    >
      {config.enabled ? '🔊' : '🔇'}
    </button>
  );
};

// Компонент для отображения уведомления о новом заказе с анимацией
export const NewOrderAlert: React.FC<{ 
  orderId: number; 
  onClose: () => void; 
  visible: boolean;
}> = ({ orderId, onClose, visible }) => {

  useEffect(() => {
    if (visible) {
      // Показываем уведомление на 3 секунды
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-4 right-4 bg-green-600 text-white p-4 rounded-lg shadow-lg z-50 animate-slide-in">
      <div className="flex items-center space-x-3">
        <div className="text-2xl animate-bounce">🆕</div>
        <div>
          <h3 className="font-semibold">Новый заказ!</h3>
          <p className="text-sm opacity-90">Заказ #{orderId}</p>
        </div>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 text-xl"
        >
          ×
        </button>
      </div>
    </div>
  );
};

// Компонент для отображения статистики звуковых уведомлений
export const SoundStats: React.FC = () => {
  const [stats, setStats] = useState({
    totalPlayed: 0,
    newOrderSounds: 0,
    updateSounds: 0,
    notificationSounds: 0,
  });

  useEffect(() => {
    // Загружаем статистику из localStorage
    const savedStats = localStorage.getItem('sound_stats');
    if (savedStats) {
      try {
        setStats(JSON.parse(savedStats));
      } catch {
        // Игнорируем ошибки парсинга
      }
    }

    // Слушаем события воспроизведения звука
    const handleSoundPlay = (event: CustomEvent) => {
      const soundType = event.detail.type;
      setStats(prev => {
        const newStats = {
          ...prev,
          totalPlayed: prev.totalPlayed + 1,
          [`${soundType}Sounds`]: prev[`${soundType}Sounds` as keyof typeof prev] + 1,
        };
        localStorage.setItem('sound_stats', JSON.stringify(newStats));
        return newStats;
      });
    };

    window.addEventListener('soundPlayed', handleSoundPlay as EventListener);
    
    return () => {
      window.removeEventListener('soundPlayed', handleSoundPlay as EventListener);
    };
  }, []);

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="mr-2">📊</span>
        Статистика звуков
      </h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Всего воспроизведено:</span>
          <span className="text-white font-semibold">{stats.totalPlayed}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Новые заказы:</span>
          <span className="text-green-400 font-semibold">{stats.newOrderSounds}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Обновления:</span>
          <span className="text-blue-400 font-semibold">{stats.updateSounds}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-gray-300">Уведомления:</span>
          <span className="text-purple-400 font-semibold">{stats.notificationSounds}</span>
        </div>
        
        <div className="pt-3 border-t border-gray-700">
          <button
            onClick={() => {
              setStats({
                totalPlayed: 0,
                newOrderSounds: 0,
                updateSounds: 0,
                notificationSounds: 0,
              });
              localStorage.removeItem('sound_stats');
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🗑️ Сбросить статистику
          </button>
        </div>
      </div>
    </div>
  );
};
