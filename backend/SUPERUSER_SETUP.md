# Создание суперпользователя для BabayBurger

## Проблема

При попытке создать суперпользователя командой `python manage.py createsuperuser` возникает ошибка:

```
sqlite3.IntegrityError: UNIQUE constraint failed: app_operator_operator.phone
```

Это происходит потому, что модель `Operator` требует уникальный номер телефона, но стандартная команда Django не запрашивает его.

## Решения

### 1. Использовать кастомную команду (рекомендуется)

```bash
python manage.py createsuperuser --username admin --email admin@babayburger.com --phone +998901234567
```

### 2. Использовать интерактивный скрипт

```bash
python create_superuser_shell.py
```

### 3. Использовать автоматический скрипт

```bash
python create_superuser.py
```

### 4. Создать через Django shell

```bash
python manage.py shell
```

Затем в shell:

```python
from django.contrib.auth import get_user_model
User = get_user_model()

# Создаем суперпользователя
user = User.objects.create_superuser(
    username='admin',
    email='admin@babayburger.com',
    password='admin123456',
    phone=''  # Пустой номер телефона
)
```

## Изменения в модели

Поле `phone` в модели `Operator` теперь:
- `blank=True` - может быть пустым
- `null=True` - может быть NULL в базе данных
- Валидатор пропускает пустые значения

## Миграции

Если вы изменили модель, примените миграции:

```bash
python manage.py makemigrations
python manage.py migrate
```

## Данные для входа

После создания суперпользователя используйте:

- **Имя пользователя**: admin
- **Email**: admin@babayburger.com  
- **Пароль**: admin123456 (или тот, который вы указали)

⚠️ **Важно**: Измените пароль после первого входа в админ-панель! 