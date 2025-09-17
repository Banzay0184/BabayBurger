#!/bin/bash

# 🚀 Скрипт для деплоя Babay Food Frontend

echo "🚀 Начинаем деплой Babay Food Frontend..."

# Проверяем, что мы в правильной директории
if [ ! -f "package.json" ]; then
    echo "❌ Ошибка: package.json не найден. Запустите скрипт из корня фронтенда."
    exit 1
fi

# Устанавливаем зависимости
echo "📦 Устанавливаем зависимости..."
npm install

# Проверяем переменные окружения
echo "🔧 Проверяем конфигурацию..."

if [ ! -f ".env.production" ]; then
    echo "⚠️  Файл .env.production не найден. Создаем из примера..."
    cat > .env.production << EOF
# Production Environment Variables
VITE_API_URL=https://api.babayfood.uz/
VITE_API_BASE_URL=https://api.babayfood.uz/api/
VITE_WEBSOCKET_URL=api.babayfood.uz
VITE_TELEGRAM_AUTH_URL=https://api.babayfood.uz/api/auth/telegram-widget/

# Production settings
VITE_APP_ENV=production
VITE_APP_NAME=Babay Food
VITE_APP_VERSION=1.0.0
EOF
    echo "✅ Файл .env.production создан"
fi

# Проверяем доступность API
echo "🌐 Проверяем доступность API..."
if curl -s https://api.babayfood.uz/ > /dev/null; then
    echo "✅ API доступен: https://api.babayfood.uz/"
else
    echo "❌ API недоступен: https://api.babayfood.uz/"
    echo "Проверьте, что API сервер запущен и доступен."
    exit 1
fi

# Собираем проект
echo "🔨 Собираем проект для продакшена..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Сборка успешна!"
else
    echo "❌ Ошибка при сборке проекта"
    exit 1
fi

# Проверяем, что dist папка создана
if [ -d "dist" ]; then
    echo "✅ Папка dist создана"
    echo "📊 Размер сборки:"
    du -sh dist/
else
    echo "❌ Папка dist не найдена"
    exit 1
fi

# Создаем архив для деплоя
echo "📦 Создаем архив для деплоя..."
tar -czf babay-food-frontend-$(date +%Y%m%d-%H%M%S).tar.gz dist/

echo "🎉 Деплой готов!"
echo ""
echo "📋 Следующие шаги:"
echo "1. Загрузите содержимое папки 'dist/' на ваш веб-сервер"
echo "2. Настройте веб-сервер для обслуживания SPA"
echo "3. Убедитесь, что CORS настроен на API сервере"
echo "4. Протестируйте приложение"
echo ""
echo "🔗 API: https://api.babayfood.uz/"
echo "📁 Файлы для деплоя: dist/"
echo "📦 Архив: babay-food-frontend-*.tar.gz"
