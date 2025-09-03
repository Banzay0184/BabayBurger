# 🔌 WebSocket Setup - Babay Food

## 📋 Обзор

WebSocket интеграция для операторского интерфейса Babay Food обеспечивает real-time обновления заказов, уведомлений и статистики.

## 🚀 Установка зависимостей

### 1. Установка Python пакетов

```bash
cd backend
pip install channels==4.0.0 channels-redis==4.1.0
```

### 2. Проверка установки

```bash
python test_websocket.py
```

## 🏗️ Архитектура

### Backend (Django Channels)

#### **ASGI Configuration**
- `config/asgi.py` - ASGI приложение
- `config/routing.py` - WebSocket роутинг
- `config/settings.py` - настройки Channels

#### **WebSocket Consumers**
- `app_operator/consumers.py` - обработчики WebSocket соединений
  - `OperatorConsumer` - для операторов
  - `OrderConsumer` - для отслеживания заказов
  - `CashierConsumer` - для кассиров

#### **Signals Integration**
- `app_operator/signals.py` - интеграция с Django signals
  - Автоматическая отправка WebSocket уведомлений
  - Real-time обновления при изменении заказов

### Frontend (React)

#### **WebSocket Hooks**
- `frontend/src/hooks/useWebSocket.ts` - базовый WebSocket хук
- `frontend/src/hooks/useOperatorWebSocket.ts` - специализированный хук для операторов

#### **Integration**
- `frontend/src/pages/operator/OperatorDashboardPage.tsx` - интеграция с дашбордом

## 🔧 Настройка

### 1. Redis

Убедитесь, что Redis запущен:

```bash
redis-server
```

### 2. Django Settings

Настройки уже добавлены в `config/settings.py`:

```python
# Channels
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            "hosts": [os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/2')],
            "capacity": 1500,
            "expiry": 10,
        },
    },
}
```

### 3. ASGI Application

ASGI приложение настроено в `config/asgi.py`.

## 🚀 Запуск

### 1. Запуск Django с ASGI

```bash
cd backend
python manage.py runserver
```

### 2. Запуск с ASGI сервером (рекомендуется)

```bash
cd backend
pip install uvicorn
uvicorn config.asgi:application --host 0.0.0.0 --port 8000 --reload
```

### 3. Запуск Frontend

```bash
cd frontend
npm run dev:operator
```

## 🧪 Тестирование

### 1. Автоматические тесты

```bash
cd backend
python test_websocket.py
```

### 2. Ручное тестирование

Откройте `backend/websocket_test.html` в браузере для тестирования WebSocket соединения.

### 3. Тестирование в операторском интерфейсе

1. Откройте `http://localhost:5174`
2. Войдите как оператор
3. Проверьте индикатор WebSocket статуса в верхней панели
4. Создайте новый заказ через Telegram бот
5. Проверьте, что заказ появился в операторском интерфейсе мгновенно

## 📡 WebSocket Endpoints

### Операторы
- `ws://localhost:8000/ws/operator/` - общая группа операторов
- `ws://localhost:8000/ws/operator/{operator_id}/` - конкретный оператор

### Заказы
- `ws://localhost:8000/ws/order/{order_id}/` - отслеживание конкретного заказа

### Кассиры
- `ws://localhost:8000/ws/cashier/` - группа кассиров

## 📨 Типы сообщений

### От сервера к клиенту

#### Новый заказ
```json
{
  "type": "order_created",
  "order": { ... },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

#### Обновление заказа
```json
{
  "type": "order_updated",
  "order_id": 123,
  "order": { ... },
  "status": "confirmed",
  "updated_at": "2025-01-01T12:00:00Z",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

#### Назначение заказа
```json
{
  "type": "order_assigned",
  "order_id": 123,
  "operator_id": 456,
  "operator_name": "Иван Иванов",
  "timestamp": "2025-01-01T12:00:00Z"
}
```

#### Уведомление
```json
{
  "type": "notification",
  "notification": { ... },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

#### Обновление дашборда
```json
{
  "type": "dashboard_update",
  "stats": { ... },
  "timestamp": "2025-01-01T12:00:00Z"
}
```

### От клиента к серверу

#### Ping
```json
{
  "type": "ping",
  "timestamp": 1640995200000
}
```

#### Подписка на заказы
```json
{
  "type": "subscribe_orders"
}
```

## 🔍 Мониторинг

### Логи

WebSocket события логируются в Django логах:

```python
logger.info(f"WebSocket уведомление о новом заказе #{order.id} отправлено")
```

### Статус соединения

В операторском интерфейсе отображается индикатор статуса WebSocket:
- 🟢 **Онлайн** - соединение активно
- 🟡 **Подключение...** - идет подключение
- 🔴 **Офлайн** - соединение отсутствует

## 🚨 Troubleshooting

### 1. WebSocket не подключается

**Проблема**: Ошибка подключения к WebSocket

**Решение**:
- Проверьте, что Redis запущен
- Убедитесь, что Django запущен с ASGI
- Проверьте настройки CORS
- Проверьте логи Django

### 2. Сообщения не приходят

**Проблема**: WebSocket подключен, но сообщения не приходят

**Решение**:
- Проверьте, что signals зарегистрированы
- Убедитесь, что Channel Layer настроен правильно
- Проверьте логи на ошибки отправки

### 3. Автоматическое переподключение не работает

**Проблема**: WebSocket не переподключается автоматически

**Решение**:
- Проверьте настройки `maxReconnectAttempts`
- Убедитесь, что `reconnectInterval` настроен правильно
- Проверьте логи браузера на ошибки

## 📊 Производительность

### Оптимизации

1. **Группировка сообщений** - сообщения отправляются в группы операторов
2. **Селективная отправка** - уведомления отправляются только нужным операторам
3. **Ping/Pong** - проверка соединения каждые 30 секунд
4. **Автоматическое переподключение** - до 10 попыток с интервалом 3 секунды

### Мониторинг

- Количество активных соединений
- Частота отправки сообщений
- Время отклика WebSocket
- Количество ошибок подключения

## 🔒 Безопасность

### Аутентификация

WebSocket соединения используют Django аутентификацию через токены.

### Валидация

Все входящие сообщения валидируются на сервере.

### CORS

Настроены правильные CORS заголовки для WebSocket соединений.

## 📈 Масштабирование

### Горизонтальное масштабирование

Для масштабирования на несколько серверов:

1. Используйте Redis Cluster
2. Настройте load balancer с поддержкой WebSocket
3. Используйте sticky sessions

### Мониторинг

- Redis мониторинг
- WebSocket метрики
- Производительность Channel Layer

## 🎯 Следующие шаги

1. **Клиентский интерфейс** - добавить WebSocket для отслеживания заказов
2. **Интерфейс кассира** - реализовать WebSocket для кассиров
3. **Push уведомления** - интеграция с браузерными уведомлениями
4. **Аналитика** - метрики использования WebSocket
5. **Мобильная версия** - оптимизация для мобильных устройств
