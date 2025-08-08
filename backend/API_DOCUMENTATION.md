# API Документация - Babay Burger

## Базовый URL
```
http://localhost:8000/api/
```

## Аутентификация

### Telegram Login Widget
```
POST /api/auth/telegram-widget/
```
Авторизация через Telegram Login Widget.

**Тело запроса:**
```json
{
  "id": 123456789,
  "first_name": "Имя",
  "last_name": "Фамилия",
  "username": "username",
  "auth_date": 1234567890,
  "hash": "hash_string"
}
```

**Ответ:**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "telegram_id": 123456789,
    "first_name": "Имя",
    "last_name": "Фамилия",
    "username": "username",
    "created_at": "2025-08-08T10:30:00Z"
  },
  "message": "Авторизация успешна"
}
```

## Меню и товары

### Получить все меню
```
GET /api/menu/
```
Возвращает все категории с товарами и общую статистику.

**Ответ:**
```json
{
  "categories": [
    {
      "id": 1,
      "name": "Бургеры",
      "description": "Сочные бургеры с разными начинками",
      "image": null,
      "items": [...],
      "item_count": 4
    }
  ],
  "all_items": [...],
  "total_items": 12,
  "total_categories": 4
}
```

### Получить категории
```
GET /api/categories/
```
Возвращает список всех категорий с количеством товаров.

### Получить товары по категории
```
GET /api/categories/{category_id}/items/
```

### Получить детали товара
```
GET /api/menu/items/{item_id}/
```

### Получить хиты продаж
```
GET /api/menu/hits/
```

### Получить новинки
```
GET /api/menu/new/
```

### Получить избранные товары
```
GET /api/menu/featured/
```

### Поиск товаров
```
GET /api/menu/search/?q=бургер
```

### Фильтр по цене
```
GET /api/menu/price-range/?min_price=10000&max_price=30000
```

## Корзина

### Получить корзину
```
GET /api/cart/
```

### Добавить в корзину
```
POST /api/cart/
```
**Тело запроса:**
```json
{
  "item_id": 1,
  "quantity": 2
}
```

### Обновить количество
```
PUT /api/cart/
```
**Тело запроса:**
```json
{
  "item_id": 1,
  "quantity": 3
}
```

### Удалить из корзины
```
DELETE /api/cart/
```
**Тело запроса:**
```json
{
  "item_id": 1
}
```

## Адреса

### Получить адреса пользователя
```
GET /api/addresses/?telegram_id=123456789
```

### Создать адрес
```
POST /api/addresses/
```
**Тело запроса:**
```json
{
  "telegram_id": 123456789,
  "street": "Улица Пушкина",
  "house_number": "10",
  "apartment": "15",
  "city": "Бухара",
  "phone_number": "+998901234567",
  "is_primary": true
}
```

### Обновить адрес
```
PUT /api/addresses/{address_id}/
```

### Удалить адрес
```
DELETE /api/addresses/{address_id}/
```

## Заказы

### Получить заказы пользователя
```
GET /api/orders/?telegram_id=123456789
```

### Создать заказ
```
POST /api/orders/create/
```
**Тело запроса:**
```json
{
  "telegram_id": 123456789,
  "address_id": 1,
  "items": [
    {
      "menu_item_id": 1,
      "quantity": 2,
      "size_option_id": 2,
      "add_ons": [1, 2]
    }
  ],
  "notes": "Доставить к 18:00"
}
```

### Обновить статус заказа
```
PATCH /api/orders/{order_id}/
```
**Тело запроса:**
```json
{
  "status": "preparing"
}
```

## Акции

### Получить активные акции
```
GET /api/promotions/
```

## Зоны доставки

### Получить зоны доставки
```
GET /api/delivery-zones/
```

### Проверить адрес в зоне доставки
```
POST /api/addresses/delivery-zone-check/
```
**Тело запроса:**
```json
{
  "address": {
    "street": "Улица Пушкина",
    "house_number": "10",
    "city": "Бухара",
    "latitude": 39.7681,
    "longitude": 64.4556
  }
}
```

## Геокодирование

### Геокодирование адреса
```
GET /api/geocode/?query=Бухара, улица Пушкина 10
```

### Обратное геокодирование
```
POST /api/geocode/
```
**Тело запроса:**
```json
{
  "lat": 39.7681,
  "lon": 64.4556
}
```

## Статистика

### Получить статистику
```
GET /api/statistics/
```

**Ответ:**
```json
{
  "statistics": {
    "categories": 4,
    "items": 12,
    "hits": 3,
    "new_items": 2,
    "promotions": 3,
    "delivery_zones": 3,
    "users": 3,
    "price_range": {
      "min": 8000.0,
      "max": 35000.0,
      "average": 18500.0
    }
  },
  "categories_with_counts": [...]
}
```

## ViewSets (DRF)

### MenuItem ViewSet
```
GET /api/menu-items/ - список товаров
POST /api/menu-items/ - создать товар
GET /api/menu-items/{id}/ - получить товар
PUT /api/menu-items/{id}/ - обновить товар
DELETE /api/menu-items/{id}/ - удалить товар

Параметры фильтрации:
- ?is_hit=true - только хиты
- ?is_new=true - только новинки
- ?category=1 - по категории
```

### AddOn ViewSet
```
GET /api/add-ons/ - список дополнений
POST /api/add-ons/ - создать дополнение
GET /api/add-ons/{id}/ - получить дополнение
PUT /api/add-ons/{id}/ - обновить дополнение
DELETE /api/add-ons/{id}/ - удалить дополнение

Параметры фильтрации:
- ?category=1 - по категории
- ?available_for_category=1 - доступные для категории
```

### SizeOption ViewSet
```
GET /api/size-options/ - список размеров
POST /api/size-options/ - создать размер
GET /api/size-options/{id}/ - получить размер
PUT /api/size-options/{id}/ - обновить размер
DELETE /api/size-options/{id}/ - удалить размер
```

### Promotion ViewSet
```
GET /api/promotions/ - список акций
POST /api/promotions/ - создать акцию
GET /api/promotions/{id}/ - получить акцию
PUT /api/promotions/{id}/ - обновить акцию
DELETE /api/promotions/{id}/ - удалить акцию

Параметры фильтрации:
- ?is_active=true - только активные
- ?discount_type=PERCENT - по типу скидки
```

### Order ViewSet
```
GET /api/orders/ - список заказов
POST /api/orders/ - создать заказ
GET /api/orders/{id}/ - получить заказ
PUT /api/orders/{id}/ - обновить заказ
DELETE /api/orders/{id}/ - удалить заказ
```

## Коды ошибок

- `400` - Неверный запрос
- `401` - Не авторизован
- `404` - Не найдено
- `500` - Внутренняя ошибка сервера

## Примеры использования

### 1. Авторизация пользователя
```javascript
const response = await fetch('/api/auth/telegram-widget/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(telegramAuthData)
});
```

### 2. Получение меню
```javascript
const response = await fetch('/api/menu/');
const menuData = await response.json();
```

### 3. Добавление в корзину
```javascript
const response = await fetch('/api/cart/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    item_id: 1,
    quantity: 2
  })
});
```

### 4. Создание заказа
```javascript
const response = await fetch('/api/orders/create/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    telegram_id: 123456789,
    address_id: 1,
    notes: "Доставить к 18:00"
  })
});
``` 