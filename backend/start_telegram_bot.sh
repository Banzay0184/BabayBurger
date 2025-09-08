#!/bin/bash

set -e

# Определяем директорию проекта (папка backend)
PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "🚀 Запуск Celery worker для Telegram уведомлений..."

# Определяем интерпретатор Python из venv, если есть
VENV_DIR=""
if [ -d "venv" ] && [ -x "venv/bin/python" ]; then
    VENV_DIR="venv"
elif [ -d ".venv" ] && [ -x ".venv/bin/python" ]; then
    VENV_DIR=".venv"
fi

if [ -n "$VENV_DIR" ]; then
    PY_BIN="$PROJECT_DIR/$VENV_DIR/bin/python"
    CELERY_BIN="$PROJECT_DIR/$VENV_DIR/bin/celery"
else
    PY_BIN="$(command -v python3 || command -v python)"
    CELERY_BIN="$(command -v celery)"
fi

if [ -z "$PY_BIN" ] || [ -z "$CELERY_BIN" ]; then
    echo "❌ Не найден python/celery. Убедитесь, что зависимости установлены (pip install -r requirements.txt)."
    exit 1
fi

# Загружаем переменные окружения из .env, если файл существует
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

# Устанавливаем переменную DJANGO_SETTINGS_MODULE, если не задана
export DJANGO_SETTINGS_MODULE=${DJANGO_SETTINGS_MODULE:-config.settings}

# Запускаем WebSocket-сервер (uvicorn) для ASGI/Channels
UVICORN_BIN=""
if [ -n "$VENV_DIR" ] && [ -x "$PROJECT_DIR/$VENV_DIR/bin/uvicorn" ]; then
  UVICORN_BIN="$PROJECT_DIR/$VENV_DIR/bin/uvicorn"
else
  UVICORN_BIN="$(command -v uvicorn || true)"
fi

WEBSOCKET_PORT="${WEBSOCKET_PORT:-8001}"

if [ -n "$UVICORN_BIN" ]; then
  # Проверяем, занят ли порт
  if command -v lsof >/dev/null 2>&1 && lsof -i TCP:"$WEBSOCKET_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "⚠️ Порт $WEBSOCKET_PORT уже занят. Пропускаю запуск uvicorn."
  else
    echo "🌐 Запуск WebSocket (uvicorn) на порту $WEBSOCKET_PORT..."
    "$UVICORN_BIN" config.asgi:application --host 0.0.0.0 --port "$WEBSOCKET_PORT" --workers 1 --no-access-log &
    UVICORN_PID=$!
    echo "➡️  uvicorn PID: $UVICORN_PID"
  fi
else
  echo "⚠️ uvicorn не найден. Установите его (pip install uvicorn) для запуска WebSocket."
fi

# Запускаем Celery worker, используя приложение Django (config.celery)
# Очередь notifications обрабатывает отправку сообщений в Telegram
exec "$CELERY_BIN" -A config.celery:app worker -l info -Q notifications,default --hostname telegram@%h


