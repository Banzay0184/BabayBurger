import React, { useState, useEffect } from 'react';

// Компонент для визуальной диагностики звуковой системы
export const SoundDiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState({
    isMobile: false,
    isInitialized: false,
    showPrompt: false,
    audioElementsCount: 0,
    audioContextState: 'unknown',
    localStorageInitialized: false,
    lastError: null as string | null,
    lastSoundPlayed: null as string | null,
    lastSoundTime: null as string | null
  });

  const [isVisible, setIsVisible] = useState(false);

  // Отладочная информация
  useEffect(() => {
    console.log('🔧 SoundDiagnostics: Component loaded');
    console.log('🔧 SoundDiagnostics: Current diagnostics:', diagnostics);
  }, []);

  // Обновляем диагностику
  const updateDiagnostics = () => {
    const userAgentMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const screenMobile = window.innerWidth <= 768 || window.innerHeight <= 768;
    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobile = userAgentMobile || (screenMobile && hasTouch);

    setDiagnostics({
      isMobile,
      isInitialized: (window as any).mobileSoundInitialized || false,
      showPrompt: (window as any).mobileSoundShowPrompt || false,
      audioElementsCount: (window as any).mobileSoundAudioElementsCount || 0,
      audioContextState: window.audioContext?.state || 'unknown',
      localStorageInitialized: localStorage.getItem('mobile_sound_simple_initialized') === 'true',
      lastError: (window as any).mobileSoundLastError || null,
      lastSoundPlayed: (window as any).mobileSoundLastPlayed || null,
      lastSoundTime: (window as any).mobileSoundLastTime || null
    });
  };

  // Обновляем диагностику каждые 2 секунды
  useEffect(() => {
    updateDiagnostics();
    const interval = setInterval(updateDiagnostics, 2000);
    return () => clearInterval(interval);
  }, []);

  // Слушаем события звуков
  useEffect(() => {
    const handleSoundPlayed = (event: CustomEvent) => {
      (window as any).mobileSoundLastPlayed = event.detail.type;
      (window as any).mobileSoundLastTime = new Date().toLocaleTimeString();
      updateDiagnostics();
    };

    const handleSoundError = (event: CustomEvent) => {
      (window as any).mobileSoundLastError = event.detail.error;
      updateDiagnostics();
    };

    window.addEventListener('soundPlayed', handleSoundPlayed as EventListener);
    window.addEventListener('soundError', handleSoundError as EventListener);

    return () => {
      window.removeEventListener('soundPlayed', handleSoundPlayed as EventListener);
      window.removeEventListener('soundError', handleSoundError as EventListener);
    };
  }, []);

  // Функции для управления
  const resetSoundSystem = () => {
    if ((window as any).resetMobileSound) {
      (window as any).resetMobileSound();
    }
    updateDiagnostics();
  };

  const testSound = () => {
    if ((window as any).playMobileSound) {
      (window as any).playMobileSound('new_order');
    }
    updateDiagnostics();
  };

  const forceInitialize = () => {
    if ((window as any).handleInitialize) {
      (window as any).handleInitialize();
    }
    updateDiagnostics();
  };

  if (!isVisible) {
    console.log('🔧 SoundDiagnostics: Rendering button, isVisible:', isVisible);
    return (
      <div className="fixed bottom-4 right-4 z-[9999]">
        <button
          onClick={() => {
            console.log('🔧 SoundDiagnostics: Button clicked');
            setIsVisible(true);
          }}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-lg text-sm font-bold shadow-2xl border-2 border-red-400 animate-pulse"
          style={{ 
            position: 'fixed',
            bottom: '16px',
            right: '16px',
            zIndex: 9999,
            fontSize: '14px',
            fontWeight: 'bold'
          }}
        >
          🔧 Диагностика звуков
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold text-white">🔧 Диагностика звуков</h2>
          <button
            onClick={() => setIsVisible(false)}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Статус системы */}
          <div className="bg-gray-700 rounded-lg p-3">
            <h3 className="text-white font-medium mb-2">📊 Статус системы</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Мобильное устройство:</span>
                <span className={diagnostics.isMobile ? 'text-green-400' : 'text-red-400'}>
                  {diagnostics.isMobile ? '✅ Да' : '❌ Нет'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Инициализировано:</span>
                <span className={diagnostics.isInitialized ? 'text-green-400' : 'text-red-400'}>
                  {diagnostics.isInitialized ? '✅ Да' : '❌ Нет'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Показывать prompt:</span>
                <span className={diagnostics.showPrompt ? 'text-yellow-400' : 'text-green-400'}>
                  {diagnostics.showPrompt ? '⚠️ Да' : '✅ Нет'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Аудио элементы:</span>
                <span className={diagnostics.audioElementsCount > 0 ? 'text-green-400' : 'text-red-400'}>
                  {diagnostics.audioElementsCount} шт.
                </span>
              </div>
            </div>
          </div>

          {/* AudioContext */}
          <div className="bg-gray-700 rounded-lg p-3">
            <h3 className="text-white font-medium mb-2">🎵 AudioContext</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Состояние:</span>
                <span className={
                  diagnostics.audioContextState === 'running' ? 'text-green-400' :
                  diagnostics.audioContextState === 'suspended' ? 'text-yellow-400' :
                  'text-red-400'
                }>
                  {diagnostics.audioContextState === 'running' ? '✅ Работает' :
                   diagnostics.audioContextState === 'suspended' ? '⚠️ Приостановлен' :
                   '❌ Неизвестно'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">localStorage:</span>
                <span className={diagnostics.localStorageInitialized ? 'text-green-400' : 'text-red-400'}>
                  {diagnostics.localStorageInitialized ? '✅ Сохранено' : '❌ Не сохранено'}
                </span>
              </div>
            </div>
          </div>

          {/* Последние события */}
          <div className="bg-gray-700 rounded-lg p-3">
            <h3 className="text-white font-medium mb-2">📝 Последние события</h3>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-300">Последний звук:</span>
                <span className="text-blue-400">
                  {diagnostics.lastSoundPlayed || 'Нет'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Время:</span>
                <span className="text-blue-400">
                  {diagnostics.lastSoundTime || 'Нет'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Последняя ошибка:</span>
                <span className="text-red-400">
                  {diagnostics.lastError || 'Нет'}
                </span>
              </div>
            </div>
          </div>

          {/* Кнопки управления */}
          <div className="space-y-2">
            <button
              onClick={testSound}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🔊 Тест звука
            </button>
            
            <button
              onClick={forceInitialize}
              className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🔄 Принудительная инициализация
            </button>
            
            <button
              onClick={resetSoundSystem}
              className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              🗑️ Сброс системы
            </button>
          </div>

          {/* Информация для разработчика */}
          <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
            <div className="text-blue-300 text-xs">
              <p className="font-medium mb-1">💡 Для разработчика:</p>
              <p>• Если "Инициализировано: Нет" - нажмите "Принудительная инициализация"</p>
              <p>• Если "AudioContext: Приостановлен" - нажмите "Тест звука"</p>
              <p>• Если ничего не помогает - нажмите "Сброс системы"</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
