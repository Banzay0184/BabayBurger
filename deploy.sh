#!/usr/bin/env bash

# Универсальный скрипт деплоя BabayBurger (backend + frontend)
# Запускать на сервере из корня репозитория:
#   ./deploy.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Настройки (при необходимости переопределяйте переменными окружения)
GIT_REMOTE_NAME="${GIT_REMOTE_NAME:-origin}"
GIT_BRANCH_NAME="${GIT_BRANCH_NAME:-master}"

# Пути и команды сервисов (systemd unit имена можно переопределить через env)
SERVICE_GUNICORN="${SERVICE_GUNICORN:-babayburger-gunicorn}"
SERVICE_CELERY="${SERVICE_CELERY:-babayburger-celery}"
SERVICE_CELERY_BEAT="${SERVICE_CELERY_BEAT:-babayburger-celerybeat}"
SERVICE_NGINX="${SERVICE_NGINX:-nginx}"

# Директория публикации фронтенда (root сайта)
FRONTEND_PUBLISH_DIR="${FRONTEND_PUBLISH_DIR:-/var/www/babayburger/frontend}"

echo "🚀 Старт деплоя BabayBurger"
echo "ROOT: $PROJECT_ROOT"

if [ -n "${SUDO_USER:-}" ]; then
  echo "ℹ️ Запущено с sudo (SUDO_USER=$SUDO_USER)"
fi

echo "📥 Обновляю репозиторий..."
git -C "$PROJECT_ROOT" fetch "$GIT_REMOTE_NAME" "$GIT_BRANCH_NAME"
git -C "$PROJECT_ROOT" checkout "$GIT_BRANCH_NAME"
git -C "$PROJECT_ROOT" pull --rebase "$GIT_REMOTE_NAME" "$GIT_BRANCH_NAME"

echo "🧪 Быстрая проверка наличия ключевых директорий"
[ -d "$BACKEND_DIR" ] || { echo "❌ Нет директории backend"; exit 1; }
[ -d "$FRONTEND_DIR" ] || { echo "❌ Нет директории frontend"; exit 1; }

echo "📦 Backend: установка зависимостей и миграции"
cd "$BACKEND_DIR"

if [ -f ".venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  source .venv/bin/activate
elif command -v poetry >/dev/null 2>&1 && [ -f "pyproject.toml" ]; then
  echo "📦 Использую poetry"
  poetry install --no-interaction --no-root
  POETRY_RUN="poetry run"
else
  echo "📦 Устанавливаю pip-зависимости"
  pip install -r requirements.txt
  POETRY_RUN=""
fi

echo "🗄  Применяю миграции"
${POETRY_RUN:-} python manage.py migrate --noinput

echo "🧰 Собираю статику"
${POETRY_RUN:-} python manage.py collectstatic --noinput

echo "📡 Проверка конфигурации ASGI/WSGI"
if grep -q "config.asgi" config/asgi.py 2>/dev/null; then
  echo "✅ ASGI присутствует"
fi
if grep -q "config.wsgi" config/wsgi.py 2>/dev/null; then
  echo "✅ WSGI присутствует"
fi

echo "🌐 Frontend: билд"
cd "$FRONTEND_DIR"
if command -v corepack >/dev/null 2>&1; then corepack enable >/dev/null 2>&1 || true; fi
if [ -f "package-lock.json" ]; then
  npm ci
else
  npm install
fi
npm run build

echo "📤 Публикую фронтенд в: $FRONTEND_PUBLISH_DIR"
sudo mkdir -p "$FRONTEND_PUBLISH_DIR"
sudo rsync -a --delete "$FRONTEND_DIR/dist/" "$FRONTEND_PUBLISH_DIR/"

echo "🔁 Перезапускаю сервисы"
if systemctl is-enabled "$SERVICE_GUNICORN" >/dev/null 2>&1; then
  sudo systemctl restart "$SERVICE_GUNICORN"
  sudo systemctl status --no-pager "$SERVICE_GUNICORN" | sed -n '1,10p'
else
  echo "⚠️  Сервис $SERVICE_GUNICORN не найден или отключён"
fi

if systemctl is-enabled "$SERVICE_CELERY" >/dev/null 2>&1; then
  sudo systemctl restart "$SERVICE_CELERY"
  sudo systemctl status --no-pager "$SERVICE_CELERY" | sed -n '1,10p'
fi

if systemctl is-enabled "$SERVICE_CELERY_BEAT" >/dev/null 2>&1; then
  sudo systemctl restart "$SERVICE_CELERY_BEAT"
  sudo systemctl status --no-pager "$SERVICE_CELERY_BEAT" | sed -n '1,10p'
fi

if systemctl is-enabled "$SERVICE_NGINX" >/dev/null 2>&1; then
  sudo systemctl reload "$SERVICE_NGINX" || sudo systemctl restart "$SERVICE_NGINX"
fi

echo "✅ Деплой завершён успешно"
echo "ℹ️  Переменные можно переопределять, пример:"
echo "    SERVICE_GUNICORN=myapp-gunicorn FRONTEND_PUBLISH_DIR=/var/www/myapp ./deploy.sh"


