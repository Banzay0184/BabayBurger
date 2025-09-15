#!/usr/bin/env python3
"""
Универсальный скрипт для добавления всех напитков в базу данных Django
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

def create_category(category_name, description):
    """Создает категорию напитков"""
    category, created = Category.objects.get_or_create(
        name=category_name,
        defaults={'description': description}
    )
    
    if created:
        print(f"✅ Создана новая категория: {category_name}")
    else:
        print(f"ℹ️ Категория уже существует: {category_name}")
    
    return category

def add_drink_to_db(category, drink_data):
    """Добавляет один напиток в базу данных"""
    try:
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
    print("🚀 Начинаем добавление всех напитков в базу данных...")
    
    # Холодные напитки
    print("\n=== ХОЛОДНЫЕ НАПИТКИ ===")
    cold_category = create_category("Яхна ичимликлар", "Различные напитки и соки")
    
    cold_drinks = [
        {"itemId": "8f583021-3ed9-44c6-895f-982e2bd61d01", "sku": "00649", "name": "Chortoq 1 litr", "description": "", "itemSizes": [{"prices": [{"price": 5000.0}]}]},
        {"itemId": "43098002-878b-4366-b656-0722efd8412d", "sku": "00650", "name": "Chortoq 1.5 litr", "description": "", "itemSizes": [{"prices": [{"price": 8000.0}]}]},
        {"itemId": "a0b801d8-75c8-4131-9dae-c33fcdec94cf", "sku": "00577", "name": "Cola cola Бутилка", "description": "", "itemSizes": [{"prices": [{"price": 5000.0}]}]},
        {"itemId": "90bd74fc-a343-4acf-a73f-c7f6db7235b3", "sku": "00630", "name": "Fanta бутилка", "description": "", "itemSizes": [{"prices": [{"price": 5000.0}]}]},
        {"itemId": "f02ac87a-4660-4a5b-91fc-c9c2d24df9ff", "sku": "00565", "name": "Fuse Tea 0.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}]}]},
        {"itemId": "d3745099-7ea2-4633-b4c6-146c60ddb712", "sku": "00566", "name": "Fuse Tea 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 12000.0}]}]},
        {"itemId": "799255ed-417f-4da2-9318-9b99b2c1bffd", "sku": "00628", "name": "Mirinda 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}]}]},
        {"itemId": "61352a3f-7d1e-4f63-b965-0bb5aead0977", "sku": "00647", "name": "Mirinda 1.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}]}]},
        {"itemId": "c2cad746-d4b4-440b-afd7-dec82698d1ac", "sku": "00568", "name": "Rockstar 0.5", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}]}]},
        {"itemId": "9698a817-bc12-4cb1-aace-d43f971503e9", "sku": "00567", "name": "Sprite Бан. 0.25", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}]}]},
        {"itemId": "4ca80c6e-5526-41a1-9416-81f7e9c1f024", "sku": "00634", "name": "Ананас Сок 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 18000.0}]}]},
        {"itemId": "68876bb8-e361-4683-99cc-cc6badbbe4fa", "sku": "00557", "name": "Анор суви", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}]}]},
        {"itemId": "653cb406-f638-4409-a1ed-096f1e44dee7", "sku": "00583", "name": "Апелсин Сок 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 18000.0}]}]},
        {"itemId": "1c6e3846-0857-4744-924d-245dea97b4aa", "sku": "00563", "name": "Bonaque 0.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 5000.0}]}]},
        {"itemId": "5591f76e-d789-465f-95c3-9abf2a3e6afa", "sku": "00564", "name": "Bonaque 1.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}]}]},
        {"itemId": "ff486da9-4ce6-46f0-8774-c10227aa4fcb", "sku": "00430", "name": "Coca cola Бан 0.5", "description": "", "itemSizes": [{"prices": [{"price": 11000.0}]}]},
        {"itemId": "b2f62ef8-7506-48a1-88eb-6d2c3f9bb1cd", "sku": "00017", "name": "Adrenalin", "description": "", "itemSizes": [{"prices": [{"price": 19000.0}]}]},
        {"itemId": "33cdafc6-553a-49a1-a793-30619ff5ae47", "sku": "00009", "name": "Fanta 1.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}]}]},
        {"itemId": "aa645960-62f3-4b1b-ae0c-b330a38eaae3", "sku": "00435", "name": "Lipton 0.5", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}]}]},
        {"itemId": "0bec7f69-f59c-48a2-8bb5-2c47b7405c9b", "sku": "00436", "name": "Lipton 1L", "description": "", "itemSizes": [{"prices": [{"price": 12000.0}]}]},
        {"itemId": "bb9f3763-429e-4bf2-acb4-0a4fca461fe3", "sku": "00011", "name": "Fanta 0.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}]}]},
        {"itemId": "22c4b0d1-8e21-429e-9309-f210a22b5e4e", "sku": "00014", "name": "Sprite 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}]}]},
        {"itemId": "94327605-f2ee-417f-825a-0005e28eaeeb", "sku": "00021", "name": "Pepsi баночний 0.5", "description": "", "itemSizes": [{"prices": [{"price": 11000.0}]}]},
        {"itemId": "5b11a240-c536-4016-a920-b7779135e499", "sku": "00433", "name": "Fanta Бан 0.3", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}]}]},
        {"itemId": "100cfe7f-f836-4ec2-b0d6-a9a82b56ddf4", "sku": "00013", "name": "Sprite 1.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}]}]},
        {"itemId": "ccf53dbe-3d71-4765-8518-b7c1afc2073b", "sku": "00020", "name": "Сокча детский", "description": "", "itemSizes": [{"prices": [{"price": 5000.0}]}]},
        {"itemId": "5f2c84e6-dd32-43fe-8dbf-e6d84f999773", "sku": "00431", "name": "Coca cola Бан 0.25", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}]}]},
        {"itemId": "d7e56ad2-88b5-4b82-9dde-b2bf17447586", "sku": "00432", "name": "Fanta Бан 0.5", "description": "", "itemSizes": [{"prices": [{"price": 11000.0}]}]},
        {"itemId": "5916628b-9a61-4d79-b5c8-492dc46a1217", "sku": "00434", "name": "Moxito 0.5", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}]}]},
        {"itemId": "03e4975b-706b-4769-babb-8a3eee0f9979", "sku": "00004", "name": "Coca cola 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}]}]},
        {"itemId": "ea8289cb-9e89-460a-8e14-ae545bea6b9e", "sku": "00007", "name": "Pepsi 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}]}]},
        {"itemId": "f5734341-b487-4978-a89f-59cbe607a491", "sku": "00015", "name": "Sprite 0.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}]}]},
        {"itemId": "1ae80a57-f206-4bec-a5c5-7bdc16afe5b2", "sku": "00022", "name": "Qarshi газ вода", "description": "", "itemSizes": [{"prices": [{"price": 6000.0}]}]},
        {"itemId": "8f6e3dee-92d2-4169-85a8-cc389e4069c8", "sku": "00005", "name": "Coca cola 0.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}]}]},
        {"itemId": "74d71b09-2744-4172-9de0-1347728adff9", "sku": "00006", "name": "Pepsi 1.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}]}]},
        {"itemId": "aae6966a-36de-4b68-b266-dcfb4a1eafb1", "sku": "00010", "name": "Fanta 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}]}]},
        {"itemId": "bcb8243e-b105-46d4-bd9a-0c66f95fa792", "sku": "00008", "name": "Pepsi 0.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}]}]},
        {"itemId": "42ae3faf-870f-4bb8-bf06-c0dbd1648e3c", "sku": "00012", "name": "Сок 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}]}]},
        {"itemId": "adcebf0f-95d4-471e-af1a-fc6e5fbcdf09", "sku": "00019", "name": "Сув без газ 0,5 литр", "description": "", "itemSizes": [{"prices": [{"price": 3000.0}]}]},
        {"itemId": "fa6fdf70-8fcc-4557-9945-d13e071dd0a3", "sku": "00016", "name": "Flesh", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}]}]},
        {"itemId": "1880dc04-0528-4b83-b1cf-ed055475ac8f", "sku": "00003", "name": "Coca cola 1.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}]}]},
        {"itemId": "5de9b20f-e508-4de0-85cd-b9586f33de1a", "sku": "00437", "name": "Chortoq", "description": "", "itemSizes": [{"prices": [{"price": 14000.0}]}]},
        {"itemId": "b3469db0-4ceb-433a-a692-aefe9894be0d", "sku": "00018", "name": "Сув без газ 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 4000.0}]}]}
    ]
    
    cold_added = 0
    for drink in cold_drinks:
        menu_item = add_drink_to_db(cold_category, drink)
        if menu_item:
            cold_added += 1
    
    # Горячие напитки
    print("\n=== ГОРЯЧИЕ НАПИТКИ ===")
    hot_category = create_category("Иссик ичимликлар", "Горячие напитки: чай, кофе")
    
    hot_drinks = [
        {"itemId": "052a0300-a284-4f5f-b151-55a9c5c98979", "sku": "00367", "name": "Кора Чой", "description": "", "itemSizes": [{"prices": [{"price": 6000.0}]}]},
        {"itemId": "465029b9-c8ea-4d0a-98a1-d737502a9592", "sku": "00368", "name": "Coffee 3/1", "description": "", "itemSizes": [{"prices": [{"price": 5000.0}]}]},
        {"itemId": "8c8cbf25-26d2-4098-ba21-8ae15b12bf31", "sku": "00440", "name": "Кора Коффе бол с собой", "description": "", "itemSizes": [{"prices": [{"price": 10000.0}]}]},
        {"itemId": "66cda4ee-b506-43e6-9df5-dbff95641288", "sku": "00441", "name": "Лимон Чой зел с собой", "description": "", "itemSizes": [{"prices": [{"price": 10000.0}]}]},
        {"itemId": "a87b2319-78bb-465a-8d82-05a73b07cb9e", "sku": "00369", "name": "Кора Коффе", "description": "", "itemSizes": [{"prices": [{"price": 6000.0}]}]},
        {"itemId": "35d17845-9699-4d0c-b99b-cff5a44c4847", "sku": "00366", "name": "Лимон Чой", "description": "", "itemSizes": [{"prices": [{"price": 15000.0}]}]},
        {"itemId": "79f5b290-93df-4bca-83fa-b4e28ba82f40", "sku": "00451", "name": "Кок Чой", "description": "", "itemSizes": [{"prices": [{"price": 6000.0}]}]},
        {"itemId": "6da740dc-0ac7-4418-9c21-3227c5dbe42d", "sku": "00439", "name": "Coffee 3/1 бол с собой", "description": "", "itemSizes": [{"prices": [{"price": 10000.0}]}]},
        {"itemId": "bfd45ccc-303a-4441-8b1d-8d02e011d5c8", "sku": "00438", "name": "Лимон Чой чер с собой", "description": "", "itemSizes": [{"prices": [{"price": 10000.0}]}]}
    ]
    
    hot_added = 0
    for drink in hot_drinks:
        menu_item = add_drink_to_db(hot_category, drink)
        if menu_item:
            hot_added += 1
    
    print(f"\n🎉 Готово!")
    print(f"✅ Холодные напитки: {cold_added} товаров в категории '{cold_category.name}'")
    print(f"✅ Горячие напитки: {hot_added} товаров в категории '{hot_category.name}'")
    print(f"📊 Всего добавлено: {cold_added + hot_added} напитков")

if __name__ == "__main__":
    main()
