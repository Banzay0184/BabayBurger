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

  useEffect(() => {
    checkPWACriteria();
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
        const response = await fetch('/cashier-manifest.json');
        if (response.ok) {
          const manifest = await response.json();
          const hasRequiredFields = manifest.name && manifest.short_name && manifest.start_url && manifest.display && manifest.icons;
          updateDiagnostic(2, hasRequiredFields ? 'success' : 'error',
            hasRequiredFields ? '✅ Манифест корректен' : '❌ Манифест неполный',
            `Иконок: ${manifest.icons?.length || 0}, Start URL: ${manifest.start_url}`
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
        const icon192Response = await fetch('/icon-192.png');
        const icon512Response = await fetch('/icon-512.png');
        
        const icon192Ok = icon192Response.ok;
        const icon512Ok = icon512Response.ok;
        
        if (icon192Ok && icon512Ok) {
          updateDiagnostic(3, 'success', '✅ Иконки доступны', '192x192 и 512x512');
        } else {
          updateDiagnostic(3, 'error', '❌ Иконки недоступны', 
            `192x192: ${icon192Ok ? 'OK' : 'FAIL'}, 512x512: ${icon512Ok ? 'OK' : 'FAIL'}`
          );
        }
      } catch (error) {
        updateDiagnostic(3, 'error', '❌ Ошибка проверки иконок', String(error));
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
            </div>
          </div>

          <button
            onClick={checkPWACriteria}
            className="w-full mt-3 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm transition-colors"
          >
            🔄 Перепроверить
          </button>
        </div>
      )}
    </div>
  );
};

export default PWADiagnostics;
