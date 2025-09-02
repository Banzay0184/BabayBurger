# 🚀 WebSocket Quick Start Guide

## ❌ **Проблема:**
WebSocket пытается подключиться к `ws://localhost:5173/ws/operator/` (порт фронтенда), но должен подключаться к `ws://localhost:8000/ws/operator/` (порт бэкенда).

## ✅ **Исправлено:**
- Обновлены URL для WebSocket соединений
- Создана конфигурация WebSocket
- Исправлены все компоненты

## 🚀 **Быстрый старт:**

### 1. Проверьте статус сервера
```bash
cd backend
python check_server.py
```

### 2. Если сервер не запущен, запустите его с ASGI:
```bash
cd backend
python run_asgi.py
```

### 3. Откройте операторский интерфейс:
```bash
cd frontend
npm run dev:operator
```

### 4. Протестируйте WebSocket:
- Откройте `http://localhost:5174`
- Нажмите кнопку 🔌 (тест соединения)
- Нажмите кнопку 🏓 (тест ping/pong)
- Проверьте индикатор статуса WebSocket

## 🎯 **Ожидаемые результаты:**

### ✅ Если все работает:
- 🟢 Индикатор "Онлайн" (зеленый)
- ✅ Тест соединения проходит
- ✅ Ping/Pong работает
- 📨 В консоли браузера: "WebSocket подключен"

### ❌ Если не работает:
- 🔴 Индикатор "Офлайн" (красный)
- ❌ Тест соединения не проходит
- 📨 В консоли: "WebSocket connection failed"

## 🔧 **Troubleshooting:**

### Проблема: "WebSocket connection failed"
**Решение:**
1. Убедитесь, что Django сервер запущен: `python check_server.py`
2. Запустите с ASGI: `python run_asgi.py`
3. Проверьте, что Redis запущен: `redis-server`

### Проблема: "Connection refused"
**Решение:**
1. Проверьте, что порт 8000 свободен
2. Перезапустите сервер
3. Проверьте логи сервера на ошибки

### Проблема: "404 Not Found"
**Решение:**
1. Убедитесь, что сервер запущен с ASGI
2. Проверьте настройки в `config/settings.py`
3. Перезапустите сервер

## 📊 **Логи для отладки:**

### В консоли браузера должно быть:
```
🔌 Тестирование WebSocket соединения: ws://localhost:8000/ws/operator/
🔌 WebSocket подключен
📨 WebSocket сообщение: {type: "connection_established", ...}
🏓 Pong получен
```

### В логах Django сервера должно быть:
```
INFO WebSocket connection established
INFO Operator WebSocket connected: operators
```

## 🎉 **Готово!**

После успешного тестирования WebSocket будет полностью функционален:
- Real-time обновления заказов
- Мгновенные уведомления
- Автоматическое переподключение
- Fallback на polling

**Попробуйте сейчас!** 🚀
