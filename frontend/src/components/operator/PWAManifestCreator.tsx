import React, { useState, useEffect } from 'react';

// Компонент для принудительного создания манифеста
export const PWAManifestCreator: React.FC = () => {
  const [manifestStatus, setManifestStatus] = useState({
    hasLink: false,
    hasEmbedded: false,
    canCreate: false,
  });

  useEffect(() => {
    const checkManifest = () => {
      const hasLink = !!document.querySelector('link[rel="manifest"]');
      const hasEmbedded = !!document.getElementById('pwa-manifest');
      
      setManifestStatus({
        hasLink,
        hasEmbedded,
        canCreate: !hasLink && !hasEmbedded,
      });
    };

    checkManifest();
  }, []);

  const createManifestLink = () => {
    // Создаем ссылку на манифест
    const manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    manifestLink.href = './operator-manifest.json';
    document.head.appendChild(manifestLink);
    
    console.log('🎯 PWA Manifest Creator: Manifest link created');
    
    // Обновляем статус
    setManifestStatus(prev => ({
      ...prev,
      hasLink: true,
      canCreate: false,
    }));
  };

  const createEmbeddedManifest = () => {
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
    
    console.log('🎯 PWA Manifest Creator: Embedded manifest created');
    
    // Обновляем статус
    setManifestStatus(prev => ({
      ...prev,
      hasEmbedded: true,
      canCreate: false,
    }));
  };

  if (!manifestStatus.canCreate) {
    return (
      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="text-green-300 font-semibold">PWA Manifest Status</h3>
            <div className="text-green-200 text-sm space-y-1">
              <p>• Manifest link: {manifestStatus.hasLink ? '✅ Found' : '❌ Not found'}</p>
              <p>• Embedded manifest: {manifestStatus.hasEmbedded ? '✅ Found' : '❌ Not found'}</p>
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
          <p className="text-red-200 text-sm">No manifest found in HTML. Create one to enable PWA installation.</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <button
          onClick={createManifestLink}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          📄 Create Manifest Link
        </button>
        
        <button
          onClick={createEmbeddedManifest}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          📋 Create Embedded Manifest
        </button>
      </div>
      
      <div className="mt-4 pt-4 border-t border-red-600/50">
        <h4 className="text-red-300 font-semibold text-sm mb-2">💡 Что делать:</h4>
        <div className="text-red-200 text-xs space-y-1">
          <p>• <strong>Manifest Link:</strong> Создает ссылку на внешний файл манифеста</p>
          <p>• <strong>Embedded Manifest:</strong> Встраивает манифест прямо в HTML</p>
          <p>• После создания обновите страницу для применения изменений</p>
        </div>
      </div>
    </div>
  );
};
