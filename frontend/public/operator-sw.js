// Service Worker для интерфейса оператора Babay Burger
// Версия: 1.0.1

const CACHE_NAME = 'babay-operator-v1.0.1';
const CACHE_URLS = [
  '/operator/',
  '/operator/login',
  '/operator-manifest.json',
  '/logobabay.png',
  '/logo.jpg'
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(CACHE_URLS);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName.startsWith('babay-operator-')) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
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
    // Для внешних ресурсов используем network first
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
    // Специальная обработка для маршрутов оператора
    if (request.mode === 'navigate') {
      const url = new URL(request.url);
      
      // Если запрашивается /operator, перенаправляем на /operator/login
      if (url.pathname === '/operator' || url.pathname === '/operator/') {
        const loginUrl = new URL('/operator/login', url.origin);
        const cachedLoginResponse = await caches.match(loginUrl);
        if (cachedLoginResponse) {
          return cachedLoginResponse;
        }
      }
      
      // Если запрашивается /operator/login, возвращаем кэшированную версию
      if (url.pathname === '/operator/login') {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
          return cachedResponse;
        }
      }
    }
    
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

// Обработка push уведомлений для оператора
self.addEventListener('push', (event) => {
  const options = {
    body: 'Новый заказ поступил в систему',
    icon: '/logobabay.png',
    badge: '/logobabay.png',
    tag: 'operator-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Посмотреть заказ'
      },
      {
        action: 'dismiss',
        title: 'Закрыть'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Babay Burger - Оператор', options)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/operator/#/dashboard')
    );
  } else if (event.action === 'dismiss') {
    // Просто закрываем уведомление
    return;
  } else {
    // Клик по самому уведомлению
    event.waitUntil(
      clients.openWindow('/operator/#/dashboard')
    );
  }
});

// Обработка фоновой синхронизации
self.addEventListener('sync', (event) => {
  if (event.tag === 'operator-data-sync') {
    event.waitUntil(syncOperatorData());
  }
});

// Синхронизация данных оператора
async function syncOperatorData() {
  try {
    // Здесь можно добавить логику синхронизации данных оператора
    // Например, отправка отложенных действий, обновление статистики и т.д.
    
    // Уведомляем все открытые окна о синхронизации
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
    
    console.log('🎯 Operator SW: Data sync completed');
  } catch (error) {
    console.error('🎯 Operator SW: Sync error:', error);
  }
}

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  // Обработка звуковых уведомлений
  if (event.data && event.data.type === 'SOUND_NOTIFICATION') {
    // Service Worker может воспроизводить звуки через Web Audio API
    // Но лучше делегировать это основному потоку
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'PLAY_SOUND',
            soundType: event.data.soundType
          });
        });
      })
    );
  }
});

// Обработка ошибок
self.addEventListener('error', (event) => {
  console.error('🎯 Operator SW: Error occurred:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('🎯 Operator SW: Unhandled promise rejection:', event.reason);
});

console.log('🎯 Operator Service Worker: Loaded successfully');
