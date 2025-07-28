# API для операторов доставки StreetBurger

## Обзор

API для операторов доставки позволяет управлять заказами, отслеживать статистику и получать уведомления. Система поддерживает работу в городах Бухара и Каган.

## Аутентификация

Все API эндпоинты (кроме регистрации и входа) требуют аутентификации через токен.

### Получение токена

```http
POST /api/operator/auth/login/
Content-Type: application/json

{
    "username": "operator_username",
    "password": "password"
}
```

**Ответ:**
```json
{
    "message": "Успешный вход",
    "token": "your_auth_token_here",
    "operator": {
        "id": 1,
        "username": "operator_username",
        "first_name": "Иван",
        "last_name": "Иванов",
        "phone": "+998901234567",
        "rating": 4.8,
        "completed_orders_count": 150,
        "avg_delivery_time": 25
    }
}
```

### Использование токена

Добавьте заголовок в запросы:
```
Authorization: Token your_auth_token_here
```

## Регистрация оператора

```http
POST /api/operator/auth/register/
Content-Type: application/json

{
    "username": "new_operator",
    "password": "secure_password",
    "password_confirm": "secure_password",
    "first_name": "Петр",
    "last_name": "Петров",
    "email": "petr@example.com",
    "phone": "901234567"
}
```

## Профиль оператора

### Получение профиля

```http
GET /api/operator/profile/me/
Authorization: Token your_token
```

### Обновление профиля

```http
PUT /api/operator/profile/update_profile/
Authorization: Token your_token
Content-Type: application/json

{
    "first_name": "Новое имя",
    "last_name": "Новая фамилия",
    "phone": "901234568"
}
```

## Управление сессиями

### Создание сессии

```http
POST /api/operator/sessions/
Authorization: Token your_token
Content-Type: application/json

{
    "notes": "Начало смены"
}
```

### Получение текущей сессии

```http
GET /api/operator/sessions/current/
Authorization: Token your_token
```

### Завершение сессии

```http
POST /api/operator/sessions/{session_id}/end/
Authorization: Token your_token
```

## Управление заказами

### Получение списка заказов

```http
GET /api/operator/orders/
Authorization: Token your_token
```

**Параметры запроса:**
- `status` - фильтр по статусу (pending, preparing, delivering, completed, cancelled)
- `zone` - фильтр по зоне доставки (ID зоны)
- `date` - фильтр по дате (YYYY-MM-DD)
- `search` - поиск по ID заказа или адресу

### Детали заказа

```http
GET /api/operator/orders/{order_id}/details/
Authorization: Token your_token
```

### Назначение заказа

```http
POST /api/operator/orders/{order_id}/assign/
Authorization: Token your_token
```

### Принятие заказа

```http
POST /api/operator/orders/{order_id}/accept/
Authorization: Token your_token
```

### Отклонение заказа

```http
POST /api/operator/orders/{order_id}/reject/
Authorization: Token your_token
Content-Type: application/json

{
    "reason": "Причина отклонения"
}
```

### Изменение статуса заказа

```http
PUT /api/operator/orders/{order_id}/change-status/
Authorization: Token your_token
Content-Type: application/json

{
    "new_status": "preparing",
    "reason": "Начинаем готовить заказ"
}
```

**Допустимые переходы статусов:**
- `pending` → `preparing`, `cancelled`
- `preparing` → `delivering`, `cancelled`
- `delivering` → `completed`, `cancelled`
- `completed` - финальный статус
- `cancelled` - финальный статус

## Уведомления

### Получение уведомлений

```http
GET /api/operator/notifications/
Authorization: Token your_token
```

### Отметить как прочитанное

```http
POST /api/operator/notifications/mark-read/
Authorization: Token your_token
Content-Type: application/json

{
    "notification_ids": [1, 2, 3]  // опционально, если не указано - все уведомления
}
```

### Количество непрочитанных

```http
GET /api/operator/notifications/unread-count/
Authorization: Token your_token
```

## Аналитика

### Дневная аналитика

```http
GET /api/operator/analytics/daily/
Authorization: Token your_token
```

**Параметры:**
- `date` - дата в формате YYYY-MM-DD (по умолчанию сегодня)

### Сводная аналитика

```http
GET /api/operator/analytics/summary/
Authorization: Token your_token
```

**Ответ:**
```json
{
    "total_orders": 45,
    "completed_orders": 42,
    "avg_delivery_time": 28,
    "completion_rate": 93.3
}
```

## Зоны доставки

### Получение зон оператора

```http
GET /api/operator/delivery-zones/
Authorization: Token your_token
```

## Работа с картами

### Получение заказов для карты

```http
GET /api/operator/map/
Authorization: Token your_token
```

### Маршрут доставки

```http
GET /api/operator/map/{order_id}/route/
Authorization: Token your_token
```

**Ответ:**
```json
{
    "order_id": 123,
    "destination": {
        "latitude": 39.7681,
        "longitude": 64.4556,
        "address": "ул. Тестовая, 1, Бухара"
    },
    "estimated_time": 30,
    "distance": 5.2
}
```

## Структуры данных

### Заказ

```json
{
    "id": 123,
    "total_price": "15000.00",
    "discounted_total": "14500.00",
    "status": "pending",
    "created_at": "2024-01-15T10:30:00Z",
    "delivery_fee": "5000.00",
    "notes": "Комментарий к заказу",
    "address_summary": {
        "full_address": "ул. Тестовая, 1, Бухара",
        "phone": "+998901234567",
        "coordinates": "39.7681,64.4556"
    },
    "items_summary": [
        {
            "name": "Бургер Классический",
            "quantity": 2,
            "total": "8000.00"
        }
    ],
    "assignment": {
        "id": 1,
        "status": "assigned",
        "assigned_at": "2024-01-15T10:35:00Z",
        "operator_name": "Иван Иванов"
    }
}
```

### Уведомление

```json
{
    "id": 1,
    "notification_type": "new_order",
    "notification_type_display": "Новый заказ",
    "title": "Новый заказ",
    "message": "Поступил новый заказ #123 на сумму 15000 UZS",
    "order": 123,
    "is_read": false,
    "created_at": "2024-01-15T10:30:00Z"
}
```

### Аналитика

```json
{
    "id": 1,
    "date": "2024-01-15",
    "date_formatted": "15.01.2024",
    "total_orders": 10,
    "completed_orders": 9,
    "cancelled_orders": 1,
    "total_delivery_time": 240,
    "avg_delivery_time": 27,
    "total_earnings": "150000.00",
    "rating": 4.8,
    "completion_rate": 90.0
}
```

## Коды ошибок

- `400 Bad Request` - неверные данные запроса
- `401 Unauthorized` - не авторизован
- `403 Forbidden` - нет прав доступа
- `404 Not Found` - ресурс не найден
- `409 Conflict` - конфликт (например, заказ уже назначен)

## Ограничения

1. **Регионы:** Только Бухара и Каган
2. **Зоны доставки:** Оператор может обрабатывать только заказы в своих зонах
3. **Статусы заказов:** Строгие правила переходов между статусами
4. **Время доставки:** Отслеживается автоматически

## Интеграция с Telegram

Система автоматически отправляет уведомления в Telegram при:
- Поступлении нового заказа
- Назначении заказа оператору
- Изменении статуса заказа

## Безопасность

- Все запросы (кроме регистрации/входа) требуют токен
- Валидация данных на сервере
- Логирование всех действий операторов
- Ограничение доступа по зонам доставки 