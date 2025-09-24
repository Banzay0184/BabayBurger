import React, { useState, useEffect } from 'react';

// Компонент для проверки URL и перенаправления
export const URLChecker: React.FC = () => {
  const [urlInfo, setUrlInfo] = useState({
    currentUrl: '',
    isOperatorPage: false,
    isCorrectPath: false,
    needsRedirect: false,
  });

  useEffect(() => {
    const checkURL = () => {
      const currentUrl = window.location.href;
      const pathname = window.location.pathname;
      const isOperatorPage = pathname.includes('/operator') || currentUrl.includes('operator');
      const isCorrectPath = pathname === '/operator/' || pathname === '/operator' || currentUrl.includes('operator.html');
      
      setUrlInfo({
        currentUrl,
        isOperatorPage,
        isCorrectPath,
        needsRedirect: !isCorrectPath,
      });

      console.log('🎯 URL Checker: URL analysis complete');
      console.log('- Current URL:', currentUrl);
      console.log('- Pathname:', pathname);
      console.log('- Is operator page:', isOperatorPage);
      console.log('- Is correct path:', isCorrectPath);
    };

    checkURL();
  }, []);

  const redirectToOperator = () => {
    // Пытаемся перенаправить на страницу оператора
    const operatorUrl = '/operator.html';
    window.location.href = operatorUrl;
  };

  const openOperatorInNewTab = () => {
    const operatorUrl = '/operator.html';
    window.open(operatorUrl, '_blank');
  };

  if (urlInfo.isCorrectPath) {
    return (
      <div className="bg-green-900/30 border border-green-600/50 rounded-lg p-4 mb-6">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">✅</span>
          <div>
            <h3 className="text-green-300 font-semibold">Correct URL</h3>
            <p className="text-green-200 text-sm">You are on the operator page!</p>
          </div>
        </div>
        
        <div className="mt-3 text-green-200 text-sm">
          <p><strong>Current URL:</strong> {urlInfo.currentUrl}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-900/30 border border-red-600/50 rounded-lg p-4 mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <span className="text-2xl">⚠️</span>
        <div>
          <h3 className="text-red-300 font-semibold">Wrong Page</h3>
          <p className="text-red-200 text-sm">You are not on the operator page!</p>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="bg-red-800/50 border border-red-600/50 rounded-lg p-3">
          <h4 className="text-red-300 font-semibold mb-2">Current URL:</h4>
          <p className="text-red-200 text-sm break-all">{urlInfo.currentUrl}</p>
        </div>
        
        <div className="space-y-2">
          <button
            onClick={redirectToOperator}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔄 Redirect to Operator Page
          </button>
          
          <button
            onClick={openOperatorInNewTab}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            🔗 Open Operator in New Tab
          </button>
        </div>
      </div>
      
      <div className="mt-4 pt-4 border-t border-red-600/50">
        <h4 className="text-red-300 font-semibold text-sm mb-2">💡 Что делать:</h4>
        <div className="text-red-200 text-xs space-y-1">
          <p>• <strong>Redirect to Operator Page:</strong> Перенаправляет на страницу оператора</p>
          <p>• <strong>Open Operator in New Tab:</strong> Открывает страницу оператора в новой вкладке</p>
          <p>• Правильный URL должен содержать: <code>/operator.html</code> или <code>/operator/</code></p>
          <p>• PWA компоненты работают только на странице оператора</p>
        </div>
      </div>
    </div>
  );
};
