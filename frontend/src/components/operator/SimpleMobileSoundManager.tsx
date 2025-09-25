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

// Простая система звуков для мобильных устройств
export const SimpleMobileSoundManager: React.FC = () => {
  const { config } = useSoundNotifications();
  const [isMobile, setIsMobile] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({});

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

  // Проверяем сохраненное состояние
  useEffect(() => {
    if (isMobile) {
      const wasInitialized = localStorage.getItem('mobile_sound_simple_initialized') === 'true';
      if (wasInitialized) {
        console.log('📱 Mobile: Previously initialized');
        setIsInitialized(true);
        setShowPrompt(false);
      }
    }
  }, [isMobile]);

  // Инициализация звуковой системы
  const handleInitialize = useCallback(async () => {
    try {
      console.log('📱 Mobile: Initializing simple sound system...');
      
      // Создаем AudioContext
      if (!window.audioContext) {
        window.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      // Возобновляем AudioContext
      if (window.audioContext.state === 'suspended') {
        await window.audioContext.resume();
      }

      // Воспроизводим тестовый звук
      const testAudio = audioElements.new_order;
      if (testAudio) {
        await testAudio.play();
      }
      
      setIsInitialized(true);
      setShowPrompt(false);
      
      // Сохраняем состояние
      localStorage.setItem('mobile_sound_simple_initialized', 'true');
      
      console.log('📱 Mobile: Simple sound system initialized');
      
    } catch (error) {
      console.error('📱 Mobile: Initialization failed:', error);
    }
  }, [audioElements]);

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
      const audio = audioElements[type];
      if (audio) {
        console.log(`📱 Mobile: Playing ${type} sound`);
        
        // Сбрасываем позицию
        audio.currentTime = 0;
        
        // Воспроизводим
        await audio.play();
        
        console.log(`📱 Mobile: ${type} sound played successfully`);
      } else {
        console.warn(`📱 Mobile: Audio element for ${type} not found`);
      }
    } catch (error) {
      console.error(`📱 Mobile: Error playing ${type} sound:`, error);
      
      // Если ошибка, показываем prompt для повторной инициализации
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.log('📱 Mobile: Autoplay blocked, showing prompt');
        setShowPrompt(true);
        setIsInitialized(false);
      }
    }
  }, [config?.enabled, isMobile, isInitialized, audioElements]);

  // Экспортируем функцию воспроизведения в глобальную область
  useEffect(() => {
    if (isMobile) {
      (window as any).playMobileSound = playSound;
      console.log('📱 Mobile: playMobileSound function exported to window');
    }
  }, [isMobile, playSound]);

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
