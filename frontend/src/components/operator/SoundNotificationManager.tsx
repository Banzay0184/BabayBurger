// Улучшенная система звуковых уведомлений с реальными звуками
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// Глобальная переменная для AudioContext
declare global {
  interface Window {
    audioContext?: AudioContext;
  }
}

// Типы для звуковых уведомлений
export interface SoundNotificationConfig {
  enabled: boolean;
  volume: number; // 0-1
  newOrderSound: boolean;
  orderUpdateSound: boolean;
  notificationSound: boolean;
  customSoundUrl?: string;
}

export interface SoundNotificationContextType {
  config: SoundNotificationConfig;
  updateConfig: (config: Partial<SoundNotificationConfig>) => void;
  playSound: (type: 'new_order' | 'order_update' | 'notification' | 'custom') => void;
  testSound: () => void;
}

// Контекст для звуковых уведомлений
const SoundNotificationContext = createContext<SoundNotificationContextType | undefined>(undefined);

// Провайдер контекста
interface SoundNotificationProviderProps {
  children: React.ReactNode;
}

export const SoundNotificationProvider: React.FC<SoundNotificationProviderProps> = ({ children }) => {
  const [config, setConfig] = useState<SoundNotificationConfig>(() => {
    // Загружаем настройки из localStorage
    const saved = localStorage.getItem('operator_sound_config');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Если ошибка парсинга, используем дефолтные настройки
      }
    }
    
    // Дефолтные настройки
    return {
      enabled: true,
      volume: 0.7,
      newOrderSound: true,
      orderUpdateSound: false,
      notificationSound: true,
    };
  });

  // Сохраняем настройки в localStorage при изменении
  useEffect(() => {
    localStorage.setItem('operator_sound_config', JSON.stringify(config));
  }, [config]);

  // Обновление конфигурации
  const updateConfig = useCallback((newConfig: Partial<SoundNotificationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  }, []);

  // Создание аудио элементов для разных звуков
  const createAudioElement = useCallback((soundUrl: string): HTMLAudioElement => {
    const audio = new Audio(soundUrl);
    audio.volume = config.volume;
    audio.preload = 'auto';
    return audio;
  }, [config.volume]);

  // Инициализация AudioContext при первом взаимодействии
  const initializeAudioContext = useCallback(() => {
    try {
      // Создаем AudioContext только при необходимости
      if (!window.audioContext) {
        window.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log('🔊 AudioContext initialized');
      }
      
      // Если AudioContext приостановлен, возобновляем его
      if (window.audioContext.state === 'suspended') {
        window.audioContext.resume().then(() => {
          console.log('🔊 AudioContext resumed');
        });
      }
    } catch (error) {
      console.error('🔊 Error initializing AudioContext:', error);
    }
  }, []);

  // Улучшенные звуки с использованием Web Audio API для генерации
  const generateSound = useCallback((type: 'new_order' | 'order_update' | 'notification'): string => {
    // Создаем простые звуки программно
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const sampleRate = audioContext.sampleRate;
    const duration = 0.3; // 300ms
    const length = sampleRate * duration;
    
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    switch (type) {
      case 'new_order':
        // Высокий тон для новых заказов (более заметный)
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          data[i] = Math.sin(2 * Math.PI * 800 * t) * Math.exp(-t * 3) * 0.3;
        }
        break;
        
      case 'order_update':
        // Средний тон для обновлений
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          data[i] = Math.sin(2 * Math.PI * 600 * t) * Math.exp(-t * 4) * 0.2;
        }
        break;
        
      case 'notification':
        // Низкий тон для уведомлений
        for (let i = 0; i < length; i++) {
          const t = i / sampleRate;
          data[i] = Math.sin(2 * Math.PI * 400 * t) * Math.exp(-t * 5) * 0.25;
        }
        break;
    }
    
    // Конвертируем в WAV и возвращаем как Data URL
    const wav = encodeWAV(data, sampleRate);
    const blob = new Blob([wav], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  }, []);

  // Простая функция для кодирования WAV
  const encodeWAV = useCallback((samples: Float32Array, sampleRate: number): ArrayBuffer => {
    const length = samples.length;
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
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      const sample = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
    
    return buffer;
  }, []);

  // Воспроизведение звука
  const playSound = useCallback((type: 'new_order' | 'order_update' | 'notification' | 'custom') => {
    if (!config.enabled) {
      console.log('🔊 Sound disabled, skipping playback');
      return;
    }

    try {
      // Инициализируем AudioContext при первом воспроизведении
      initializeAudioContext();
      
      let soundUrl: string;
      
      if (type === 'custom' && config.customSoundUrl) {
        soundUrl = config.customSoundUrl;
      } else if (type !== 'custom') {
        // Проверяем, включен ли звук для этого типа
        switch (type) {
          case 'new_order':
            if (!config.newOrderSound) {
              console.log('🔊 New order sound disabled, skipping');
              return;
            }
            break;
          case 'order_update':
            if (!config.orderUpdateSound) {
              console.log('🔊 Order update sound disabled, skipping');
              return;
            }
            break;
          case 'notification':
            if (!config.notificationSound) {
              console.log('🔊 Notification sound disabled, skipping');
              return;
            }
            break;
        }
        
        soundUrl = generateSound(type);
      } else {
        return;
      }

      if (!soundUrl) {
        console.warn('🔊 No sound URL generated');
        return;
      }

      console.log(`🔊 Playing sound: ${type}, URL: ${soundUrl.substring(0, 50)}...`);

      const audio = createAudioElement(soundUrl);
      
      // Обработка ошибок воспроизведения
      audio.onerror = (e) => {
        console.warn('🔊 Audio playback error:', e);
      };

      // Обработка успешного воспроизведения
      audio.onplay = () => {
        console.log(`🔊 Sound started playing: ${type}`);
      };

      audio.onended = () => {
        console.log(`🔊 Sound finished playing: ${type}`);
        // Очистка URL после воспроизведения
        if (soundUrl.startsWith('blob:')) {
          URL.revokeObjectURL(soundUrl);
        }
      };

      // Воспроизводим звук
      const playPromise = audio.play();
      
      if (playPromise !== undefined) {
        playPromise.then(() => {
          console.log(`🔊 Sound play promise resolved: ${type}`);
        }).catch((error) => {
          console.warn(`🔊 Sound play promise rejected: ${type}`, error);
          // В некоторых браузерах требуется пользовательское взаимодействие
          if (error.name === 'NotAllowedError') {
            console.warn('🔊 Autoplay blocked - user interaction required');
          }
        });
      }

      console.log(`🔊 Воспроизведен звук: ${type}`);
      
      // Отправляем событие для других компонентов
      window.dispatchEvent(new CustomEvent('soundPlayed', { 
        detail: { type, timestamp: Date.now() } 
      }));
    } catch (error) {
      console.error('🔊 Ошибка при воспроизведении звука:', error);
    }
  }, [config, createAudioElement, generateSound, initializeAudioContext]);

  // Тестовый звук
  const testSound = useCallback(() => {
    playSound('new_order');
  }, [playSound]);

  const value: SoundNotificationContextType = {
    config,
    updateConfig,
    playSound,
    testSound,
  };

  return (
    <SoundNotificationContext.Provider value={value}>
      {children}
    </SoundNotificationContext.Provider>
  );
};

// Хук для использования звуковых уведомлений
export const useSoundNotifications = (): SoundNotificationContextType => {
  const context = useContext(SoundNotificationContext);
  if (context === undefined) {
    throw new Error('useSoundNotifications must be used within a SoundNotificationProvider');
  }
  return context;
};

// Компонент для управления настройками звука
export const SoundSettingsPanel: React.FC = () => {
  const { config, updateConfig, testSound } = useSoundNotifications();

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="mr-2">🔊</span>
        Настройки звука
      </h3>
      
      <div className="space-y-4">
        {/* Основной переключатель */}
        <div className="flex items-center justify-between">
          <label className="text-gray-300 font-medium">Включить звуковые уведомления</label>
          <button
            onClick={() => updateConfig({ enabled: !config.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              config.enabled ? 'bg-blue-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                config.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Громкость */}
        <div className="space-y-2">
          <label className="text-gray-300 font-medium">Громкость</label>
          <div className="flex items-center space-x-3">
            <span className="text-gray-400 text-sm">🔇</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={config.volume}
              onChange={(e) => updateConfig({ volume: parseFloat(e.target.value) })}
              disabled={!config.enabled}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            />
            <span className="text-gray-400 text-sm">🔊</span>
            <span className="text-gray-300 text-sm w-8">{Math.round(config.volume * 100)}%</span>
          </div>
        </div>

        {/* Типы звуков */}
        <div className="space-y-3">
          <h4 className="text-gray-300 font-medium">Типы уведомлений</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">Новые заказы</label>
              <button
                onClick={() => updateConfig({ newOrderSound: !config.newOrderSound })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  config.newOrderSound ? 'bg-green-600' : 'bg-gray-600'
                }`}
                disabled={!config.enabled}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    config.newOrderSound ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">Обновления заказов</label>
              <button
                onClick={() => updateConfig({ orderUpdateSound: !config.orderUpdateSound })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  config.orderUpdateSound ? 'bg-green-600' : 'bg-gray-600'
                }`}
                disabled={!config.enabled}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    config.orderUpdateSound ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-gray-300 text-sm">Системные уведомления</label>
              <button
                onClick={() => updateConfig({ notificationSound: !config.notificationSound })}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                  config.notificationSound ? 'bg-green-600' : 'bg-gray-600'
                }`}
                disabled={!config.enabled}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                    config.notificationSound ? 'translate-x-5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Информация о звуках */}
        <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <span className="text-blue-400 text-sm">ℹ️</span>
            <div className="text-blue-300 text-xs">
              <p className="font-medium mb-1">Типы звуков:</p>
              <ul className="space-y-1">
                <li>• <strong>Новые заказы:</strong> Высокий тон (800Hz)</li>
                <li>• <strong>Обновления:</strong> Средний тон (600Hz)</li>
                <li>• <strong>Уведомления:</strong> Низкий тон (400Hz)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Тест звука */}
        <div className="pt-4 border-t border-gray-700">
          <button
            onClick={testSound}
            disabled={!config.enabled}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            🔊 Тест звука
          </button>
        </div>
      </div>
    </div>
  );
};