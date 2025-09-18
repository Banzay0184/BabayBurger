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
    print("🚀 Начинаем добавление всех категорий в базу данных...")
    
    # Создаем категорию суши
    sushi_category = create_category("Суши", "Японские роллы и суши")
    
    # Создаем категорию салатов
    salads_category = create_category("Салат ва бошкалар", "Свежие салаты и закуски")
    
    # Создаем категорию музкаймоков
    muzkaimok_category = create_category("Музкаймоклар", "Мороженое и десерты")
    
    # Создаем категорию комбо
    combo_category = create_category("Комбо ва сетлар", "Комбо наборы")
    
    # Создаем категорию фри
    fries_category = create_category("Фри ва бошкалар", "Картошка фри и закуски")
    
    # Создаем категорию донер
    doner_category = create_category("Донер ва кебаблар", "Донер и кебабы")
    
    # Создаем категорию десертов
    dessert_category = create_category("Дессерт", "Десерты и сладости")
    
    # Создаем категорию бургеров
    burgers_category = create_category("Бургерлар", "Бургеры и сэндвичи")
    
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
    
    # Список всех музкаймоков
    muzkaimok_items = [
        {
            "itemId": "e785ff9a-e871-412d-98ee-f48df9b591fc",
            "sku": "00516",
            "name": "Музкаймок Ягодный Микс",
            "description": "",
            "itemSizes": [{"prices": [{"price": 4000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/9fdd38ec-ce20-4d37-9a0c-706460ad7642-254x196x100.webp"}}]
        },
        {
            "itemId": "ddb6bfc0-69c3-4eca-8783-e17139503c58",
            "sku": "00512",
            "name": "Музкаймок Шоколад",
            "description": "",
            "itemSizes": [{"prices": [{"price": 4000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/db9414f0-1f31-4fa8-aa6f-53739c89795a-254x196x100.webp"}}]
        },
        {
            "itemId": "14ad3fbc-bff5-4321-a69b-58ad5a0f44f6",
            "sku": "00515",
            "name": "Музкаймок Банан",
            "description": "",
            "itemSizes": [{"prices": [{"price": 4000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/75af4e45-ba71-4875-ba11-299220b17fcf-254x196x100.webp"}}]
        },
        {
            "itemId": "07a2bc15-46b7-4203-9cb7-1c88f5af54bf",
            "sku": "00514",
            "name": "Музкаймок Клубника",
            "description": "",
            "itemSizes": [{"prices": [{"price": 4000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/9008e9a0-7f22-4b4a-a866-c728b3004f76-254x196x100.webp"}}]
        },
        {
            "itemId": "e0fc8f30-22f0-4dd7-8a5d-4d59895409fd",
            "sku": "00513",
            "name": "Музкаймок Классик",
            "description": "",
            "itemSizes": [{"prices": [{"price": 4000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/d5357b59-1619-4220-96d2-8ccc292f4217-254x196x100.webp"}}]
        },
        {
            "itemId": "bc1e1db4-474c-4623-9a1e-29ea8d7c53e8",
            "sku": "00517",
            "name": "Музкаймок Апелсин",
            "description": "",
            "itemSizes": [{"prices": [{"price": 4000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/44f486d1-5bc3-46f5-94a6-cb1dbb962c96-254x196x100.webp"}}]
        }
    ]
    
    # Список всех комбо
    combo_items = [
        {
            "itemId": "f143bb6e-87b9-4a9f-91a9-538c0894424a",
            "sku": "00328",
            "name": "Комбо Бургер",
            "description": "",
            "itemSizes": [{"prices": [{"price": 42000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/34861dea-c1a6-496f-aed1-3345fa965de6-254x196x100.webp"}}]
        },
        {
            "itemId": "3c79f4e2-7c85-429f-9650-72294c14dcfe",
            "sku": "00329",
            "name": "Комбо Лаваш",
            "description": "",
            "itemSizes": [{"prices": [{"price": 37000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/464d792d-ec95-4c1e-8a51-a0f2516a45b5-254x196x100.webp"}}]
        },
        {
            "itemId": "74baae53-65ec-4d55-a077-650774160b4e",
            "sku": "00327",
            "name": "Комбо Пицца Детский",
            "description": "",
            "itemSizes": [{"prices": [{"price": 37000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/84af0b94-f9c2-4f55-a4be-2facaa9f7d93-254x196x100.webp"}}]
        }
    ]
    
    # Список всех фри и закусок
    fries_items = [
        {
            "itemId": "3e41a846-e3e9-4160-8c9c-713fcfad7f0c",
            "sku": "00384",
            "name": "Картошка Фри",
            "description": "",
            "itemSizes": [{"prices": [{"price": 18000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/6fe0c244-7ae7-4c1b-90bf-55b73ccb7973-254x196x100.webp"}}]
        },
        {
            "itemId": "877f7ebb-412f-45d7-b0da-4f4910616ef4",
            "sku": "00207",
            "name": "Куринный Стрипцы",
            "description": "",
            "itemSizes": [{"prices": [{"price": 24000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/f7b05be4-80ae-4bd3-924b-6710be7ceaad-254x196x100.webp"}}]
        },
        {
            "itemId": "1e729f39-ca42-4ab8-8295-38f1c458fb76",
            "sku": "00388",
            "name": "Крылышки Острые",
            "description": "",
            "itemSizes": [{"prices": [{"price": 26000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/b43e5131-6c8b-4a4a-a702-65d32914012e-254x196x100.webp"}}]
        },
        {
            "itemId": "204300a4-66ce-4511-bf8d-3bd9ef92ff2d",
            "sku": "00387",
            "name": "Крылышки Стандарт",
            "description": "",
            "itemSizes": [{"prices": [{"price": 26000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/b43e5131-6c8b-4a4a-a702-65d32914012e-254x196x100.webp"}}]
        },
        {
            "itemId": "639ac05e-d266-4665-a293-a46699769c18",
            "sku": "00385",
            "name": "Картошка по Деревенский",
            "description": "",
            "itemSizes": [{"prices": [{"price": 18000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/e780ca8c-472d-4478-9bfb-f07af4289c98-254x196x100.webp"}}]
        },
        {
            "itemId": "96932bea-d220-445c-934b-e93b9eeaaee2",
            "sku": "00391",
            "name": "Чучвара Жаренный",
            "description": "",
            "itemSizes": [{"prices": [{"price": 22000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/7b394cf5-ee38-432a-bcf8-01b25a74f52d-254x196x100.webp"}}]
        }
    ]
    
    # Список всех донер и кебабов
    doner_items = [
        {
            "itemId": "bd58c38d-4acd-42c6-8396-d24c3d4d774c",
            "sku": "00283",
            "name": "Араб Кебаб Средный",
            "description": "",
            "itemSizes": [{"prices": [{"price": 37000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/646e31c1-958a-4486-abbd-b9b854790887-254x196x100.webp"}}]
        },
        {
            "itemId": "5b5b6042-2e66-454b-9f0f-144de1ece5dc",
            "sku": "00285",
            "name": "Бабай Кебаб",
            "description": "",
            "itemSizes": [{"prices": [{"price": 38000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/536144da-6d9d-4cd2-88b4-78ce296a52d2-254x196x100.webp"}}]
        },
        {
            "itemId": "a5830e7e-633f-49f1-9684-38212e2fe1e7",
            "sku": "00281",
            "name": "Донер Средный",
            "description": "",
            "itemSizes": [{"prices": [{"price": 35000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/9dae7b09-9239-43db-bd79-12016a6a0332-254x196x100.webp"}}]
        },
        {
            "itemId": "57d6e9f5-dd18-483d-a277-f59cefc11e4c",
            "sku": "00282",
            "name": "Араб Кебаб катта",
            "description": "",
            "itemSizes": [{"prices": [{"price": 42000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/646e31c1-958a-4486-abbd-b9b854790887-254x196x100.webp"}}]
        },
        {
            "itemId": "dc7bccae-7cb0-4193-acbf-919c29776f9b",
            "sku": "00280",
            "name": "Донер катта",
            "description": "",
            "itemSizes": [{"prices": [{"price": 38000.0}], "buttonImage": {"254x196x100.webp": "https://f3de18c8-cd97-436c-ad9e-8e1dc2839628.selstorage.ru/ru/47385/9dae7b09-9239-43db-bd79-12016a6a0332-254x196x100.webp"}}]
        }
    ]
    
    # Добавляем музкаймоки
    added_muzkaimok_count = 0
    print(f"\n🍦 Добавляем музкаймоки в категорию '{muzkaimok_category.name}'...")
    for item in muzkaimok_items:
        menu_item = add_menu_item_to_db(muzkaimok_category, item)
        if menu_item:
            added_muzkaimok_count += 1
    
    # Добавляем комбо
    added_combo_count = 0
    print(f"\n🍔 Добавляем комбо в категорию '{combo_category.name}'...")
    for item in combo_items:
        menu_item = add_menu_item_to_db(combo_category, item)
        if menu_item:
            added_combo_count += 1
    
    # Добавляем фри и закуски
    added_fries_count = 0
    print(f"\n🍟 Добавляем фри и закуски в категорию '{fries_category.name}'...")
    for item in fries_items:
        menu_item = add_menu_item_to_db(fries_category, item)
        if menu_item:
            added_fries_count += 1
    
    # Добавляем донер и кебабы
    added_doner_count = 0
    print(f"\n🥙 Добавляем донер и кебабы в категорию '{doner_category.name}'...")
    for item in doner_items:
        menu_item = add_menu_item_to_db(doner_category, item)
        if menu_item:
            added_doner_count += 1
    
    # Список всех десертов
    dessert_items = [
        {
            "itemId": "9dc13e84-6ad6-4ee3-93a4-f08e2d242b42",
            "sku": "00735",
            "name": "Рулет Медовый",
            "description": "",
            "itemSizes": [{"prices": [{"price": 20000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "51f5fac5-2de2-4276-9297-0741b81fb456",
            "sku": "00733",
            "name": "Рулет сказка",
            "description": "",
            "itemSizes": [{"prices": [{"price": 20000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "2568f26f-218d-47f1-bf8c-aef6d2ba066c",
            "sku": "00734",
            "name": "Рулет фруктовый",
            "description": "",
            "itemSizes": [{"prices": [{"price": 13000.0}], "buttonImage": {}}]
        },
        {
            "itemId": "959144f2-4d29-48d6-b72c-46670aed5e7b",
            "sku": "00656",
            "name": "Дубайский трюфель",
            "description": "",
            "itemSizes": [{"prices": [{"price": 35000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/ed4fd3464fe33c33f553043948c91f7e.JPEG"}}]
        },
        {
            "itemId": "d22f623f-9b0c-43fc-af78-e14d78b0dad3",
            "sku": "00610",
            "name": "Вафли Фруктовый",
            "description": "",
            "itemSizes": [{"prices": [{"price": 50000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/ec0704fbd87cd3b2eb09d38c4d9efe9c.JPEG"}}]
        },
        {
            "itemId": "e7d61ca3-9b58-4ee7-8dc2-38e29cb4407c",
            "sku": "00575",
            "name": "Milka Шоколод",
            "description": "",
            "itemSizes": [{"prices": [{"price": 20000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/df654b70f1091b981061a9011f675e5c.PNG"}}]
        },
        {
            "itemId": "1297f0b9-f3cd-4d69-ac3f-d2641daf5a00",
            "sku": "00661",
            "name": "Пирамида пирожное",
            "description": "",
            "itemSizes": [{"prices": [{"price": 20000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/c2ebcae75bb817ab35886831001bcf5e.JPEG"}}]
        },
        {
            "itemId": "ee97d97e-3620-4263-b6cf-51d07a9e5e23",
            "sku": "00660",
            "name": "Прага пирожное",
            "description": "",
            "itemSizes": [{"prices": [{"price": 20000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/60304a1143d374f84a671ae9fcfa4f55.JPEG"}}]
        },
        {
            "itemId": "c9060a6a-baef-427c-9486-39d2fd0b8ea3",
            "sku": "00655",
            "name": "Медовый пирожное",
            "description": "",
            "itemSizes": [{"prices": [{"price": 20000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/bed4844a22268aa4ef29f3b63d55c7bc.JPEG"}}]
        },
        {
            "itemId": "58e12ac3-de64-489e-a0ad-b49135031178",
            "sku": "00651",
            "name": "Пирожное 18000",
            "description": "",
            "itemSizes": [{"prices": [{"price": 18000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/99f2d82a4a722c37c5794ad97b52381c.JPEG"}}]
        },
        {
            "itemId": "cc986986-6660-43fa-bd91-b6c351f288a6",
            "sku": "00652",
            "name": "Трайфл Babay",
            "description": "",
            "itemSizes": [{"prices": [{"price": 40000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/9ac3146cae0994cfe862213601836dec.JPEG"}}]
        },
        {
            "itemId": "225382cb-9c8c-4f00-9e59-a8f6c6e7f15e",
            "sku": "00429",
            "name": "Alpen Gold",
            "description": "",
            "itemSizes": [{"prices": [{"price": 15000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/72d4d2feca5a56e8da13969e8a3ac60d.PNG"}}]
        },
        {
            "itemId": "a585aa78-29ca-4b80-bab8-c2e929ee550b",
            "sku": "00370",
            "name": "Классик Вафли",
            "description": "",
            "itemSizes": [{"prices": [{"price": 25000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/f6722be673105d316dac9d38cf4322ef.JPEG"}}]
        }
    ]
    
    # Список всех бургеров
    burgers_items = [
        {
            "itemId": "3859151b-20bc-45da-80b7-5284a3199f3f",
            "sku": "00227",
            "name": "Чиз Бургер New",
            "description": "",
            "itemSizes": [{"prices": [{"price": 32000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/6b02c20334da4e25bd81c191f276d194.JPEG"}}]
        },
        {
            "itemId": "da4a7cd4-adf4-4132-b449-792920102ab1",
            "sku": "00248",
            "name": "Бургер сырный",
            "description": "",
            "itemSizes": [{"prices": [{"price": 58000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/fa6ce021646a24eb2f6f435ac306b1ee.JPEG"}}]
        },
        {
            "itemId": "12b86342-3ff6-440b-8590-05953c696d7b",
            "sku": "00253",
            "name": "Шеф Бургер",
            "description": "",
            "itemSizes": [{"prices": [{"price": 54000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/c16e5f2120b83a57633d1d58557f7ba1.JPEG"}}]
        },
        {
            "itemId": "8354a2a8-1291-4a01-8411-d73108eed372",
            "sku": "00250",
            "name": "Бургер Бабай",
            "description": "",
            "itemSizes": [{"prices": [{"price": 60000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/b97b6977d3ef444f1d8e0f0522c3e3e5.JPEG"}}]
        },
        {
            "itemId": "a02d26b6-c2bf-4358-ae02-51413af22fd0",
            "sku": "00251",
            "name": "Бургер Нюёрк",
            "description": "",
            "itemSizes": [{"prices": [{"price": 40000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/2b18035fe3b806872b9e0fed2e7d6f7b.JPEG"}}]
        },
        {
            "itemId": "c248c6ae-8431-40a7-aba2-35081302578d",
            "sku": "00446",
            "name": "Чиз Бургер ",
            "description": "",
            "itemSizes": [{"prices": [{"price": 36000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/6b02c20334da4e25bd81c191f276d194.JPEG"}}]
        },
        {
            "itemId": "9fd5c49c-7df7-4d87-a1bb-5b28e224df3b",
            "sku": "00252",
            "name": "Гамбургер",
            "description": "",
            "itemSizes": [{"prices": [{"price": 34000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/a13ab846c7cf28de0e6434ac5eec8090.JPEG"}}]
        },
        {
            "itemId": "89788160-5a53-4a39-b4eb-53da6ab0a228",
            "sku": "00249",
            "name": "Бургер Чикен Кинг",
            "description": "",
            "itemSizes": [{"prices": [{"price": 38000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/205637307847b2e6f9b00a390612b7f5.JPEG"}}]
        },
        {
            "itemId": "fdcbff3b-9c1f-4454-85bd-b291cf8eeaf5",
            "sku": "00228",
            "name": "Бургер Чикен Классик",
            "description": "",
            "itemSizes": [{"prices": [{"price": 32000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/ea213b6291e92fe26c0cecebeb79d950.JPEG"}}]
        },
        {
            "itemId": "551c19aa-c734-4d31-89a7-874c730c4ffa",
            "sku": "00221",
            "name": "Бургер Чили",
            "description": "",
            "itemSizes": [{"prices": [{"price": 28000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/39c93fcaa6d3b3bf750343be4e8883b3.JPEG"}}]
        },
        {
            "itemId": "0fd7a4f5-4679-4e57-b596-515a8cf8f7d3",
            "sku": "00245",
            "name": "Бургер Сырний Бро",
            "description": "",
            "itemSizes": [{"prices": [{"price": 54000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/0f663be8148b7279ac4f8431124f28c1.JPEG"}}]
        },
        {
            "itemId": "a698c09b-6a1a-4371-8fb2-e6a616b1aff7",
            "sku": "00247",
            "name": "Бургер Чикен",
            "description": "",
            "itemSizes": [{"prices": [{"price": 34000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/13857e315ee7e27fdd1838d2e48224d6.JPEG"}}]
        },
        {
            "itemId": "a8ee9906-efe7-4ae4-954a-53ee487d727d",
            "sku": "00229",
            "name": "Бургер Зингер",
            "description": "",
            "itemSizes": [{"prices": [{"price": 30000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/7982a4bf31df48b904f3f6bb881130f6.JPEG"}}]
        },
        {
            "itemId": "74a2e7a6-06e0-46bd-aa9a-949b945dd888",
            "sku": "00219",
            "name": "Чикен Чиз",
            "description": "",
            "itemSizes": [{"prices": [{"price": 29000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/f71a798326ce9c9723fa258a37a1e404.JPEG"}}]
        },
        {
            "itemId": "e7c2b31c-46c4-430d-bc32-e0daf1173a6e",
            "sku": "00246",
            "name": "Бургер Сырный Папа",
            "description": "",
            "itemSizes": [{"prices": [{"price": 48000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/021696cc09df060a61c70a3940d5fcbf.JPEG"}}]
        },
        {
            "itemId": "bc63401f-1d4b-46bd-b796-e62986490733",
            "sku": "00216",
            "name": "Бургер Грибной",
            "description": "",
            "itemSizes": [{"prices": [{"price": 32000.0}], "buttonImage": {"src": "https://16a9564f-f8ec-42ba-a998-3027aa809e50.selstorage.ru/baybay-food-co-co/96585/images/items/c93cc1b5a3617841ae465913ddac6a9a.JPEG"}}]
        }
    ]
    
    # Добавляем десерты
    added_dessert_count = 0
    print(f"\n🍰 Добавляем десерты в категорию '{dessert_category.name}'...")
    for item in dessert_items:
        menu_item = add_menu_item_to_db(dessert_category, item)
        if menu_item:
            added_dessert_count += 1
    
    # Добавляем бургеры
    added_burgers_count = 0
    print(f"\n🍔 Добавляем бургеры в категорию '{burgers_category.name}'...")
    for item in burgers_items:
        menu_item = add_menu_item_to_db(burgers_category, item)
        if menu_item:
            added_burgers_count += 1
    
    print(f"\n🎉 Готово!")
    print(f"✅ Добавлено {added_sushi_count} суши в категорию '{sushi_category.name}'")
    print(f"✅ Добавлено {added_salads_count} салатов в категорию '{salads_category.name}'")
    print(f"✅ Добавлено {added_muzkaimok_count} музкаймоков в категорию '{muzkaimok_category.name}'")
    print(f"✅ Добавлено {added_combo_count} комбо в категорию '{combo_category.name}'")
    print(f"✅ Добавлено {added_fries_count} фри и закусок в категорию '{fries_category.name}'")
    print(f"✅ Добавлено {added_doner_count} донер и кебабов в категорию '{doner_category.name}'")
    print(f"✅ Добавлено {added_dessert_count} десертов в категорию '{dessert_category.name}'")
    print(f"✅ Добавлено {added_burgers_count} бургеров в категорию '{burgers_category.name}'")
    print(f"📊 Всего добавлено: {added_sushi_count + added_salads_count + added_muzkaimok_count + added_combo_count + added_fries_count + added_doner_count + added_dessert_count + added_burgers_count} товаров")

if __name__ == "__main__":
    main()
