import React, { useState, useEffect } from 'react';

// Компонент для проверки доступности файлов PWA
export const PWAFileChecker: React.FC = () => {
  const [fileStatus, setFileStatus] = useState({
    manifest: { exists: false, url: '', error: null as string | null },
    serviceWorker: { exists: false, url: '', error: null as string | null },
    icon: { exists: false, url: '', error: null as string | null },
  });

  useEffect(() => {
    const checkFiles = async () => {
      const baseUrl = window.location.origin;
      
      // Проверяем манифест
      const manifestUrls = [
        './operator-manifest.json',
        '/operator-manifest.json',
        `${baseUrl}/operator-manifest.json`,
      ];
      
      for (const url of manifestUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            setFileStatus(prev => ({
              ...prev,
              manifest: { exists: true, url, error: null }
            }));
            break;
          }
        } catch (error) {
          console.log(`Manifest check failed for ${url}:`, error);
        }
      }

      // Проверяем Service Worker
      const swUrls = [
        './operator-sw.js',
        '/operator-sw.js',
        `${baseUrl}/operator-sw.js`,
      ];
      
      for (const url of swUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            setFileStatus(prev => ({
              ...prev,
              serviceWorker: { exists: true, url, error: null }
            }));
            break;
          }
        } catch (error) {
          console.log(`Service Worker check failed for ${url}:`, error);
        }
      }

      // Проверяем иконку
      const iconUrls = [
        '/logobabay.png',
        './logobabay.png',
        `${baseUrl}/logobabay.png`,
      ];
      
      for (const url of iconUrls) {
        try {
          const response = await fetch(url);
          if (response.ok) {
            setFileStatus(prev => ({
              ...prev,
              icon: { exists: true, url, error: null }
            }));
            break;
          }
        } catch (error) {
          console.log(`Icon check failed for ${url}:`, error);
        }
      }
    };

    checkFiles();
  }, []);

  const testDirectAccess = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
      <h3 className="text-white font-semibold mb-3">📁 PWA File Checker</h3>
      
      <div className="space-y-3">
        {/* Manifest */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">📄</span>
            <div>
              <p className="text-white font-medium">Manifest</p>
              <p className="text-gray-400 text-sm">
                {fileStatus.manifest.exists ? fileStatus.manifest.url : 'Not found'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={fileStatus.manifest.exists ? 'text-green-400' : 'text-red-400'}>
              {fileStatus.manifest.exists ? '✅' : '❌'}
            </span>
            {fileStatus.manifest.exists && (
              <button
                onClick={() => testDirectAccess(fileStatus.manifest.url)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                🔗
              </button>
            )}
          </div>
        </div>

        {/* Service Worker */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <p className="text-white font-medium">Service Worker</p>
              <p className="text-gray-400 text-sm">
                {fileStatus.serviceWorker.exists ? fileStatus.serviceWorker.url : 'Not found'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={fileStatus.serviceWorker.exists ? 'text-green-400' : 'text-red-400'}>
              {fileStatus.serviceWorker.exists ? '✅' : '❌'}
            </span>
            {fileStatus.serviceWorker.exists && (
              <button
                onClick={() => testDirectAccess(fileStatus.serviceWorker.url)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                🔗
              </button>
            )}
          </div>
        </div>

        {/* Icon */}
        <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🖼️</span>
            <div>
              <p className="text-white font-medium">Icon</p>
              <p className="text-gray-400 text-sm">
                {fileStatus.icon.exists ? fileStatus.icon.url : 'Not found'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className={fileStatus.icon.exists ? 'text-green-400' : 'text-red-400'}>
              {fileStatus.icon.exists ? '✅' : '❌'}
            </span>
            {fileStatus.icon.exists && (
              <button
                onClick={() => testDirectAccess(fileStatus.icon.url)}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                🔗
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Рекомендации */}
      <div className="mt-4 pt-4 border-t border-gray-600">
        <h4 className="text-yellow-300 font-semibold text-sm mb-2">💡 Рекомендации:</h4>
        <div className="text-yellow-200 text-xs space-y-1">
          <p>• Если файлы не найдены, проверьте настройки сервера</p>
          <p>• Убедитесь, что файлы находятся в папке public</p>
          <p>• Проверьте консоль браузера на ошибки CORS</p>
          <p>• Попробуйте перезапустить сервер разработки</p>
        </div>
      </div>
    </div>
  );
};
