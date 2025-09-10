import React, { useState, useEffect } from 'react';

export const PWADebug: React.FC = () => {
  const [debugInfo, setDebugInfo] = useState<any>({});

  useEffect(() => {
    const checkPWA = async () => {
      const info: any = {
        serviceWorkerSupported: 'serviceWorker' in navigator,
        manifestSupported: 'onbeforeinstallprompt' in window,
        isHTTPS: location.protocol === 'https:' || location.hostname === 'localhost',
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        language: navigator.language,
        displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser'
      };

      // Проверяем Service Worker
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.getRegistration();
          info.serviceWorkerRegistered = !!registration;
          info.serviceWorkerScope = registration?.scope;
        } catch (error) {
          info.serviceWorkerError = error;
        }
      }

      // Проверяем манифест
      try {
        const manifestResponse = await fetch('/manifest.json');
        if (manifestResponse.ok) {
          const manifest = await manifestResponse.json();
          info.manifestLoaded = true;
          info.manifestName = manifest.name;
          info.manifestStartUrl = manifest.start_url;
          info.manifestDisplay = manifest.display;
        } else {
          info.manifestError = 'Failed to load manifest';
        }
      } catch (error) {
        info.manifestError = error;
      }

      setDebugInfo(info);
    };

    checkPWA();
  }, []);

  const handleInstallPWA = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered:', registration);
        alert('Service Worker зарегистрирован!');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
        alert('Ошибка регистрации Service Worker: ' + error);
      }
    }
  };

  const handleTestManifest = async () => {
    try {
      const response = await fetch('/manifest.json');
      const manifest = await response.json();
      console.log('Manifest loaded:', manifest);
      alert('Манифест загружен: ' + manifest.name);
    } catch (error) {
      console.error('Manifest test failed:', error);
      alert('Ошибка загрузки манифеста: ' + error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-3">🔧 PWA Отладка</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Статус поддержки:</h4>
          <div className="space-y-1 text-sm">
            <div className={`flex items-center space-x-2 ${debugInfo.serviceWorkerSupported ? 'text-green-600' : 'text-red-600'}`}>
              <span>{debugInfo.serviceWorkerSupported ? '✅' : '❌'}</span>
              <span>Service Worker</span>
            </div>
            <div className={`flex items-center space-x-2 ${debugInfo.manifestSupported ? 'text-green-600' : 'text-red-600'}`}>
              <span>{debugInfo.manifestSupported ? '✅' : '❌'}</span>
              <span>Manifest API</span>
            </div>
            <div className={`flex items-center space-x-2 ${debugInfo.isHTTPS ? 'text-green-600' : 'text-red-600'}`}>
              <span>{debugInfo.isHTTPS ? '✅' : '❌'}</span>
              <span>HTTPS/Localhost</span>
            </div>
            <div className={`flex items-center space-x-2 ${debugInfo.onLine ? 'text-green-600' : 'text-red-600'}`}>
              <span>{debugInfo.onLine ? '✅' : '❌'}</span>
              <span>Онлайн</span>
            </div>
          </div>
        </div>
        
        <div>
          <h4 className="font-medium text-gray-700 mb-2">Информация:</h4>
          <div className="space-y-1 text-sm text-gray-600">
            <div>Платформа: {debugInfo.platform}</div>
            <div>Язык: {debugInfo.language}</div>
            <div>Режим: {debugInfo.displayMode}</div>
            <div>Service Worker: {debugInfo.serviceWorkerRegistered ? 'Зарегистрирован' : 'Не зарегистрирован'}</div>
            <div>Манифест: {debugInfo.manifestLoaded ? 'Загружен' : 'Не загружен'}</div>
          </div>
        </div>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={handleInstallPWA}
          className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm transition-colors"
        >
          Регистрировать SW
        </button>
        <button
          onClick={handleTestManifest}
          className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded text-sm transition-colors"
        >
          Тест манифеста
        </button>
      </div>

      {debugInfo.manifestError && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <strong>Ошибка манифеста:</strong> {debugInfo.manifestError}
        </div>
      )}

      {debugInfo.serviceWorkerError && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <strong>Ошибка Service Worker:</strong> {debugInfo.serviceWorkerError}
        </div>
      )}
    </div>
  );
};
