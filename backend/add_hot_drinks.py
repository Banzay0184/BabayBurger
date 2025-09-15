#!/usr/bin/env python3
"""
Скрипт для добавления горячих напитков в базу данных Django
"""

import os
import sys
import django
from decimal import Decimal

# Настройка Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Category, MenuItem

def create_hot_drinks_category():
    """Создает категорию горячих напитков"""
    category_name = "Иссик ичимликлар"
    
    # Проверяем, существует ли уже категория
    category, created = Category.objects.get_or_create(
        name=category_name,
        defaults={
            'description': 'Горячие напитки: чай, кофе',
        }
    )
    
    if created:
        print(f"✅ Создана новая категория: {category_name}")
    else:
        print(f"ℹ️ Категория уже существует: {category_name}")
    
    return category

def add_hot_drink_to_db(category, drink_data):
    """Добавляет один горячий напиток в базу данных"""
    try:
        # Извлекаем данные из JSON
        item_id = drink_data['itemId']
        sku = drink_data['sku']
        name = drink_data['name']
        description = drink_data.get('description', '')
        
        # Получаем цену из первого размера
        if drink_data['itemSizes'] and drink_data['itemSizes'][0]['prices']:
            price = Decimal(str(drink_data['itemSizes'][0]['prices'][0]['price']))
        else:
            price = Decimal('0')
        
        # Проверяем, существует ли уже товар
        existing_item = MenuItem.objects.filter(name=name).first()
        if existing_item:
            print(f"⚠️ Товар уже существует: {name}")
            return existing_item
        
        # Создаем новый товар
        menu_item = MenuItem.objects.create(
            name=name,
            description=description,
            price=price,
            category=category,
            is_active=True,
            priority=0
        )
        
        print(f"✅ Добавлен товар: {name} - {price} сум")
        return menu_item
        
    except Exception as e:
        print(f"❌ Ошибка добавления товара {name}: {e}")
        return None

def main():
    """Основная функция"""
    print("🚀 Начинаем добавление горячих напитков в базу данных...")
    
    # Создаем категорию
    category = create_hot_drinks_category()
    
    # Список всех горячих напитков
    hot_drinks = [
        {
            "itemId": "052a0300-a284-4f5f-b151-55a9c5c98979",
            "sku": "00367",
            "name": "Кора Чой",
            "description": "",
            "itemSizes": [{"prices": [{"price": 6000.0}]}]
        },
        {
            "itemId": "465029b9-c8ea-4d0a-98a1-d737502a9592",
            "sku": "00368",
            "name": "Coffee 3/1",
            "description": "",
            "itemSizes": [{"prices": [{"price": 5000.0}]}]
        },
        {
            "itemId": "8c8cbf25-26d2-4098-ba21-8ae15b12bf31",
            "sku": "00440",
            "name": "Кора Коффе бол с собой",
            "description": "",
            "itemSizes": [{"prices": [{"price": 10000.0}]}]
        },
        {
            "itemId": "66cda4ee-b506-43e6-9df5-dbff95641288",
            "sku": "00441",
            "name": "Лимон Чой зел с собой",
            "description": "",
            "itemSizes": [{"prices": [{"price": 10000.0}]}]
        },
        {
            "itemId": "a87b2319-78bb-465a-8d82-05a73b07cb9e",
            "sku": "00369",
            "name": "Кора Коффе",
            "description": "",
            "itemSizes": [{"prices": [{"price": 6000.0}]}]
        },
        {
            "itemId": "35d17845-9699-4d0c-b99b-cff5a44c4847",
            "sku": "00366",
            "name": "Лимон Чой",
            "description": "",
            "itemSizes": [{"prices": [{"price": 15000.0}]}]
        },
        {
            "itemId": "79f5b290-93df-4bca-83fa-b4e28ba82f40",
            "sku": "00451",
            "name": "Кок Чой",
            "description": "",
            "itemSizes": [{"prices": [{"price": 6000.0}]}]
        },
        {
            "itemId": "6da740dc-0ac7-4418-9c21-3227c5dbe42d",
            "sku": "00439",
            "name": "Coffee 3/1 бол с собой",
            "description": "",
            "itemSizes": [{"prices": [{"price": 10000.0}]}]
        },
        {
            "itemId": "bfd45ccc-303a-4441-8b1d-8d02e011d5c8",
            "sku": "00438",
            "name": "Лимон Чой чер с собой",
            "description": "",
            "itemSizes": [{"prices": [{"price": 10000.0}]}]
        }
    ]
    
    # Добавляем горячие напитки
    added_count = 0
    for drink in hot_drinks:
        menu_item = add_hot_drink_to_db(category, drink)
        if menu_item:
            added_count += 1
    
    print(f"\n🎉 Готово! Добавлено {added_count} горячих напитков в категорию '{category.name}'")

if __name__ == "__main__":
    main()
