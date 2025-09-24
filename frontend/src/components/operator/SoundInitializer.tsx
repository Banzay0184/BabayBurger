import React, { useState, useEffect } from 'react';
import { useSoundNotifications } from './SoundNotificationManager';

// Компонент для инициализации звуковой системы при первом взаимодействии
export const SoundInitializer: React.FC = () => {
  const { playSound, config } = useSoundNotifications();
  const [isInitialized, setIsInitialized] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);

  useEffect(() => {
    // Проверяем, нуждается ли браузер в пользовательском взаимодействии
    const checkAutoplayPolicy = async () => {
      try {
        // Пытаемся создать и воспроизвести короткий звук
        const audio = new Audio();
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
        audio.volume = 0.01; // Очень тихий звук для теста
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('🔊 Autoplay allowed - no user interaction needed');
          setIsInitialized(true);
        }
      } catch (error) {
        console.log('🔊 Autoplay blocked - user interaction required');
        setNeedsInteraction(true);
      }
    };

    checkAutoplayPolicy();
  }, []);

  const handleInitialize = () => {
    try {
      // Инициализируем AudioContext
      if (!window.audioContext) {
        window.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (window.audioContext.state === 'suspended') {
        window.audioContext.resume().then(() => {
          console.log('🔊 AudioContext resumed after user interaction');
        });
      }

      // Воспроизводим тестовый звук
      playSound('new_order');
      setIsInitialized(true);
      setNeedsInteraction(false);
      
      console.log('🔊 Sound system initialized successfully');
    } catch (error) {
      console.error('🔊 Error initializing sound system:', error);
    }
  };

  if (!config.enabled) {
    return null;
  }

  if (isInitialized) {
    return null;
  }

  if (needsInteraction) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-yellow-400 text-2xl">🔊</span>
            <div>
              <h3 className="text-yellow-300 font-semibold">Инициализация звука</h3>
              <p className="text-yellow-400 text-sm">
                Нажмите кнопку для активации звуковых уведомлений
              </p>
            </div>
          </div>
          <button
            onClick={handleInitialize}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔊 Активировать звук
          </button>
        </div>
      </div>
    );
  }

  return null;
};
