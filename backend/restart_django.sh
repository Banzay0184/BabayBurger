#!/bin/bash

echo "🔄 Перезапуск Django сервера..."

# Останавливаем все процессы Django
echo "🛑 Останавливаем Django процессы..."
pkill -f "python manage.py runserver" 2>/dev/null || echo "Процессы Django не найдены"

# Ждем немного
sleep 2

# Запускаем новый сервер
echo "🚀 Запускаем Django сервер..."
python manage.py runserver 0.0.0.0:8000 &

# Ждем запуска
sleep 3

# Проверяем, что сервер работает
echo "🔍 Проверяем сервер..."
curl -s http://localhost:8000/api/test/ > /dev/null
if [ $? -eq 0 ]; then
    echo "✅ Django сервер успешно перезапущен"
else
    echo "❌ Ошибка перезапуска Django сервера"
fi 