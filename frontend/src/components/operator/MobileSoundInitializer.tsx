import React, { useState, useEffect, useCallback } from 'react';
import { useSoundNotifications } from './SoundNotificationManager';

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

// Компонент для мобильной инициализации звуков
export const MobileSoundInitializer: React.FC = () => {
  const { playSound, config } = useSoundNotifications();
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isPWA, setIsPWA] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [needsInteraction, setNeedsInteraction] = useState(false);
  const [audioContextState, setAudioContextState] = useState<string>('unknown');
  const [showActivationPrompt, setShowActivationPrompt] = useState(false);

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

    console.log('📱 Mobile Sound Initializer:', {
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
        console.log('📱 Mobile: AudioContext state:', window.audioContext.state);
      }
    };

    checkAudioContext();
    
    // Проверяем каждые 2 секунды
    const interval = setInterval(checkAudioContext, 2000);
    return () => clearInterval(interval);
  }, []);

  // Проверяем политику автовоспроизведения на мобильных
  useEffect(() => {
    if (!isMobile || !isPWA) return;

    const checkMobileAutoplayPolicy = async () => {
      try {
        console.log('📱 Mobile: Checking autoplay policy...');
        
        // Создаем очень короткий тестовый звук
        const audio = new Audio();
        audio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScT';
        audio.volume = 0.01;
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('📱 Mobile: Autoplay allowed');
          setIsInitialized(true);
          setNeedsInteraction(false);
        }
      } catch (error) {
        console.log('📱 Mobile: Autoplay blocked - user interaction required');
        console.log('📱 Mobile: Error details:', error);
        setNeedsInteraction(true);
        setShowActivationPrompt(true);
      }
    };

    // Проверяем через 1 секунду после загрузки
    const timer = setTimeout(checkMobileAutoplayPolicy, 1000);
    return () => clearTimeout(timer);
  }, [isMobile, isPWA]);

  // Проверяем сохраненное состояние инициализации
  useEffect(() => {
    if (isMobile && isPWA) {
      const wasInitialized = localStorage.getItem('mobile_sound_initialized') === 'true';
      if (wasInitialized) {
        console.log('📱 Mobile: Sound system was previously initialized');
        setIsInitialized(true);
        setNeedsInteraction(false);
        setShowActivationPrompt(false);
      }
    }
  }, [isMobile, isPWA]);

  const handleInitialize = useCallback(async () => {
    try {
      console.log('📱 Mobile: Initializing sound system...');
      
      // Инициализируем AudioContext
      if (!window.audioContext) {
        window.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('📱 Mobile: AudioContext created');
      }
      
      // Возобновляем AudioContext если приостановлен
      if (window.audioContext.state === 'suspended') {
        await window.audioContext.resume();
        console.log('📱 Mobile: AudioContext resumed');
      }

      // Воспроизводим тестовый звук для активации
      playSound('new_order');
      
      setIsInitialized(true);
      setNeedsInteraction(false);
      setShowActivationPrompt(false);
      setAudioContextState(window.audioContext.state);
      
      console.log('📱 Mobile: Sound system initialized successfully');
      
      // Сохраняем состояние инициализации в localStorage
      localStorage.setItem('mobile_sound_initialized', 'true');
      
    } catch (error) {
      console.error('📱 Mobile: Error initializing sound system:', error);
    }
  }, [playSound]);

  // Слушаем события от Service Worker
  useEffect(() => {
    if (!isMobile || !isPWA) return;

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'PLAY_SOUND') {
        console.log('📱 Mobile: Received sound request from Service Worker:', event.data.soundType);
        if (isInitialized) {
          playSound(event.data.soundType as any);
        } else {
          console.warn('📱 Mobile: Sound system not initialized, cannot play sound');
        }
      }
    };

    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, [isMobile, isPWA, isInitialized, playSound]);

  if (!config.enabled) {
    return null;
  }

  if (!isMobile || !isPWA) {
    return null; // Не показываем на десктопе или в браузере
  }

  if (isInitialized) {
    return (
      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-green-400 text-lg">📱</span>
          <div>
            <p className="text-green-300 text-sm font-medium">Мобильные звуковые уведомления активны</p>
            <p className="text-green-400 text-xs">
              {isIOS ? 'iOS' : isAndroid ? 'Android' : 'Mobile'} • AudioContext: {audioContextState}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (needsInteraction || showActivationPrompt) {
    return (
      <div className="bg-orange-900/30 border border-orange-600/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-orange-400 text-2xl">📱</span>
            <div>
              <h3 className="text-orange-300 font-semibold">
                {isIOS ? 'iOS' : isAndroid ? 'Android' : 'Мобильное'} устройство
              </h3>
              <p className="text-orange-400 text-sm">
                Активация звуковых уведомлений в PWA режиме
              </p>
              <p className="text-orange-400 text-xs mt-1">
                AudioContext: {audioContextState}
              </p>
              {isIOS && (
                <p className="text-orange-300 text-xs mt-1">
                  ⚠️ На iOS требуется пользовательское взаимодействие
                </p>
              )}
            </div>
          </div>
          <button
            onClick={handleInitialize}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔊 Активировать
          </button>
        </div>
      </div>
    );
  }

  return null;
};

// Компонент для принудительной активации звука на мобильных
export const MobileSoundActivator: React.FC = () => {
  const { playSound, config } = useSoundNotifications();
  const [isMobile, setIsMobile] = useState(false);
  const [isPWA, setIsPWA] = useState(false);

  useEffect(() => {
    const mobile = isMobileDevice();
    const pwa = window.matchMedia('(display-mode: standalone)').matches ||
               (window.navigator as any).standalone === true;

    setIsMobile(mobile);
    setIsPWA(pwa);
  }, []);

  const handleForceActivate = useCallback(async () => {
    try {
      console.log('📱 Mobile: Force activating sound system...');
      
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
      localStorage.setItem('mobile_sound_initialized', 'true');
      
      console.log('📱 Mobile: Force activation completed');
      
    } catch (error) {
      console.error('📱 Mobile: Force activation failed:', error);
    }
  }, [playSound]);

  if (!isMobile || !isPWA || !config.enabled) {
    return null;
  }

  return (
    <div className="bg-purple-900/30 border border-purple-600/50 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-purple-400 text-lg">📱</span>
          <div>
            <p className="text-purple-300 text-sm font-medium">Мобильные звуки</p>
            <p className="text-purple-400 text-xs">Активация для мобильного PWA</p>
          </div>
        </div>
        <button
          onClick={handleForceActivate}
          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
        >
          🔊 Активировать
        </button>
      </div>
    </div>
  );
};
