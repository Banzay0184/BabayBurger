import React, { useState, useEffect } from 'react';

// Компонент для принудительного добавления манифеста в HTML
export const PWAManifestInjector: React.FC = () => {
  const [injectionStatus, setInjectionStatus] = useState({
    manifestLinkAdded: false,
    embeddedManifestAdded: false,
    canInject: false,
  });

  useEffect(() => {
    const checkManifest = () => {
      const hasLink = !!document.querySelector('link[rel="manifest"]');
      const hasEmbedded = !!document.getElementById('pwa-manifest');
      
      setInjectionStatus({
        manifestLinkAdded: hasLink,
        embeddedManifestAdded: hasEmbedded,
        canInject: !hasLink && !hasEmbedded,
      });
    };

    // Проверяем сразу и через задержку
    checkManifest();
    setTimeout(checkManifest, 200);
  }, []);

  const injectManifestLink = () => {
    // Проверяем, не добавлен ли уже
    if (document.querySelector('link[rel="manifest"]')) {
      console.log('🎯 PWA Manifest Injector: Manifest link already exists');
      return;
    }

    // Создаем ссылку на манифест
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = './operator-manifest.json';
    document.head.appendChild(manifestLink);
    
    console.log('🎯 PWA Manifest Injector: Manifest link injected');
    
    // Обновляем статус
    setInjectionStatus(prev => ({
      ...prev,
      manifestLinkAdded: true,
      canInject: false,
    }));
  };

  const injectEmbeddedManifest = () => {
    // Проверяем, не добавлен ли уже
    if (document.getElementById('pwa-manifest')) {
      console.log('🎯 PWA Manifest Injector: Embedded manifest already exists');
      return;
    }

    // Создаем встроенный манифест
    const embeddedManifest = document.createElement('script');
    embeddedManifest.type = 'application/json';
    embeddedManifest.id = 'pwa-manifest';
    embeddedManifest.textContent = JSON.stringify({
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
    }, null, 2);
    
    document.head.appendChild(embeddedManifest);
    
    console.log('🎯 PWA Manifest Injector: Embedded manifest injected');
    
    // Обновляем статус
    setInjectionStatus(prev => ({
      ...prev,
      embeddedManifestAdded: true,
      canInject: false,
    }));
  };

  const refreshPage = () => {
    window.location.reload();
  };

  if (!injectionStatus.canInject) {
    return (
      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="text-green-300 font-semibold">PWA Manifest Status</h3>
            <div className="text-green-200 text-sm space-y-1">
              <p>• Manifest link: {injectionStatus.manifestLinkAdded ? '✅ Found' : '❌ Not found'}</p>
              <p>• Embedded manifest: {injectionStatus.embeddedManifestAdded ? '✅ Found' : '❌ Not found'}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3 className="text-red-300 font-semibold">PWA Manifest Missing</h3>
          <p className="text-red-200 text-sm">No manifest found in HTML. Inject one to enable PWA installation.</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={injectManifestLink}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          📄 Inject Manifest Link
        </button>
        
        <button
          onClick={injectEmbeddedManifest}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          📋 Inject Embedded Manifest
        </button>
        
        <button
          onClick={refreshPage}
          className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          🔄 Refresh Page
        </button>
      </div>
      
      <div className="mt-4 pt-4 border-t border-red-600/50">
        <h4 className="text-red-300 font-semibold text-sm mb-2">💡 Что делать:</h4>
        <div className="text-red-200 text-xs space-y-1">
          <p>• <strong>Inject Manifest Link:</strong> Добавляет ссылку на внешний файл манифеста</p>
          <p>• <strong>Inject Embedded Manifest:</strong> Встраивает манифест прямо в HTML</p>
          <p>• <strong>Refresh Page:</strong> Обновляет страницу для применения изменений</p>
          <p>• После инъекции обновите страницу для активации PWA</p>
        </div>
      </div>
    </div>
  );
};
