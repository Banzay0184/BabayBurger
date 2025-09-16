// PWA Test Script для диагностики
// Используйте в консоли: loadScript('/pwa-test.js')

console.log('🧪 PWA Test Script loaded');

function testPWA() {
  console.log('🧪 Starting PWA diagnostics...');
  
  const results = {
    browser: navigator.userAgent,
    https: location.protocol === 'https:',
    localhost: location.hostname === 'localhost',
    serviceWorkerSupport: 'serviceWorker' in navigator,
    manifestSupport: 'manifest' in document.createElement('link'),
    displayMode: window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser',
    notificationSupport: 'Notification' in window,
    currentUrl: location.href
  };
  
  console.table(results);
  
  // Проверяем манифест
  fetch('/cashier-manifest.json')
    .then(response => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then(manifest => {
      console.log('✅ Manifest loaded successfully');
      console.log('📄 Manifest details:', manifest);
      
      // Проверяем иконки
      const iconChecks = manifest.icons.map(icon => 
        fetch(icon.src).then(r => ({ src: icon.src, ok: r.ok, status: r.status }))
      );
      
      Promise.all(iconChecks).then(iconResults => {
        console.log('🖼️ Icon availability:');
        console.table(iconResults);
      });
    })
    .catch(error => {
      console.error('❌ Manifest loading failed:', error);
    });
  
  // Проверяем Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      console.log('🔧 Service Worker registrations:', registrations);
      
      if (registrations.length === 0) {
        console.warn('⚠️ No Service Worker registered');
      } else {
        registrations.forEach((registration, index) => {
          console.log(`🔧 SW ${index + 1}:`, {
            scope: registration.scope,
            state: registration.active?.state,
            scriptURL: registration.active?.scriptURL
          });
        });
      }
    });
  }
  
  // Проверяем критерии установки
  const installCriteria = {
    'HTTPS or localhost': results.https || results.localhost,
    'Service Worker support': results.serviceWorkerSupport,
    'Manifest linked': document.querySelector('link[rel="manifest"]') !== null,
    'Has icons': document.querySelectorAll('link[rel*="icon"]').length > 0,
    'Not already installed': results.displayMode === 'browser'
  };
  
  console.log('📋 PWA Install criteria:');
  console.table(installCriteria);
  
  const allCriteriaMet = Object.values(installCriteria).every(Boolean);
  
  if (allCriteriaMet) {
    console.log('✅ All PWA criteria met! App should be installable.');
  } else {
    console.log('❌ Some PWA criteria not met. Check the table above.');
  }
  
  return {
    results,
    installCriteria,
    canInstall: allCriteriaMet
  };
}

// Функция для принудительной регистрации SW
function forceRegisterSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/cashier-sw.js', { scope: '/' })
      .then(registration => {
        console.log('✅ Service Worker registered:', registration);
      })
      .catch(error => {
        console.error('❌ Service Worker registration failed:', error);
      });
  }
}

// Функция для очистки всех данных PWA
function clearPWAData() {
  console.log('🧹 Clearing PWA data...');
  
  // Очищаем Service Workers
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
        console.log('🗑️ Unregistered Service Worker:', registration.scope);
      });
    });
  }
  
  // Очищаем localStorage
  localStorage.clear();
  console.log('🗑️ Cleared localStorage');
  
  // Очищаем sessionStorage  
  sessionStorage.clear();
  console.log('🗑️ Cleared sessionStorage');
  
  console.log('✅ PWA data cleared. Reload page to test again.');
}

// Функция для симуляции beforeinstallprompt
function simulateInstallPrompt() {
  console.log('🎭 Simulating install prompt...');
  
  const event = new Event('beforeinstallprompt');
  event.platforms = ['web'];
  event.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });
  event.prompt = () => Promise.resolve();
  
  window.dispatchEvent(event);
  console.log('✅ Install prompt event dispatched');
}

// Экспорт функций в глобальную область
window.testPWA = testPWA;
window.forceRegisterSW = forceRegisterSW;
window.clearPWAData = clearPWAData;
window.simulateInstallPrompt = simulateInstallPrompt;

console.log('🧪 PWA Test functions available:');
console.log('- testPWA() - Run full diagnostics');
console.log('- forceRegisterSW() - Force Service Worker registration');
console.log('- clearPWAData() - Clear all PWA data');
console.log('- simulateInstallPrompt() - Simulate install prompt');

// Автоматически запускаем тест
testPWA();
