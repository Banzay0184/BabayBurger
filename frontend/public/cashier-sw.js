const CACHE_NAME = 'babay-cashier-v7';
const STATIC_CACHE_NAME = 'babay-cashier-static-v7';
const DYNAMIC_CACHE_NAME = 'babay-cashier-dynamic-v7';

// Статические ресурсы для кэширования
const STATIC_ASSETS = [
  '/',
  '/cashier',
  '/cashier/login',
  '/cashier-manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// API endpoints для кэширования
const API_CACHE_PATTERNS = [
  /\/api\/cashier\/.*/,
  /\/api\/orders\/.*/
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Cashier Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cashier Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('✅ Cashier Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Cashier Service Worker: Installation failed', error);
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Cashier Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
              console.log('🗑️ Cashier Service Worker: Deleting old cache', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Cashier Service Worker: Activation complete');
        return self.clients.claim();
      })
  );
});

// Перехват запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Пропускаем chrome-extension и другие не-HTTP запросы
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Стратегия кэширования для разных типов запросов
  if (request.method === 'GET') {
    if (url.pathname.startsWith('/api/')) {
      // API запросы: Network First с fallback на кэш
      event.respondWith(handleApiRequest(request));
    } else if (isStaticAsset(request.url)) {
      // Статические ресурсы: Cache First
      event.respondWith(handleStaticAsset(request));
    } else {
      // HTML страницы: Network First с fallback на кэш
      event.respondWith(handlePageRequest(request));
    }
  }
});

// Обработка API запросов (Network First)
async function handleApiRequest(request) {
  try {
    // Сначала пытаемся получить данные из сети
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Кэшируем успешные ответы
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('🌐 Network failed, trying cache for:', request.url);
    
    // Если сеть недоступна, пытаемся получить из кэша
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Если нет в кэше, возвращаем ошибку
    return new Response(
      JSON.stringify({ 
        error: 'Нет подключения к интернету',
        offline: true 
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Обработка статических ресурсов (Cache First)
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('Failed to fetch static asset:', request.url);
    return new Response('Asset not available offline', { status: 404 });
  }
}

// Обработка HTML страниц (Network First)
async function handlePageRequest(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    // Fallback на кэшированную версию или главную страницу
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Если это страница кассира, возвращаем кэшированную версию
    if (request.url.includes('/cashier')) {
      const fallbackResponse = await caches.match('/cashier');
      if (fallbackResponse) {
        return fallbackResponse;
      }
    }
    
    return new Response('Page not available offline', { status: 404 });
  }
}

// Проверка, является ли ресурс статическим
function isStaticAsset(url) {
  return url.includes('.js') || 
         url.includes('.css') || 
         url.includes('.png') || 
         url.includes('.jpg') || 
         url.includes('.jpeg') || 
         url.includes('.gif') || 
         url.includes('.svg') || 
         url.includes('.ico') ||
         url.includes('.woff') ||
         url.includes('.woff2');
}

// Обработка push уведомлений
self.addEventListener('push', (event) => {
  console.log('🔔 Push notification received:', event);
  
  const options = {
    body: 'Новый заказ требует обработки',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'view',
        title: 'Просмотреть заказ',
        icon: '/icon-192.png'
      },
      {
        action: 'close',
        title: 'Закрыть',
        icon: '/icon-192.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Babay Burger - Новый заказ', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  console.log('🔔 Notification clicked:', event);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/cashier')
    );
  }
});

// Синхронизация в фоне
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  try {
    // Здесь можно добавить логику синхронизации данных
    console.log('🔄 Performing background sync...');
  } catch (error) {
    console.error('❌ Background sync failed:', error);
  }
}
