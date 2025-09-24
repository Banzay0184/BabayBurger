import React, { useState, useEffect } from 'react';

// Компонент для тестирования загрузки манифеста
export const ManifestTester: React.FC = () => {
  const [manifestStatus, setManifestStatus] = useState({
    loading: true,
    loaded: false,
    error: null as string | null,
    manifest: null as any,
  });

  useEffect(() => {
    const testManifest = async () => {
      try {
        setManifestStatus(prev => ({ ...prev, loading: true, error: null }));
        
        // Проверяем ссылку на манифест в HTML
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        console.log('🎯 Manifest Tester: Manifest link found:', manifestLink);
        
        if (!manifestLink) {
          // Проверяем встроенный манифест
          const embeddedManifest = document.getElementById('pwa-manifest');
          console.log('🎯 Manifest Tester: Embedded manifest found:', embeddedManifest);
          
          if (embeddedManifest) {
            try {
              const manifest = JSON.parse(embeddedManifest.textContent || '{}');
              console.log('🎯 Manifest Tester: Using embedded manifest:', manifest);
              
              // Проверяем обязательные поля
              const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
              const missingFields = requiredFields.filter(field => !manifest[field]);
              
              if (missingFields.length > 0) {
                throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
              }

              // Проверяем иконки
              if (!manifest.icons || manifest.icons.length === 0) {
                throw new Error('No icons found in manifest');
              }

              const hasValidIcons = manifest.icons.some((icon: any) => 
                icon.sizes && icon.src && (icon.sizes.includes('192') || icon.sizes.includes('512'))
              );

              if (!hasValidIcons) {
                throw new Error('No valid icons found (need 192x192 or 512x512)');
              }

              setManifestStatus({
                loading: false,
                loaded: true,
                error: null,
                manifest,
              });
              return;
            } catch (error) {
              throw new Error(`Embedded manifest error: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
          }
          throw new Error('Manifest link not found in HTML and no embedded manifest');
        }

        console.log('🎯 Manifest Tester: Found manifest link:', manifestLink.href);

        // Пытаемся загрузить манифест
        const response = await fetch(manifestLink.href);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const manifest = await response.json();
        console.log('🎯 Manifest Tester: Manifest loaded:', manifest);

        // Проверяем обязательные поля
        const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
        const missingFields = requiredFields.filter(field => !manifest[field]);
        
        if (missingFields.length > 0) {
          throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }

        // Проверяем иконки
        if (!manifest.icons || manifest.icons.length === 0) {
          throw new Error('No icons found in manifest');
        }

        const hasValidIcons = manifest.icons.some((icon: any) => 
          icon.sizes && icon.src && (icon.sizes.includes('192') || icon.sizes.includes('512'))
        );

        if (!hasValidIcons) {
          throw new Error('No valid icons found (need 192x192 or 512x512)');
        }

        setManifestStatus({
          loading: false,
          loaded: true,
          error: null,
          manifest,
        });

      } catch (error) {
        console.error('🎯 Manifest Tester: Error:', error);
        setManifestStatus({
          loading: false,
          loaded: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          manifest: null,
        });
      }
    };

    testManifest();
  }, []);

  const retryTest = () => {
    setManifestStatus(prev => ({ ...prev, loading: true, error: null }));
    // Перезапускаем тест
    window.location.reload();
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
      <h3 className="text-white font-semibold mb-3">🧪 Manifest Tester</h3>
      
      {manifestStatus.loading && (
        <div className="flex items-center space-x-3">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-300">Тестирование манифеста...</span>
        </div>
      )}

      {manifestStatus.error && (
        <div className="space-y-3">
          <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-3">
            <h4 className="text-red-300 font-semibold mb-2">❌ Ошибка загрузки манифеста</h4>
            <p className="text-red-200 text-sm">{manifestStatus.error}</p>
          </div>
          
          <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-3">
            <h4 className="text-yellow-300 font-semibold mb-2">💡 Возможные решения:</h4>
            <ul className="text-yellow-200 text-sm space-y-1">
              <li>• Проверьте, что файл /operator-manifest.json существует</li>
              <li>• Убедитесь, что сервер обслуживает статические файлы</li>
              <li>• Проверьте консоль браузера на ошибки сети</li>
              <li>• Попробуйте открыть манифест напрямую в браузере</li>
            </ul>
          </div>
          
          <button
            onClick={retryTest}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔄 Повторить тест
          </button>
        </div>
      )}

      {manifestStatus.loaded && manifestStatus.manifest && (
        <div className="space-y-3">
          <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-3">
            <h4 className="text-green-300 font-semibold mb-2">✅ Манифест загружен успешно</h4>
            <div className="text-green-200 text-sm space-y-1">
              <p><strong>Название:</strong> {manifestStatus.manifest.name}</p>
              <p><strong>Короткое название:</strong> {manifestStatus.manifest.short_name}</p>
              <p><strong>Start URL:</strong> {manifestStatus.manifest.start_url}</p>
              <p><strong>Display:</strong> {manifestStatus.manifest.display}</p>
              <p><strong>Иконки:</strong> {manifestStatus.manifest.icons?.length || 0} шт.</p>
            </div>
          </div>
          
          <div className="bg-blue-900/30 border border-blue-600/50 rounded-lg p-3">
            <h4 className="text-blue-300 font-semibold mb-2">📋 Детали манифеста</h4>
            <pre className="text-blue-200 text-xs overflow-auto max-h-40">
              {JSON.stringify(manifestStatus.manifest, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
