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

# Определяем интерпретатор Python и pip (предпочтительно из venv)
VENV_DIR=""
if [ -d "venv" ] && [ -x "venv/bin/python" ]; then
    VENV_DIR="venv"
elif [ -d ".venv" ] && [ -x ".venv/bin/python" ]; then
    VENV_DIR=".venv"
fi

if [ -n "$VENV_DIR" ]; then
    PY_BIN="$PWD/$VENV_DIR/bin/python"
    PIP_BIN="$PWD/$VENV_DIR/bin/pip"
else
    PY_BIN="$(command -v python3 || command -v python)"
    PIP_BIN="$(command -v pip3 || command -v pip)"
fi

if [ -z "$PY_BIN" ] || [ -z "$PIP_BIN" ]; then
    echo "❌ Не найден python/pip. Установите Python 3 и pip или создайте venv"
    exit 1
fi

# Безопасная загрузка только нужных переменных из .env
echo "⚙️ Загружаю переменные из .env (DB_* и SECRET_KEY)"
if [ -f .env ]; then
    while IFS= read -r _line; do
        # Пропускаем комментарии и пустые строки
        case "$_line" in
            \#*|'' ) continue ;;
        esac
        # Разрешённые ключи
        case "$_line" in
            DB_NAME=*|DB_USER=*|DB_PASSWORD=*|DB_HOST=*|DB_PORT=*|SECRET_KEY=* )
                # Удаляем возможные обрамляющие кавычки у значения
                _key="${_line%%=*}"
                _val="${_line#*=}"
                _val="${_val%\r}"
                _val="${_val%\n}"
                _val="${_val%\r\n}"
                _val="${_val%\"}"
                _val="${_val#\"}"
                _val="${_val%\'}"
                _val="${_val#\'}"
                export "${_key}=${_val}"
                ;;
            * ) : ;;
        esac
    done < .env
fi

# Проверка переменных PostgreSQL
if [ -z "$DB_NAME" ] || [ -z "$DB_USER" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_HOST" ]; then
    echo "❌ Не настроены переменные PostgreSQL в .env файле!"
    echo "Убедитесь что в .env есть: DB_NAME, DB_USER, DB_PASSWORD, DB_HOST"
    exit 1
fi

# Установка зависимостей
echo "📦 Устанавливаем зависимости..."
"$PIP_BIN" install -r requirements.txt

# Проверка подключения к PostgreSQL
echo "🔍 Проверяем подключение к PostgreSQL..."
echo "DB_NAME=$DB_NAME"
echo "DB_USER=$DB_USER"
echo "DB_HOST=$DB_HOST"
echo "DB_PORT=$DB_PORT"
"$PY_BIN" -c "
import psycopg2
import os
from dotenv import dotenv_values
env_path = '.env'
vals = {}
try:
    vals = dotenv_values(env_path) if os.path.exists(env_path) else {}
except Exception:
    vals = {}
print('dotenv DB_NAME:', vals.get('DB_NAME'))
print('os.getenv DB_NAME:', os.getenv('DB_NAME'))
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
"$PY_BIN" manage.py migrate

# Сбор статических файлов
echo "📁 Собираем статические файлы..."
"$PY_BIN" manage.py collectstatic --noinput

# Создание суперпользователя (если не существует)
echo "👤 Проверяем суперпользователя..."
"$PY_BIN" manage.py shell -c "
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
