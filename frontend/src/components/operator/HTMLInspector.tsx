import React, { useState, useEffect } from 'react';

// Компонент для проверки HTML содержимого
export const HTMLInspector: React.FC = () => {
  const [htmlInfo, setHtmlInfo] = useState({
    headContent: '',
    manifestLinks: 0,
    embeddedManifests: 0,
    serviceWorkerScripts: 0,
  });

  useEffect(() => {
    const inspectHTML = () => {
      try {
        // Получаем содержимое head
        const headContent = document.head.innerHTML;
        
        // Считаем ссылки на манифест
        const manifestLinks = document.querySelectorAll('link[rel="manifest"]').length;
        
        // Считаем встроенные манифесты
        const embeddedManifests = document.querySelectorAll('script[id="pwa-manifest"]').length;
        
        // Считаем скрипты Service Worker
        const serviceWorkerScripts = document.querySelectorAll('script').length;
        
        setHtmlInfo({
          headContent: headContent.substring(0, 500) + (headContent.length > 500 ? '...' : ''),
          manifestLinks,
          embeddedManifests,
          serviceWorkerScripts,
        });
        
        console.log('🎯 HTML Inspector: HTML analysis complete');
        console.log('- Manifest links:', manifestLinks);
        console.log('- Embedded manifests:', embeddedManifests);
        console.log('- Service Worker scripts:', serviceWorkerScripts);
        
      } catch (error) {
        console.error('🎯 HTML Inspector: Error:', error);
      }
    };

    // Проверяем сразу и через задержку
    inspectHTML();
    setTimeout(inspectHTML, 1000);
  }, []);

  const refreshInspection = () => {
    const inspectHTML = () => {
      try {
        const headContent = document.head.innerHTML;
        const manifestLinks = document.querySelectorAll('link[rel="manifest"]').length;
        const embeddedManifests = document.querySelectorAll('script[id="pwa-manifest"]').length;
        const serviceWorkerScripts = document.querySelectorAll('script').length;
        
        setHtmlInfo({
          headContent: headContent.substring(0, 500) + (headContent.length > 500 ? '...' : ''),
          manifestLinks,
          embeddedManifests,
          serviceWorkerScripts,
        });
        
        console.log('🎯 HTML Inspector: Refreshed inspection');
      } catch (error) {
        console.error('🎯 HTML Inspector: Refresh error:', error);
      }
    };

    inspectHTML();
  };

  return (
    <div className="bg-gray-800 border border-gray-600 rounded-lg p-4 mb-6">
      <h3 className="text-white font-semibold mb-3">🔍 HTML Inspector</h3>
      
      <div className="space-y-3">
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-gray-300">Manifest Links</div>
            <div className={`text-lg font-bold ${htmlInfo.manifestLinks > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {htmlInfo.manifestLinks}
            </div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-gray-300">Embedded Manifests</div>
            <div className={`text-lg font-bold ${htmlInfo.embeddedManifests > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {htmlInfo.embeddedManifests}
            </div>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-3">
            <div className="text-gray-300">Scripts</div>
            <div className="text-lg font-bold text-blue-400">
              {htmlInfo.serviceWorkerScripts}
            </div>
          </div>
        </div>
        
        <div className="bg-gray-700 rounded-lg p-3">
          <h4 className="text-gray-300 font-semibold mb-2">Head Content (first 500 chars):</h4>
          <pre className="text-gray-200 text-xs overflow-auto max-h-40 whitespace-pre-wrap">
            {htmlInfo.headContent}
          </pre>
        </div>
        
        <button
          onClick={refreshInspection}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          🔄 Refresh Inspection
        </button>
      </div>
    </div>
  );
};
