import { useState, useEffect, useCallback } from 'react';
import { useSoundNotifications } from '../components/operator/SoundNotificationManager';

// Утилиты для определения мобильного устройства
const isMobileDevice = (): boolean => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
         (typeof window !== 'undefined' && window.innerWidth <= 768);
};

const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const isAndroidDevice = (): boolean => {
  return /Android/i.test(navigator.userAgent);
};

// Хук для управления звуками на мобильных устройствах
export const useMobileSound = () => {
  const { playSound, config } = useSoundNotifications();
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [audioContextState, setAudioContextState] = useState<string>('unknown');

  // Определяем тип устройства
  useEffect(() => {
    const mobile = isMobileDevice();
    const ios = isIOSDevice();
    const android = isAndroidDevice();
    const pwa = window.matchMedia('(display-mode: standalone)').matches ||
               (window.navigator as any).standalone === true;

    setIsMobile(mobile);
    setIsIOS(ios);
    setIsAndroid(android);
    setIsPWA(pwa);

    console.log('📱 Mobile Sound Hook:', {
      mobile,
      ios,
      android,
      pwa,
      userAgent: navigator.userAgent
    });
  }, []);

  // Проверяем состояние AudioContext
  useEffect(() => {
    const checkAudioContext = () => {
      if (window.audioContext) {
        setAudioContextState(window.audioContext.state);
        
        // Если AudioContext работает, считаем систему инициализированной
        if (window.audioContext.state === 'running' && !isInitialized) {
          setIsInitialized(true);
          console.log('📱 Mobile Hook: AudioContext is running, marking as initialized');
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
    if (isMobile && isPWA) {
      const wasInitialized = localStorage.getItem('mobile_sound_initialized') === 'true';
      if (wasInitialized) {
        setIsInitialized(true);
        console.log('📱 Mobile Hook: Sound system was previously initialized');
      }
    } else if (isMobile && !isPWA) {
      // В мобильном браузере считаем систему инициализированной если AudioContext работает
      if (window.audioContext && window.audioContext.state === 'running') {
        setIsInitialized(true);
        console.log('📱 Mobile Hook: Mobile browser - AudioContext is running');
      }
    }
  }, [isMobile, isPWA]);

  // Инициализация звуковой системы для мобильных
  const initializeSound = useCallback(async () => {
    try {
      console.log('📱 Mobile Hook: Initializing sound system...');
      
      // Создаем AudioContext
      if (!window.audioContext) {
        window.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('📱 Mobile Hook: AudioContext created');
      }
      
      // Возобновляем AudioContext
      if (window.audioContext.state === 'suspended') {
        await window.audioContext.resume();
        console.log('📱 Mobile Hook: AudioContext resumed');
      }

      // Воспроизводим тестовый звук
      playSound('new_order');
      
      // Сохраняем состояние
      setIsInitialized(true);
      setAudioContextState(window.audioContext.state);
      
      if (isPWA) {
        localStorage.setItem('mobile_sound_initialized', 'true');
      }
      
      console.log('📱 Mobile Hook: Sound system initialized successfully');
      
      return true;
    } catch (error) {
      console.error('📱 Mobile Hook: Error initializing sound system:', error);
      return false;
    }
  }, [playSound, isPWA]);

  // Воспроизведение звука с проверкой мобильной инициализации
  const playSoundSafe = useCallback((type: 'new_order' | 'order_update' | 'notification') => {
    if (!config.enabled) {
      console.log('📱 Mobile Hook: Sound disabled');
      return;
    }

    if (!isMobile) {
      // На десктопе используем обычное воспроизведение
      playSound(type);
      return;
    }

    // На мобильных проверяем инициализацию
    if (!isInitialized) {
      console.warn('📱 Mobile Hook: Sound system not initialized, attempting to initialize...');
      
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
      console.warn('📱 Mobile Hook: AudioContext suspended, attempting to resume...');
      window.audioContext.resume().then(() => {
        playSound(type);
      }).catch((error) => {
        console.error('📱 Mobile Hook: Failed to resume AudioContext:', error);
      });
      return;
    }

    playSound(type);
  }, [config.enabled, isMobile, isInitialized, playSound, initializeSound]);

  // Сброс состояния инициализации
  const resetInitialization = useCallback(() => {
    setIsInitialized(false);
    if (isPWA) {
      localStorage.removeItem('mobile_sound_initialized');
    }
    console.log('📱 Mobile Hook: Sound initialization state reset');
  }, [isPWA]);

  return {
    isMobile,
    isIOS,
    isAndroid,
    isPWA,
    isInitialized,
    audioContextState,
    initializeSound,
    playSoundSafe,
    resetInitialization,
  };
};
