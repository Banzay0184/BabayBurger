import React, { useState, useEffect } from 'react';

interface PWADiagnostic {
  name: string;
  status: 'checking' | 'success' | 'error';
  message: string;
  details?: string;
}

const PWADiagnostics: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<PWADiagnostic[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [serviceWorkerStatus, setServiceWorkerStatus] = useState<string>('Проверка...');
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isAlreadyInstalled, setIsAlreadyInstalled] = useState(false);

  useEffect(() => {
    checkPWACriteria();
    
    // Проверяем, установлено ли уже приложение
    const checkIfInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const isIOSStandalone = (window.navigator as any).standalone;
      const installed = isStandalone || isIOSStandalone;
      setIsAlreadyInstalled(installed);
    };

    checkIfInstalled();
    
    // Слушаем событие beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    // Слушаем событие установки
    const handleAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
      setIsAlreadyInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const checkPWACriteria = async () => {
    const checks: PWADiagnostic[] = [
      {
        name: 'HTTPS соединение',
        status: 'checking',
        message: 'Проверка безопасного соединения...'
      },
      {
        name: 'Service Worker',
        status: 'checking',
        message: 'Проверка Service Worker...'
      },
      {
        name: 'Манифест',
        status: 'checking',
        message: 'Проверка манифеста...'
      },
      {
        name: 'Иконки',
        status: 'checking',
        message: 'Проверка иконок...'
      },
      {
        name: 'PWA готовность',
        status: 'checking',
        message: 'Проверка готовности к установке...'
      }
    ];

    setDiagnostics(checks);

    // Проверка HTTPS
    setTimeout(() => {
      const isHTTPS = location.protocol === 'https:' || location.hostname === 'localhost';
      updateDiagnostic(0, isHTTPS ? 'success' : 'error', 
        isHTTPS ? '✅ Безопасное соединение' : '❌ Требуется HTTPS',
        `Протокол: ${location.protocol}, Хост: ${location.hostname}`
      );
    }, 500);

    // Проверка Service Worker
    setTimeout(async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          const hasActiveSW = registrations.some(reg => reg.active);
          updateDiagnostic(1, hasActiveSW ? 'success' : 'error',
            hasActiveSW ? '✅ Service Worker активен' : '❌ Service Worker не активен',
            `Зарегистрировано: ${registrations.length}`
          );
          setServiceWorkerStatus(hasActiveSW ? 'Активен' : 'Не активен');
        } catch (error) {
          updateDiagnostic(1, 'error', '❌ Ошибка Service Worker', String(error));
        }
      } else {
        updateDiagnostic(1, 'error', '❌ Service Worker не поддерживается', '');
      }
    }, 1000);

    // Проверка манифеста
    setTimeout(async () => {
      try {
        // Определяем правильный манифест в зависимости от текущего пути
        const currentPath = window.location.pathname;
        const manifestPath = currentPath.includes('/operator') ? '/operator-manifest.json' : '/cashier-manifest.json';
        
        const response = await fetch(manifestPath + '?v=' + Date.now());
        if (response.ok) {
          const manifest = await response.json();
          const hasRequiredFields = manifest.name && manifest.short_name && manifest.start_url && manifest.display && manifest.icons;
          updateDiagnostic(2, hasRequiredFields ? 'success' : 'error',
            hasRequiredFields ? '✅ Манифест корректен' : '❌ Манифест неполный',
            `Иконок: ${manifest.icons?.length || 0}, Start URL: ${manifest.start_url}, Иконка: ${manifest.icons?.[0]?.src || 'нет'}`
          );
        } else {
          updateDiagnostic(2, 'error', '❌ Манифест недоступен', `Статус: ${response.status}`);
        }
      } catch (error) {
        updateDiagnostic(2, 'error', '❌ Ошибка загрузки манифеста', String(error));
      }
    }, 1500);

    // Проверка иконок
    setTimeout(async () => {
      try {
        const iconResponse = await fetch('/icon-192.png?v=' + Date.now());
        
        if (iconResponse.ok) {
          updateDiagnostic(3, 'success', '✅ Иконка доступна', 'icon-192.png');
        } else {
          updateDiagnostic(3, 'error', '❌ Иконка недоступна', 
            `Статус: ${iconResponse.status}`
          );
        }
      } catch (error) {
        updateDiagnostic(3, 'error', '❌ Ошибка проверки иконки', String(error));
      }
    }, 2000);

    // Финальная проверка готовности
    setTimeout(() => {
      const allChecksPass = diagnostics.every(d => d.status === 'success');
      updateDiagnostic(4, allChecksPass ? 'success' : 'error',
        allChecksPass ? '🎉 PWA готов к установке!' : '⚠️ PWA не готов к установке',
        allChecksPass ? 'Все критерии выполнены' : 'Проверьте ошибки выше'
      );
    }, 2500);
  };

  const updateDiagnostic = (index: number, status: 'success' | 'error', message: string, details?: string) => {
    setDiagnostics(prev => prev.map((d, i) => 
      i === index ? { ...d, status, message, details } : d
    ));
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('✅ Пользователь принял установку PWA');
      } else {
        console.log('❌ Пользователь отклонил установку PWA');
      }
      
      setDeferredPrompt(null);
      setCanInstall(false);
    } catch (error) {
      console.error('❌ Ошибка при установке PWA:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-yellow-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return '✅';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Кнопка для открытия диагностики */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
      >
        🔍 PWA Диагностика
      </button>

      {/* Панель диагностики */}
      {isVisible && (
        <div className="absolute bottom-16 right-0 bg-white rounded-lg shadow-xl border p-4 w-80 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-gray-800">PWA Диагностика</h3>
            <button
              onClick={() => setIsVisible(false)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {diagnostics.map((diagnostic, index) => (
              <div key={index} className="border-b pb-2 last:border-b-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{getStatusIcon(diagnostic.status)}</span>
                  <span className="font-medium text-sm">{diagnostic.name}</span>
                </div>
                <div className={`text-xs ${getStatusColor(diagnostic.status)} ml-6`}>
                  {diagnostic.message}
                </div>
                {diagnostic.details && (
                  <div className="text-xs text-gray-500 ml-6 mt-1">
                    {diagnostic.details}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t">
            <div className="text-sm text-gray-600">
              <div>Service Worker: <span className="font-medium">{serviceWorkerStatus}</span></div>
              <div>URL: <span className="font-medium">{location.href}</span></div>
              <div>Протокол: <span className="font-medium">{location.protocol}</span></div>
              <div>Можно установить: <span className="font-medium">{canInstall ? 'Да' : 'Нет'}</span></div>
              <div>Уже установлено: <span className="font-medium">{isAlreadyInstalled ? 'Да' : 'Нет'}</span></div>
            </div>
            
            {isAlreadyInstalled ? (
              <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-800">
                <div className="font-medium mb-1">✅ PWA уже установлено!</div>
                <div>Приложение уже установлено на вашем устройстве. Проверьте главный экран или список приложений.</div>
              </div>
            ) : !canInstall ? (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <div className="font-medium mb-1">Почему нет кнопки установки?</div>
                <ul className="list-disc list-inside space-y-1">
                  <li>Браузер не поддерживает PWA</li>
                  <li>Не выполнены все критерии</li>
                  <li>Попробуйте очистить кэш</li>
                </ul>
                
                <div className="mt-2 pt-2 border-t border-yellow-300">
                  <div className="font-medium mb-1">Попробуйте принудительную установку:</div>
                  <div className="space-y-1">
                    <button
                      onClick={async () => {
                        try {
                          // Очищаем кэш Service Worker
                          if ('serviceWorker' in navigator) {
                            const registrations = await navigator.serviceWorker.getRegistrations();
                            for (const registration of registrations) {
                              await registration.unregister();
                            }
                            
                            // Очищаем кэш
                            if ('caches' in window) {
                              const cacheNames = await caches.keys();
                              await Promise.all(
                                cacheNames.map(cacheName => caches.delete(cacheName))
                              );
                            }
                            
                            alert('✅ Кэш очищен! Перезагрузите страницу.');
                            window.location.reload();
                          }
                        } catch (error) {
                          alert('❌ Ошибка очистки кэша: ' + error);
                        }
                      }}
                      className="w-full bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                    >
                      🗑️ Очистить кэш
                    </button>
                    
                    <button
                      onClick={() => {
                        alert('Попробуйте:\n1. Меню браузера (⋮) → "Установить Babay Кассир"\n2. Или очистите кэш и перезагрузите страницу');
                      }}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-1 rounded text-xs"
                    >
                      🔧 Принудительная установка
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex gap-2 mt-3">
            <button
              onClick={checkPWACriteria}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm transition-colors"
            >
              🔄 Перепроверить
            </button>
            
            {canInstall && (
              <button
                onClick={handleInstall}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm transition-colors"
              >
                📱 Установить
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PWADiagnostics;
