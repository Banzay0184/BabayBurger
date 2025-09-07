# 🌐 Настройка CORS для Babay Food API

## 📡 Ваш API развернут по адресу: https://api.babayfood.uz/

Для корректной работы фронтенда с вашим API необходимо настроить CORS (Cross-Origin Resource Sharing).

## ⚙️ Настройка CORS в Django

### 1. Обновите настройки CORS в `settings.py`:

```python
# settings.py

# CORS настройки
CORS_ALLOWED_ORIGINS = [
    "https://your-frontend-domain.com",  # Замените на ваш фронтенд домен
    "https://babayfood.uz",              # Если фронтенд на том же домене
    "http://localhost:3000",             # Для локальной разработки
    "http://localhost:5173",             # Для Vite dev server
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

# Разрешить все поддомены
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.babayfood\.uz$",
    r"^https://.*\.your-domain\.com$",
]

# Разрешить все заголовки
CORS_ALLOW_ALL_ORIGINS = False  # В продакшене лучше False

# Разрешенные заголовки
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'ngrok-skip-browser-warning',  # Для ngrok
]

# Разрешенные методы
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

# Разрешить cookies
CORS_ALLOW_CREDENTIALS = True

# Время кэширования preflight запросов
CORS_PREFLIGHT_MAX_AGE = 86400
```

### 2. Настройки для WebSocket (если используете):

```python
# settings.py

# WebSocket CORS настройки
CORS_ALLOWED_ORIGINS_WEBSOCKET = [
    "wss://your-frontend-domain.com",
    "ws://localhost:3000",
    "ws://localhost:5173",
]
```

### 3. Настройки для Telegram Web App:

```python
# settings.py

# Telegram Web App настройки
TELEGRAM_WEB_APP_DOMAINS = [
    "https://your-frontend-domain.com",
    "https://babayfood.uz",
    "https://t.me",  # Для Telegram
]
```

## 🔧 Альтернативная настройка (если используете nginx)

### nginx.conf:
```nginx
server {
    listen 443 ssl;
    server_name api.babayfood.uz;
    
    # SSL настройки
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    
    # CORS заголовки
    add_header 'Access-Control-Allow-Origin' 'https://your-frontend-domain.com' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,ngrok-skip-browser-warning' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
    
    # Обработка preflight запросов
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' 'https://your-frontend-domain.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization,ngrok-skip-browser-warning' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Max-Age' 1728000;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        add_header 'Content-Length' 0;
        return 204;
    }
    
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # WebSocket поддержка
    location /ws/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🧪 Тестирование CORS

### 1. Проверка с помощью curl:
```bash
# Проверка preflight запроса
curl -X OPTIONS \
  -H "Origin: https://your-frontend-domain.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  https://api.babayfood.uz/auth/telegram-widget/

# Проверка обычного запроса
curl -X GET \
  -H "Origin: https://your-frontend-domain.com" \
  https://api.babayfood.uz/
```

### 2. Проверка в браузере:
Откройте консоль разработчика и выполните:
```javascript
fetch('https://api.babayfood.uz/', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
})
.then(response => response.json())
.then(data => console.log('✅ CORS работает:', data))
.catch(error => console.error('❌ CORS ошибка:', error));
```

## 🚨 Частые проблемы и решения

### 1. Ошибка "Access to fetch at 'https://api.babayfood.uz/' from origin 'https://your-domain.com' has been blocked by CORS policy"

**Решение:** Добавьте ваш домен в `CORS_ALLOWED_ORIGINS`

### 2. Ошибка "Request header field authorization is not allowed by Access-Control-Allow-Headers"

**Решение:** Добавьте 'authorization' в `CORS_ALLOW_HEADERS`

### 3. WebSocket не подключается

**Решение:** Убедитесь, что WebSocket CORS настроен правильно и nginx поддерживает WebSocket

### 4. Telegram Web App не работает

**Решение:** Добавьте домен Telegram в `TELEGRAM_WEB_APP_DOMAINS`

## 📋 Чек-лист для настройки CORS

- [ ] ✅ Обновлены `CORS_ALLOWED_ORIGINS` с вашим фронтенд доменом
- [ ] ✅ Добавлены все необходимые заголовки в `CORS_ALLOW_HEADERS`
- [ ] ✅ Настроены методы в `CORS_ALLOW_METHODS`
- [ ] ✅ Включен `CORS_ALLOW_CREDENTIALS = True`
- [ ] ✅ Настроен nginx (если используется)
- [ ] ✅ Протестированы CORS запросы
- [ ] ✅ Проверена работа WebSocket
- [ ] ✅ Протестирована авторизация через Telegram

## 🔄 После настройки CORS

1. **Перезапустите Django сервер:**
   ```bash
   python manage.py runserver
   ```

2. **Перезапустите nginx (если используется):**
   ```bash
   sudo systemctl reload nginx
   ```

3. **Протестируйте фронтенд** с вашим API

---

**🎉 После настройки CORS ваш фронтенд сможет корректно работать с API!**
