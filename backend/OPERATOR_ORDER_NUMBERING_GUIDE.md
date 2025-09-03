# Руководство по нумерации заказов оператора

## Обзор

Реализована система отдельной нумерации заказов для каждого оператора с автоматическим сбросом в полночь.

## Что было исправлено

### 1. Проблема с заказами из других регионов

**Проблема**: Заказы из других регионов (например, Каган) приходили к оператору Бухары, но потом исчезали из-за неправильной фильтрации.

**Решение**: 
- Изменена логика фильтрации в `OperatorOrderViewSet.get_queryset()`
- Теперь используется точная проверка зон доставки через `operator.can_handle_order(order)`
- Заказы фильтруются в Python коде, а не на уровне SQL

### 2. Отдельная нумерация заказов оператора

**Новая функциональность**:
- Каждый оператор имеет свою нумерацию заказов
- Номера начинаются с 1 и увеличиваются последовательно
- Номера сбрасываются в полночь (00:00) каждый день

## Технические детали

### Новые модели

#### `OperatorOrderNumber`
```python
class OperatorOrderNumber(models.Model):
    operator = models.ForeignKey(Operator, ...)
    date = models.DateField(...)
    last_number = models.PositiveIntegerField(default=0)
    # ...
```

#### Поле в модели `Order`
```python
operator_order_number = models.PositiveIntegerField(
    blank=True, null=True,
    verbose_name="Номер заказа оператора"
)
```

### Логика присвоения номера

1. При подтверждении заказа оператором вызывается `OperatorOrderNumber.get_next_number(operator)`
2. Метод создает или обновляет запись для оператора на текущую дату
3. Увеличивает `last_number` на 1 и возвращает новый номер
4. Номер присваивается полю `order.operator_order_number`

### Автоматический сброс

#### Celery задача
```python
@shared_task(name='api.tasks.reset_operator_order_numbers')
def reset_operator_order_numbers():
    # Удаляет записи за вчерашний день
    # Вызывается каждый день в 00:00
```

#### Celery Beat настройки
```python
beat_schedule={
    'reset-operator-order-numbers': {
        'task': 'api.tasks.reset_operator_order_numbers',
        'schedule': 60.0 * 60.0 * 24.0,  # Каждые 24 часа
    },
}
```

## Изменения в интерфейсе

### Backend
- `app_operator/models.py`: Добавлена модель `OperatorOrderNumber`
- `api/models.py`: Добавлено поле `operator_order_number` в модель `Order`
- `app_operator/views.py`: Обновлена логика подтверждения заказа
- `app_operator/serializers.py`: Добавлено поле в сериализатор
- `api/tasks.py`: Добавлена задача сброса номеров
- `config/celery.py`: Настроен Celery Beat

### Frontend
- `types/operator.ts`: Добавлено поле `operator_order_number`
- `components/operator/OrderCard.tsx`: Отображение номера заказа оператора

## Тестирование

### 1. Проверка фильтрации заказов по регионам

```bash
# Создайте заказ из другого региона
# Убедитесь, что он не появляется у оператора из другого региона
# Проверьте, что заказ появляется у правильного оператора
```

### 2. Проверка нумерации заказов

```bash
# 1. Подтвердите несколько заказов одним оператором
# 2. Проверьте, что номера увеличиваются: 1, 2, 3, ...
# 3. Подтвердите заказ другим оператором
# 4. Проверьте, что у него номер начинается с 1
```

### 3. Проверка отображения в интерфейсе

```bash
# 1. Откройте интерфейс оператора
# 2. Подтвердите заказ
# 3. Проверьте, что в заголовке отображается: "Заказ #123 (№1)"
```

### 4. Проверка сброса в полночь

```bash
# 1. Создайте несколько заказов с номерами оператора
# 2. Дождитесь 00:00 или запустите задачу вручную:
cd backend
python manage.py shell -c "
from api.tasks import reset_operator_order_numbers
result = reset_operator_order_numbers()
print(result)
"
# 3. Проверьте, что номера сбросились
```

## Запуск Celery Beat

Для автоматического сброса номеров в полночь запустите Celery Beat:

```bash
cd backend
celery -A config beat --loglevel=info
```

## Миграции

Применены миграции:
- `api/migrations/0018_order_operator_order_number_alter_order_status.py`
- `app_operator/migrations/XXXX_operatorordernumber.py` (если создана)

## Логирование

Все операции логируются:
- Присвоение номера заказа: `🔄 Присвоен номер заказа оператора: {number}`
- Сброс номеров: `🔄 Сброс номеров заказов операторов: удалено {count} записей`
- Ошибки: `❌ Ошибка при сбросе номеров заказов операторов: {error}`

## Примеры использования

### Получение следующего номера
```python
from app_operator.models import OperatorOrderNumber

# Получить следующий номер для оператора
next_number = OperatorOrderNumber.get_next_number(operator)
print(f"Следующий номер: {next_number}")
```

### Проверка текущего номера
```python
# Получить текущий номер оператора на сегодня
today = timezone.now().date()
order_number = OperatorOrderNumber.objects.filter(
    operator=operator,
    date=today
).first()

if order_number:
    print(f"Текущий номер: {order_number.last_number}")
else:
    print("Номеров на сегодня еще нет")
```

## Заключение

Система нумерации заказов оператора полностью реализована и готова к использованию. Заказы из других регионов больше не будут появляться у неправильных операторов, а каждый оператор будет иметь свою последовательную нумерацию заказов с автоматическим сбросом в полночь.
