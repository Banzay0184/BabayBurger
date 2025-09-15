#!/usr/bin/env python3
"""
Скрипт для добавления напитков в базу данных Django
"""

import os
import sys
import django
import json
import requests
from decimal import Decimal

# Настройка Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Category, MenuItem

def download_image(url, filename):
    """Скачивает изображение по URL"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        # Создаем директорию если не существует
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'wb') as f:
            f.write(response.content)
        return True
    except Exception as e:
        print(f"Ошибка скачивания изображения {url}: {e}")
        return False

def create_drinks_category():
    """Создает категорию напитков"""
    category_name = "Яхна ичимликлар"
    
    # Проверяем, существует ли уже категория
    category, created = Category.objects.get_or_create(
        name=category_name,
        defaults={
            'description': 'Различные напитки и соки',
        }
    )
    
    if created:
        print(f"✅ Создана новая категория: {category_name}")
    else:
        print(f"ℹ️ Категория уже существует: {category_name}")
    
    return category

def add_drink_to_db(category, drink_data):
    """Добавляет один напиток в базу данных"""
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
        
        # Получаем изображение
        image_url = None
        if drink_data['itemSizes'] and drink_data['itemSizes'][0].get('buttonImage'):
            button_image = drink_data['itemSizes'][0]['buttonImage']
            # Используем изображение среднего размера
            image_url = button_image.get('254x196x100.webp') or button_image.get('src')
        
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
        
        # Скачиваем и сохраняем изображение
        if image_url:
            try:
                # Создаем имя файла на основе SKU
                filename = f"backend/media/menu_items/{sku}.webp"
                if download_image(image_url, filename):
                    # Обновляем путь к изображению в базе данных
                    menu_item.image = f"menu_items/{sku}.webp"
                    menu_item.save()
                    print(f"✅ Изображение скачано для {name}")
                else:
                    print(f"⚠️ Не удалось скачать изображение для {name}")
            except Exception as e:
                print(f"⚠️ Ошибка обработки изображения для {name}: {e}")
        
        print(f"✅ Добавлен товар: {name} - {price} сум")
        return menu_item
        
    except Exception as e:
        print(f"❌ Ошибка добавления товара {name}: {e}")
        return None

def main():
    """Основная функция"""
    print("🚀 Начинаем добавление напитков в базу данных...")
    
    # JSON данные напитков
    drinks_data = {
        "id": "ab14e4a4-2b26-431a-839c-82d0c9f40fc2",
        "name": "Яхна ичимликлар",
        "description": "",
        "slug": "iakhna-ichimliklar",
        "items": [
            {
                "itemId": "8f583021-3ed9-44c6-895f-982e2bd61d01",
                "sku": "00649",
                "balance": None,
                "name": "Chortoq 1 litr",
                "description": "",
                "allergens": [],
                "labels": [],
                "taxCategory": None,
                "itemSizes": [
                    {
                        "sku": "00649",
                        "sizeName": "",
                        "isDefault": True,
                        "prices": [
                            {
                                "organizationId": "79e4b266-c483-46ba-9f5c-4f5a44ab4116",
                                "price": 5000.0,
                                "storeId": 137386
                            },
                            {
                                "organizationId": "9c2bdff5-138b-4cf8-8208-e17e80210e8e",
                                "price": 5000.0,
                                "storeId": 137387
                            },
                            {
                                "organizationId": "f722df81-896b-4306-b673-3c8909488122",
                                "price": 5000.0,
                                "storeId": 137388
                            }
                        ],
                        "portionWeightGrams": 1000.0,
                        "sizeId": None,
                        "nutritionPerHundredGrams": {
                            "fats": 0.0,
                            "proteins": 0.0,
                            "carbs": 0.0,
                            "energy": 0.0,
                            "saturatedFattyAcid": None,
                            "salt": None,
                            "sugar": None
                        },
                        "itemModifierGroups": [],
                        "relatedProducts": [],
                        "measureUnitType": "GRAM",
                        "buttonImage": {
                            "src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/e8d406ec05d620e619533f922003d04a.JPEG",
                            "44x44x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/2979ce0a-bd8b-483d-adfa-00c4a9100524-44x44x100.webp",
                            "88x88x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/2979ce0a-bd8b-483d-adfa-00c4a9100524-88x88x100.webp",
                            "254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/2979ce0a-bd8b-483d-adfa-00c4a9100524-254x196x100.webp",
                            "508x392x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/2979ce0a-bd8b-483d-adfa-00c4a9100524-508x392x100.webp",
                            "376x276x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/2979ce0a-bd8b-483d-adfa-00c4a9100524-376x276x100.webp",
                            "752x552x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/2979ce0a-bd8b-483d-adfa-00c4a9100524-752x552x100.webp",
                            "500x250x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/2979ce0a-bd8b-483d-adfa-00c4a9100524-500x250x100.webp"
                        },
                        "isHidden": False
                    }
                ],
                "isCompound": False,
                "slug": "chortoq-1-litr",
                "isHidden": False
            }
            # Добавим остальные напитки в следующей части
        ],
        "buttonImage": {},
        "isHidden": False,
        "schedule": None
    }
    
    # Создаем категорию
    category = create_drinks_category()
    
    # Добавляем напитки
    added_count = 0
    for drink in drinks_data['items']:
        menu_item = add_drink_to_db(category, drink)
        if menu_item:
            added_count += 1
    
    print(f"\n🎉 Готово! Добавлено {added_count} напитков в категорию '{category.name}'")

if __name__ == "__main__":
    main()
