# 🚀 Production WebSocket Configuration Guide

## ❌ **Проблема в продакшене:**
После деплоя фронтенд пытается подключиться к `wss://localhost:8000/ws/client/`, но это неправильный URL для продакшена.

## ✅ **Исправлено:**

### **1. WebSocket URL для продакшена**
- ❌ **Было:** `wss://localhost:8000/ws/client/` (не работает в продакшене)
- ✅ **Стало:** Автоматическое определение URL в зависимости от окружения

### **2. Логика определения URL:**
```typescript
// В режиме разработки
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  baseUrl = `${protocol}//localhost:8000`;  // Django сервер
} else {
  // В продакшене используем тот же хост что и фронтенд
  baseUrl = `${protocol}//${window.location.host}`;
}
```

### **3. Обновленные файлы:**
- ✅ `useClientWebSocket.ts` - клиентский WebSocket
- ✅ `useOperatorWebSocket.ts` - операторский WebSocket  
- ✅ `websocketTest.ts` - тестирование WebSocket
- ✅ `config/websocket.ts` - конфигурация (уже была правильная)

## 🚀 **Инструкции для деплоя:**

### **1. Пересоберите фронтенд:**
```bash
cd frontend
npm run build
```

### **2. Убедитесь, что Django сервер запущен с ASGI:**
```bash
cd backend
python run_asgi.py
```

### **3. Проверьте настройки nginx (если используется):**
```nginx
# WebSocket проксирование
location /ws/ {
    proxy_pass http://localhost:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

### **4. Проверьте настройки Django для продакшена:**
```python
# settings.py
ALLOWED_HOSTS = ['your-domain.com', 'www.your-domain.com']

# WebSocket настройки
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [('127.0.0.1', 6379)],
        },
    },
}
```

## 🧪 **Тестирование в продакшене:**

### **1. Проверьте WebSocket соединение:**
- Откройте консоль браузера
- Должно быть: `🔌 Client WebSocket connected`
- НЕ должно быть: `WebSocket connection to 'wss://localhost:8000/ws/client/' failed`

### **2. Проверьте URL в консоли:**
```javascript
// Должно быть что-то вроде:
// wss://your-domain.com/ws/client/123456789/
// НЕ localhost:8000
```

### **3. Протестируйте real-time обновления:**
- Создайте заказ через Telegram Web App
- Измените статус в операторском интерфейсе
- Проверьте, что статус обновился мгновенно в клиентской части

## 🔍 **Логи для отладки:**

### **В консоли браузера должно быть:**
```
🔌 Client WebSocket connected
📨 Client WebSocket message: {type: "connection_established"}
🔄 Статус заказа обновлен через WebSocket: 123, preparing
```

### **В логах Django сервера должно быть:**
```
INFO Client WebSocket connected: client_123456789
INFO 📨 Client WebSocket: sending order_status_update for order #123
```

## 🚨 **Troubleshooting:**

### **Проблема: WebSocket все еще подключается к localhost**
**Решение:**
1. Убедитесь, что фронтенд пересобран: `npm run build`
2. Очистите кэш браузера
3. Проверьте, что деплой прошел успешно

### **Проблема: WebSocket не подключается в продакшене**
**Решение:**
1. Проверьте настройки nginx для WebSocket
2. Убедитесь, что Django сервер запущен с ASGI
3. Проверьте настройки Redis
4. Проверьте логи Django сервера

### **Проблема: 502 Bad Gateway**
**Решение:**
1. Проверьте, что Django сервер запущен
2. Проверьте настройки nginx
3. Проверьте порты и проксирование

## 🎯 **Ожидаемые результаты после исправлений:**

### ✅ **В продакшене:**
- 🟢 WebSocket подключается к правильному хосту
- 🔄 Real-time обновления работают
- 📱 Telegram уведомления приходят мгновенно
- 🚫 Нет ошибок подключения к localhost

### ✅ **В разработке:**
- 🟢 WebSocket подключается к localhost:8000
- 🔄 Все функции работают как раньше

## 🎉 **Готово!**

WebSocket теперь правильно настроен для продакшена:
- ✅ Автоматическое определение URL
- ✅ Поддержка dev/prod окружений
- ✅ Правильное проксирование
- ✅ Real-time обновления в продакшене

**Пересоберите фронтенд и протестируйте!** 🚀
