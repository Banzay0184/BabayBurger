#!/usr/bin/env python3
"""
Скрипт для тестирования реального бота
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
        # Проверяем подключение к боту
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
        # Получаем информацию о webhook
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

def test_django_server():
    """Проверяет Django сервер"""
    print("\n🌐 ПРОВЕРКА DJANGO СЕРВЕРА")
    print("=" * 50)
    
    endpoints = [
        ("http://localhost:8000/admin/", "Admin панель"),
        ("http://localhost:8000/api/menu/", "API меню"),
        ("http://localhost:8000/api/auth/", "API авторизация"),
    ]
    
    all_ok = True
    for url, name in endpoints:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code in [200, 302, 403]:
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
    print("🧪 ТЕСТИРОВАНИЕ РЕАЛЬНОГО БОТА")
    print("=" * 50)
    
    # Проверяем подключение к боту
    if not test_bot_connection():
        print("\n❌ Проблемы с подключением к боту")
        return False
    
    # Проверяем webhook
    if not test_webhook_status():
        print("\n⚠️  Webhook не настроен")
        print("💡 Запустите: python setup_ngrok_webhook.py")
    
    # Проверяем Django сервер
    if not test_django_server():
        print("\n❌ Django сервер не работает")
        print("💡 Запустите: python manage.py runserver")
        return False
    
    # Проверяем ngrok
    if not test_ngrok():
        print("\n❌ Ngrok не работает")
        print("💡 Запустите: ngrok http 8000")
        return False
    
    # Отправляем тестовое сообщение
    send_test_message()
    
    print("\n🎉 Тестирование завершено!")
    print("📋 Результаты:")
    print("   ✅ Бот подключен")
    print("   ✅ Django сервер работает")
    print("   ✅ Ngrok настроен")
    print("\n🤖 Теперь можете тестировать бота в Telegram!")
    print("   Команды: /start, /menu, /orders, /status, /help")
    
    return True

if __name__ == '__main__':
    main() 