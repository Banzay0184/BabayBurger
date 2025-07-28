#!/usr/bin/env python3
"""
Скрипт для запуска системы с ngrok
"""

import os
import sys
import subprocess
import time
import requests
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()

def check_ngrok():
    """Проверяет, запущен ли ngrok"""
    try:
        response = requests.get("http://localhost:4040/api/tunnels", timeout=5)
        return response.status_code == 200
    except:
        return False

def check_django():
    """Проверяет, запущен ли Django"""
    try:
        response = requests.get("http://localhost:8000/admin/", timeout=5)
        return response.status_code in [200, 302, 403]  # 403 - CSRF, но сервер работает
    except:
        return False

def start_services():
    """Запускает все сервисы"""
    print("🚀 ЗАПУСК СИСТЕМЫ С NGROK")
    print("=" * 50)
    
    # Проверяем наличие .env файла
    env_file = Path('.env')
    if not env_file.exists():
        print("❌ Файл .env не найден")
        print("💡 Создайте .env файл на основе env_example.txt")
        return False
    
    # Проверяем переменные окружения
   
    
    bot_token = os.getenv('BOT_TOKEN')
    if not bot_token:
        print("❌ BOT_TOKEN не найден в .env файле")
        print("💡 Добавьте BOT_TOKEN=your_bot_token в .env")
        return False
    
    print("✅ Переменные окружения загружены")
    
    # Проверяем ngrok
    if not check_ngrok():
        print("❌ Ngrok не запущен")
        print("💡 Запустите ngrok в отдельном терминале:")
        print("   ngrok http 8000")
        return False
    
    print("✅ Ngrok запущен")
    
    # Проверяем Django
    if not check_django():
        print("❌ Django сервер не запущен")
        print("💡 Запустите Django в отдельном терминале:")
        print("   python manage.py runserver")
        return False
    
    print("✅ Django сервер запущен")
    
    # Настраиваем webhook
    print("\n🔧 Настройка webhook...")
    try:
        result = subprocess.run([sys.executable, 'setup_ngrok_webhook.py'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print("✅ Webhook настроен")
        else:
            print("❌ Ошибка настройки webhook")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Ошибка запуска setup_ngrok_webhook.py: {e}")
        return False
    
    # Проверяем Celery
    print("\n🔍 Проверка Celery...")
    try:
        result = subprocess.run(['celery', '-A', 'config', 'inspect', 'ping'], 
                              capture_output=True, text=True, timeout=10)
        if result.returncode == 0:
            print("✅ Celery worker запущен")
        else:
            print("⚠️  Celery worker не запущен")
            print("💡 Запустите Celery в отдельном терминале:")
            print("   celery -A config worker -l info")
    except Exception as e:
        print(f"⚠️  Не удалось проверить Celery: {e}")
    
    # Получаем ngrok URL
    try:
        response = requests.get("http://localhost:4040/api/tunnels")
        if response.status_code == 200:
            tunnels = response.json()['tunnels']
            if tunnels:
                ngrok_url = tunnels[0]['public_url']
                print(f"\n🌐 Ngrok URL: {ngrok_url}")
                print(f"🔗 Webhook: {ngrok_url}/api/webhook/")
                print(f"📊 Мониторинг: http://localhost:4040")
            else:
                print("❌ Ngrok туннели не найдены")
                return False
        else:
            print("❌ Не удалось получить информацию о ngrok туннелях")
            return False
    except Exception as e:
        print(f"❌ Ошибка получения ngrok URL: {e}")
        return False
    
    print("\n🎉 Система готова к работе!")
    print("📋 Доступные URL:")
    print(f"   🌐 Публичный URL: {ngrok_url}")
    print(f"   🔗 Webhook: {ngrok_url}/api/webhook/")
    print(f"   📊 Ngrok мониторинг: http://localhost:4040")
    print(f"   🏠 Локальный сервер: http://localhost:8000")
    print(f"   🔧 Админ панель: http://localhost:8000/admin/")
    
    print("\n🤖 Тестирование бота:")
    print("   1. Откройте бота в Telegram")
    print("   2. Отправьте команду /start")
    print("   3. Проверьте ответ бота")
    
    print("\n📝 Логи:")
    print("   📄 API логи: logs/api.log")
    print("   📄 Django логи: logs/django.log")
    print("   📄 Celery логи: logs/celery.log")
    
    return True

def main():
    """Главная функция"""
    if not start_services():
        print("\n❌ Запуск системы не удался")
        sys.exit(1)
    
    print("\n✅ Система успешно запущена!")
    print("🔄 Для остановки нажмите Ctrl+C")

if __name__ == '__main__':
    main() 