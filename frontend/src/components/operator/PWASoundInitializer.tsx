import React, { useState, useEffect, useCallback } from 'react';
import { useSoundNotifications } from './SoundNotificationManager';

// Компонент для инициализации звуковой системы в PWA
export const PWASoundInitializer: React.FC = () => {
  const { playSound, config } = useSoundNotifications();
  const [isPWA, setIsPWA] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [audioContextState, setAudioContextState] = useState<string>('unknown');

  // Проверяем, запущено ли как PWA
  useEffect(() => {
    const checkPWAMode = () => {
      const isPWAMode = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
      setIsPWA(isPWAMode);
      console.log('🔊 PWA Sound Initializer: PWA mode:', isPWAMode);
    };

    checkPWAMode();
  }, []);

  // Проверяем состояние AudioContext
  useEffect(() => {
    const checkAudioContext = () => {
      if (window.audioContext) {
        setAudioContextState(window.audioContext.state);
        console.log('🔊 PWA Sound Initializer: AudioContext state:', window.audioContext.state);
      }
    };

    checkAudioContext();
    
    // Проверяем каждые 2 секунды
    const interval = setInterval(checkAudioContext, 2000);
    return () => clearInterval(interval);
  }, []);

  // Проверяем политику автовоспроизведения в PWA
  useEffect(() => {
    if (!isPWA) return;

    const checkAutoplayPolicy = async () => {
      try {
        // Создаем очень короткий тестовый звук
        const audio = new Audio();
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
        audio.volume = 0.01;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('🔊 PWA: Autoplay allowed');
          setIsInitialized(true);
        }
      } catch (error) {
        console.log('🔊 PWA: Autoplay blocked - user interaction required');
        setNeedsInteraction(true);
      }
    };

    // Проверяем через 1 секунду после загрузки
    const timer = setTimeout(checkAutoplayPolicy, 1000);
    return () => clearTimeout(timer);
  }, [isPWA]);

  const handleInitialize = useCallback(async () => {
    try {
      console.log('🔊 PWA: Initializing sound system...');
      
      // Инициализируем AudioContext
      if (!window.audioContext) {
        window.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🔊 PWA: AudioContext created');
      }
      
      // Возобновляем AudioContext если приостановлен
      if (window.audioContext.state === 'suspended') {
        await window.audioContext.resume();
        console.log('🔊 PWA: AudioContext resumed');
      }

      // Воспроизводим тестовый звук для активации
      playSound('new_order');
      
      setIsInitialized(true);
      setNeedsInteraction(false);
      setAudioContextState(window.audioContext.state);
      
      console.log('🔊 PWA: Sound system initialized successfully');
      
      // Сохраняем состояние инициализации в localStorage
      localStorage.setItem('pwa_sound_initialized', 'true');
      
    } catch (error) {
      console.error('🔊 PWA: Error initializing sound system:', error);
    }
  }, [playSound]);

  // Проверяем сохраненное состояние инициализации
  useEffect(() => {
    if (isPWA) {
      const wasInitialized = localStorage.getItem('pwa_sound_initialized') === 'true';
      if (wasInitialized) {
        console.log('🔊 PWA: Sound system was previously initialized');
        setIsInitialized(true);
        setNeedsInteraction(false);
      }
    }
  }, [isPWA]);

  // Слушаем события от Service Worker
  useEffect(() => {
    if (!isPWA) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAY_SOUND') {
        console.log('🔊 PWA: Received sound request from Service Worker:', event.data.soundType);
        if (isInitialized) {
          playSound(event.data.soundType as any);
        } else {
          console.warn('🔊 PWA: Sound system not initialized, cannot play sound');
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [isPWA, isInitialized, playSound]);

  if (!config.enabled) {
    return null;
  }

  if (!isPWA) {
    return null; // Не показываем в браузере
  }

  if (isInitialized) {
    return (
      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-green-400 text-lg">🔊</span>
          <div>
            <p className="text-green-300 text-sm font-medium">Звуковые уведомления активны</p>
            <p className="text-green-400 text-xs">AudioContext: {audioContextState}</p>
          </div>
        </div>
      </div>
    );
  }

  if (needsInteraction) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-yellow-400 text-2xl">📱</span>
            <div>
              <h3 className="text-yellow-300 font-semibold">PWA: Активация звука</h3>
              <p className="text-yellow-400 text-sm">
                В PWA режиме требуется активация звуковых уведомлений
              </p>
              <p className="text-yellow-400 text-xs mt-1">
                AudioContext: {audioContextState}
              </p>
            </div>
          </div>
          <button
            onClick={handleInitialize}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔊 Активировать
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// Компонент для принудительной активации звука в PWA
export const PWASoundActivator: React.FC = () => {
  const { playSound, config } = useSoundNotifications();
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const checkPWAMode = () => {
      const isPWAMode = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
      setIsPWA(isPWAMode);
    };

    checkPWAMode();
  }, []);

  const handleForceActivate = useCallback(async () => {
    try {
      console.log('🔊 PWA: Force activating sound system...');
      
      // Создаем AudioContext
      if (!window.audioContext) {
        window.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Принудительно возобновляем
      if (window.audioContext.state === 'suspended') {
        await window.audioContext.resume();
      }

      // Воспроизводим звук
      playSound('new_order');
      
      // Сохраняем состояние
      localStorage.setItem('pwa_sound_initialized', 'true');
      
      console.log('🔊 PWA: Force activation completed');
      
    } catch (error) {
      console.error('🔊 PWA: Force activation failed:', error);
    }
  }, [playSound]);

  if (!isPWA || !config.enabled) {
    return null;
  }

  return (
    <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-blue-400 text-lg">🔊</span>
          <div>
            <p className="text-blue-300 text-sm font-medium">PWA звуковые уведомления</p>
            <p className="text-blue-400 text-xs">Нажмите для активации звуков</p>
          </div>
        </div>
        <button
          onClick={handleForceActivate}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          🔊 Активировать
        </button>
      </div>
    </div>
  );
};
