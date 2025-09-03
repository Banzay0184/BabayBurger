#!/usr/bin/env python3
"""
Скрипт для настройки Telegram бота с Web App
"""

import os
import requests
import json
from dotenv import load_dotenv

load_dotenv()

def setup_telegram_bot():
    """Настройка Telegram бота с Web App"""
    
    # Получаем токен бота из переменных окружения
    bot_token = os.getenv('BOT_TOKEN')
    if not bot_token:
        print("❌ Ошибка: BOT_TOKEN не найден в переменных окружения")
        print("Добавьте BOT_TOKEN в файл .env")
        return False
    
    print(f"🤖 Настройка бота с токеном: {bot_token[:10]}...")
    
    # URL для Web App (замените на ваш домен)
    web_app_url = "https://b05836c13049.ngrok-free.app"  # Замените на ваш домен
    
    # Команды бота
    commands = [
        {
            "command": "start",
            "description": "Запустить Babay Food приложение"
        },
        {
            "command": "menu", 
            "description": "Показать меню Babay Food"
        },
        {
            "command": "help",
            "description": "Показать справку"
        }
    ]
    
    # Устанавливаем команды бота
    try:
        response = requests.post(
            f"https://api.telegram.org/bot{bot_token}/setMyCommands",
            json={"commands": commands}
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('ok'):
                print("✅ Команды бота успешно установлены")
                for cmd in commands:
                    print(f"   /{cmd['command']} - {cmd['description']}")
            else:
                print(f"❌ Ошибка установки команд: {result.get('description', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при установке команд: {str(e)}")
        return False
    
    # Устанавливаем Web App URL
    try:
        response = requests.post(
            f"https://api.telegram.org/bot{bot_token}/setChatMenuButton",
            json={
                "menu_button": {
                    "type": "web_app",
                    "text": "🍔 Открыть Babay Food",
                    "web_app": {
                        "url": web_app_url
                    }
                }
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('ok'):
                print("✅ Web App URL успешно установлен")
                print(f"   URL: {web_app_url}")
            else:
                print(f"❌ Ошибка установки Web App URL: {result.get('description', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при установке Web App URL: {str(e)}")
        return False
    
    print("\n🎉 Настройка бота завершена успешно!")
    print(f"📱 Web App URL: {web_app_url}")
    print("🤖 Теперь пользователи могут использовать команду /start для открытия приложения")
    
    return True

def create_test_message():
    """Создает тестовое сообщение с Web App кнопкой"""
    
    # Получаем токен бота из переменных окружения
    bot_token = os.getenv('BOT_TOKEN')
    if not bot_token:
        print("❌ Ошибка: BOT_TOKEN не найден в переменных окружения")
        return False
    
    print(f"🤖 Создание тестового сообщения с токеном: {bot_token[:10]}...")
    
    # URL для локальной разработки
    web_app_url = "https://b05836c13049.ngrok-free.app"
    
    # Тестовое сообщение
    message_text = (
        "🍔 Добро пожаловать в Babay Food!\n\n"
        "Доставка вкусных бургеров в Бухаре и Кагане.\n\n"
        "Нажмите кнопку ниже, чтобы открыть приложение и сделать заказ:"
    )
    
    # Создаем кнопку Web App
    web_app_button = {
        "text": "🍔 Открыть Babay Food",
        "web_app": {"url": web_app_url}
    }
    
    # Создаем клавиатуру с Web App кнопкой
    keyboard = {
        "inline_keyboard": [[web_app_button]]
    }
    
    try:
        # Отправляем тестовое сообщение
        response = requests.post(
            f"https://api.telegram.org/bot{bot_token}/sendMessage",
            json={
                "chat_id": "YOUR_CHAT_ID",  # Замените на ваш chat_id
                "text": message_text,
                "reply_markup": keyboard,
                "parse_mode": "HTML"
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('ok'):
                print("✅ Тестовое сообщение успешно отправлено")
                print(f"   Web App URL: {web_app_url}")
            else:
                print(f"❌ Ошибка отправки сообщения: {result.get('description', 'Unknown error')}")
                return False
        else:
            print(f"❌ HTTP ошибка: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка при отправке тестового сообщения: {str(e)}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 Настройка Telegram бота для Babay Food")
    print("=" * 50)
    
    if setup_telegram_bot():
        create_test_message()
        
        print("\n📝 Следующие шаги:")
        print("1. Создайте бота через @BotFather")
        print("2. Добавьте BOT_TOKEN в .env файл")
        print("3. Запустите фронтенд: npm run dev")
        print("4. Отправьте тестовое сообщение с Web App кнопкой")
        print("5. Откройте приложение через кнопку в Telegram")
    else:
        print("\n❌ Настройка не завершена. Проверьте BOT_TOKEN в .env файле.") 