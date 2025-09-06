#!/bin/bash

# Быстрый деплой BabayBurger Backend
# Используйте этот скрипт для быстрого развертывания на сервере

set -e

echo "🚀 Быстрый деплой BabayBurger Backend"
echo "======================================"

# Проверка наличия .env
if [ ! -f .env ]; then
    echo "❌ Файл .env не найден!"
    echo "📋 Создайте .env файл на основе env.example:"
    echo "   cp env.example .env"
    echo "   nano .env  # отредактируйте настройки"
    exit 1
fi

# Загрузка переменных окружения
source .env

echo "📦 Устанавливаем зависимости..."
pip install -r requirements.txt

echo "🗄️ Применяем миграции..."
python manage.py migrate

echo "📁 Собираем статические файлы..."
python manage.py collectstatic --noinput

echo "👤 Проверяем суперпользователя..."
python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(is_superuser=True).exists():
    print('⚠️  Суперпользователь не найден!')
    print('Создайте его командой: python manage.py createsuperuser')
else:
    print('✅ Суперпользователь существует')
"

echo ""
echo "✅ Деплой завершен!"
echo ""
echo "🚀 Для запуска используйте:"
echo "   python manage.py runserver 0.0.0.0:8000"
echo ""
echo "🐳 Или с Docker:"
echo "   docker-compose up -d"
echo ""
echo "📊 Проверить статус:"
echo "   docker-compose ps"
echo "   docker-compose logs web"
