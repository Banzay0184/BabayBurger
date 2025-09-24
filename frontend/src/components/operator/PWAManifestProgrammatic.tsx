import React, { useState, useEffect } from 'react';

// Компонент для программного создания манифеста
export const PWAManifestProgrammatic: React.FC = () => {
  const [manifestStatus, setManifestStatus] = useState({
    created: false,
    error: null as string | null,
    manifestData: null as any,
  });

  useEffect(() => {
    // Проверяем, есть ли уже манифест
    const checkExistingManifest = () => {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      const embeddedManifest = document.getElementById('pwa-manifest');
      
      if (manifestLink || embeddedManifest) {
        setManifestStatus(prev => ({
          ...prev,
          created: true,
          error: null,
        }));
        return true;
      }
      return false;
    };

    // Проверяем сразу и через задержку
    if (!checkExistingManifest()) {
      setTimeout(checkExistingManifest, 500);
    }
  }, []);

  const createManifestProgrammatically = async () => {
    try {
      setManifestStatus(prev => ({ ...prev, error: null }));

      // Создаем манифест программно
      const manifestData = {
        name: "Babay Burger - Оператор",
        short_name: "Babay Оператор",
        description: "Интерфейс оператора для управления заказами ресторана Babay Burger",
        start_url: "/operator/",
        display: "standalone",
        id: "/operator/",
        background_color: "#1f2937",
        theme_color: "#3b82f6",
        orientation: "any",
        scope: "/",
        lang: "ru",
        categories: ["business", "food", "productivity"],
        icons: [
          {
            src: "/logobabay.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/logobabay.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/logobabay.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable"
          },
          {
            src: "/logobabay.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      };

      // Создаем ссылку на манифест
      const manifestLink = document.createElement('link');
      manifestLink.rel = 'manifest';
      manifestLink.href = './operator-manifest.json';
      document.head.appendChild(manifestLink);

      // Создаем встроенный манифест
      const embeddedManifest = document.createElement('script');
      embeddedManifest.type = 'application/json';
      embeddedManifest.id = 'pwa-manifest';
      embeddedManifest.textContent = JSON.stringify(manifestData, null, 2);
      document.head.appendChild(embeddedManifest);

      // Регистрируем манифест программно
      if ('serviceWorker' in navigator) {
        try {
          await navigator.serviceWorker.register('./operator-sw.js');
          console.log('🎯 PWA Manifest Programmatic: Service Worker registered');
        } catch (error) {
          console.warn('🎯 PWA Manifest Programmatic: Service Worker registration failed:', error);
        }
      }

      setManifestStatus({
        created: true,
        error: null,
        manifestData,
      });

      console.log('🎯 PWA Manifest Programmatic: Manifest created successfully');

    } catch (error) {
      console.error('🎯 PWA Manifest Programmatic: Error:', error);
      setManifestStatus(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  };

  const testManifest = () => {
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const embeddedManifest = document.getElementById('pwa-manifest');
    
    console.log('🎯 PWA Manifest Programmatic: Test results:');
    console.log('- Manifest link:', manifestLink);
    console.log('- Embedded manifest:', embeddedManifest);
    console.log('- Document head:', document.head.innerHTML);
  };

  if (manifestStatus.created) {
    return (
      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="text-green-300 font-semibold">PWA Manifest Created</h3>
            <p className="text-green-200 text-sm">Manifest has been created successfully!</p>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-green-600/50">
          <button
            onClick={testManifest}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🧪 Test Manifest
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3 className="text-red-300 font-semibold">PWA Manifest Not Found</h3>
          <p className="text-red-200 text-sm">No manifest found in HTML. Create one programmatically.</p>
        </div>
      </div>
      
      {manifestStatus.error && (
        <div className="bg-red-800/50 border border-red-600/50 rounded-lg p-3 mb-4">
          <p className="text-red-200 text-sm">Error: {manifestStatus.error}</p>
        </div>
      )}
      
      <div className="space-y-3">
        <button
          onClick={createManifestProgrammatically}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          🚀 Create Manifest Programmatically
        </button>
        
        <button
          onClick={testManifest}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          🧪 Test Current State
        </button>
      </div>
      
      <div className="mt-4 pt-4 border-t border-red-600/50">
        <h4 className="text-red-300 font-semibold text-sm mb-2">💡 Что делает:</h4>
        <div className="text-red-200 text-xs space-y-1">
          <p>• <strong>Create Manifest Programmatically:</strong> Создает манифест через JavaScript</p>
          <p>• <strong>Test Current State:</strong> Проверяет текущее состояние DOM</p>
          <p>• Создает как ссылку на внешний файл, так и встроенный манифест</p>
          <p>• Регистрирует Service Worker программно</p>
        </div>
      </div>
    </div>
  );
};
