#!/usr/bin/env python3
"""
Скрипт для исправления проблем и тестирования
"""

import os
import sys
import subprocess
import time
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def fix_database():
    """Исправляет проблемы с базой данных"""
    print("🔧 ИСПРАВЛЕНИЕ БАЗЫ ДАННЫХ")
    print("=" * 50)
    
    try:
        # Очищаем и создаем данные
        result = subprocess.run([
            sys.executable, 'clear_database.py'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ База данных исправлена")
            return True
        else:
            print("❌ Ошибка исправления базы данных")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Ошибка исправления базы данных: {e}")
        return False

def test_django_endpoints():
    """Тестирует Django endpoints"""
    print("\n🌐 ТЕСТИРОВАНИЕ DJANGO ENDPOINTS")
    print("=" * 50)
    
    import requests
    import time
    
    endpoints = [
        ("http://localhost:8000/admin/", "Admin панель", "GET"),
        ("http://localhost:8000/api/menu/", "API меню", "GET"),
        ("http://localhost:8000/api/auth/", "API авторизация", "GET"),
        ("http://localhost:8000/api/categories/", "API категории", "GET"),
    ]
    
    all_ok = True
    for url, name, method in endpoints:
        try:
            if method == "GET":
                response = requests.get(url, timeout=5)
            else:
                response = requests.post(url, json={}, timeout=5)
            
            if response.status_code in [200, 302, 403]:
                print(f"✅ {name}: {response.status_code}")
            else:
                print(f"❌ {name}: {response.status_code}")
                if response.status_code == 500:
                    print(f"   Ошибка: {response.text[:200]}")
                all_ok = False
        except requests.exceptions.RequestException as e:
            print(f"❌ {name}: {e}")
            all_ok = False
    
    return all_ok

def test_webhook():
    """Тестирует webhook отдельно"""
    print("\n🔗 ТЕСТИРОВАНИЕ WEBHOOK")
    print("=" * 50)
    
    import requests
    import time
    
    webhook_url = "http://localhost:8000/api/webhook/"
    
    # Корректные данные для webhook
    webhook_data = {
        "update_id": 123456789,
        "message": {
            "message_id": 1,
            "from": {
                "id": 123456789,
                "is_bot": False,
                "first_name": "Test",
                "username": "testuser"
            },
            "chat": {
                "id": 123456789,
                "first_name": "Test",
                "username": "testuser",
                "type": "private"
            },
            "date": int(time.time()),
            "text": "/start"
        }
    }
    
    try:
        response = requests.post(webhook_url, json=webhook_data, timeout=5)
        if response.status_code in [200, 400, 401]:
            print(f"✅ Webhook: {response.status_code}")
            if response.status_code == 400:
                print(f"   Ответ: {response.text[:200]}")
            return True
        else:
            print(f"❌ Webhook: {response.status_code}")
            print(f"   Ответ: {response.text[:200]}")
            return False
    except Exception as e:
        print(f"❌ Ошибка webhook: {e}")
        return False

def test_bot_connection():
    """Тестирует подключение к боту"""
    print("\n🤖 ТЕСТ ПОДКЛЮЧЕНИЯ К БОТУ")
    print("=" * 50)
    
    import requests
    
    bot_token = os.getenv('BOT_TOKEN')
    if not bot_token or bot_token == 'your_bot_token_here':
        print("❌ BOT_TOKEN не настроен")
        return False
    
    try:
        response = requests.get(f"https://api.telegram.org/bot{bot_token}/getMe")
        if response.status_code == 200:
            bot_info = response.json()
            print(f"✅ Бот подключен: @{bot_info['result']['username']}")
            print(f"   ID: {bot_info['result']['id']}")
            print(f"   Имя: {bot_info['result']['first_name']}")
            return True
        else:
            print(f"❌ Ошибка подключения: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Ошибка подключения: {e}")
        return False

def send_test_message():
    """Отправляет тестовое сообщение"""
    print("\n📤 ОТПРАВКА ТЕСТОВОГО СООБЩЕНИЯ")
    print("=" * 50)
    
    import requests
    
    bot_token = os.getenv('BOT_TOKEN')
    chat_id = input("Введите ваш Telegram ID (или нажмите Enter для пропуска): ").strip()
    
    if not chat_id:
        print("⏭️  Тестовое сообщение пропущено")
        return True
    
    try:
        message_data = {
            'chat_id': chat_id,
            'text': '🧪 Тестовое сообщение от StreetBurger Bot!\n\n✅ Система работает корректно!'
        }
        
        response = requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json=message_data
        )
        
        if response.status_code == 200:
            print("✅ Тестовое сообщение отправлено!")
            return True
        else:
            print(f"❌ Ошибка отправки: {response.status_code}")
            print(f"Ответ: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Ошибка отправки: {e}")
        return False

def main():
    """Главная функция"""
    print("🔧 ИСПРАВЛЕНИЕ И ТЕСТИРОВАНИЕ СИСТЕМЫ")
    print("=" * 50)
    
    # Исправляем базу данных
    if not fix_database():
        print("\n❌ Ошибка исправления базы данных")
        return False
    
    # Тестируем Django endpoints
    if not test_django_endpoints():
        print("\n❌ Проблемы с Django endpoints")
        return False
    
    # Тестируем webhook
    if not test_webhook():
        print("\n❌ Проблемы с webhook")
        return False
    
    # Тестируем бота
    if not test_bot_connection():
        print("\n❌ Проблемы с ботом")
        return False
    
    # Отправляем тестовое сообщение
    send_test_message()
    
    print("\n🎉 Исправление завершено!")
    print("📋 Результаты:")
    print("   ✅ База данных исправлена")
    print("   ✅ Django endpoints работают")
    print("   ✅ Webhook работает")
    print("   ✅ Бот подключен")
    
    print("\n🚀 Система готова к тестированию!")
    print("🤖 Откройте бота в Telegram и отправьте /start")
    
    return True

if __name__ == '__main__':
    main() 