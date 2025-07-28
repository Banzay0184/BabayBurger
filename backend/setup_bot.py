#!/usr/bin/env python3
"""
Скрипт для настройки реального Telegram бота
"""

import os
import sys
import django
from django.conf import settings

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def setup_bot():
    """Настройка Telegram бота"""
    print("🤖 НАСТРОЙКА TELEGRAM БОТА")
    print("=" * 50)
    
    # Проверяем переменные окружения
    bot_token = os.environ.get('BOT_TOKEN')
    webhook_url = os.environ.get('WEBHOOK_URL')
    
    if not bot_token:
        print("❌ BOT_TOKEN не найден в переменных окружения")
        print("💡 Добавьте в .env файл:")
        print("   BOT_TOKEN=your_bot_token_here")
        return False
    
    if not webhook_url:
        print("❌ WEBHOOK_URL не найден в переменных окружения")
        print("💡 Добавьте в .env файл:")
        print("   WEBHOOK_URL=https://your-domain.com/api/webhook/")
        return False
    
    print(f"✅ BOT_TOKEN: {bot_token[:10]}...")
    print(f"✅ WEBHOOK_URL: {webhook_url}")
    
    # Проверяем подключение к боту
    import requests
    
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
        
        response = requests.post(
            f"https://api.telegram.org/bot{bot_token}/setWebhook",
            json=webhook_data
        )
        
        if response.status_code == 200:
            result = response.json()
            if result.get('ok'):
                print("✅ Webhook установлен успешно")
            else:
                print(f"❌ Ошибка установки webhook: {result.get('description')}")
                return False
        else:
            print(f"❌ Ошибка установки webhook: {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка установки webhook: {e}")
        return False
    
    print("\n🎉 Бот настроен успешно!")
    print("📝 Следующие шаги:")
    print("   1. Запустите Django сервер: python manage.py runserver")
    print("   2. Запустите Celery: celery -A config worker -l info")
    print("   3. Протестируйте бота: отправьте /start")
    
    return True

def create_sample_data():
    """Создание образцовых данных"""
    print("\n📊 СОЗДАНИЕ ОБРАЗЦОВЫХ ДАННЫХ")
    print("=" * 50)
    
    from api.models import Category, MenuItem
    
    # Создаем категории
    categories_data = [
        {
            'name': 'Бургеры',
            'description': 'Сочные бургеры с мясом и овощами'
        },
        {
            'name': 'Напитки',
            'description': 'Холодные и горячие напитки'
        },
        {
            'name': 'Десерты',
            'description': 'Сладкие десерты и выпечка'
        }
    ]
    
    for cat_data in categories_data:
        category, created = Category.objects.get_or_create(
            name=cat_data['name'],
            defaults=cat_data
        )
        if created:
            print(f"✅ Создана категория: {category.name}")
    
    # Создаем блюда
    menu_items_data = [
        {
            'name': 'Классический бургер',
            'description': 'Бургер с говяжьей котлетой, салатом и соусом',
            'price': 350.00,
            'category_name': 'Бургеры'
        },
        {
            'name': 'Чизбургер',
            'description': 'Бургер с сыром и говяжьей котлетой',
            'price': 400.00,
            'category_name': 'Бургеры'
        },
        {
            'name': 'Биг Мак',
            'description': 'Двойной бургер с двумя котлетами',
            'price': 450.00,
            'category_name': 'Бургеры'
        },
        {
            'name': 'Кола',
            'description': 'Газированный напиток Coca-Cola',
            'price': 150.00,
            'category_name': 'Напитки'
        },
        {
            'name': 'Чай',
            'description': 'Горячий чай с лимоном',
            'price': 100.00,
            'category_name': 'Напитки'
        },
        {
            'name': 'Тирамису',
            'description': 'Итальянский десерт с кофе',
            'price': 250.00,
            'category_name': 'Десерты'
        }
    ]
    
    for item_data in menu_items_data:
        category = Category.objects.get(name=item_data['category_name'])
        menu_item, created = MenuItem.objects.get_or_create(
            name=item_data['name'],
            defaults={
                'description': item_data['description'],
                'price': item_data['price'],
                'category': category
            }
        )
        if created:
            print(f"✅ Создано блюдо: {menu_item.name} - {menu_item.price} ₽")
    
    print("\n✅ Образцовые данные созданы!")

def main():
    """Главная функция"""
    print("🚀 НАСТРОЙКА STREETBURGER BOT")
    print("=" * 50)
    
    # Настройка бота
    if not setup_bot():
        print("\n❌ Настройка бота не удалась")
        sys.exit(1)
    
    # Создание образцовых данных
    create_sample_data()
    
    print("\n🎉 Настройка завершена успешно!")
    print("📋 Чек-лист:")
    print("   ✅ Бот подключен и настроен")
    print("   ✅ Webhook установлен")
    print("   ✅ Образцовые данные созданы")
    print("   ✅ API готов к работе")
    print("\n🚀 Запустите систему:")
    print("   python manage.py runserver")

if __name__ == '__main__':
    main() 