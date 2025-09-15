#!/usr/bin/env python3
"""
Скрипт для добавления всех напитков в базу данных Django
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
    
    # Создаем категорию
    category = create_drinks_category()
    
    # Список всех напитков
    drinks = [
        {"itemId": "8f583021-3ed9-44c6-895f-982e2bd61d01", "sku": "00649", "name": "Chortoq 1 litr", "description": "", "itemSizes": [{"prices": [{"price": 5000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/2979ce0a-bd8b-483d-adfa-00c4a9100524-254x196x100.webp"}}]},
        {"itemId": "43098002-878b-4366-b656-0722efd8412d", "sku": "00650", "name": "Chortoq 1.5 litr", "description": "", "itemSizes": [{"prices": [{"price": 8000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/2979ce0a-bd8b-483d-adfa-00c4a9100524-254x196x100.webp"}}]},
        {"itemId": "a0b801d8-75c8-4131-9dae-c33fcdec94cf", "sku": "00577", "name": "Cola cola Бутилка", "description": "", "itemSizes": [{"prices": [{"price": 5000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/916547b8-cb59-4b10-a123-eba5c93af609-254x196x100.webp"}}]},
        {"itemId": "90bd74fc-a343-4acf-a73f-c7f6db7235b3", "sku": "00630", "name": "Fanta бутилка", "description": "", "itemSizes": [{"prices": [{"price": 5000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/7d4ce19c-c1a8-428c-ad30-566878584894-254x196x100.webp"}}]},
        {"itemId": "f02ac87a-4660-4a5b-91fc-c9c2d24df9ff", "sku": "00565", "name": "Fuse Tea 0.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/6df39a77-2224-4cf1-9582-5765ba92e732-254x196x100.webp"}}]},
        {"itemId": "d3745099-7ea2-4633-b4c6-146c60ddb712", "sku": "00566", "name": "Fuse Tea 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 12000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/6df39a77-2224-4cf1-9582-5765ba92e732-254x196x100.webp"}}]},
        {"itemId": "799255ed-417f-4da2-9318-9b99b2c1bffd", "sku": "00628", "name": "Mirinda 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/93c23a07-5422-4655-9349-f4cc406e3709-254x196x100.webp"}}]},
        {"itemId": "61352a3f-7d1e-4f63-b965-0bb5aead0977", "sku": "00647", "name": "Mirinda 1.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/93c23a07-5422-4655-9349-f4cc406e3709-254x196x100.webp"}}]},
        {"itemId": "c2cad746-d4b4-440b-afd7-dec82698d1ac", "sku": "00568", "name": "Rockstar 0.5", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/1bab6b6a-abc0-4da9-9985-6afa28a4beb8-254x196x100.webp"}}]},
        {"itemId": "9698a817-bc12-4cb1-aace-d43f971503e9", "sku": "00567", "name": "Sprite Бан. 0.25", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/ab177777-6456-4553-92d1-b40bd376548e-254x196x100.webp"}}]},
        {"itemId": "4ca80c6e-5526-41a1-9416-81f7e9c1f024", "sku": "00634", "name": "Ананас Сок 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 18000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/a9f492e2-bc30-474d-8f1e-03e231d65ec3-254x196x100.webp"}}]},
        {"itemId": "68876bb8-e361-4683-99cc-cc6badbbe4fa", "sku": "00557", "name": "Анор суви", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/b558dbc0-0fb5-4847-a962-8b3c67943d5e-254x196x100.webp"}}]},
        {"itemId": "653cb406-f638-4409-a1ed-096f1e44dee7", "sku": "00583", "name": "Апелсин Сок 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 18000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/a9f492e2-bc30-474d-8f1e-03e231d65ec3-254x196x100.webp"}}]},
        {"itemId": "1c6e3846-0857-4744-924d-245dea97b4aa", "sku": "00563", "name": "Bonaque 0.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 5000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/6d3ad209-3a19-4ab8-b156-997ec1cd0a77-254x196x100.webp"}}]},
        {"itemId": "5591f76e-d789-465f-95c3-9abf2a3e6afa", "sku": "00564", "name": "Bonaque 1.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/6d3ad209-3a19-4ab8-b156-997ec1cd0a77-254x196x100.webp"}}]},
        {"itemId": "ff486da9-4ce6-46f0-8774-c10227aa4fcb", "sku": "00430", "name": "Coca cola Бан 0.5", "description": "", "itemSizes": [{"prices": [{"price": 11000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/b6de238f-47ae-43cc-9417-3b8a55683ff5-254x196x100.webp"}}]},
        {"itemId": "b2f62ef8-7506-48a1-88eb-6d2c3f9bb1cd", "sku": "00017", "name": "Adrenalin", "description": "", "itemSizes": [{"prices": [{"price": 19000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/2ef563ca-186d-4b29-b2f8-bc1daf62048f-254x196x100.webp"}}]},
        {"itemId": "33cdafc6-553a-49a1-a793-30619ff5ae47", "sku": "00009", "name": "Fanta 1.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/9066ac8b-691e-4c38-a7b2-76a6166e6435-254x196x100.webp"}}]},
        {"itemId": "aa645960-62f3-4b1b-ae0c-b330a38eaae3", "sku": "00435", "name": "Lipton 0.5", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/74f08215-f4f5-4e96-8d2d-05cad73fef87-254x196x100.webp"}}]},
        {"itemId": "0bec7f69-f59c-48a2-8bb5-2c47b7405c9b", "sku": "00436", "name": "Lipton 1L", "description": "", "itemSizes": [{"prices": [{"price": 12000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/3d748c6e-4338-4720-8d27-d4d886f789a7-254x196x100.webp"}}]},
        {"itemId": "bb9f3763-429e-4bf2-acb4-0a4fca461fe3", "sku": "00011", "name": "Fanta 0.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/9066ac8b-691e-4c38-a7b2-76a6166e6435-254x196x100.webp"}}]},
        {"itemId": "22c4b0d1-8e21-429e-9309-f210a22b5e4e", "sku": "00014", "name": "Sprite 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/d9c3c1fd-0fd1-4dca-b648-178ae3720ca8-254x196x100.webp"}}]},
        {"itemId": "94327605-f2ee-417f-825a-0005e28eaeeb", "sku": "00021", "name": "Pepsi баночний 0.5", "description": "", "itemSizes": [{"prices": [{"price": 11000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/d44f5788-604a-4efe-82e4-dd51c4e0213b-254x196x100.webp"}}]},
        {"itemId": "5b11a240-c536-4016-a920-b7779135e499", "sku": "00433", "name": "Fanta Бан 0.3", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/e6af93ba-92ad-4060-9e66-7f24e3df4e40-254x196x100.webp"}}]},
        {"itemId": "100cfe7f-f836-4ec2-b0d6-a9a82b56ddf4", "sku": "00013", "name": "Sprite 1.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/d19f9a77-7e08-46a5-bc29-ea5a73d2fe90-254x196x100.webp"}}]},
        {"itemId": "ccf53dbe-3d71-4765-8518-b7c1afc2073b", "sku": "00020", "name": "Сокча детский", "description": "", "itemSizes": [{"prices": [{"price": 5000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/70b29ba2-310a-4c01-b7e6-c5f82916898a-254x196x100.webp"}}]},
        {"itemId": "5f2c84e6-dd32-43fe-8dbf-e6d84f999773", "sku": "00431", "name": "Coca cola Бан 0.25", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/b6de238f-47ae-43cc-9417-3b8a55683ff5-254x196x100.webp"}}]},
        {"itemId": "d7e56ad2-88b5-4b82-9dde-b2bf17447586", "sku": "00432", "name": "Fanta Бан 0.5", "description": "", "itemSizes": [{"prices": [{"price": 11000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/e6af93ba-92ad-4060-9e66-7f24e3df4e40-254x196x100.webp"}}]},
        {"itemId": "5916628b-9a61-4d79-b5c8-492dc46a1217", "sku": "00434", "name": "Moxito 0.5", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/87267019-b769-40cb-906a-6dd7a3223dd0-254x196x100.webp"}}]},
        {"itemId": "03e4975b-706b-4769-babb-8a3eee0f9979", "sku": "00004", "name": "Coca cola 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/b63cfe0e-1ed3-46dc-b0c8-e7d00c58bea2-254x196x100.webp"}}]},
        {"itemId": "ea8289cb-9e89-460a-8e14-ae545bea6b9e", "sku": "00007", "name": "Pepsi 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/35774857-7fee-4589-82de-6bacad4b2c56-254x196x100.webp"}}]},
        {"itemId": "f5734341-b487-4978-a89f-59cbe607a491", "sku": "00015", "name": "Sprite 0.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/3f1c0328-89e6-4377-bea4-ad314a8ec5de-254x196x100.webp"}}]},
        {"itemId": "1ae80a57-f206-4bec-a5c5-7bdc16afe5b2", "sku": "00022", "name": "Qarshi газ вода", "description": "", "itemSizes": [{"prices": [{"price": 6000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/d0e188ec-dfe7-4d05-9f5f-4e94ac735825-254x196x100.webp"}}]},
        {"itemId": "8f6e3dee-92d2-4169-85a8-cc389e4069c8", "sku": "00005", "name": "Coca cola 0.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/b63cfe0e-1ed3-46dc-b0c8-e7d00c58bea2-254x196x100.webp"}}]},
        {"itemId": "74d71b09-2744-4172-9de0-1347728adff9", "sku": "00006", "name": "Pepsi 1.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/35774857-7fee-4589-82de-6bacad4b2c56-254x196x100.webp"}}]},
        {"itemId": "aae6966a-36de-4b68-b266-dcfb4a1eafb1", "sku": "00010", "name": "Fanta 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/9066ac8b-691e-4c38-a7b2-76a6166e6435-254x196x100.webp"}}]},
        {"itemId": "bcb8243e-b105-46d4-bd9a-0c66f95fa792", "sku": "00008", "name": "Pepsi 0.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 9000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/43cb95a5-4679-47f7-9350-5af98ab807b6-254x196x100.webp"}}]},
        {"itemId": "42ae3faf-870f-4bb8-bf06-c0dbd1648e3c", "sku": "00012", "name": "Сок 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/a9f492e2-bc30-474d-8f1e-03e231d65ec3-254x196x100.webp"}}]},
        {"itemId": "adcebf0f-95d4-471e-af1a-fc6e5fbcdf09", "sku": "00019", "name": "Сув без газ 0,5 литр", "description": "", "itemSizes": [{"prices": [{"price": 3000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/7962cc45-4bfa-4045-8ee6-d1c14d58809b-254x196x100.webp"}}]},
        {"itemId": "fa6fdf70-8fcc-4557-9945-d13e071dd0a3", "sku": "00016", "name": "Flesh", "description": "", "itemSizes": [{"prices": [{"price": 13000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/2cda2cd0-f7bd-4125-8a4a-ccbb3e0ec30b-254x196x100.webp"}}]},
        {"itemId": "1880dc04-0528-4b83-b1cf-ed055475ac8f", "sku": "00003", "name": "Coca cola 1.5 литр", "description": "", "itemSizes": [{"prices": [{"price": 16000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/763b6552-44c0-484c-821a-845a098ab481-254x196x100.webp"}}]},
        {"itemId": "5de9b20f-e508-4de0-85cd-b9586f33de1a", "sku": "00437", "name": "Chortoq", "description": "", "itemSizes": [{"prices": [{"price": 14000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/151f0a93-c4bc-4467-a2a1-77ccc79633cb-254x196x100.webp"}}]},
        {"itemId": "b3469db0-4ceb-433a-a692-aefe9894be0d", "sku": "00018", "name": "Сув без газ 1 литр", "description": "", "itemSizes": [{"prices": [{"price": 4000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/ad639e1d-2887-4701-b8c5-2ecfa62f2e79-254x196x100.webp"}}]}
    ]
    
    # Добавляем напитки
    added_count = 0
    for drink in drinks:
        menu_item = add_drink_to_db(category, drink)
        if menu_item:
            added_count += 1
    
    print(f"\n🎉 Готово! Добавлено {added_count} напитков в категорию '{category.name}'")

if __name__ == "__main__":
    main()
