# Исправление проблемы с моделью User

## Проблема

При обработке Telegram webhook возникала ошибка:
```
ERROR Error handling start command: Invalid field name(s) for model User: 'last_name'.
```

Это происходило потому, что в модели `User` в `api/models.py` отсутствовало поле `last_name`, но код в `views.py` пытался его использовать.

## Исправления

### 1. Добавлено поле `last_name` в модель User

```python
class User(models.Model):
    telegram_id = models.BigIntegerField(unique=True)
    username = models.CharField(max_length=255, blank=True, null=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255, blank=True, null=True)  # НОВОЕ ПОЛЕ
    created_at = models.DateTimeField(auto_now_add=True)
```

### 2. Создана миграция

Файл: `api/migrations/0004_user_last_name.py`

### 3. Исправлен код в views.py

- Добавлена обработка пустых значений для `last_name` и `username`
- Удалены несуществующие поля `phone_number` и `updated_at` из ответов API
- Улучшен метод `__str__` для модели User

### 4. Обновлен метод `__str__`

```python
def __str__(self):
    full_name = f"{self.first_name}"
    if self.last_name:
        full_name += f" {self.last_name}"
    if self.username:
        full_name += f" (@{self.username})"
    return full_name
```

## Применение исправлений

### Автоматический способ:
```bash
python fix_and_restart.py
```

### Ручной способ:
```bash
# 1. Применить миграции
python manage.py migrate

# 2. Перезапустить сервер
python manage.py runserver
```

## Проверка исправлений

После применения исправлений:

1. ✅ Telegram webhook должен работать без ошибок
2. ✅ Команда `/start` должна создавать пользователей корректно
3. ✅ API должен возвращать правильные данные пользователей

## Дополнительные улучшения

- Добавлена обработка пустых значений для `last_name` и `username`
- Улучшена валидация данных от Telegram
- Исправлены ответы API для соответствия модели данных 