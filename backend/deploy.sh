#!/bin/bash

# Скрипт для деплоя BabayBurger Backend

set -e

echo "🚀 Начинаем деплой BabayBurger Backend..."

# Проверка наличия .env файла
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден! Скопируйте env.example в .env и настройте переменные."
    echo "cp env.example .env"
    exit 1
fi

# Проверка переменных PostgreSQL
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_HOST" ]; then
    echo "❌ Не настроены переменные PostgreSQL в .env файле!"
    echo "Убедитесь что в .env есть: DB_NAME, DB_USER, DB_PASSWORD, DB_HOST"
    exit 1
fi

# Установка зависимостей
echo "📦 Устанавливаем зависимости..."
pip install -r requirements.txt

# Проверка подключения к PostgreSQL
echo "🔍 Проверяем подключение к PostgreSQL..."
python -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(
        host=os.getenv('DB_HOST'),
        port=os.getenv('DB_PORT', '5432'),
        user=os.getenv('DB_USER'),
        password=os.getenv('DB_PASSWORD'),
        database=os.getenv('DB_NAME')
    )
    conn.close()
    print('✅ Подключение к PostgreSQL успешно!')
except Exception as e:
    print(f'❌ Ошибка подключения к PostgreSQL: {e}')
    exit(1)
"

# Применение миграций
echo "🗄️ Применяем миграции базы данных..."
python manage.py migrate

# Сбор статических файлов
echo "📁 Собираем статические файлы..."
python manage.py collectstatic --noinput

# Создание суперпользователя (если не существует)
echo "👤 Проверяем суперпользователя..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    print('Создайте суперпользователя: python manage.py createsuperuser')
else:
    print('Суперпользователь уже существует')
"

echo "✅ Деплой завершен успешно!"
echo ""
echo "Для запуска сервера используйте:"
echo "  python manage.py runserver  # для разработки"
echo "  gunicorn config.wsgi:application --bind 0.0.0.0:8000  # для продакшена"
echo ""
echo "Для запуска с Docker:"
echo "  docker-compose up -d"
