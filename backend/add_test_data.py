#!/usr/bin/env python3
"""
Скрипт для добавления недостающих тестовых данных
"""

import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Category, MenuItem, AddOn, Promotion, DeliveryZone
from decimal import Decimal

def add_test_data():
    """Добавляет недостающие тестовые данные"""
    print("🔧 ДОБАВЛЕНИЕ ТЕСТОВЫХ ДАННЫХ")
    print("=" * 50)
    
    # 1. Добавляем недостающие категории
    print("\n📂 Добавление категорий...")
    
    categories_data = [
        {"name": "Напитки", "description": "Холодные и горячие напитки"},
        {"name": "Дополнения", "description": "Дополнительные продукты"},
    ]
    
    for cat_data in categories_data:
        category, created = Category.objects.get_or_create(
            name=cat_data["name"],
            defaults=cat_data
        )
        if created:
            print(f"✅ Создана категория: {category.name}")
        else:
            print(f"ℹ️  Категория уже существует: {category.name}")
    
    # 2. Добавляем недостающие дополнения
    print("\n🥤 Добавление дополнений...")
    
    addons_data = [
        {"name": "Кока-Кола", "price": Decimal("8000")},
        {"name": "Картошка фри", "price": Decimal("12000")},
        {"name": "Чипсы", "price": Decimal("15000")},
        {"name": "Морс", "price": Decimal("10000")},
        {"name": "Чай", "price": Decimal("5000")},
        {"name": "Кофе", "price": Decimal("8000")},
    ]
    
    for addon_data in addons_data:
        addon, created = AddOn.objects.get_or_create(
            name=addon_data["name"],
            defaults=addon_data
        )
        if created:
            print(f"✅ Создано дополнение: {addon.name} - {addon.price}")
        else:
            print(f"ℹ️  Дополнение уже существует: {addon.name}")
    
    # 3. Добавляем недостающие акции
    print("\n🎉 Добавление акций...")
    
    from datetime import timedelta
    from django.utils import timezone
    
    promotions_data = [
                       {
                   "name": "Скидка 5000 сум",
                   "description": "Фиксированная скидка 5000 сум на заказ от 50000 сум",
                   "discount_type": "FIXED_AMOUNT",
                   "discount_value": Decimal("5000"),
                   "min_order_amount": Decimal("50000"),
                   "is_active": True,
                   "valid_from": timezone.now(),
                   "valid_to": timezone.now() + timedelta(days=30)
               },
               {
                   "name": "Скидка 15%",
                   "description": "Скидка 15% на все блюда",
                   "discount_type": "PERCENT",
                   "discount_value": Decimal("15"),
                   "is_active": True,
                   "valid_from": timezone.now(),
                   "valid_to": timezone.now() + timedelta(days=30)
               },
               {
                   "name": "Бесплатная доставка",
                   "description": "Бесплатная доставка при заказе от 100000 сум",
                   "discount_type": "FREE_DELIVERY",
                   "discount_value": Decimal("0"),  # Добавляем значение для FREE_DELIVERY
                   "min_order_amount": Decimal("100000"),
                   "is_active": True,
                   "valid_from": timezone.now(),
                   "valid_to": timezone.now() + timedelta(days=30)
               },
                       {
                   "name": "Бесплатный напиток",
                   "description": "Бесплатный напиток при заказе от 80000 сум",
                   "discount_type": "FREE_ITEM",
                   "discount_value": Decimal("0"),  # Добавляем значение для FREE_ITEM
                   "min_order_amount": Decimal("80000"),
                   "is_active": True,
                   "valid_from": timezone.now(),
                   "valid_to": timezone.now() + timedelta(days=30)
               }
    ]
    
    for promo_data in promotions_data:
        promotion, created = Promotion.objects.get_or_create(
            name=promo_data["name"],
            defaults=promo_data
        )
        if created:
            print(f"✅ Создана акция: {promotion.name}")
        else:
            print(f"ℹ️  Акция уже существует: {promotion.name}")
    
    # 4. Добавляем блюда в новые категории
    print("\n🍔 Добавление блюд в новые категории...")
    
    # Получаем категории
    drinks_category = Category.objects.get(name="Напитки")
    additions_category = Category.objects.get(name="Дополнения")
    
    menu_items_data = [
        {
            "name": "Кока-Кола",
            "description": "Газированный напиток Coca-Cola",
            "price": Decimal("8000"),
            "category": drinks_category
        },
        {
            "name": "Пепси",
            "description": "Газированный напиток Pepsi",
            "price": Decimal("8000"),
            "category": drinks_category
        },
        {
            "name": "Фанта",
            "description": "Газированный напиток Fanta",
            "price": Decimal("8000"),
            "category": drinks_category
        },
        {
            "name": "Картошка фри",
            "description": "Жареная картошка фри",
            "price": Decimal("12000"),
            "category": additions_category
        },
        {
            "name": "Чипсы",
            "description": "Картофельные чипсы",
            "price": Decimal("15000"),
            "category": additions_category
        },
        {
            "name": "Наггетсы",
            "description": "Куриные наггетсы",
            "price": Decimal("18000"),
            "category": additions_category
        }
    ]
    
    for item_data in menu_items_data:
        menu_item, created = MenuItem.objects.get_or_create(
            name=item_data["name"],
            category=item_data["category"],
            defaults=item_data
        )
        if created:
            print(f"✅ Создано блюдо: {menu_item.name} - {menu_item.price}")
        else:
            print(f"ℹ️  Блюдо уже существует: {menu_item.name}")
    
    # 5. Проверяем зоны доставки
    print("\n🚚 Проверка зон доставки...")
    
    zones = DeliveryZone.objects.filter(is_active=True)
    if zones.exists():
        print(f"✅ Найдено активных зон доставки: {zones.count()}")
        for zone in zones:
            print(f"   - {zone.name} ({zone.city})")
    else:
        print("⚠️  Нет активных зон доставки")
    
    # 6. Итоговая статистика
    print("\n📊 ИТОГОВАЯ СТАТИСТИКА:")
    print(f"📂 Категорий: {Category.objects.count()}")
    print(f"🍔 Блюд: {MenuItem.objects.count()}")
    print(f"🥤 Дополнений: {AddOn.objects.count()}")
    print(f"🎉 Акций: {Promotion.objects.count()}")
    print(f"🚚 Зон доставки: {DeliveryZone.objects.count()}")
    
    print("\n✅ Тестовые данные добавлены успешно!")
    print("🎯 Теперь можно запускать тесты с полными данными")
if __name__ == "__main__":
    add_test_data() 