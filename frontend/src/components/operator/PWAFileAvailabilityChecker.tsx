import React, { useState, useEffect } from 'react';

// Компонент для проверки доступности PWA файлов
export const PWAFileAvailabilityChecker: React.FC = () => {
  const [fileStatus, setFileStatus] = useState({
    manifest: { available: false, content: '', error: '' },
    serviceWorker: { available: false, content: '', error: '' },
    icon: { available: false, content: '', error: '' },
  });

  useEffect(() => {
    const checkFiles = async () => {
      try {
        // Проверяем манифест
        try {
          const manifestResponse = await fetch('/operator-manifest.json');
          const manifestText = await manifestResponse.text();
          
          if (manifestResponse.ok && manifestText.startsWith('{')) {
            setFileStatus(prev => ({
              ...prev,
              manifest: { available: true, content: manifestText.substring(0, 100) + '...', error: '' }
            }));
          } else {
            setFileStatus(prev => ({
              ...prev,
              manifest: { available: false, content: manifestText.substring(0, 100) + '...', error: 'Not JSON' }
            }));
          }
        } catch (error) {
          setFileStatus(prev => ({
            ...prev,
            manifest: { available: false, content: '', error: error instanceof Error ? error.message : 'Unknown error' }
          }));
        }

        // Проверяем Service Worker
        try {
          const swResponse = await fetch('/operator-sw.js');
          const swText = await swResponse.text();
          
          if (swResponse.ok && swText.includes('self.addEventListener')) {
            setFileStatus(prev => ({
              ...prev,
              serviceWorker: { available: true, content: swText.substring(0, 100) + '...', error: '' }
            }));
          } else {
            setFileStatus(prev => ({
              ...prev,
              serviceWorker: { available: false, content: swText.substring(0, 100) + '...', error: 'Not JS' }
            }));
          }
        } catch (error) {
          setFileStatus(prev => ({
            ...prev,
            serviceWorker: { available: false, content: '', error: error instanceof Error ? error.message : 'Unknown error' }
          }));
        }

        // Проверяем иконку
        try {
          const iconResponse = await fetch('/logobabay.png');
          
          if (iconResponse.ok) {
            setFileStatus(prev => ({
              ...prev,
              icon: { available: true, content: `Size: ${iconResponse.headers.get('content-length')} bytes`, error: '' }
            }));
          } else {
            setFileStatus(prev => ({
              ...prev,
              icon: { available: false, content: '', error: `Status: ${iconResponse.status}` }
            }));
          }
        } catch (error) {
          setFileStatus(prev => ({
            ...prev,
            icon: { available: false, content: '', error: error instanceof Error ? error.message : 'Unknown error' }
          }));
        }

        console.log('🎯 PWA File Availability Checker: File check complete');
        
      } catch (error) {
        console.error('🎯 PWA File Availability Checker: Error:', error);
      }
    };

    checkFiles();
  }, []);

  const refreshCheck = () => {
    const checkFiles = async () => {
      try {
        // Повторная проверка файлов
        const manifestResponse = await fetch('/operator-manifest.json');
        const manifestText = await manifestResponse.text();
        
        const swResponse = await fetch('/operator-sw.js');
        const swText = await swResponse.text();
        
        const iconResponse = await fetch('/logobabay.png');
        
        setFileStatus({
          manifest: { 
            available: manifestResponse.ok && manifestText.startsWith('{'), 
            content: manifestText.substring(0, 100) + '...', 
            error: manifestResponse.ok && manifestText.startsWith('{') ? '' : 'Not JSON' 
          },
          serviceWorker: { 
            available: swResponse.ok && swText.includes('self.addEventListener'), 
            content: swText.substring(0, 100) + '...', 
            error: swResponse.ok && swText.includes('self.addEventListener') ? '' : 'Not JS' 
          },
          icon: { 
            available: iconResponse.ok, 
            content: `Size: ${iconResponse.headers.get('content-length')} bytes`, 
            error: iconResponse.ok ? '' : `Status: ${iconResponse.status}` 
          },
        });
        
        console.log('🎯 PWA File Availability Checker: Refreshed check');
      } catch (error) {
        console.error('🎯 PWA File Availability Checker: Refresh error:', error);
      }
    };

    checkFiles();
  };

  const allFilesAvailable = fileStatus.manifest.available && fileStatus.serviceWorker.available && fileStatus.icon.available;

  if (allFilesAvailable) {
    return (
      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="text-green-300 font-semibold">All PWA Files Available</h3>
            <p className="text-green-200 text-sm">All PWA files are accessible and valid!</p>
          </div>
        </div>
        
        <div className="mt-3 space-y-2 text-green-200 text-sm">
          <p><strong>Manifest:</strong> ✅ Available</p>
          <p><strong>Service Worker:</strong> ✅ Available</p>
          <p><strong>Icon:</strong> ✅ Available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3 className="text-red-300 font-semibold">PWA Files Not Available</h3>
          <p className="text-red-200 text-sm">Some PWA files are not accessible or invalid!</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-1 gap-3">
          <div className={`rounded-lg p-3 ${fileStatus.manifest.available ? 'bg-green-800/50 border border-green-600/50' : 'bg-red-800/50 border border-red-600/50'}`}>
            <div className="flex items-center space-x-2">
              <span className={fileStatus.manifest.available ? 'text-green-400' : 'text-red-400'}>
                {fileStatus.manifest.available ? '✅' : '❌'}
              </span>
              <h4 className="font-semibold">Manifest</h4>
            </div>
            <p className="text-xs mt-1">
              <strong>Status:</strong> {fileStatus.manifest.available ? 'Available' : 'Not Available'}
            </p>
            {fileStatus.manifest.error && (
              <p className="text-xs text-red-300 mt-1">
                <strong>Error:</strong> {fileStatus.manifest.error}
              </p>
            )}
            <p className="text-xs text-gray-300 mt-1">
              <strong>Content:</strong> {fileStatus.manifest.content}
            </p>
          </div>
          
          <div className={`rounded-lg p-3 ${fileStatus.serviceWorker.available ? 'bg-green-800/50 border border-green-600/50' : 'bg-red-800/50 border border-red-600/50'}`}>
            <div className="flex items-center space-x-2">
              <span className={fileStatus.serviceWorker.available ? 'text-green-400' : 'text-red-400'}>
                {fileStatus.serviceWorker.available ? '✅' : '❌'}
              </span>
              <h4 className="font-semibold">Service Worker</h4>
            </div>
            <p className="text-xs mt-1">
              <strong>Status:</strong> {fileStatus.serviceWorker.available ? 'Available' : 'Not Available'}
            </p>
            {fileStatus.serviceWorker.error && (
              <p className="text-xs text-red-300 mt-1">
                <strong>Error:</strong> {fileStatus.serviceWorker.error}
              </p>
            )}
            <p className="text-xs text-gray-300 mt-1">
              <strong>Content:</strong> {fileStatus.serviceWorker.content}
            </p>
          </div>
          
          <div className={`rounded-lg p-3 ${fileStatus.icon.available ? 'bg-green-800/50 border border-green-600/50' : 'bg-red-800/50 border border-red-600/50'}`}>
            <div className="flex items-center space-x-2">
              <span className={fileStatus.icon.available ? 'text-green-400' : 'text-red-400'}>
                {fileStatus.icon.available ? '✅' : '❌'}
              </span>
              <h4 className="font-semibold">Icon</h4>
            </div>
            <p className="text-xs mt-1">
              <strong>Status:</strong> {fileStatus.icon.available ? 'Available' : 'Not Available'}
            </p>
            {fileStatus.icon.error && (
              <p className="text-xs text-red-300 mt-1">
                <strong>Error:</strong> {fileStatus.icon.error}
              </p>
            )}
            <p className="text-xs text-gray-300 mt-1">
              <strong>Info:</strong> {fileStatus.icon.content}
            </p>
          </div>
        </div>
        
        <button
          onClick={refreshCheck}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          🔄 Refresh Check
        </button>
      </div>
      
      <div className="mt-4 pt-4 border-t border-red-600/50">
        <h4 className="text-red-300 font-semibold text-sm mb-2">💡 Что делать:</h4>
        <div className="text-red-200 text-xs space-y-1">
          <p>• Проверьте, что файлы существуют в папке <code>public/</code></p>
          <p>• Убедитесь, что сервер обслуживает статические файлы</p>
          <p>• Проверьте конфигурацию Vercel в <code>vercel.json</code></p>
          <p>• Попробуйте перезапустить сервер разработки</p>
        </div>
      </div>
    </div>
  );
};
