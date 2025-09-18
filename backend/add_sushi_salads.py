#!/usr/bin/env python3
"""
Скрипт для добавления суши и салатов в базу данных Django
"""

import os
import sys
import django
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

def create_category(category_name, description):
    """Создает категорию"""
    # Проверяем, существует ли уже категория
    category, created = Category.objects.get_or_create(
        name=category_name,
        defaults={
            'description': description,
        }
    )
    
    if created:
        print(f"✅ Создана новая категория: {category_name}")
    else:
        print(f"ℹ️ Категория уже существует: {category_name}")
    
    return category

def add_menu_item_to_db(category, item_data):
    """Добавляет один товар в базу данных"""
    try:
        # Извлекаем данные из JSON
        item_id = item_data['itemId']
        sku = item_data['sku']
        name = item_data['name']
        description = item_data.get('description', '')
        
        # Получаем цену из первого размера
        if item_data['itemSizes'] and item_data['itemSizes'][0]['prices']:
            price = Decimal(str(item_data['itemSizes'][0]['prices'][0]['price']))
        else:
            price = Decimal('0')
        
        # Получаем изображение
        image_url = None
        if item_data['itemSizes'] and item_data['itemSizes'][0].get('buttonImage'):
            button_image = item_data['itemSizes'][0]['buttonImage']
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
    print("🚀 Начинаем добавление суши и салатов в базу данных...")
    
    # Создаем категорию суши
    sushi_category = create_category("Суши", "Японские роллы и суши")
    
    # Создаем категорию салатов
    salads_category = create_category("Салат ва бошкалар", "Свежие салаты и закуски")
    
    # Список всех суши
    sushi_items = [
        {
            "itemId": "934385bf-18ee-4ee2-b3cc-f8e49d189f4f",
            "sku": "00723",
            "name": "Слфдкий Рол Фруктовый",
            "description": "",
            "itemSizes": [{"prices": [{"price": 50000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "92c00031-395f-4ad4-9f79-f7d55a77e7ea",
            "sku": "00727",
            "name": "Слфдкий Рол Шоколадний",
            "description": "",
            "itemSizes": [{"prices": [{"price": 54000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "483f3a01-2cf9-4372-b04f-1e496f72cab0",
            "sku": "00713",
            "name": "Темпура Дракон",
            "description": "",
            "itemSizes": [{"prices": [{"price": 80000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "b752849d-5c95-424d-93cb-d1929031d52c",
            "sku": "00725",
            "name": "Сладкий Рол Арахис ",
            "description": "",
            "itemSizes": [{"prices": [{"price": 52000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "a456bc79-dd3d-4497-8943-d2c3a86ec6a3",
            "sku": "00719",
            "name": "Сладкий Рол Баунти",
            "description": "",
            "itemSizes": [{"prices": [{"price": 56000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "ef385695-7fc7-4c27-9442-428b58538bc1",
            "sku": "00721",
            "name": "Сладкий Рол Крекр",
            "description": "",
            "itemSizes": [{"prices": [{"price": 46000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "bea9fd69-13e5-4adf-8f21-8bf54d9a8815",
            "sku": "00714",
            "name": "Саке теряки",
            "description": "",
            "itemSizes": [{"prices": [{"price": 62000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "712c64bd-3816-45cc-9d11-1b57a8b96a6c",
            "sku": "00698",
            "name": "Рол Цезар",
            "description": "",
            "itemSizes": [{"prices": [{"price": 26000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "ac616a22-258c-4384-9f5b-3065dc245427",
            "sku": "00699",
            "name": "Рол Фитнес",
            "description": "",
            "itemSizes": [{"prices": [{"price": 28000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "71372d59-0994-4e63-a46d-32f5efd4c39e",
            "sku": "00709",
            "name": "Рол Филоделфия",
            "description": "",
            "itemSizes": [{"prices": [{"price": 64000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "9667b20b-ffa5-4b4a-b658-946caeaecd32",
            "sku": "00710",
            "name": "Рол Филоделфия Экстра",
            "description": "",
            "itemSizes": [{"prices": [{"price": 74000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "54ec5b1e-b39d-4250-9610-5b7cfd545787",
            "sku": "00715",
            "name": "Рол Филоделфия с копченний лососом",
            "description": "",
            "itemSizes": [{"prices": [{"price": 62000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "16f0459a-db07-4af9-aec7-8b5181ffa6b6",
            "sku": "00716",
            "name": "Рол Филоделфия с копченний лососом Экстра",
            "description": "",
            "itemSizes": [{"prices": [{"price": 70000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "21dafa09-6e83-48bf-8035-534bc571f426",
            "sku": "00695",
            "name": "Рол Канада",
            "description": "",
            "itemSizes": [{"prices": [{"price": 34000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "169afc98-9770-4f9b-bfea-126f7bc7159f",
            "sku": "00696",
            "name": "Лосось Калифорниа",
            "description": "",
            "itemSizes": [{"prices": [{"price": 86000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "09cfda7f-25a6-4b0c-935d-4a29674fe80f",
            "sku": "00700",
            "name": "Калифорниа Саке",
            "description": "",
            "itemSizes": [{"prices": [{"price": 66000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "51d4539c-f5ad-4797-a53e-c48f51ccc1e8",
            "sku": "00707",
            "name": "Запеченый  Цезар рол ",
            "description": "",
            "itemSizes": [{"prices": [{"price": 42000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "618f2837-dc46-4c6c-ad25-a7c7aae73459",
            "sku": "00706",
            "name": "Запеченый ролс с курици ",
            "description": "",
            "itemSizes": [{"prices": [{"price": 40000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "95b540b5-c660-431f-8d48-21eb96144f3f",
            "sku": "00703",
            "name": "Запеченый ролс с курици острый",
            "description": "",
            "itemSizes": [{"prices": [{"price": 42000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "330bcc91-6f1a-427a-b473-205a4f4cf3a3",
            "sku": "00702",
            "name": "Запеченый ролс с лососом",
            "description": "",
            "itemSizes": [{"prices": [{"price": 54000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "c41c162f-8ad0-496c-9c3f-f4373daac7f4",
            "sku": "00704",
            "name": "Запеченый ролс с лососом острый",
            "description": "",
            "itemSizes": [{"prices": [{"price": 70000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "003c01aa-0d68-4e78-b30e-8114260f4890",
            "sku": "00705",
            "name": "Запеченый ролс с сыром",
            "description": "",
            "itemSizes": [{"prices": [{"price": 52000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "7534ac67-1f4f-4778-8cab-566dc35d8a51",
            "sku": "00701",
            "name": "Запеченый ролс с угрьем",
            "description": "",
            "itemSizes": [{"prices": [{"price": 56000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "51079c2c-4d1b-48f7-b565-353d6ea468e6",
            "sku": "00712",
            "name": "Горячий Рол с Угрьем",
            "description": "",
            "itemSizes": [{"prices": [{"price": 56000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "ca65df86-a288-4d18-8fb5-2d5e4accb529",
            "sku": "00711",
            "name": "Горячий Рол с Лососом",
            "description": "",
            "itemSizes": [{"prices": [{"price": 60000.0}], "buttonImage": {}}]
        }
    ]
    
    # Список всех салатов
    salads_items = [
        {
            "itemId": "4bd207a6-750a-45bc-bb32-03d59b7565f7",
            "sku": "00205",
            "name": "Язык Салат",
            "description": "",
            "itemSizes": [{"prices": [{"price": 37000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/9623c425-cc3c-402b-adc8-09bfdeedd5b1-254x196x100.webp"}}]
        },
        {
            "itemId": "d0a9accd-a216-4d06-8799-d03c67c86257",
            "sku": "00201",
            "name": "Салат Цезар",
            "description": "",
            "itemSizes": [{"prices": [{"price": 37000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/42cc783a-a9fb-43f9-b1e0-e58b421ee2c9-254x196x100.webp"}}]
        }
    ]
    
    # Добавляем суши
    added_sushi_count = 0
    print(f"\n🍣 Добавляем суши в категорию '{sushi_category.name}'...")
    for item in sushi_items:
        menu_item = add_menu_item_to_db(sushi_category, item)
        if menu_item:
            added_sushi_count += 1
    
    # Добавляем салаты
    added_salads_count = 0
    print(f"\n🥗 Добавляем салаты в категорию '{salads_category.name}'...")
    for item in salads_items:
        menu_item = add_menu_item_to_db(salads_category, item)
        if menu_item:
            added_salads_count += 1
    
    print(f"\n🎉 Готово!")
    print(f"✅ Добавлено {added_sushi_count} суши в категорию '{sushi_category.name}'")
    print(f"✅ Добавлено {added_salads_count} салатов в категорию '{salads_category.name}'")
    print(f"📊 Всего добавлено: {added_sushi_count + added_salads_count} товаров")

if __name__ == "__main__":
    main()
