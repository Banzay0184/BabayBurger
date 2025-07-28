# StreetBurger Telegram Bot API

Полнофункциональный API для Telegram бота доставки еды с Mini App интеграцией.

## 🚀 Быстрый старт

### 1. Установка зависимостей
```bash
pip install -r requirements.txt
```

### 2. Настройка переменных окружения
Создайте файл `.env` на основе `env_example.txt`:
```bash
cp env_example.txt .env
```

Заполните переменные в `.env`:
```env
BOT_TOKEN=your_telegram_bot_token
WEBHOOK_URL=https://your-domain.com/api/webhook/
TELEGRAM_BOT_USERNAME=your_bot_username
```

### 3. Настройка базы данных
```bash
python manage.py migrate
```

### 4. Настройка бота
```bash
python setup_bot.py
```

### 5. Запуск системы
```bash
# Django сервер
python manage.py runserver

# Celery воркер (в отдельном терминале)
celery -A config worker -l info

# Redis (если не установлен)
redis-server
```

## 📋 API Endpoints

### Авторизация
- `POST /api/auth/` - Авторизация с initData от Mini App

### Меню
- `GET /api/menu/` - Получение меню с кэшированием

### Заказы
- `POST /api/orders/` - Создание заказа
- `GET /api/orders/` - Получение заказов пользователя
- `PATCH /api/orders/{id}/` - Обновление статуса заказа

### Webhook
- `POST /api/webhook/` - Обработка команд Telegram

## 🤖 Telegram Bot Команды

- `/start` - Приветствие и главное меню
- `/menu` - Ссылка на Mini App меню
- `/orders` - История заказов
- `/status` - Статус последнего заказа
- `/help` - Справка по командам

## 🛠️ Технологии

- **Django 4.2** - Web фреймворк
- **Django REST Framework** - API
- **Celery** - Асинхронные задачи
- **Redis** - Кэширование и брокер сообщений
- **SQLite** - База данных (можно заменить на PostgreSQL)

## 📊 Модели данных

### User
- `telegram_id` - ID пользователя в Telegram
- `username` - Имя пользователя
- `first_name` - Имя

### Category
- `name` - Название категории
- `description` - Описание
- `image` - Изображение

### MenuItem
- `name` - Название блюда
- `description` - Описание
- `price` - Цена
- `category` - Категория
- `image` - Изображение

### Order
- `user` - Пользователь
- `total_price` - Общая стоимость
- `status` - Статус заказа
- `address` - Адрес доставки
- `created_at` - Дата создания

### UserAddress
- `user` - Пользователь
- `address` - Адрес
- `phone_number` - Номер телефона

## 🔧 Настройка для продакшена

### 1. Получение токена бота
1. Создайте бота через @BotFather
2. Получите токен
3. Добавьте в `.env`

### 2. Настройка webhook
1. Разверните на сервере с HTTPS
2. Установите webhook URL
3. Протестируйте подключение

### 3. Настройка Celery
```bash
# Продакшен
celery -A config worker -l info --concurrency=4
celery -A config flower  # Мониторинг
```

### 4. Настройка Redis
```bash
# Установка Redis
sudo apt-get install redis-server

# Запуск
redis-server
```

## 📝 Логирование

Логи сохраняются в `logs/`:
- `api.log` - API запросы
- `celery.log` - Celery задачи
- `webhook.log` - Webhook события

## 🔒 Безопасность

- Валидация initData от Telegram
- HMAC подписи для webhook
- Проверка времени авторизации
- Логирование всех операций

## 🚀 Развертывание

### Docker (рекомендуется)
```bash
docker-compose up -d
```

### Ручное развертывание
1. Настройте сервер с HTTPS
2. Установите зависимости
3. Настройте переменные окружения
4. Запустите миграции
5. Настройте webhook
6. Запустите сервисы

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи в `logs/`
2. Убедитесь в правильности настроек
3. Проверьте подключение к Telegram API
4. Проверьте работу webhook

## 📄 Лицензия

MIT License 