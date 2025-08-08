# Руководство по устранению проблем

## Проблема: CORS ошибки при авторизации через Telegram

### Симптомы:
- `Request header field Access-Control-Allow-Origin is not allowed`
- `XMLHttpRequest cannot load due to access control checks`
- `Network Error` при попытке авторизации

### Решение:

#### 1. Проверьте, что Django сервер запущен:
```bash
cd backend
python manage.py runserver 0.0.0.0:8000
```

#### 2. Проверьте ngrok туннель:
```bash
# Проверьте активные туннели
curl http://localhost:4040/api/tunnels

# Если ngrok не запущен, запустите его:
ngrok http 8000
```

#### 3. Обновите конфигурацию API:
В файле `frontend/src/config/api.ts` обновите URL на актуальный ngrok URL:

```typescript
BASE_URL: 'https://YOUR_NGROK_URL.ngrok-free.app/api/',
```

#### 4. Проверьте CORS настройки в Django:
В файле `backend/config/settings.py` убедитесь, что есть следующие настройки:

```python
CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [
    'https://babay-burger.vercel.app',
    'https://*.ngrok-free.app',
    'https://*.ngrok.io',
]
CORS_ALLOWED_HEADERS = [
    'ngrok-skip-browser-warning',
    # ... другие заголовки
]
```

#### 5. Запустите диагностику:
```bash
cd backend
python check_and_start_services.py
```

#### 6. Тестирование API:
Откройте в браузере: `https://YOUR_NGROK_URL.ngrok-free.app/api/test/`

Должен вернуться JSON ответ.

### Дополнительные проверки:

#### Проверка в браузере:
1. Откройте DevTools (F12)
2. Перейдите на вкладку Network
3. Попробуйте авторизацию
4. Проверьте, какие запросы отправляются и какие ошибки возникают

#### Проверка логов Django:
```bash
cd backend
tail -f logs/api.log
tail -f logs/errors.log
```

### Частые проблемы:

1. **Ngrok URL изменился**: Обновите URL в конфигурации
2. **Django не запущен**: Запустите сервер на порту 8000
3. **CORS не настроен**: Проверьте настройки в settings.py
4. **Проблемы с SSL**: Убедитесь, что используете HTTPS URL

### Команды для быстрого исправления:

```bash
# 1. Остановите все процессы
pkill -f "python manage.py runserver"
pkill -f "ngrok"

# 2. Запустите ngrok
ngrok http 8000

# 3. Запустите Django
cd backend
python manage.py runserver 0.0.0.0:8000

# 4. Проверьте API
curl https://YOUR_NGROK_URL.ngrok-free.app/api/test/
```

### Контакты для поддержки:
Если проблема не решается, проверьте:
1. Логи Django в `backend/logs/`
2. Консоль браузера (F12)
3. Network вкладку в DevTools 