#!/usr/bin/env python3
"""
Скрипт для настройки webhook для Telegram бота
"""

import os
import requests
from dotenv import load_dotenv

load_dotenv()

def setup_webhook():
    """Настройка webhook для Telegram бота"""
    
    # Получаем токен бота из переменных окружения
    bot_token = os.getenv('BOT_TOKEN')
    if not bot_token:
        print("❌ BOT_TOKEN не найден в .env файле")
        return False
    
    # URL для webhook (замените на ваш домен)
    webhook_url = "https://c53683f80930.ngrok-free.app/api/webhook/"  # Замените на ваш домен
    
    print(f"🤖 Настройка webhook для бота с токеном: {bot_token[:10]}...")
    print(f"🌐 Webhook URL: {webhook_url}")
    
    # 1. Получаем информацию о боте
    try:
        response = requests.get(f"https://api.telegram.org/bot{bot_token}/getMe")
        if response.status_code == 200:
            bot_info = response.json()['result']
            print(f"✅ Бот найден: @{bot_info['username']}")
            print(f"📝 Имя бота: {bot_info['first_name']}")
        else:
            print(f"❌ Ошибка получения информации о боте: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Ошибка подключения к Telegram API: {e}")
        return False
    
    # 2. Устанавливаем webhook
    try:
        response = requests.post(
            f"https://api.telegram.org/bot{bot_token}/setWebhook",
            json={
                "url": webhook_url,
                "allowed_updates": ["message", "callback_query"],
                "drop_pending_updates": True
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('ok'):
                print("✅ Webhook успешно установлен")
                # Безопасно получаем информацию о результате
                result_data = result.get('result', {})
                if isinstance(result_data, dict):
                    print(f"📡 URL: {result_data.get('url', 'N/A')}")
                    print(f"🔗 Всего URL: {result_data.get('pending_update_count', 0)}")
                else:
                    print(f"📡 Результат: {result_data}")
            else:
                print(f"❌ Ошибка установки webhook: {result.get('description', 'Unknown error')}")
                return False
        else:
            print(f"❌ Ошибка установки webhook: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка установки webhook: {e}")
        return False
    
    # 3. Проверяем информацию о webhook
    try:
        response = requests.get(f"https://api.telegram.org/bot{bot_token}/getWebhookInfo")
        if response.status_code == 200:
            webhook_info = response.json()['result']
            print("\n📊 Информация о webhook:")
            print(f"• URL: {webhook_info.get('url', 'Не установлен')}")
            print(f"• Ожидающие обновления: {webhook_info.get('pending_update_count', 0)}")
            print(f"• Последняя ошибка: {webhook_info.get('last_error_message', 'Нет')}")
            print(f"• Последняя ошибка: {webhook_info.get('last_error_date', 'Нет')}")
        else:
            print(f"⚠️ Не удалось получить информацию о webhook: {response.text}")
    except Exception as e:
        print(f"⚠️ Ошибка получения информации о webhook: {e}")
    
    return True

def delete_webhook():
    """Удаление webhook"""
    
    bot_token = os.getenv('BOT_TOKEN')
    if not bot_token:
        print("❌ BOT_TOKEN не найден в .env файле")
        return False
    
    try:
        response = requests.post(f"https://api.telegram.org/bot{bot_token}/deleteWebhook")
        if response.status_code == 200:
            result = response.json()
            if result.get('ok'):
                print("✅ Webhook успешно удален")
                return True
            else:
                print(f"❌ Ошибка удаления webhook: {result.get('description', 'Unknown error')}")
                return False
        else:
            print(f"❌ Ошибка удаления webhook: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Ошибка удаления webhook: {e}")
        return False

def test_webhook():
    """Тестирование webhook"""
    
    bot_token = os.getenv('BOT_TOKEN')
    if not bot_token:
        print("❌ BOT_TOKEN не найден в .env файле")
        return False
    
    try:
        response = requests.get(f"https://api.telegram.org/bot{bot_token}/getWebhookInfo")
        if response.status_code == 200:
            webhook_info = response.json()['result']
            url = webhook_info.get('url')
            
            if url and url != "https://your-domain.com/api/webhook/":
                print(f"✅ Webhook настроен: {url}")
                print("🧪 Для тестирования:")
                print("1. Откройте бота в Telegram")
                print("2. Отправьте команду /start")
                print("3. Проверьте, что появилась кнопка Web App")
                return True
            else:
                print("❌ Webhook не настроен или настроен неправильно")
                return False
        else:
            print(f"❌ Ошибка получения информации о webhook: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Ошибка тестирования webhook: {e}")
        return False

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "setup":
            print("🚀 Настройка webhook для Telegram бота")
            print("=" * 50)
            setup_webhook()
            
        elif command == "delete":
            print("🗑️ Удаление webhook")
            print("=" * 50)
            delete_webhook()
            
        elif command == "test":
            print("🧪 Тестирование webhook")
            print("=" * 50)
            test_webhook()
            
        else:
            print("❌ Неизвестная команда. Используйте: setup, delete, test")
    else:
        print("🚀 Настройка webhook для Telegram бота")
        print("=" * 50)
        print("Использование:")
        print("  python setup_webhook.py setup  - Настроить webhook")
        print("  python setup_webhook.py delete - Удалить webhook")
        print("  python setup_webhook.py test   - Тестировать webhook")
        print()
        
        if setup_webhook():
            print("\n📝 Следующие шаги:")
            print("1. Запустите бэкэнд: python manage.py runserver")
            print("2. Запустите фронтенд: npm run dev")
            print("3. Откройте бота в Telegram и отправьте /start")
            print("4. Проверьте, что появилась кнопка Web App")
        else:
            print("\n❌ Настройка не завершена. Проверьте BOT_TOKEN в .env файле.") 