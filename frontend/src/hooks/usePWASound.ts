import { useState, useEffect, useCallback } from 'react';
import { useSoundNotifications } from '../components/operator/SoundNotificationManager';

// Хук для управления звуками в PWA режиме
export const usePWASound = () => {
  const { playSound, config } = useSoundNotifications();
  const [isPWA, setIsPWA] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [audioContextState, setAudioContextState] = useState<string>('unknown');

  // Проверяем PWA режим
  useEffect(() => {
    const checkPWAMode = () => {
      const isPWAMode = window.matchMedia('(display-mode: standalone)').matches ||
                       (window.navigator as any).standalone === true;
      setIsPWA(isPWAMode);
    };

    checkPWAMode();
    
    // Слушаем изменения режима отображения
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleChange = () => checkPWAMode();
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Проверяем состояние AudioContext
  useEffect(() => {
    const checkAudioContext = () => {
      if (window.audioContext) {
        setAudioContextState(window.audioContext.state);
        
        // Если AudioContext работает, считаем систему инициализированной
        if (window.audioContext.state === 'running' && !isInitialized) {
          setIsInitialized(true);
          console.log('🔊 PWA Hook: AudioContext is running, marking as initialized');
        }
      }
    };

    checkAudioContext();
    
    // Проверяем каждые 3 секунды
    const interval = setInterval(checkAudioContext, 3000);
    return () => clearInterval(interval);
  }, [isInitialized]);

  // Проверяем сохраненное состояние инициализации
  useEffect(() => {
    if (isPWA) {
      const wasInitialized = localStorage.getItem('pwa_sound_initialized') === 'true';
      if (wasInitialized) {
        setIsInitialized(true);
        console.log('🔊 PWA Hook: Sound system was previously initialized');
      }
    } else {
      // В браузере считаем систему инициализированной если AudioContext работает
      if (window.audioContext && window.audioContext.state === 'running') {
        setIsInitialized(true);
        console.log('🔊 PWA Hook: Browser mode - AudioContext is running');
      }
    }
  }, [isPWA]);

  // Инициализация звуковой системы
  const initializeSound = useCallback(async () => {
    try {
      console.log('🔊 PWA Hook: Initializing sound system...');
      
      // Создаем AudioContext
      if (!window.audioContext) {
        window.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🔊 PWA Hook: AudioContext created');
      }
      
      // Возобновляем AudioContext
      if (window.audioContext.state === 'suspended') {
        await window.audioContext.resume();
        console.log('🔊 PWA Hook: AudioContext resumed');
      }

      // Воспроизводим тестовый звук
      playSound('new_order');
      
      // Сохраняем состояние
      setIsInitialized(true);
      setAudioContextState(window.audioContext.state);
      localStorage.setItem('pwa_sound_initialized', 'true');
      
      console.log('🔊 PWA Hook: Sound system initialized successfully');
      
      return true;
    } catch (error) {
      console.error('🔊 PWA Hook: Error initializing sound system:', error);
      return false;
    }
  }, [playSound]);

  // Воспроизведение звука с проверкой инициализации
  const playSoundSafe = useCallback((type: 'new_order' | 'order_update' | 'notification') => {
    if (!config.enabled) {
      console.log('🔊 PWA Hook: Sound disabled');
      return;
    }

    if (!isPWA) {
      // В браузере используем обычное воспроизведение
      playSound(type);
      return;
    }

    // В PWA проверяем инициализацию
    if (!isInitialized) {
      console.warn('🔊 PWA Hook: Sound system not initialized, attempting to initialize...');
      
      // Попробуем инициализировать автоматически
      initializeSound().then((success) => {
        if (success) {
          playSound(type);
        }
      });
      return;
    }

    // Проверяем состояние AudioContext
    if (window.audioContext && window.audioContext.state === 'suspended') {
      console.warn('🔊 PWA Hook: AudioContext suspended, attempting to resume...');
      window.audioContext.resume().then(() => {
        playSound(type);
      }).catch((error) => {
        console.error('🔊 PWA Hook: Failed to resume AudioContext:', error);
      });
      return;
    }

    playSound(type);
  }, [config.enabled, isPWA, isInitialized, playSound, initializeSound]);

  // Сброс состояния инициализации
  const resetInitialization = useCallback(() => {
    setIsInitialized(false);
    localStorage.removeItem('pwa_sound_initialized');
    console.log('🔊 PWA Hook: Sound initialization state reset');
  }, []);

  return {
    isPWA,
    isInitialized,
    audioContextState,
    initializeSound,
    playSoundSafe,
    resetInitialization,
  };
};
