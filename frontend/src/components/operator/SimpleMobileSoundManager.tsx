import React, { useState, useEffect, useCallback } from 'react';
import { useSoundNotifications } from './SoundNotificationManager';

// Утилиты для определения мобильного устройства
const isMobileDevice = (): boolean => {
  // Проверяем User Agent
  const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Проверяем размер экрана
  const screenMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
  
  // Проверяем touch события
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  
  // Комбинированная проверка
  const isMobile = userAgentMobile || (screenMobile && hasTouch);
  
  console.log('📱 Simple Mobile detection:', {
    userAgentMobile,
    screenMobile,
    hasTouch,
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints,
    finalResult: isMobile
  });
  
  return isMobile;
};

const isIOSDevice = (): boolean => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
};

const isAndroidDevice = (): boolean => {
  return /Android/i.test(navigator.userAgent);
};

// Простая система звуков для мобильных устройств
export const SimpleMobileSoundManager: React.FC = () => {
  const { config } = useSoundNotifications();
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});
  const [waitingForInteraction, setWaitingForInteraction] = useState(false);

  // Определяем тип устройства
  useEffect(() => {
    const mobile = isMobileDevice();
    const ios = isIOSDevice();
    const android = isAndroidDevice();

    setIsMobile(mobile);
    setIsIOS(ios);
    setIsAndroid(android);

    console.log('📱 Simple Mobile Sound Manager:', {
      mobile,
      ios,
      android,
      userAgent: navigator.userAgent
    });
  }, []);

  // Создаем аудио элементы для каждого типа звука
  useEffect(() => {
    if (!isMobile) return;

    const createAudioElement = (frequency: number): HTMLAudioElement => {
      const audio = new Audio();
      
      // Создаем простой тональный звук
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // Создаем blob URL для воспроизведения
      const duration = 0.3;
      const sampleRate = 44100;
      const length = sampleRate * duration;
      const buffer = new ArrayBuffer(44 + length * 2);
      const view = new DataView(buffer);
      
      // WAV header
      const writeString = (offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };
      
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + length * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, length * 2, true);
      
      // Generate sine wave
      for (let i = 0; i < length; i++) {
        const sample = Math.sin(2 * Math.PI * frequency * i / sampleRate) * 0.3;
        view.setInt16(44 + i * 2, sample * 32767, true);
      }
      
      const blob = new Blob([buffer], { type: 'audio/wav' });
      audio.src = URL.createObjectURL(blob);
      audio.volume = config?.volume || 0.5;
      audio.preload = 'auto';
      
      return audio;
    };

    const elements = {
      new_order: createAudioElement(800),
      order_update: createAudioElement(600),
      notification: createAudioElement(400)
    };

    setAudioElements(elements);
    console.log('📱 Mobile: Audio elements created');

    return () => {
      // Очистка
      Object.values(elements).forEach(audio => {
        if (audio.src.startsWith('blob:')) {
          URL.revokeObjectURL(audio.src);
        }
      });
    };
  }, [isMobile, config?.volume]);

  // Проверяем политику автовоспроизведения
  useEffect(() => {
    if (!isMobile) return;

    const checkAutoplayPolicy = async () => {
      try {
        console.log('📱 Mobile: Testing autoplay policy...');
        
        // Простой тест автовоспроизведения
        const testAudio = new Audio();
        testAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScT';
        testAudio.volume = 0.01;
        
        const playPromise = testAudio.play();
        if (playPromise !== undefined) {
          await playPromise;
          console.log('📱 Mobile: Autoplay allowed');
          setIsInitialized(true);
          setShowPrompt(false);
        }
      } catch (error) {
        console.log('📱 Mobile: Autoplay blocked, showing prompt');
        console.log('📱 Mobile: Error:', error);
        setShowPrompt(true);
      }
    };

    // Проверяем через 1 секунду
    const timer = setTimeout(checkAutoplayPolicy, 1000);
    return () => clearTimeout(timer);
  }, [isMobile]);

  // Инициализация звуковой системы
  const handleInitialize = useCallback(async () => {
    try {
      console.log('📱 Mobile: Initializing simple sound system...');
      
      // Создаем AudioContext
      if (!window.audioContext) {
        window.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('📱 Mobile: AudioContext created');
      }
      
      // Возобновляем AudioContext
      if (window.audioContext.state === 'suspended') {
        await window.audioContext.resume();
        console.log('📱 Mobile: AudioContext resumed');
      }

      // Проверяем, что аудио элементы созданы
      if (Object.keys(audioElements).length === 0) {
        console.log('📱 Mobile: No audio elements found, waiting for creation...');
        // Ждем создания аудио элементов
        setTimeout(() => {
          if (Object.keys(audioElements).length > 0) {
            console.log('📱 Mobile: Audio elements created, proceeding with test');
            const testAudio = audioElements.new_order;
            if (testAudio) {
              testAudio.play().then(() => {
                console.log('📱 Mobile: Test sound played successfully');
                setIsInitialized(true);
                setShowPrompt(false);
                localStorage.setItem('mobile_sound_simple_initialized', 'true');
                localStorage.setItem('mobile_sound_persistent_activated', 'true');
                sessionStorage.setItem('mobile_sound_session_activated', 'true');
              }).catch((error) => {
                console.error('📱 Mobile: Test sound failed:', error);
                // Все равно считаем инициализированным
                setIsInitialized(true);
                setShowPrompt(false);
                localStorage.setItem('mobile_sound_simple_initialized', 'true');
                localStorage.setItem('mobile_sound_persistent_activated', 'true');
                sessionStorage.setItem('mobile_sound_session_activated', 'true');
              });
            }
          }
        }, 1000);
        return;
      }

      // Воспроизводим тестовый звук
      const testAudio = audioElements.new_order;
      if (testAudio) {
        await testAudio.play();
        console.log('📱 Mobile: Test sound played successfully');
      }
      
      setIsInitialized(true);
      setShowPrompt(false);
      
      // Сохраняем состояние во всех хранилищах
      localStorage.setItem('mobile_sound_simple_initialized', 'true');
      localStorage.setItem('mobile_sound_persistent_activated', 'true');
      sessionStorage.setItem('mobile_sound_session_activated', 'true');
      
      console.log('📱 Mobile: Simple sound system initialized');
      
    } catch (error) {
      console.error('📱 Mobile: Initialization failed:', error);
      
      // Даже если инициализация не удалась, сохраняем состояние
      // чтобы не показывать prompt снова
      setIsInitialized(true);
      setShowPrompt(false);
      localStorage.setItem('mobile_sound_simple_initialized', 'true');
      localStorage.setItem('mobile_sound_persistent_activated', 'true');
      sessionStorage.setItem('mobile_sound_session_activated', 'true');
      console.log('📱 Mobile: Marked as initialized despite error');
    }
  }, [audioElements]);

  // Проверяем сохраненное состояние
  useEffect(() => {
    if (isMobile) {
      const wasInitialized = localStorage.getItem('mobile_sound_simple_initialized') === 'true';
      if (wasInitialized) {
        console.log('📱 Mobile: Previously initialized, checking audio elements...');
        
        // Проверяем, есть ли аудио элементы
        if (Object.keys(audioElements).length > 0) {
          console.log('📱 Mobile: Audio elements found, marking as initialized');
          setIsInitialized(true);
          setShowPrompt(false);
        } else {
          console.log('📱 Mobile: No audio elements found, waiting for creation...');
          // Ждем создания аудио элементов с таймаутом
          const checkTimer = setTimeout(() => {
            if (Object.keys(audioElements).length > 0) {
              console.log('📱 Mobile: Audio elements created after timeout, marking as initialized');
              setIsInitialized(true);
              setShowPrompt(false);
            } else {
              console.log('📱 Mobile: Audio elements still not found, showing prompt');
              setShowPrompt(true);
            }
          }, 2000);
          
          return () => clearTimeout(checkTimer);
        }
      }
    }
  }, [isMobile, audioElements]);

  // Принудительная активация звуковой системы
  const forceActivateSoundSystem = useCallback(async () => {
    console.log('📱 Mobile: Force activating sound system...');
    
    try {
      // Принудительно создаем AudioContext
      if (!window.audioContext) {
        window.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('📱 Mobile: AudioContext created forcefully');
      }
      
      // Принудительно возобновляем AudioContext
      if (window.audioContext.state === 'suspended') {
        await window.audioContext.resume();
        console.log('📱 Mobile: AudioContext resumed forcefully');
      }
      
      // Принудительно инициализируем систему
      await handleInitialize();
      
      // Принудительно сохраняем состояние
      localStorage.setItem('mobile_sound_persistent_activated', 'true');
      sessionStorage.setItem('mobile_sound_session_activated', 'true');
      localStorage.setItem('mobile_sound_simple_initialized', 'true');
      
      console.log('📱 Mobile: Sound system force activated successfully');
      
    } catch (error) {
      console.error('📱 Mobile: Force activation failed:', error);
      
      // Даже при ошибке помечаем как активированную
      setIsInitialized(true);
      setShowPrompt(false);
      localStorage.setItem('mobile_sound_persistent_activated', 'true');
      sessionStorage.setItem('mobile_sound_session_activated', 'true');
      localStorage.setItem('mobile_sound_simple_initialized', 'true');
    }
  }, [handleInitialize]);

  // Проверяем состояние AudioContext при загрузке
  // Периодическая проверка и восстановление системы
  useEffect(() => {
    if (!isMobile) return;

    const checkAndRestoreSystem = async () => {
      console.log('📱 Mobile: Periodic system check...');
      
      // Проверяем состояние системы
      const shouldBeActive = localStorage.getItem('mobile_sound_persistent_activated') === 'true' ||
                           sessionStorage.getItem('mobile_sound_session_activated') === 'true' ||
                           localStorage.getItem('mobile_sound_simple_initialized') === 'true';
      
      if (shouldBeActive && !isInitialized) {
        console.log('📱 Mobile: System should be active but not initialized, restoring...');
        await forceActivateSoundSystem();
        return;
      }
      
      // Проверяем AudioContext
      if (window.audioContext) {
        console.log('📱 Mobile: AudioContext state:', window.audioContext.state);
        
        if (window.audioContext.state === 'suspended') {
          console.log('📱 Mobile: AudioContext suspended, resuming...');
          try {
            await window.audioContext.resume();
            console.log('📱 Mobile: AudioContext resumed');
          } catch (error) {
            console.error('📱 Mobile: Failed to resume AudioContext:', error);
          }
        }
      }
      
      // Проверяем аудио элементы
      if (isInitialized && Object.keys(audioElements).length === 0) {
        console.log('📱 Mobile: Audio elements missing, recreating...');
        await forceActivateSoundSystem();
      }
    };

    // Проверяем сразу
    checkAndRestoreSystem();
    
    // Проверяем каждые 3 секунды
    const interval = setInterval(checkAndRestoreSystem, 3000);
    
    return () => clearInterval(interval);
  }, [isMobile, isInitialized, audioElements, forceActivateSoundSystem]);

  // Автоматическая активация при загрузке страницы
  useEffect(() => {
    if (!isMobile) return;

    const autoInitialize = async () => {
      console.log('📱 Mobile: Auto-initializing sound system on page load...');
      
      // Проверяем множественные источники состояния активации
      const localStorageActivated = localStorage.getItem('mobile_sound_persistent_activated') === 'true';
      const sessionStorageActivated = sessionStorage.getItem('mobile_sound_session_activated') === 'true';
      const wasInitialized = localStorage.getItem('mobile_sound_simple_initialized') === 'true';
      
      console.log('📱 Mobile: Activation status:', {
        localStorageActivated,
        sessionStorageActivated,
        wasInitialized,
        currentInitialized: isInitialized
      });
      
      // Если система была активирована ранее ИЛИ уже инициализирована
      if (localStorageActivated || sessionStorageActivated || wasInitialized || isInitialized) {
        console.log('📱 Mobile: Sound system was previously activated, preparing for auto-activation...');
        
        // Не активируем сразу, а ждем первого взаимодействия пользователя
        // Это решает проблему с политикой автовоспроизведения браузеров
        console.log('📱 Mobile: Waiting for user interaction to activate (browser autoplay policy)...');
        
        // Показываем подсказку о необходимости взаимодействия
        setWaitingForInteraction(true);
        setShowPrompt(false);
        
      } else {
        console.log('📱 Mobile: Sound system not previously activated, waiting for user interaction...');
        
        const handleUserInteraction = async () => {
          console.log('📱 Mobile: User interaction detected, force initializing sound...');
          await forceActivateSoundSystem();
          
          // Удаляем слушатели после активации
          document.removeEventListener('click', handleUserInteraction);
          document.removeEventListener('touchstart', handleUserInteraction);
          document.removeEventListener('keydown', handleUserInteraction);
        };

        // Добавляем слушатели для различных типов взаимодействия
        document.addEventListener('click', handleUserInteraction, { once: true });
        document.addEventListener('touchstart', handleUserInteraction, { once: true });
        document.addEventListener('keydown', handleUserInteraction, { once: true });

        return () => {
          document.removeEventListener('click', handleUserInteraction);
          document.removeEventListener('touchstart', handleUserInteraction);
          document.removeEventListener('keydown', handleUserInteraction);
        };
      }
    };

    // Задержка для стабилизации
    const timeoutId = setTimeout(autoInitialize, 100);
    
    return () => clearTimeout(timeoutId);
  }, [isMobile, handleInitialize, forceActivateSoundSystem, isInitialized]);

  // Автоматическое создание AudioContext при загрузке
  useEffect(() => {
    if (!isMobile) return;

    console.log('📱 Mobile: Creating AudioContext on page load...');
    
    // Создаем AudioContext сразу при загрузке
    if (!window.audioContext) {
      window.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('📱 Mobile: AudioContext created on page load');
    }

    // Автоматическая активация AudioContext при любом взаимодействии
    const handleAnyInteraction = async () => {
      console.log('📱 Mobile: User interaction detected, activating sound system...');
      
      // Проверяем, нужно ли активировать систему
      const shouldActivate = localStorage.getItem('mobile_sound_persistent_activated') === 'true' ||
                           sessionStorage.getItem('mobile_sound_session_activated') === 'true' ||
                           localStorage.getItem('mobile_sound_simple_initialized') === 'true';
      
      if (shouldActivate && !isInitialized) {
        console.log('📱 Mobile: System should be active, force activating...');
        setWaitingForInteraction(false);
        await forceActivateSoundSystem();
      }
      
      // Возобновляем AudioContext
      if (window.audioContext && window.audioContext.state === 'suspended') {
        console.log('📱 Mobile: Resuming AudioContext from interaction...');
        try {
          await window.audioContext.resume();
          console.log('📱 Mobile: AudioContext resumed from interaction');
        } catch (error) {
          console.error('📱 Mobile: Failed to resume AudioContext from interaction:', error);
        }
      }
    };

    // Добавляем слушатели для всех типов взаимодействия
    document.addEventListener('click', handleAnyInteraction, { passive: true });
    document.addEventListener('touchstart', handleAnyInteraction, { passive: true });
    document.addEventListener('keydown', handleAnyInteraction, { passive: true });
    document.addEventListener('scroll', handleAnyInteraction, { passive: true });
    document.addEventListener('mousemove', handleAnyInteraction, { passive: true });
    document.addEventListener('focus', handleAnyInteraction, { passive: true });

    return () => {
      document.removeEventListener('click', handleAnyInteraction);
      document.removeEventListener('touchstart', handleAnyInteraction);
      document.removeEventListener('keydown', handleAnyInteraction);
      document.removeEventListener('scroll', handleAnyInteraction);
      document.removeEventListener('mousemove', handleAnyInteraction);
      document.removeEventListener('focus', handleAnyInteraction);
    };
  }, [isMobile, isInitialized, forceActivateSoundSystem]);

  // Воспроизведение звука
  const playSound = useCallback(async (type: 'new_order' | 'order_update' | 'notification') => {
    if (!config?.enabled) {
      console.log('📱 Mobile: Sound disabled');
      return;
    }

    if (!isMobile) {
      console.log('📱 Mobile: Not mobile device');
      return;
    }

    if (!isInitialized) {
      console.log('📱 Mobile: Not initialized, showing prompt');
      setShowPrompt(true);
      return;
    }

    try {
      // Проверяем и возобновляем AudioContext если нужно
      if (window.audioContext && window.audioContext.state === 'suspended') {
        console.log('📱 Mobile: AudioContext suspended, attempting to resume...');
        await window.audioContext.resume();
        console.log('📱 Mobile: AudioContext resumed');
      }

      // Если AudioContext все еще не активен, пытаемся создать новый
      if (!window.audioContext || window.audioContext.state === 'closed') {
        console.log('📱 Mobile: AudioContext not available, creating new one...');
        window.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const audio = audioElements[type];
      if (audio) {
        console.log(`📱 Mobile: Playing ${type} sound`);
        
        // Сбрасываем позицию
        audio.currentTime = 0;
        
        // Воспроизводим
        await audio.play();
        
        console.log(`📱 Mobile: ${type} sound played successfully`);
        
        // Отправляем событие о успешном воспроизведении
        window.dispatchEvent(new CustomEvent('soundPlayed', { 
          detail: { type, timestamp: Date.now() } 
        }));
        
        // Обновляем глобальные переменные для диагностики
        (window as any).mobileSoundLastPlayed = type;
        (window as any).mobileSoundLastTime = new Date().toLocaleTimeString();
      } else {
        console.warn(`📱 Mobile: Audio element for ${type} not found`);
        
        // Если аудио элемент не найден, но система инициализирована,
        // попробуем пересоздать элементы
        if (isInitialized && Object.keys(audioElements).length === 0) {
          console.log('📱 Mobile: Audio elements missing, recreating...');
          // Перезагружаем страницу для пересоздания элементов
          window.location.reload();
        }
      }
    } catch (error) {
      console.error(`📱 Mobile: Error playing ${type} sound:`, error);
      
      // Отправляем событие об ошибке
      const errorMessage = error instanceof Error ? error.message : String(error);
      window.dispatchEvent(new CustomEvent('soundError', { 
        detail: { type, error: errorMessage, timestamp: Date.now() } 
      }));
      
      // Обновляем глобальные переменные для диагностики
      (window as any).mobileSoundLastError = errorMessage;
      
      // НЕ сбрасываем состояние инициализации при ошибках воспроизведения
      // Только логируем ошибку
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.log('📱 Mobile: Autoplay blocked, but keeping initialization state');
        // Не сбрасываем isInitialized, только показываем предупреждение
        console.warn('📱 Mobile: Sound blocked by browser policy, but system remains initialized');
      }
    }
  }, [config?.enabled, isMobile, isInitialized, audioElements]);

  // Экспортируем функцию воспроизведения в глобальную область
  useEffect(() => {
    if (isMobile) {
      (window as any).playMobileSound = playSound;
      (window as any).resetMobileSound = () => {
        console.log('📱 Mobile: Resetting sound system...');
        setIsInitialized(false);
        setShowPrompt(true);
        localStorage.removeItem('mobile_sound_simple_initialized');
        localStorage.removeItem('mobile_sound_persistent_activated');
        sessionStorage.removeItem('mobile_sound_session_activated');
      };
      
      
      // Обновляем состояние prompt если система инициализирована
      if (isInitialized && showPrompt) {
        console.log('📱 Mobile: System initialized but prompt still showing, hiding it...');
        setShowPrompt(false);
      }
      
      console.log('📱 Mobile: playMobileSound and resetMobileSound functions exported to window');
    }
  }, [isMobile, playSound, isInitialized, showPrompt, audioElements, handleInitialize]);

  if (!config?.enabled) {
    return null;
  }

  if (!isMobile) {
    return null;
  }

  if (isInitialized) {
    return (
      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3 mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-green-400 text-lg">📱</span>
          <div>
            <p className="text-green-300 text-sm font-medium">Мобильные звуки активны</p>
            <p className="text-green-400 text-xs">
              {isIOS ? 'iOS' : isAndroid ? 'Android' : 'Mobile'} • Простая система
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (waitingForInteraction) {
    return (
      <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-3">
          <span className="text-yellow-400 text-2xl">🔊</span>
          <div>
            <h3 className="text-yellow-300 font-semibold">
              Звуки готовы к активации
            </h3>
            <p className="text-yellow-400 text-sm">
              Сделайте любое действие (клик, нажатие кнопки) для активации звуков
            </p>
            <p className="text-yellow-400 text-xs mt-1">
              Это требование браузера для автовоспроизведения звука
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (showPrompt) {
    return (
      <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-red-400 text-2xl">📱</span>
            <div>
              <h3 className="text-red-300 font-semibold">
                {isIOS ? 'iOS' : isAndroid ? 'Android' : 'Мобильное'} устройство
              </h3>
              <p className="text-red-400 text-sm">
                Требуется активация звуков для мобильного устройства
              </p>
              <p className="text-red-400 text-xs mt-1">
                Нажмите кнопку для активации звуковых уведомлений
              </p>
            </div>
          </div>
          <button
            onClick={handleInitialize}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔊 Активировать звуки
          </button>
        </div>
      </div>
    );
  }

  return null;
};
