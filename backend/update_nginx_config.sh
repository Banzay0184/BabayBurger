#!/bin/bash

# Скрипт для обновления конфигурации nginx
# Увеличивает лимит размера загружаемых файлов

echo "🔧 Обновление конфигурации nginx..."

# Проверяем, существует ли nginx
if ! command -v nginx &> /dev/null; then
    echo "❌ nginx не установлен. Устанавливаем..."
    sudo apt update
    sudo apt install -y nginx
fi

# Создаем резервную копию текущей конфигурации
if [ -f /etc/nginx/sites-available/default ]; then
    echo "📋 Создаем резервную копию текущей конфигурации..."
    sudo cp /etc/nginx/sites-available/default /etc/nginx/sites-available/default.backup.$(date +%Y%m%d_%H%M%S)
fi

# Копируем новую конфигурацию
echo "📝 Копируем новую конфигурацию..."
sudo cp nginx.conf /etc/nginx/sites-available/babayfood

# Создаем символическую ссылку
echo "🔗 Создаем символическую ссылку..."
sudo ln -sf /etc/nginx/sites-available/babayfood /etc/nginx/sites-enabled/

# Удаляем старую конфигурацию по умолчанию, если она существует
if [ -L /etc/nginx/sites-enabled/default ]; then
    echo "🗑️ Удаляем старую конфигурацию по умолчанию..."
    sudo rm /etc/nginx/sites-enabled/default
fi

# Проверяем конфигурацию nginx
echo "🔍 Проверяем конфигурацию nginx..."
if sudo nginx -t; then
    echo "✅ Конфигурация nginx корректна"
    
    # Перезагружаем nginx
    echo "🔄 Перезагружаем nginx..."
    sudo systemctl reload nginx
    
    echo "✅ nginx успешно обновлен!"
    echo "📊 Новые настройки:"
    echo "   - client_max_body_size: 10M"
    echo "   - client_body_timeout: 60s"
    echo "   - client_header_timeout: 60s"
    echo "   - large_client_header_buffers: 4 16k"
else
    echo "❌ Ошибка в конфигурации nginx!"
    echo "🔄 Восстанавливаем предыдущую конфигурацию..."
    sudo rm /etc/nginx/sites-enabled/babayfood
    sudo ln -sf /etc/nginx/sites-available/default /etc/nginx/sites-enabled/
    exit 1
fi

echo "🎉 Настройка nginx завершена!"
