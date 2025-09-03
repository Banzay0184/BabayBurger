#!/usr/bin/env python
"""
Скрипт для создания тестовых данных в базе данных Babay Food
"""
import os
import sys
import django
from decimal import Decimal
from django.utils import timezone
from datetime import timedelta

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Category, MenuItem, DeliveryZone, AddOn, SizeOption, Promotion, User

def create_categories():
    """Создает категории товаров"""
    categories_data = [
        {
            'name': 'Бургеры',
            'description': 'Сочные бургеры с разными начинками'
        },
        {
            'name': 'Напитки',
            'description': 'Холодные и горячие напитки'
        },
        {
            'name': 'Сайды',
            'description': 'Картошка фри, наггетсы и другие гарниры'
        },
        {
            'name': 'Десерты',
            'description': 'Сладкие десерты и мороженое'
        }
    ]
    
    created_categories = []
    for data in categories_data:
        category, created = Category.objects.get_or_create(
            name=data['name'],
            defaults=data
        )
        if created:
            print(f"✅ Создана категория: {category.name}")
        else:
            print(f"ℹ️  Категория уже существует: {category.name}")
        created_categories.append(category)
    
    return created_categories

def create_menu_items(categories):
    """Создает товары в меню"""
    burgers_category = next(c for c in categories if c.name == 'Бургеры')
    drinks_category = next(c for c in categories if c.name == 'Напитки')
    sides_category = next(c for c in categories if c.name == 'Сайды')
    desserts_category = next(c for c in categories if c.name == 'Десерты')
    
    menu_items_data = [
        # Бургеры
        {
            'name': 'Классический Бургер',
            'description': 'Сочная котлета с овощами и соусом',
            'price': Decimal('25000'),
            'category': burgers_category,
            'is_hit': True,
            'priority': 1
        },
        {
            'name': 'Чизбургер',
            'description': 'Бургер с плавленым сыром',
            'price': Decimal('28000'),
            'category': burgers_category,
            'is_hit': True,
            'priority': 2
        },
        {
            'name': 'Биг Бургер',
            'description': 'Большой бургер с двойной котлетой',
            'price': Decimal('35000'),
            'category': burgers_category,
            'is_new': True,
            'priority': 3
        },
        {
            'name': 'Вегетарианский Бургер',
            'description': 'Бургер с овощной котлетой',
            'price': Decimal('22000'),
            'category': burgers_category,
            'priority': 4
        },
        # Напитки
        {
            'name': 'Кола',
            'description': 'Газированный напиток Coca-Cola',
            'price': Decimal('8000'),
            'category': drinks_category,
            'priority': 1
        },
        {
            'name': 'Фанта',
            'description': 'Газированный напиток Fanta',
            'price': Decimal('8000'),
            'category': drinks_category,
            'priority': 2
        },
        {
            'name': 'Кофе',
            'description': 'Горячий кофе',
            'price': Decimal('12000'),
            'category': drinks_category,
            'priority': 3
        },
        # Сайды
        {
            'name': 'Картошка Фри',
            'description': 'Хрустящая картошка фри',
            'price': Decimal('15000'),
            'category': sides_category,
            'is_hit': True,
            'priority': 1
        },
        {
            'name': 'Наггетсы',
            'description': 'Куриные наггетсы',
            'price': Decimal('18000'),
            'category': sides_category,
            'priority': 2
        },
        {
            'name': 'Луковые кольца',
            'description': 'Хрустящие луковые кольца',
            'price': Decimal('16000'),
            'category': sides_category,
            'priority': 3
        },
        # Десерты
        {
            'name': 'Мороженое',
            'description': 'Ванильное мороженое',
            'price': Decimal('12000'),
            'category': desserts_category,
            'priority': 1
        },
        {
            'name': 'Чизкейк',
            'description': 'Классический чизкейк',
            'price': Decimal('20000'),
            'category': desserts_category,
            'is_new': True,
            'priority': 2
        }
    ]
    
    created_items = []
    for data in menu_items_data:
        item, created = MenuItem.objects.get_or_create(
            name=data['name'],
            category=data['category'],
            defaults=data
        )
        if created:
            print(f"✅ Создан товар: {item.name} - {item.price} UZS")
        else:
            print(f"ℹ️  Товар уже существует: {item.name}")
        created_items.append(item)
    
    return created_items

def create_add_ons(categories):
    """Создает дополнительные опции"""
    burgers_category = next(c for c in categories if c.name == 'Бургеры')
    
    add_ons_data = [
        {
            'name': 'Дополнительный сыр',
            'price': Decimal('3000'),
            'category': burgers_category,
        },
        {
            'name': 'Бекон',
            'price': Decimal('5000'),
            'category': burgers_category,
        },
        {
            'name': 'Дополнительная котлета',
            'price': Decimal('8000'),
            'category': burgers_category,
        },
        {
            'name': 'Сырный соус',
            'price': Decimal('2000'),
            'category': None,
        },
        {
            'name': 'Барбекю соус',
            'price': Decimal('2000'),
            'category': None,
        }
    ]
    
    created_add_ons = []
    for data in add_ons_data:
        # Убираем many-to-many поле из defaults
        available_for_categories = [burgers_category] if data.get('category') == burgers_category else []
        
        addon, created = AddOn.objects.get_or_create(
            name=data['name'],
            defaults={
                'price': data['price'],
                'category': data['category'],
            }
        )
        
        # Устанавливаем many-to-many поле после создания
        if available_for_categories:
            addon.available_for_categories.set(available_for_categories)
        
        if created:
            print(f"✅ Создано дополнение: {addon.name} - {addon.price} UZS")
        else:
            print(f"ℹ️  Дополнение уже существует: {addon.name}")
        created_add_ons.append(addon)
    
    return created_add_ons

def create_size_options():
    """Создает варианты размеров"""
    size_options_data = [
        {
            'name': 'Маленький',
            'price_modifier': Decimal('0'),
            'description': '25 см'
        },
        {
            'name': 'Средний',
            'price_modifier': Decimal('5000'),
            'description': '30 см'
        },
        {
            'name': 'Большой',
            'price_modifier': Decimal('10000'),
            'description': '35 см'
        }
    ]
    
    created_sizes = []
    for data in size_options_data:
        size, created = SizeOption.objects.get_or_create(
            name=data['name'],
            defaults=data
        )
        if created:
            print(f"✅ Создан размер: {size.name} - {size.price_modifier:+} UZS")
        else:
            print(f"ℹ️  Размер уже существует: {size.name}")
        created_sizes.append(size)
    
    return created_sizes

def create_delivery_zones():
    """Создает зоны доставки"""
    zones_data = [
        {
            'name': 'Центр Бухары',
            'city': 'Бухара',
            'center_latitude': Decimal('39.7681'),
            'center_longitude': Decimal('64.4556'),
            'radius_km': Decimal('5.0'),
            'delivery_fee': Decimal('5000'),
            'min_order_amount': Decimal('50000')
        },
        {
            'name': 'Каган',
            'city': 'Каган',
            'center_latitude': Decimal('39.7222'),
            'center_longitude': Decimal('64.5517'),
            'radius_km': Decimal('3.0'),
            'delivery_fee': Decimal('3000'),
            'min_order_amount': Decimal('40000')
        },
        {
            'name': 'Новая Бухара',
            'city': 'Бухара',
            'center_latitude': Decimal('39.7500'),
            'center_longitude': Decimal('64.4500'),
            'radius_km': Decimal('4.0'),
            'delivery_fee': Decimal('4000'),
            'min_order_amount': Decimal('45000')
        }
    ]
    
    created_zones = []
    for data in zones_data:
        zone, created = DeliveryZone.objects.get_or_create(
            name=data['name'],
            city=data['city'],
            defaults=data
        )
        if created:
            print(f"✅ Создана зона доставки: {zone.name} ({zone.city})")
        else:
            print(f"ℹ️  Зона доставки уже существует: {zone.name}")
        created_zones.append(zone)
    
    return created_zones

def create_promotions():
    """Создает акции и скидки"""
    # Получаем товары для акций
    try:
        classic_burger = MenuItem.objects.get(name='Классический Бургер')
        cola = MenuItem.objects.get(name='Кола')
        fries = MenuItem.objects.get(name='Картошка Фри')
    except MenuItem.DoesNotExist:
        print("❌ Не удалось найти товары для акций")
        return []
    
    promotions_data = [
        {
            'name': 'Скидка 20% на все бургеры',
            'description': 'Скидка 20% на все бургеры при заказе от 50,000 UZS',
            'discount_type': 'PERCENT',
            'discount_value': Decimal('20'),
            'min_order_amount': Decimal('50000'),
            'max_discount': Decimal('10000'),
            'valid_from': timezone.now(),
            'valid_to': timezone.now() + timedelta(days=30),
            'is_active': True
        },
        {
            'name': 'Бесплатная доставка',
            'description': 'Бесплатная доставка при заказе от 80,000 UZS',
            'discount_type': 'FREE_DELIVERY',
            'discount_value': Decimal('0'),
            'min_order_amount': Decimal('80000'),
            'valid_from': timezone.now(),
            'valid_to': timezone.now() + timedelta(days=60),
            'is_active': True
        },
        {
            'name': 'Комбо: Бургер + Картошка + Напиток',
            'description': 'Бесплатная картошка фри при заказе бургера и напитка',
            'discount_type': 'FREE_ITEM',
            'discount_value': Decimal('0'),
            'min_order_amount': Decimal('40000'),
            'valid_from': timezone.now(),
            'valid_to': timezone.now() + timedelta(days=45),
            'is_active': True,
            'free_item': fries
        }
    ]
    
    created_promotions = []
    for data in promotions_data:
        promotion, created = Promotion.objects.get_or_create(
            name=data['name'],
            defaults=data
        )
        if created:
            print(f"✅ Создана акция: {promotion.name}")
        else:
            print(f"ℹ️  Акция уже существует: {promotion.name}")
        created_promotions.append(promotion)
    
    return created_promotions

def assign_add_ons_to_menu_items(menu_items, add_ons):
    """Привязывает дополнения к товарам"""
    burgers = [item for item in menu_items if item.category.name == 'Бургеры']
    
    for burger in burgers:
        # Добавляем все дополнения к бургерам
        burger.add_on_options.set(add_ons)
        print(f"✅ Добавлены дополнения к {burger.name}")

def assign_size_options_to_menu_items(menu_items, size_options):
    """Привязывает размеры к товарам"""
    burgers = [item for item in menu_items if item.category.name == 'Бургеры']
    
    for burger in burgers:
        # Добавляем все размеры к бургерам
        burger.size_options.set(size_options)
        print(f"✅ Добавлены размеры к {burger.name}")

def main():
    """Основная функция создания тестовых данных"""
    print("🍔 Создание тестовых данных для Babay Food...")
    print("=" * 50)
    
    try:
        # Создаем категории
        print("\n📂 Создание категорий...")
        categories = create_categories()
        
        # Создаем товары
        print("\n🍔 Создание товаров...")
        menu_items = create_menu_items(categories)
        
        # Создаем дополнения
        print("\n➕ Создание дополнений...")
        add_ons = create_add_ons(categories)
        
        # Создаем размеры
        print("\n📏 Создание размеров...")
        size_options = create_size_options()
        
        # Создаем зоны доставки
        print("\n🗺️ Создание зон доставки...")
        delivery_zones = create_delivery_zones()
        
        # Создаем акции
        print("\n🎉 Создание акций...")
        promotions = create_promotions()
        
        # Привязываем дополнения к товарам
        print("\n🔗 Привязка дополнений к товарам...")
        assign_add_ons_to_menu_items(menu_items, add_ons)
        
        # Привязываем размеры к товарам
        print("\n🔗 Привязка размеров к товарам...")
        assign_size_options_to_menu_items(menu_items, size_options)
        
        print("\n" + "=" * 50)
        print("✅ Тестовые данные успешно созданы!")
        print(f"📊 Статистика:")
        print(f"   - Категорий: {Category.objects.count()}")
        print(f"   - Товаров: {MenuItem.objects.count()}")
        print(f"   - Дополнений: {AddOn.objects.count()}")
        print(f"   - Размеров: {SizeOption.objects.count()}")
        print(f"   - Зон доставки: {DeliveryZone.objects.count()}")
        print(f"   - Акций: {Promotion.objects.count()}")
        print(f"   - Пользователей: {User.objects.count()}")
        
    except Exception as e:
        print(f"❌ Ошибка при создании тестовых данных: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == '__main__':
    main() 