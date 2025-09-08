#!/bin/bash

# Скрипт для деплоя BabayBurger Backend

set -e

MODE="${1:-deploy}"
echo "🚀 BabayBurger Backend: режим=${MODE}"

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

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

# Загружаем переменные окружения из .env (аккуратно)
if [ -f .env ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    case "$line" in
      ''|'#'* ) continue;;
      *'='* )
        key="${line%%=*}"
        val="${line#*=}"
        key="${key%% }"; key="${key## }"
        val="${val%$'\r'}"
        val="${val%\n}"
        val="${val%\r}"
        case "$val" in
          '"'*'"'|"'"*"'" ) val="${val:1:${#val}-2}";;
        esac
        export "$key=$val"
      ;;
    esac
  done < .env
fi

export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-config.settings}

do_start() {
  echo "🌐 Запуск WebSocket (uvicorn) и Celery..."

  # Определяем uvicorn
  local UVICORN_BIN=""
  if [ -n "$VENV_DIR" ] && [ -x "$PROJECT_DIR/$VENV_DIR/bin/uvicorn" ]; then
    UVICORN_BIN="$PROJECT_DIR/$VENV_DIR/bin/uvicorn"
  else
    UVICORN_BIN="$(command -v uvicorn || true)"
  fi

  if [ "${START_WS:-0}" != "1" ]; then
    echo "ℹ️ START_WS!=1 — пропускаю запуск uvicorn (WebSocket)."
  else
    if [ -z "$UVICORN_BIN" ]; then
      echo "⚠️ uvicorn не найден. Установите его: pip install uvicorn"
    else
      local WEBSOCKET_PORT="${WEBSOCKET_PORT:-8001}"
      if command -v lsof >/dev/null 2>&1 && lsof -i TCP:"$WEBSOCKET_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
        echo "⚠️ Порт ${WEBSOCKET_PORT} уже занят. Пропускаю запуск uvicorn."
      else
        echo "➡️  Uvicorn: 0.0.0.0:${WEBSOCKET_PORT}"
        "$UVICORN_BIN" config.asgi:application --host 0.0.0.0 --port "$WEBSOCKET_PORT" --workers 1 --no-access-log &
        echo "✅ WebSocket запущен (PID $!)"
      fi
    fi
  fi

  # Определяем celery
  local CELERY_BIN=""
  if [ -n "$VENV_DIR" ] && [ -x "$PROJECT_DIR/$VENV_DIR/bin/celery" ]; then
    CELERY_BIN="$PROJECT_DIR/$VENV_DIR/bin/celery"
  else
    CELERY_BIN="$(command -v celery || true)"
  fi

  if [ -z "$CELERY_BIN" ]; then
    echo "❌ celery не найден. Установите зависимости: pip install -r requirements.txt"
    exit 1
  fi

  echo "🚀 Запуск Celery worker (очереди: notifications,default)"
  exec "$CELERY_BIN" -A config.celery:app worker -l info -Q notifications,default --hostname telegram@%h
}

do_deploy() {
  echo "🔧 Выполняется деплой..."

# Безопасная загрузка только нужных переменных из .env (жёстко переопределяем)
echo "⚙️ Загружаю переменные из .env (DB_* и SECRET_KEY)"
if [ -f .env ]; then
    # Функция чтения ключа из .env без усечения символов
    _read_env() {
        local key="$1"
        local val
        val="$(grep -E "^${key}=" .env | head -n1 | cut -d'=' -f2- | sed 's/\r$//' | sed 's/^\"//; s/\"$//' | sed "s/^'//; s/'$//")"
        printf '%s' "$val"
    }

    export DB_NAME="$(_read_env DB_NAME)"
    export DB_USER="$(_read_env DB_USER)"
    export DB_PASSWORD="$(_read_env DB_PASSWORD)"
    export DB_HOST="$(_read_env DB_HOST)"
    export DB_PORT="$(_read_env DB_PORT)"
    export SECRET_KEY="$(_read_env SECRET_KEY)"
fi

# Явно формируем DATABASE_URL из DB_* (исключаем рассинхрон)
export DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_HOST}:${DB_PORT}/${DB_NAME}"

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
}

case "$MODE" in
  start)
    do_start
    ;;
  up)
    do_deploy
    echo "🚀 Запускаю сервисы (WebSocket + Celery)"
    do_start
    ;;
  deploy|*)
    do_deploy
    echo ""
    echo "Для запуска фона (WebSocket+Celery):"
    echo "  $0 start"
    echo "Или всё сразу:"
    echo "  $0 up"
    ;;
esac
