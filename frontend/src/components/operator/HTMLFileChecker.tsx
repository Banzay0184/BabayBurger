import React, { useState, useEffect } from 'react';

// Компонент для проверки загруженного HTML файла
export const HTMLFileChecker: React.FC = () => {
  const [htmlInfo, setHtmlInfo] = useState({
    documentTitle: '',
    isOperatorHTML: false,
    hasManifestLink: false,
    hasEmbeddedManifest: false,
    manifestLinkHref: '',
    embeddedManifestContent: '',
  });

  useEffect(() => {
    const checkHTMLFile = () => {
      try {
        const documentTitle = document.title;
        const isOperatorHTML = documentTitle.includes('Оператор') || documentTitle.includes('Operator');
        
        // Проверяем ссылку на манифест
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        const hasManifestLink = !!manifestLink;
        const manifestLinkHref = manifestLink?.href || '';
        
        // Проверяем встроенный манифест
        const embeddedManifest = document.getElementById('pwa-manifest') as HTMLScriptElement;
        const hasEmbeddedManifest = !!embeddedManifest;
        const embeddedManifestContent = embeddedManifest?.textContent || '';
        
        setHtmlInfo({
          documentTitle,
          isOperatorHTML,
          hasManifestLink,
          hasEmbeddedManifest,
          manifestLinkHref,
          embeddedManifestContent,
        });

        console.log('🎯 HTML File Checker: HTML file analysis complete');
        console.log('- Document title:', documentTitle);
        console.log('- Is operator HTML:', isOperatorHTML);
        console.log('- Has manifest link:', hasManifestLink);
        console.log('- Manifest link href:', manifestLinkHref);
        console.log('- Has embedded manifest:', hasEmbeddedManifest);
        console.log('- Embedded manifest content length:', embeddedManifestContent.length);
        
      } catch (error) {
        console.error('🎯 HTML File Checker: Error:', error);
      }
    };

    // Проверяем сразу и через задержку
    checkHTMLFile();
    setTimeout(checkHTMLFile, 1000);
  }, []);

  const refreshCheck = () => {
    const checkHTMLFile = () => {
      try {
        const documentTitle = document.title;
        const isOperatorHTML = documentTitle.includes('Оператор') || documentTitle.includes('Operator');
        
        const manifestLink = document.querySelector('link[rel="manifest"]') as HTMLLinkElement;
        const hasManifestLink = !!manifestLink;
        const manifestLinkHref = manifestLink?.href || '';
        
        const embeddedManifest = document.getElementById('pwa-manifest') as HTMLScriptElement;
        const hasEmbeddedManifest = !!embeddedManifest;
        const embeddedManifestContent = embeddedManifest?.textContent || '';
        
        setHtmlInfo({
          documentTitle,
          isOperatorHTML,
          hasManifestLink,
          hasEmbeddedManifest,
          manifestLinkHref,
          embeddedManifestContent,
        });
        
        console.log('🎯 HTML File Checker: Refreshed check');
      } catch (error) {
        console.error('🎯 HTML File Checker: Refresh error:', error);
      }
    };

    checkHTMLFile();
  };

  const openOperatorHTML = () => {
    // Открываем статический HTML файл оператора
    // Пробуем разные варианты URL
    const urls = [
      '/operator.html',
      'https://www.babayfood.uz/operator.html',
      window.location.origin + '/operator.html'
    ];
    
    // Открываем первый URL
    window.open(urls[0], '_blank');
    
    console.log('🎯 HTML File Checker: Opening operator.html');
    console.log('- URLs to try:', urls);
  };

  if (htmlInfo.isOperatorHTML && htmlInfo.hasManifestLink) {
    return (
      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="text-green-300 font-semibold">Correct HTML File</h3>
            <p className="text-green-200 text-sm">Operator HTML file loaded with manifest!</p>
          </div>
        </div>
        
        <div className="mt-3 space-y-2 text-green-200 text-sm">
          <p><strong>Document Title:</strong> {htmlInfo.documentTitle}</p>
          <p><strong>Manifest Link:</strong> {htmlInfo.manifestLinkHref}</p>
          <p><strong>Embedded Manifest:</strong> {htmlInfo.hasEmbeddedManifest ? 'Yes' : 'No'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-900/30 border border-yellow-600/50 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3 className="text-yellow-300 font-semibold">Wrong HTML File</h3>
          <p className="text-yellow-200 text-sm">Not loading operator.html file!</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="bg-yellow-800/50 border border-yellow-600/50 rounded-lg p-3">
          <h4 className="text-yellow-300 font-semibold mb-2">Current HTML Info:</h4>
          <div className="text-yellow-200 text-sm space-y-1">
            <p><strong>Document Title:</strong> {htmlInfo.documentTitle}</p>
            <p><strong>Is Operator HTML:</strong> {htmlInfo.isOperatorHTML ? 'Yes' : 'No'}</p>
            <p><strong>Has Manifest Link:</strong> {htmlInfo.hasManifestLink ? 'Yes' : 'No'}</p>
            <p><strong>Manifest Link Href:</strong> {htmlInfo.manifestLinkHref || 'None'}</p>
            <p><strong>Has Embedded Manifest:</strong> {htmlInfo.hasEmbeddedManifest ? 'Yes' : 'No'}</p>
          </div>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={openOperatorHTML}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔗 Open operator.html Directly
          </button>
          
          <button
            onClick={refreshCheck}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔄 Refresh Check
          </button>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-yellow-600/50">
        <h4 className="text-yellow-300 font-semibold text-sm mb-2">💡 Что происходит:</h4>
        <div className="text-yellow-200 text-xs space-y-1">
          <p>• Вы находитесь на SPA странице <code>/operator/</code></p>
          <p>• Но манифест есть только в статическом файле <code>/operator.html</code></p>
          <p>• <strong>Open operator.html Directly:</strong> Открывает статический HTML файл</p>
          <p>• В статическом HTML файле есть манифест и PWA работает</p>
        </div>
      </div>
    </div>
  );
};
