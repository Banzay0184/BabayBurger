#!/usr/bin/env python3
"""
Скрипт для настройки webhook с ngrok
"""

import os
import sys
import requests
import time
from dotenv import load_dotenv

def setup_ngrok_webhook():
    """Настройка webhook с ngrok"""
    print("🌐 НАСТРОЙКА WEBHOOK С NGROK")
    print("=" * 50)
    
    load_dotenv()
    
    # Получаем ngrok URL
    try:
        response = requests.get("http://localhost:4040/api/tunnels")
        if response.status_code == 200:
            tunnels = response.json()['tunnels']
            if tunnels:
                ngrok_url = tunnels[0]['public_url']
                print(f"✅ Найден ngrok URL: {ngrok_url}")
            else:
                print("❌ Ngrok туннели не найдены")
                return False
        else:
            print("❌ Не удалось получить информацию о ngrok туннелях")
            return False
    except Exception as e:
        print(f"❌ Ошибка подключения к ngrok: {e}")
        print("💡 Убедитесь, что ngrok запущен: ngrok http 8000")
        return False
    
    # Получаем токен бота
    bot_token = os.getenv('BOT_TOKEN')
    if not bot_token:
        print("❌ BOT_TOKEN не найден в переменных окружения")
        print("💡 Добавьте в .env файл:")
        print("   BOT_TOKEN=your_bot_token_here")
        return False
    
    # Формируем webhook URL
    webhook_url = f"{ngrok_url}/api/webhook/"
    print(f"🔗 Webhook URL: {webhook_url}")
    
    # Проверяем подключение к боту
    try:
        response = requests.get(f"https://api.telegram.org/bot{bot_token}/getMe")
        if response.status_code == 200:
            bot_info = response.json()
            print(f"✅ Бот подключен: @{bot_info['result']['username']}")
        else:
            print(f"❌ Ошибка подключения к боту: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Ошибка подключения к Telegram API: {e}")
        return False
    
    # Устанавливаем webhook
    try:
        webhook_data = {
            'url': webhook_url,
            'allowed_updates': ['message'],
            'drop_pending_updates': True
        }
        
        print("🔄 Устанавливаем webhook...")
        response = requests.post(
            f"https://api.telegram.org/bot{bot_token}/setWebhook",
            json=webhook_data
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('ok'):
                print("✅ Webhook установлен успешно!")
                
                # Проверяем webhook info
                info_response = requests.get(f"https://api.telegram.org/bot{bot_token}/getWebhookInfo")
                if info_response.status_code == 200:
                    info = info_response.json()
                    if info.get('ok'):
                        webhook_info = info['result']
                        print(f"📊 Webhook информация:")
                        print(f"   URL: {webhook_info.get('url', 'Не установлен')}")
                        print(f"   Ошибки: {webhook_info.get('last_error_message', 'Нет')}")
                        print(f"   Обновления: {webhook_info.get('pending_update_count', 0)}")
                
                # Обновляем переменную окружения
                os.environ['WEBHOOK_URL'] = webhook_url
                print(f"💾 WEBHOOK_URL обновлен: {webhook_url}")
                
                return True
            else:
                print(f"❌ Ошибка установки webhook: {result.get('description')}")
                return False
        else:
            print(f"❌ Ошибка установки webhook: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка установки webhook: {e}")
        return False

def test_webhook():
    """Тестирование webhook"""
    print("\n🧪 ТЕСТИРОВАНИЕ WEBHOOK")
    print("=" * 50)
    
    bot_token = os.environ.get('BOT_TOKEN')
    if not bot_token:
        print("❌ BOT_TOKEN не найден")
        return False
    
    try:
        # Отправляем тестовое сообщение
        test_data = {
            'update_id': 123456789,
            'message': {
                'message_id': 1,
                'from': {
                    'id': 123456789,
                    'is_bot': False,
                    'first_name': 'Test',
                    'username': 'test_user'
                },
                'chat': {
                    'id': 123456789,
                    'first_name': 'Test',
                    'type': 'private'
                },
                'date': int(time.time()),
                'text': '/start'
            }
        }
        
        # Получаем ngrok URL
        response = requests.get("http://localhost:4040/api/tunnels")
        if response.status_code == 200:
            tunnels = response.json()['tunnels']
            if tunnels:
                ngrok_url = tunnels[0]['public_url']
                webhook_url = f"{ngrok_url}/api/webhook/"
                
                print(f"📤 Отправляем тестовый webhook на {webhook_url}")
                
                # Отправляем тестовый webhook
                webhook_response = requests.post(
                    webhook_url,
                    json=test_data,
                    headers={'Content-Type': 'application/json'}
                )
                
                if webhook_response.status_code == 200:
                    print("✅ Webhook тест прошел успешно!")
                    return True
                else:
                    print(f"❌ Webhook тест не прошел: {webhook_response.status_code}")
                    print(f"Ответ: {webhook_response.text}")
                    return False
            else:
                print("❌ Ngrok туннели не найдены")
                return False
        else:
            print("❌ Не удалось получить информацию о ngrok туннелях")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка тестирования webhook: {e}")
        return False

def main():
    """Главная функция"""
    print("🚀 НАСТРОЙКА NGROK WEBHOOK")
    print("=" * 50)
    
    # Проверяем, что ngrok запущен
    try:
        response = requests.get("http://localhost:4040/api/tunnels", timeout=5)
        if response.status_code != 200:
            print("❌ Ngrok не запущен или недоступен")
            print("💡 Запустите ngrok: ngrok http 8000")
            return False
    except Exception:
        print("❌ Ngrok не запущен или недоступен")
        print("💡 Запустите ngrok: ngrok http 8000")
        return False
    
    # Настройка webhook
    if not setup_ngrok_webhook():
        print("\n❌ Настройка webhook не удалась")
        return False
    
    # Тестирование webhook
    if not test_webhook():
        print("\n❌ Тестирование webhook не удалось")
        return False
    
    print("\n🎉 Настройка завершена успешно!")
    print("📋 Чек-лист:")
    print("   ✅ Ngrok запущен и доступен")
    print("   ✅ Webhook установлен")
    print("   ✅ Тест webhook прошел")
    print("   ✅ Бот готов к работе")
    print("\n🤖 Теперь можете тестировать бота в Telegram!")

if __name__ == '__main__':
    main() 