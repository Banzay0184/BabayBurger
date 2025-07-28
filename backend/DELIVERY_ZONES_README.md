# Доработка бэкенда StreetBurger для Бухары и Кагана

## Обзор изменений

Данный документ описывает доработки бэкенда сервиса доставки фастфуда для улучшения функционала акций, хитов продаж, кастомизации и выбора размеров пиццы, а также обеспечения точного ограничения зон доставки.

## 1. Доработка моделей

### 1.1. Модель DeliveryZone

**Новые поля:**
- `delivery_fee` - Стоимость доставки в зоне (DecimalField, default=0)
- `min_order_amount` - Минимальная сумма заказа для бесплатной доставки (DecimalField, blank=True, null=True)

**Логика:**
- При создании заказа проверяется, что адрес находится в активной зоне (is_active=True)
- Если адрес в зоне, устанавливается Order.delivery_fee из DeliveryZone.delivery_fee
- Если Order.total_price >= min_order_amount, устанавливается delivery_fee=0

### 1.2. Модель Address

**Улучшенная валидация:**
- Проверка, что city соответствует DeliveryZone.city при сохранении
- Если координаты указаны, проверяется is_in_delivery_zone в методе clean
- Автоматическое определение ближайшей зоны доставки

### 1.3. Модель Promotion

**Новые поля:**
- `max_discount` - Максимальная сумма скидки (DecimalField, blank=True, null=True)
- `usage_count` - Количество использований акции (PositiveIntegerField, default=0)
- `max_uses` - Максимальное количество использований (PositiveIntegerField, blank=True, null=True)

**Логика:**
- При применении акции увеличивается usage_count
- Проверяется, что usage_count < max_uses (если указано)
- Для PERCENT ограничивается скидка значением max_discount
- Если free_item или free_addon неактивны, акция игнорируется

### 1.4. Модель AddOn

**Новое поле:**
- `available_for_categories` - ManyToManyField с Category для ограничения соусов по категориям

**Логика:**
- При добавлении AddOn в OrderItem проверяется, что AddOn доступен для категории блюда

### 1.5. Модель SizeOption

**Новое поле:**
- `description` - Описание размера (TextField, blank=True)

**Логика:**
- При выборе размера валидируется, что он активен и связан с menu_item

### 1.6. Модель MenuItem

**Новое поле:**
- `priority` - Порядок отображения (PositiveIntegerField, default=0)

**Логика:**
- При фильтрации по is_hit или is_new сортировка по priority и created_at

### 1.7. Модель Order

**Новые поля:**
- `delivery_time` - Время доставки (DateTimeField, blank=True, null=True)
- `notes` - Примечания к заказу (TextField, blank=True)

**Логика:**
- При создании заказа проверяется, что адрес находится в зоне доставки
- Автоматически применяется лучшая доступная акция (по максимальной скидке)

## 2. Обновленные сериализаторы

### 2.1. AddOnSerializer
- Добавлено поле `available_for_categories`

### 2.2. SizeOptionSerializer
- Добавлено поле `description`

### 2.3. PromotionSerializer
- Добавлены поля `max_discount`, `usage_count`, `max_uses`, `free_addon`

### 2.4. MenuItemSerializer
- Добавлено поле `priority`

### 2.5. OrderSerializer
- Добавлены поля `delivery_time`, `notes`

### 2.6. DeliveryZoneSerializer
- Добавлены поля `delivery_fee`, `min_order_amount`

## 3. Обновленные ViewSets

### 3.1. MenuItemViewSet
- Добавлена фильтрация по `category`
- Сортировка по `priority` для хитов и новинок
- Улучшенная фильтрация по `is_hit` и `is_new`

### 3.2. AddOnViewSet
- Добавлена фильтрация по `category` и `available_for_category`
- Сортировка по `price` и `name`

### 3.3. PromotionViewSet
- Добавлена фильтрация по `is_active` и `discount_type`
- Сортировка по `valid_from`, `valid_to`, `usage_count`

## 4. Обновленная админка

### 4.1. MenuItemAdmin
- Добавлено поле `priority` в list_display и list_editable
- Добавлен фильтр по `priority`

### 4.2. AddOnAdmin
- Добавлен `filter_horizontal` для `available_for_categories`

### 4.3. SizeOptionAdmin
- Добавлено поле `description` в list_display и search_fields

### 4.4. PromotionAdmin
- Добавлены поля `max_discount`, `usage_count`, `max_uses` в list_display
- Добавлено `readonly_fields` для `usage_count`

### 4.5. OrderAdmin
- Добавлены поля `delivery_fee`, `delivery_time` в list_display
- Добавлены поля `notes` в search_fields
- Обновлены fieldsets для новых полей

### 4.6. DeliveryZoneAdmin (новый)
- Полная админка для управления зонами доставки
- Редактируемые поля: `delivery_fee`, `min_order_amount`, `is_active`

## 5. Новые методы в моделях

### 5.1. Promotion.is_valid()
- Проверка лимита использований
- Проверка активности бесплатных товаров/дополнений

### 5.2. Promotion.calculate_discount()
- Ограничение максимальной скидки
- Автоматическое увеличение счетчика использований

### 5.3. Order.apply_promotion()
- Проверка зоны доставки
- Автоматическое применение лучшей акции
- Установка стоимости доставки из зоны

### 5.4. Order.get_best_available_promotion()
- Выбор лучшей акции по максимальной скидке

### 5.5. OrderItem.clean()
- Валидация доступности дополнений по категориям

## 6. Индексы базы данных

### 6.1. MenuItem
- Индекс по `priority`
- Составные индексы для хитов и новинок

### 6.2. Promotion
- Индексы по `usage_count`, `max_uses`
- Составной индекс по активности и датам

### 6.3. Order
- Индексы по `delivery_time`
- Составные индексы для статусов

## 7. Тестирование

### 7.1. Обновленный тест (test_promotions.py)
- Тестирование зон доставки с delivery_fee
- Проверка акций с max_discount и usage_count
- Тестирование фильтрации по priority
- Проверка ограничений дополнений по категориям

### 7.2. Примеры использования

#### Создание зоны доставки:
```python
DeliveryZone.objects.create(
    name="Бухара Центр",
    city="Бухара",
    center_latitude=39.7681,
    center_longitude=64.4556,
    radius_km=5.0,
    delivery_fee=5000,
    min_order_amount=50000,
    is_active=True
)
```

#### Создание акции с ограничениями:
```python
Promotion.objects.create(
    name="Скидка 10%",
    discount_type='PERCENT',
    discount_value=10,
    max_discount=15000,
    max_uses=100,
    valid_from=datetime.now() - timedelta(days=1),
    valid_to=datetime.now() + timedelta(days=1),
    is_active=True
)
```

#### Создание дополнения с ограничениями:
```python
addon = AddOn.objects.create(
    name="Кетчуп",
    price=2000,
    category=pizza_category,
    is_active=True
)
addon.available_for_categories.add(pizza_category)
```

## 8. API Endpoints

### 8.1. Фильтрация меню
```
GET /api/menu-items/?is_hit=true&ordering=priority
GET /api/menu-items/?is_new=true&ordering=priority
GET /api/menu-items/?category=1&ordering=price
```

### 8.2. Фильтрация дополнений
```
GET /api/add-ons/?category=1
GET /api/add-ons/?available_for_category=1
```

### 8.3. Фильтрация акций
```
GET /api/promotions/?is_active=true
GET /api/promotions/?discount_type=PERCENT
```

## 9. Миграции

Для применения изменений необходимо создать и выполнить миграции:

```bash
python manage.py makemigrations
python manage.py migrate
```

## 10. Заключение

Данные доработки значительно улучшают функционал системы:

1. **Точное ограничение зон доставки** с настраиваемой стоимостью
2. **Улучшенные акции** с ограничениями и аналитикой
3. **Оптимизированная фильтрация** хитов и новинок с сортировкой
4. **Расширенная кастомизация** с ограничениями по категориям
5. **Улучшенный выбор размеров** с описаниями
6. **Автоматическое применение лучших акций**
7. **Подробная аналитика использования акций**

Все изменения обратно совместимы и не нарушают существующий функционал. 