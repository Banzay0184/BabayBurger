// Service Worker для интерфейса оператора Babay Burger
// Версия: 1.0.0

const CACHE_NAME = 'babay-operator-v1.0.0';
const CACHE_URLS = [
  '/operator/',
  '/operator/login',
  '/operator/manifest.json',
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
  console.log('🎯 Operator SW: Push event received');
  
  let notificationData = {
    title: 'Babay Burger - Оператор',
    body: 'Новое уведомление',
    icon: '/logobabay.png',
    badge: '/logobabay.png',
    tag: 'operator-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'Посмотреть',
        icon: '/logobabay.png'
      },
      {
        action: 'dismiss',
        title: 'Закрыть'
      }
    ],
    data: {
      timestamp: Date.now(),
      type: 'default'
    }
  };

  // Если есть данные в push событии, используем их
  if (event.data) {
    try {
      const pushData = event.data.json();
      console.log('🎯 Operator SW: Push data received:', pushData);
      
      notificationData = {
        ...notificationData,
        ...pushData,
        data: {
          ...notificationData.data,
          ...pushData.data
        }
      };
    } catch (error) {
      console.error('🎯 Operator SW: Error parsing push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  console.log('🎯 Operator SW: Notification clicked:', event.action);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const action = event.action || 'default';
  
  let targetUrl = '/operator/#/dashboard';
  
  // Определяем URL в зависимости от типа уведомления
  if (notificationData.orderId) {
    targetUrl = `/operator/#/dashboard?order=${notificationData.orderId}`;
  } else if (notificationData.type === 'system') {
    targetUrl = '/operator/#/dashboard';
  }
  
  // Определяем действие
  switch (action) {
    case 'view':
      // Открываем/фокусируем окно
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then((clientList) => {
            // Ищем открытое окно
            for (const client of clientList) {
              if (client.url.includes('/operator/') && 'focus' in client) {
                return client.focus().then(() => {
                  // Переходим к нужной странице
                  return client.navigate(targetUrl);
                });
              }
            }
            
            // Если окно не найдено, открываем новое
            return clients.openWindow(targetUrl);
          })
      );
      break;
      
    case 'dismiss':
      // Просто закрываем уведомление
      break;
      
    default:
      // Клик по самому уведомлению
      event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
          .then((clientList) => {
            for (const client of clientList) {
              if (client.url.includes('/operator/') && 'focus' in client) {
                return client.focus().then(() => {
                  return client.navigate(targetUrl);
                });
              }
            }
            return clients.openWindow(targetUrl);
          })
      );
      break;
  }
});

// Обработка фоновой синхронизации
self.addEventListener('sync', (event) => {
  console.log('🎯 Operator SW: Background sync event:', event.tag);
  
  if (event.tag === 'operator-data-sync') {
    event.waitUntil(syncOperatorData());
  } else if (event.tag === 'operator-actions-sync') {
    event.waitUntil(syncPendingActions());
  }
});

// Синхронизация отложенных действий
async function syncPendingActions() {
  try {
    console.log('🎯 Operator SW: Syncing pending actions...');
    
    // Получаем отложенные действия из localStorage через сообщение клиенту
    const clients = await self.clients.matchAll();
    if (clients.length > 0) {
      // Запрашиваем отложенные действия у клиента
      clients.forEach(client => {
        client.postMessage({
          type: 'REQUEST_PENDING_ACTIONS',
          timestamp: Date.now()
        });
      });
    }
    
    console.log('🎯 Operator SW: Pending actions sync completed');
  } catch (error) {
    console.error('🎯 Operator SW: Error syncing pending actions:', error);
  }
}

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
  
  // Обработка запроса на фоновую синхронизацию
  if (event.data && event.data.type === 'REQUEST_BACKGROUND_SYNC') {
    event.waitUntil(
      self.registration.sync.register('operator-actions-sync')
        .then(() => {
          console.log('🎯 Operator SW: Background sync registered');
        })
        .catch(error => {
          console.error('🎯 Operator SW: Background sync registration failed:', error);
        })
    );
  }
  
  // Обработка отложенных действий от клиента
  if (event.data && event.data.type === 'PENDING_ACTIONS') {
    const actions = event.data.actions || [];
    console.log('🎯 Operator SW: Received pending actions:', actions.length);
    
    // Здесь можно добавить логику обработки отложенных действий
    // Например, отправка на сервер через fetch API
  }
  
  // Обработка звуковых уведомлений
  if (event.data && event.data.type === 'SOUND_NOTIFICATION') {
    console.log('🎯 Operator SW: Received sound notification request:', event.data.soundType);
    
    // Делегируем воспроизведение звука основному потоку
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'PLAY_SOUND',
            soundType: event.data.soundType,
            timestamp: Date.now()
          });
        });
      })
    );
  }
  
  // Обработка запросов на инициализацию звука
  if (event.data && event.data.type === 'INIT_SOUND_SYSTEM') {
    console.log('🎯 Operator SW: Sound system initialization requested');
    
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'INIT_SOUND_RESPONSE',
            success: true,
            timestamp: Date.now()
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
