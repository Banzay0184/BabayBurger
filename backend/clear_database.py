#!/usr/bin/env python3
"""
Скрипт для очистки базы данных и создания реальных данных
"""

import os
import sys
import django
from pathlib import Path

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, Category, MenuItem, Order, OrderItem, UserAddress
from django.core.management import execute_from_command_line

def clear_database():
    """Очищает базу данных"""
    print("🧹 ОЧИСТКА БАЗЫ ДАННЫХ")
    print("=" * 50)
    
    try:
        # Удаляем все данные
        OrderItem.objects.all().delete()
        Order.objects.all().delete()
        UserAddress.objects.all().delete()
        MenuItem.objects.all().delete()
        Category.objects.all().delete()
        User.objects.all().delete()
        
        print("✅ Все данные удалены")
        return True
    except Exception as e:
        print(f"❌ Ошибка очистки: {e}")
        return False

def create_real_data():
    """Создает реальные данные для тестирования"""
    print("\n📊 СОЗДАНИЕ РЕАЛЬНЫХ ДАННЫХ")
    print("=" * 50)
    
    try:
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
            },
            {
                'name': 'Закуски',
                'description': 'Легкие закуски и салаты'
            }
        ]
        
        categories = {}
        for cat_data in categories_data:
            category, created = Category.objects.get_or_create(
                name=cat_data['name'],
                defaults=cat_data
            )
            categories[category.name] = category
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
                'name': 'Веганский бургер',
                'description': 'Бургер с растительной котлетой',
                'price': 380.00,
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
                'name': 'Кофе',
                'description': 'Свежесваренный кофе',
                'price': 120.00,
                'category_name': 'Напитки'
            },
            {
                'name': 'Тирамису',
                'description': 'Итальянский десерт с кофе',
                'price': 250.00,
                'category_name': 'Десерты'
            },
            {
                'name': 'Чизкейк',
                'description': 'Классический чизкейк',
                'price': 280.00,
                'category_name': 'Десерты'
            },
            {
                'name': 'Картошка фри',
                'description': 'Хрустящая картошка фри',
                'price': 200.00,
                'category_name': 'Закуски'
            },
            {
                'name': 'Салат Цезарь',
                'description': 'Салат с курицей и соусом Цезарь',
                'price': 300.00,
                'category_name': 'Закуски'
            }
        ]
        
        for item_data in menu_items_data:
            category = categories[item_data['category_name']]
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
        
        print(f"\n✅ Создано {Category.objects.count()} категорий")
        print(f"✅ Создано {MenuItem.objects.count()} блюд")
        
        return True
    except Exception as e:
        print(f"❌ Ошибка создания данных: {e}")
        return False

def check_bot_token():
    """Проверяет настройки бота"""
    print("\n🤖 ПРОВЕРКА НАСТРОЕК БОТА")
    print("=" * 50)
    
    from django.conf import settings
    
    bot_token = settings.BOT_TOKEN
    webhook_url = settings.WEBHOOK_URL
    
    if bot_token and bot_token != 'your_bot_token_here':
        print(f"✅ BOT_TOKEN настроен: {bot_token[:10]}...")
    else:
        print("❌ BOT_TOKEN не настроен")
        print("💡 Добавьте токен бота в .env файл")
        return False
    
    if webhook_url:
        print(f"✅ WEBHOOK_URL: {webhook_url}")
    else:
        print("⚠️  WEBHOOK_URL не настроен")
    
    return True

def main():
    """Главная функция"""
    print("🚀 НАСТРОЙКА РЕАЛЬНОГО БОТА")
    print("=" * 50)
    
    # Проверяем настройки бота
    if not check_bot_token():
        print("\n❌ Настройки бота не готовы")
        return False
    
    # Очищаем базу данных
    if not clear_database():
        print("\n❌ Ошибка очистки базы данных")
        return False
    
    # Создаем реальные данные
    if not create_real_data():
        print("\n❌ Ошибка создания данных")
        return False
    
    print("\n🎉 Настройка завершена успешно!")
    print("📋 Что готово:")
    print("   ✅ База данных очищена")
    print("   ✅ Реальные данные созданы")
    print("   ✅ Настройки бота проверены")
    print("\n🚀 Следующие шаги:")
    print("   1. Запустите Django: python manage.py runserver")
    print("   2. Настройте webhook: python setup_ngrok_webhook.py")
    print("   3. Протестируйте бота в Telegram")
    
    return True

if __name__ == '__main__':
    main() 