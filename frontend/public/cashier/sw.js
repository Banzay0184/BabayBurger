// Service Worker для интерфейса кассира Babay Burger
// Версия: 1.0.0

const CACHE_NAME = 'babay-cashier-v1.0.0';
const CACHE_URLS = [
  '/cashier/',
  '/cashier/manifest.json',
  '/cashier/cashier-icon-192.png',
  '/cashier/cashier-icon-512.png',
  '/logo.jpg',
  '/logobabay.png'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('💰 Cashier Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('💰 Cashier Service Worker: Caching app shell');
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        console.log('💰 Cashier Service Worker: App shell cached');
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('💰 Cashier Service Worker: Activating...');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('babay-cashier-')) {
            console.log('💰 Cashier Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('💰 Cashier Service Worker: Activated');
      return self.clients.claim();
    })
  );
});

// Стратегия кэширования для разных типов запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Кэшируем только запросы к нашему домену
  if (url.origin !== location.origin) {
    // Для внешних ресурсов (шрифты, API) используем network first
    if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
      event.respondWith(networkFirstStrategy(request));
    } else if (url.hostname === 'api.babayfood.uz') {
      // API запросы - всегда из сети для актуальных данных
      event.respondWith(networkOnlyStrategy(request));
    }
    return;
  }

  // Для статических ресурсов используем cache first
  if (isStaticResource(request)) {
    event.respondWith(cacheFirstStrategy(request));
  }
  // Для HTML страниц используем network first с fallback на кэш
  else if (request.mode === 'navigate' || request.headers.get('accept').includes('text/html')) {
    event.respondWith(networkFirstStrategy(request));
  }
  // Для API запросов используем network only
  else if (request.url.includes('/api/')) {
    event.respondWith(networkOnlyStrategy(request));
  }
  // По умолчанию - network first
  else {
    event.respondWith(networkFirstStrategy(request));
  }
});

// Стратегия Cache First (сначала кэш, потом сеть)
async function cacheFirstStrategy(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('💰 Cashier SW: Cache first strategy failed:', error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Стратегия Network First (сначала сеть, потом кэш)
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log('💰 Cashier SW: Network failed, trying cache:', error.message);
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Стратегия Network Only (только сеть)
async function networkOnlyStrategy(request) {
  try {
    return await fetch(request);
  } catch (error) {
    console.error('💰 Cashier SW: Network only strategy failed:', error);
    return new Response('Network Error', { status: 503, statusText: 'Service Unavailable' });
  }
}

// Проверка, является ли ресурс статическим
function isStaticResource(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  return pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i) ||
         pathname.includes('/assets/') ||
         pathname.includes('/static/');
}

// Обработка push уведомлений
self.addEventListener('push', (event) => {
  console.log('💰 Cashier SW: Push message received');
  
  if (!event.data) {
    return;
  }

  const data = event.data.json();
  const options = {
    body: data.body || 'Новое уведомление для кассира',
    icon: '/cashier-icon-192.png',
    badge: '/cashier-icon-96.png',
    tag: 'cashier-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'open',
        title: 'Открыть',
        icon: '/cashier-icon-96.png'
      },
      {
        action: 'close',
        title: 'Закрыть'
      }
    ],
    data: {
      url: data.url || '/cashier.html#/dashboard',
      timestamp: Date.now()
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Babay Кассир', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  console.log('💰 Cashier SW: Notification click received');
  
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const urlToOpen = event.notification.data?.url || '/cashier.html#/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Ищем открытое окно кассира
      for (const client of clientList) {
        if (client.url.includes('/cashier.html') && 'focus' in client) {
          client.navigate(urlToOpen);
          return client.focus();
        }
      }
      
      // Если окно не найдено, открываем новое
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Обработка фоновой синхронизации
self.addEventListener('sync', (event) => {
  console.log('💰 Cashier SW: Background sync:', event.tag);
  
  if (event.tag === 'cashier-data-sync') {
    event.waitUntil(syncCashierData());
  }
});

// Синхронизация данных кассира
async function syncCashierData() {
  try {
    console.log('💰 Cashier SW: Syncing cashier data...');
    
    // Здесь можно добавить логику синхронизации данных
    // Например, отправка отложенных заказов, обновление статистики и т.д.
    
    // Уведомляем все открытые окна о синхронизации
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
    
    console.log('💰 Cashier SW: Data sync completed');
  } catch (error) {
    console.error('💰 Cashier SW: Data sync failed:', error);
  }
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  console.log('💰 Cashier SW: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

// Обработка ошибок
self.addEventListener('error', (event) => {
  console.error('💰 Cashier SW: Error occurred:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('💰 Cashier SW: Unhandled promise rejection:', event.reason);
});

console.log('💰 Cashier Service Worker: Loaded successfully');
