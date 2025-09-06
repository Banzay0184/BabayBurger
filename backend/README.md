# BabayBurger Backend API

Backend API для мини-приложения BabayBurger с поддержкой Telegram Bot, WebSocket и системы доставки.

## Структура проекта

```
backend/
├── api/                    # Основное API приложение
├── app_cashier/           # Модуль кассира
├── app_operator/          # Модуль оператора
├── config/                # Конфигурация Django
├── media/                 # Медиа файлы
├── logs/                  # Логи приложения
├── manage.py              # Django management script
└── requirements.txt       # Зависимости Python
```

## Установка и запуск

### 1. Установка зависимостей

```bash
pip install -r requirements.txt
```

### 2. Настройка переменных окружения

Создайте файл `.env` в корне backend директории:

```env
SECRET_KEY=your-secret-key
DEBUG=False
ALLOWED_HOSTS=your-domain.com,localhost
DATABASE_URL=postgresql://user:password@localhost:5432/babayburger
REDIS_URL=redis://localhost:6379/0
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook/
```

### 3. Настройка базы данных

```bash
python manage.py migrate
python manage.py collectstatic --noinput
```

### 4. Создание суперпользователя

```bash
python manage.py createsuperuser
```

### 5. Запуск сервера

```bash
# Для разработки
python manage.py runserver

# Для продакшена с Gunicorn
gunicorn config.wsgi:application --bind 0.0.0.0:8000

# Для ASGI (WebSocket поддержка)
gunicorn config.asgi:application --bind 0.0.0.0:8000
```

## API Endpoints

### Основные эндпоинты

- `GET /api/menu/` - Получить меню
- `POST /api/orders/` - Создать заказ
- `GET /api/orders/{id}/` - Получить заказ
- `POST /api/auth/login/` - Авторизация
- `POST /api/cashier/login/` - Авторизация кассира
- `POST /api/operator/login/` - Авторизация оператора

### WebSocket

- `ws://your-domain.com/ws/operator/` - WebSocket для операторов
- `ws://your-domain.com/ws/cashier/` - WebSocket для кассиров
- `ws://your-domain.com/ws/client/` - WebSocket для клиентов

## Модули

### API (api/)
Основное API приложение с моделями заказов, меню, пользователей и адресов.

### Cashier (app_cashier/)
Модуль для работы кассиров с заказами и статистикой.

### Operator (app_operator/)
Модуль для операторов с управлением заказами и уведомлениями.

## Технологии

- Django 4.2+
- Django REST Framework
- Celery (для фоновых задач)
- Redis (для кеширования и очередей)
- PostgreSQL (рекомендуется для продакшена)
- WebSocket (для real-time уведомлений)
- Telegram Bot API

## Развертывание

### Docker (рекомендуется)

```bash
docker-compose up -d
```

### Системные требования

- Python 3.9+
- PostgreSQL 12+
- Redis 6+
- Nginx (для статических файлов)

## Мониторинг

Логи приложения сохраняются в директории `logs/`:
- `api.log` - API логи
- `django.log` - Django логи
- `errors.log` - Ошибки

## Безопасность

- CSRF защита включена
- CORS настроен для фронтенда
- Валидация всех входящих данных
- Безопасное хранение секретных ключей
