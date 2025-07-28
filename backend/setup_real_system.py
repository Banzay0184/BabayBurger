#!/usr/bin/env python3
"""
Скрипт для полной настройки системы с реальным ботом
"""

import os
import sys
import subprocess
import time
from pathlib import Path
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def check_prerequisites():
    """Проверяет предварительные требования"""
    print("🔍 ПРОВЕРКА ТРЕБОВАНИЙ")
    print("=" * 50)
    
    # Проверяем .env файл
    env_file = Path('.env')
    if not env_file.exists():
        print("❌ Файл .env не найден")
        print("💡 Создайте .env файл на основе env_example.txt")
        return False
    
    # Проверяем BOT_TOKEN
    bot_token = os.getenv('BOT_TOKEN')
    if not bot_token or bot_token == 'your_bot_token_here':
        print("❌ BOT_TOKEN не настроен")
        print("💡 Добавьте реальный токен бота в .env файл")
        return False
    
    print("✅ Предварительные требования выполнены")
    return True

def setup_database():
    """Настраивает базу данных"""
    print("\n🗄️  НАСТРОЙКА БАЗЫ ДАННЫХ")
    print("=" * 50)
    
    try:
        # Очищаем и создаем данные
        result = subprocess.run([
            sys.executable, 'clear_database.py'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ База данных настроена")
            return True
        else:
            print("❌ Ошибка настройки базы данных")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Ошибка настройки базы данных: {e}")
        return False

def check_services():
    """Проверяет запущенные сервисы"""
    print("\n🔍 ПРОВЕРКА СЕРВИСОВ")
    print("=" * 50)
    
    services_status = {}
    
    # Проверяем Django
    try:
        import requests
        response = requests.get("http://localhost:8000/admin/", timeout=5)
        if response.status_code in [200, 302, 403]:
            print("✅ Django сервер: Работает")
            services_status['django'] = True
        else:
            print("❌ Django сервер: Не отвечает")
            services_status['django'] = False
    except:
        print("❌ Django сервер: Недоступен")
        services_status['django'] = False
    
    # Проверяем ngrok
    try:
        response = requests.get("http://localhost:4040/api/tunnels", timeout=5)
        if response.status_code == 200:
            tunnels = response.json()['tunnels']
            if tunnels:
                ngrok_url = tunnels[0]['public_url']
                print(f"✅ Ngrok: {ngrok_url}")
                services_status['ngrok'] = True
            else:
                print("❌ Ngrok: Туннели не найдены")
                services_status['ngrok'] = False
        else:
            print("❌ Ngrok: Недоступен")
            services_status['ngrok'] = False
    except:
        print("❌ Ngrok: Недоступен")
        services_status['ngrok'] = False
    
    return services_status

def setup_webhook():
    """Настраивает webhook"""
    print("\n🔧 НАСТРОЙКА WEBHOOK")
    print("=" * 50)
    
    try:
        result = subprocess.run([
            sys.executable, 'setup_ngrok_webhook.py'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Webhook настроен")
            return True
        else:
            print("❌ Ошибка настройки webhook")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Ошибка настройки webhook: {e}")
        return False

def test_bot():
    """Тестирует бота"""
    print("\n🧪 ТЕСТИРОВАНИЕ БОТА")
    print("=" * 50)
    
    try:
        result = subprocess.run([
            sys.executable, 'test_real_bot.py'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Тестирование бота завершено")
            return True
        else:
            print("⚠️  Тестирование бота не завершено")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Ошибка тестирования бота: {e}")
        return False

def main():
    """Главная функция"""
    print("🚀 ПОЛНАЯ НАСТРОЙКА СИСТЕМЫ")
    print("=" * 50)
    
    # Проверяем требования
    if not check_prerequisites():
        print("\n❌ Требования не выполнены")
        return False
    
    # Настраиваем базу данных
    if not setup_database():
        print("\n❌ Ошибка настройки базы данных")
        return False
    
    # Проверяем сервисы
    services_status = check_services()
    
    if not services_status.get('django'):
        print("\n⚠️  Django сервер не запущен")
        print("💡 Запустите в отдельном терминале:")
        print("   python manage.py runserver")
    
    if not services_status.get('ngrok'):
        print("\n⚠️  Ngrok не запущен")
        print("💡 Запустите в отдельном терминале:")
        print("   ngrok http 8000")
    
    # Если сервисы запущены, настраиваем webhook
    if services_status.get('django') and services_status.get('ngrok'):
        if not setup_webhook():
            print("\n⚠️  Webhook не настроен")
    
    # Тестируем бота
    test_bot()
    
    print("\n🎉 Настройка завершена!")
    print("📋 Статус системы:")
    print(f"   Django: {'✅' if services_status.get('django') else '❌'}")
    print(f"   Ngrok: {'✅' if services_status.get('ngrok') else '❌'}")
    print("   База данных: ✅")
    print("   Реальные данные: ✅")
    
    print("\n🚀 Следующие шаги:")
    if not services_status.get('django'):
        print("   1. Запустите Django: python manage.py runserver")
    if not services_status.get('ngrok'):
        print("   2. Запустите ngrok: ngrok http 8000")
    print("   3. Протестируйте бота в Telegram")
    print("   4. Отправьте команду /start")
    
    return True

if __name__ == '__main__':
    main() 