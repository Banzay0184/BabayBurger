import React, { useState, useEffect, useCallback } from 'react';
import { useSoundNotifications } from './SoundNotificationManager';

// Типы звуков
export type SoundType = 'new_order' | 'order_update' | 'notification';

// Варианты звуков
export interface SoundOption {
  id: string;
  name: string;
  description: string;
  frequency: number;
  duration: number;
  volume: number;
}

export const SOUND_OPTIONS: SoundOption[] = [
  {
    id: 'default',
    name: 'Стандартный',
    description: 'Классический звук уведомления',
    frequency: 800,
    duration: 0.3,
    volume: 0.3
  },
  {
    id: 'high',
    name: 'Высокий',
    description: 'Высокий тон для привлечения внимания',
    frequency: 1200,
    duration: 0.4,
    volume: 0.4
  },
  {
    id: 'low',
    name: 'Низкий',
    description: 'Низкий тон для спокойной работы',
    frequency: 400,
    duration: 0.5,
    volume: 0.2
  },
  {
    id: 'double',
    name: 'Двойной',
    description: 'Два коротких звука подряд',
    frequency: 600,
    duration: 0.2,
    volume: 0.3
  },
  {
    id: 'melody',
    name: 'Мелодия',
    description: 'Короткая мелодия из трех нот',
    frequency: 500,
    duration: 0.6,
    volume: 0.25
  }
];

// Создание звука по опциям
const createSoundFromOptions = (option: SoundOption): string => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(option.frequency, audioContext.currentTime);
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(option.volume, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + option.duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + option.duration);
    
    // Создаем blob URL для воспроизведения
    const duration = option.duration;
    const sampleRate = 44100;
    const length = sampleRate * duration;
    const buffer = audioContext.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      data[i] = Math.sin(2 * Math.PI * option.frequency * t) * option.volume * Math.exp(-t * 5);
    }
    
    // Создаем WAV файл
    const wavBuffer = createWAVBuffer(buffer);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error('Error creating sound:', error);
    return '';
  }
};

// Создание WAV буфера
const createWAVBuffer = (buffer: AudioBuffer): ArrayBuffer => {
  const length = buffer.length;
  const sampleRate = buffer.sampleRate;
  const arrayBuffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(arrayBuffer);
  
  // WAV заголовок
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
  
  // Данные
  const channelData = buffer.getChannelData(0);
  let offset = 44;
  for (let i = 0; i < length; i++) {
    const sample = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(offset, sample * 0x7FFF, true);
    offset += 2;
  }
  
  return arrayBuffer;
};

// Компонент выбора звуков
export const MobileSoundSelector: React.FC = () => {
  const { config, updateConfig } = useSoundNotifications();
  const [selectedSound, setSelectedSound] = useState<string>('default');
  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  // Загружаем сохраненный выбор звука
  useEffect(() => {
    const saved = localStorage.getItem('mobile_sound_selection');
    if (saved) {
      setSelectedSound(saved);
    }
  }, []);

  // Сохраняем выбор звука
  useEffect(() => {
    localStorage.setItem('mobile_sound_selection', selectedSound);
  }, [selectedSound]);

  // Воспроизведение тестового звука
  const playTestSound = useCallback(async (option: SoundOption) => {
    if (isPlaying === option.id) return;
    
    setIsPlaying(option.id);
    
    try {
      const soundUrl = createSoundFromOptions(option);
      if (soundUrl) {
        const audio = new Audio(soundUrl);
        audio.volume = config?.volume || 0.7;
        
        await audio.play();
        
        audio.onended = () => {
          setIsPlaying(null);
          URL.revokeObjectURL(soundUrl);
        };
      }
    } catch (error) {
      console.error('Error playing test sound:', error);
      setIsPlaying(null);
    }
  }, [isPlaying, config?.volume]);

  // Применение выбранного звука
  const applySound = useCallback(() => {
    const option = SOUND_OPTIONS.find(opt => opt.id === selectedSound);
    if (option) {
      // Сохраняем настройки звука
      updateConfig({
        customSoundUrl: createSoundFromOptions(option)
      });
      
      console.log('📱 Mobile: Sound applied:', option.name);
    }
  }, [selectedSound, updateConfig]);

  if (!config?.enabled) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-white mb-4">🎵 Выбор звука уведомлений</h3>
      
      <div className="space-y-3">
        {SOUND_OPTIONS.map((option) => (
          <div
            key={option.id}
            className={`p-3 rounded-lg border-2 transition-all ${
              selectedSound === option.id
                ? 'border-blue-500 bg-blue-900/20'
                : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-white font-medium">{option.name}</h4>
                <p className="text-gray-300 text-sm">{option.description}</p>
                <div className="text-xs text-gray-400 mt-1">
                  Частота: {option.frequency}Hz • Длительность: {option.duration}s • Громкость: {Math.round(option.volume * 100)}%
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => playTestSound(option)}
                  disabled={isPlaying === option.id}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    isPlaying === option.id
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {isPlaying === option.id ? '▶️' : '🔊'}
                </button>
                
                <button
                  onClick={() => setSelectedSound(option.id)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    selectedSound === option.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-600 hover:bg-gray-500 text-gray-300'
                  }`}
                >
                  {selectedSound === option.id ? '✓' : '○'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 flex justify-end">
        <button
          onClick={applySound}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          Применить звук
        </button>
      </div>
    </div>
  );
};
