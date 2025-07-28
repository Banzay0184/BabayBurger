#!/usr/bin/env python3
"""
Скрипт для полного тестирования системы
"""

import os
import sys
import requests
import time
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def test_bot_connection():
    """Тестирует подключение к боту"""
    print("🤖 ТЕСТ ПОДКЛЮЧЕНИЯ К БОТУ")
    print("=" * 50)
    
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

def test_webhook_status():
    """Проверяет статус webhook"""
    print("\n🔗 ПРОВЕРКА WEBHOOK")
    print("=" * 50)
    
    bot_token = os.getenv('BOT_TOKEN')
    if not bot_token:
        print("❌ BOT_TOKEN не настроен")
        return False
    
    try:
        response = requests.get(f"https://api.telegram.org/bot{bot_token}/getWebhookInfo")
        if response.status_code == 200:
            webhook_info = response.json()
            if webhook_info.get('ok'):
                info = webhook_info['result']
                print(f"✅ Webhook URL: {info.get('url', 'Не установлен')}")
                print(f"   Ошибки: {info.get('last_error_message', 'Нет')}")
                print(f"   Обновления: {info.get('pending_update_count', 0)}")
                
                if info.get('url'):
                    return True
                else:
                    print("⚠️  Webhook не установлен")
                    return False
            else:
                print("❌ Ошибка получения webhook info")
                return False
        else:
            print(f"❌ Ошибка запроса: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Ошибка проверки webhook: {e}")
        return False

def test_django_endpoints():
    """Тестирует Django endpoints"""
    print("\n🌐 ТЕСТИРОВАНИЕ DJANGO ENDPOINTS")
    print("=" * 50)
    
    endpoints = [
        ("http://localhost:8000/admin/", "Admin панель", "GET"),
        ("http://localhost:8000/api/menu/", "API меню", "GET"),
        ("http://localhost:8000/api/auth/", "API авторизация", "GET"),
        ("http://localhost:8000/api/categories/", "API категории", "GET"),
        ("http://localhost:8000/api/webhook/", "Webhook endpoint", "POST_WEBHOOK"),
    ]
    
    all_ok = True
    for url, name, method in endpoints:
        try:
            if method == "GET":
                response = requests.get(url, timeout=5)
            elif method == "POST_WEBHOOK":
                # Отправляем корректные данные для webhook
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
                response = requests.post(url, json=webhook_data, timeout=5)
            else:
                response = requests.post(url, json={}, timeout=5)
            
            if response.status_code in [200, 302, 403, 405]:
                print(f"✅ {name}: {response.status_code}")
            else:
                print(f"❌ {name}: {response.status_code}")
                all_ok = False
        except requests.exceptions.RequestException as e:
            print(f"❌ {name}: {e}")
            all_ok = False
    
    return all_ok

def test_ngrok():
    """Проверяет ngrok"""
    print("\n🌍 ПРОВЕРКА NGROK")
    print("=" * 50)
    
    try:
        response = requests.get("http://localhost:4040/api/tunnels", timeout=5)
        if response.status_code == 200:
            tunnels = response.json()['tunnels']
            if tunnels:
                ngrok_url = tunnels[0]['public_url']
                print(f"✅ Ngrok URL: {ngrok_url}")
                print(f"   Webhook: {ngrok_url}/api/webhook/")
                
                # Тестируем webhook через ngrok
                webhook_url = f"{ngrok_url}/api/webhook/"
                try:
                    response = requests.post(webhook_url, json={}, timeout=5)
                    if response.status_code in [200, 400, 401]:
                        print(f"✅ Webhook доступен: {response.status_code}")
                    else:
                        print(f"⚠️  Webhook ответ: {response.status_code}")
                except Exception as e:
                    print(f"⚠️  Webhook недоступен: {e}")
                
                return True
            else:
                print("❌ Ngrok туннели не найдены")
                return False
        else:
            print("❌ Ngrok недоступен")
            return False
    except Exception as e:
        print(f"❌ Ошибка проверки ngrok: {e}")
        return False

def test_database():
    """Проверяет базу данных"""
    print("\n🗄️  ПРОВЕРКА БАЗЫ ДАННЫХ")
    print("=" * 50)
    
    try:
        # Импортируем Django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        import django
        django.setup()
        
        from api.models import User, Category, MenuItem, Order
        
        # Проверяем данные
        users_count = User.objects.count()
        categories_count = Category.objects.count()
        menu_items_count = MenuItem.objects.count()
        orders_count = Order.objects.count()
        
        print(f"✅ Пользователи: {users_count}")
        print(f"✅ Категории: {categories_count}")
        print(f"✅ Блюда: {menu_items_count}")
        print(f"✅ Заказы: {orders_count}")
        
        if categories_count > 0 and menu_items_count > 0:
            return True
        else:
            print("❌ База данных пуста")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка проверки БД: {e}")
        return False

def send_test_message():
    """Отправляет тестовое сообщение"""
    print("\n📤 ОТПРАВКА ТЕСТОВОГО СООБЩЕНИЯ")
    print("=" * 50)
    
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
    print("🧪 ПОЛНОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ")
    print("=" * 50)
    
    results = {}
    
    # Тестируем бота
    results['bot'] = test_bot_connection()
    
    # Тестируем webhook
    results['webhook'] = test_webhook_status()
    
    # Тестируем Django
    results['django'] = test_django_endpoints()
    
    # Тестируем ngrok
    results['ngrok'] = test_ngrok()
    
    # Тестируем базу данных
    results['database'] = test_database()
    
    # Отправляем тестовое сообщение
    results['test_message'] = send_test_message()
    
    # Выводим результаты
    print("\n📊 РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ")
    print("=" * 50)
    
    status_emoji = {True: "✅", False: "❌"}
    
    for test_name, result in results.items():
        print(f"{status_emoji[result]} {test_name.replace('_', ' ').title()}")
    
    all_passed = all(results.values())
    
    if all_passed:
        print("\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
        print("🤖 Система готова к работе с реальным ботом!")
    else:
        print("\n⚠️  НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ")
        print("🔧 Проверьте настройки и попробуйте снова")
    
    print("\n🚀 Следующие шаги:")
    print("   1. Откройте бота в Telegram")
    print("   2. Отправьте команду /start")
    print("   3. Протестируйте функционал")
    
    return all_passed

if __name__ == '__main__':
    main() 