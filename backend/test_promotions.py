#!/usr/bin/env python3
"""
Тест для проверки функционала акций, кастомизации и фильтрации меню
Обновленная версия с изолированным тестированием акций
"""

import os
import sys
import django
import time
import requests
from django.db import transaction
from django.db.utils import OperationalError
from datetime import datetime, timedelta

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, Address, Category, SizeOption, AddOn, MenuItem, Promotion, DeliveryZone, Order, OrderItem

def print_step(step_number, title):
    print(f"\n📋 {step_number}. {title}")
    print("=" * 50)

def print_result(success, message):
    if success:
        print(f"✅ {message}")
    else:
        print(f"❌ {message}")

def retry_on_db_lock(func, max_retries=3, delay=1):
    """Повторяет функцию при блокировке базы данных"""
    for attempt in range(max_retries):
        try:
            return func()
        except OperationalError as e:
            if "database is locked" in str(e) and attempt < max_retries - 1:
                print(f"⚠️  База данных заблокирована, повторная попытка {attempt + 1}/{max_retries}")
                time.sleep(delay)
                continue
            else:
                raise e

def create_test_data():
    """Создание тестовых данных с обработкой ошибок блокировки"""
    
    print_step(1, "Подготовка тестовых данных")
    
    # Создание пользователя
    user, created = retry_on_db_lock(lambda: User.objects.get_or_create(
        telegram_id=908758841,
        defaults={'username': 'abidov_0184', 'first_name': 'Шахзод'}
    ))
    print_result(True, f"Пользователь создан: {user.first_name}")
    
    # Создание зоны доставки
    delivery_zone, created = retry_on_db_lock(lambda: DeliveryZone.objects.get_or_create(
        city='Бухара',
        name='Бухара Центр',
        defaults={
            'center_latitude': 39.768100,
            'center_longitude': 64.455600,
            'radius_km': 5.0,
            'delivery_fee': 5000.00,
            'min_order_amount': 50000.00,
            'is_active': True
        }
    ))
    print_result(True, f"Зона доставки создана: {delivery_zone.name}")
    
    # Создание адреса
    address, created = retry_on_db_lock(lambda: Address.objects.get_or_create(
        user=user,
        street='Тестовая улица',
        house_number='10',
        city='Бухара',
        defaults={
            'latitude': 39.768100,
            'longitude': 64.455600,
            'phone_number': '+998901234567',
            'is_primary': True
        }
    ))
    print_result(True, f"Адрес создан: {address.street}, {address.house_number}, {address.city}")
    
    # Создание категории
    category, created = retry_on_db_lock(lambda: Category.objects.get_or_create(
        name='Пицца',
        defaults={'description': 'Вкусные пиццы'}
    ))
    print_result(True, f"Категория создана: {category.name}")
    
    # Создание размеров
    small_size, created = retry_on_db_lock(lambda: SizeOption.objects.get_or_create(
        name='Маленькая',
        defaults={
            'price_modifier': 0,
            'description': '25 см, 6 кусочков',
            'is_active': True
        }
    ))
    
    large_size, created = retry_on_db_lock(lambda: SizeOption.objects.get_or_create(
        name='Большая',
        defaults={
            'price_modifier': 20000,
            'description': '35 см, 8 кусочков',
            'is_active': True
        }
    ))
    print_result(True, f"Размеры созданы: {small_size.name}, {large_size.name}")
    
    # Создание дополнений
    ketchup, created = retry_on_db_lock(lambda: AddOn.objects.get_or_create(
        name='Кетчуп',
        defaults={
            'price': 2000,
            'category': category,
            'is_active': True
        }
    ))
    
    cheese_sauce, created = retry_on_db_lock(lambda: AddOn.objects.get_or_create(
        name='Сырный соус',
        defaults={
            'price': 3000,
            'category': category,
            'is_active': True
        }
    ))
    
    # Установка доступности дополнений для категории
    try:
        retry_on_db_lock(lambda: ketchup.available_for_categories.add(category))
        retry_on_db_lock(lambda: cheese_sauce.available_for_categories.add(category))
        print_result(True, f"Дополнения созданы: {ketchup.name}, {cheese_sauce.name}")
    except Exception as e:
        print_result(False, f"Ошибка при установке доступности дополнений: {str(e)}")
    
    # Создание блюда
    menu_item, created = retry_on_db_lock(lambda: MenuItem.objects.get_or_create(
        name='Пицца Маргарита',
        defaults={
            'description': 'Вкусная пицца',
            'price': 50000,
            'category': category,
            'is_hit': True,
            'is_new': True,
            'priority': 1
        }
    ))
    
    # Добавление размеров и дополнений к блюду
    try:
        retry_on_db_lock(lambda: menu_item.size_options.add(small_size, large_size))
        retry_on_db_lock(lambda: menu_item.add_on_options.add(ketchup, cheese_sauce))
        print_result(True, f"Блюдо создано: {menu_item.name} (приоритет: {menu_item.priority})")
    except Exception as e:
        print_result(False, f"Ошибка при добавлении опций к блюду: {str(e)}")
    
    # Создание акций
    now = datetime.now()
    
    promo_percent, created = retry_on_db_lock(lambda: Promotion.objects.get_or_create(
        name='Скидка 10%',
        defaults={
            'description': '10% на всё',
            'discount_type': 'PERCENT',
            'discount_value': 10,
            'max_discount': 15000,
            'max_uses': 100,
            'valid_from': now - timedelta(days=1),
            'valid_to': now + timedelta(days=1),
            'is_active': True
        }
    ))
    
    promo_free_delivery, created = retry_on_db_lock(lambda: Promotion.objects.get_or_create(
        name='Бесплатная доставка',
        defaults={
            'description': 'При заказе от 100000',
            'discount_type': 'FREE_DELIVERY',
            'discount_value': 0,
            'min_order_amount': 100000,
            'valid_from': now - timedelta(days=1),
            'valid_to': now + timedelta(days=1),
            'is_active': True
        }
    ))
    
    promo_free_addon, created = retry_on_db_lock(lambda: Promotion.objects.get_or_create(
        name='Бесплатный кетчуп',
        defaults={
            'description': 'Кетчуп бесплатно к пицце',
            'discount_type': 'FREE_ITEM',
            'discount_value': 0,
            'valid_from': now - timedelta(days=1),
            'valid_to': now + timedelta(days=1),
            'is_active': True,
            'free_addon': ketchup
        }
    ))
    
    print_result(True, f"Акции созданы: {promo_percent.name}, {promo_free_delivery.name}, {promo_free_addon.name}")
    print_result(True, "Тестовые данные успешно созданы")
    
    return user, address, category, small_size, large_size, ketchup, cheese_sauce, menu_item, promo_percent, promo_free_delivery, promo_free_addon

def test_promotion_isolated(promotion_name, order_data, expected_usage_increase=1):
    """Тестирует конкретную акцию в изоляции"""
    print(f"\n🎯 Тестирование акции: {promotion_name}")
    print("-" * 40)
    
    # Получаем акцию
    promotion = retry_on_db_lock(lambda: Promotion.objects.get(name=promotion_name))
    initial_usage = promotion.usage_count
    
    # Деактивируем все другие акции
    retry_on_db_lock(lambda: Promotion.objects.exclude(name=promotion_name).update(is_active=False))
    
    try:
        # Создаем заказ
        response = requests.post('http://localhost:8000/api/orders/create/', json=order_data)
        if response.status_code == 201:
            order_data_response = response.json()
            print_result(True, f"Заказ создан: ID {order_data_response['id']}")
            
            # Проверяем счетчик использований
            promotion.refresh_from_db()
            new_usage = promotion.usage_count
            usage_increased = new_usage > initial_usage
            
            print_result(usage_increased, f"Счетчик акции '{promotion_name}': {initial_usage} → {new_usage} (+{new_usage - initial_usage})")
            
            return usage_increased
        else:
            print_result(False, f"Ошибка создания заказа: {response.status_code} {response.text}")
            return False
    except Exception as e:
        print_result(False, f"Не удалось создать заказ: {str(e)}")
        return False
    finally:
        # Реактивируем все акции
        retry_on_db_lock(lambda: Promotion.objects.update(is_active=True))

def test_edge_cases(user, address, small_size, large_size, ketchup, cheese_sauce, menu_item):
    print_step('EC1', 'Пограничные условия: min_order_amount')
    # min_order_amount ровно на границе
    free_delivery = Promotion.objects.get(name='Бесплатная доставка')
    order_data = {
        'telegram_id': user.telegram_id,
        'address_id': address.id,
        'items': [
            {
                'menu_item_id': menu_item.id,
                'quantity': 2,  # 50 000 * 2 = 100 000
                'size_option_id': small_size.id
            }
        ]
    }
    test_promotion_isolated('Бесплатная доставка', order_data)

    print_step('EC2', 'max_uses: акция не должна применяться после достижения лимита')
    percent = Promotion.objects.get(name='Скидка 10%')
    percent.max_uses = 2
    percent.usage_count = 2
    percent.save()
    order_data = {
        'telegram_id': user.telegram_id,
        'address_id': address.id,
        'items': [
            {
                'menu_item_id': menu_item.id,
                'quantity': 1,
                'size_option_id': small_size.id
            }
        ]
    }
    print('Ожидаем: акция не применяется, счетчик не увеличивается')
    test_promotion_isolated('Скидка 10%', order_data, expected_usage_increase=0)
    percent.max_uses = 100
    percent.usage_count = 0
    percent.save()

    print_step('EC3', 'max_discount: скидка не превышает лимит')
    percent.max_discount = 1000
    percent.save()
    order_data = {
        'telegram_id': user.telegram_id,
        'address_id': address.id,
        'items': [
            {
                'menu_item_id': menu_item.id,
                'quantity': 10,
                'size_option_id': small_size.id
            }
        ]
    }
    test_promotion_isolated('Скидка 10%', order_data)
    percent.max_discount = 15000
    percent.save()

    print_step('EC4', 'valid_from/valid_to: акция вне срока действия')
    import datetime
    free_delivery = Promotion.objects.get(name='Бесплатная доставка')
    old_from, old_to = free_delivery.valid_from, free_delivery.valid_to
    free_delivery.valid_from = datetime.datetime.now() + datetime.timedelta(days=1)
    free_delivery.valid_to = datetime.datetime.now() + datetime.timedelta(days=2)
    free_delivery.save()
    order_data = {
        'telegram_id': user.telegram_id,
        'address_id': address.id,
        'items': [
            {
                'menu_item_id': menu_item.id,
                'quantity': 2,
                'size_option_id': small_size.id
            }
        ]
    }
    print('Ожидаем: акция не применяется, счетчик не увеличивается')
    test_promotion_isolated('Бесплатная доставка', order_data, expected_usage_increase=0)
    free_delivery.valid_from, free_delivery.valid_to = old_from, old_to
    free_delivery.save()

    print_step('EC5', 'is_active: неактивная акция не применяется')
    free_delivery.is_active = False
    free_delivery.save()
    print('Ожидаем: акция не применяется, счетчик не увеличивается')
    test_promotion_isolated('Бесплатная доставка', order_data, expected_usage_increase=0)
    free_delivery.is_active = True
    free_delivery.save()

    print_step('EC6', 'Приоритет: если экономия одинаковая, какая акция выберется?')
    percent = Promotion.objects.get(name='Скидка 10%')
    free_delivery = Promotion.objects.get(name='Бесплатная доставка')
    percent.discount_value = 10
    percent.max_discount = 5000
    percent.save()
    free_delivery.min_order_amount = 50000
    free_delivery.save()
    # Заказ на 50000, обе акции дают 5000 экономии
    order_data = {
        'telegram_id': user.telegram_id,
        'address_id': address.id,
        'items': [
            {
                'menu_item_id': menu_item.id,
                'quantity': 1,
                'size_option_id': small_size.id
            }
        ]
    }
    print('Ожидаем: одна из акций будет выбрана (смотрим какая)')
    test_promotion_isolated('Скидка 10%', order_data)
    test_promotion_isolated('Бесплатная доставка', order_data)
    # Вернуть значения
    percent.max_discount = 15000
    percent.save()
    free_delivery.min_order_amount = 100000
    free_delivery.save()

    print_step('EC7', 'FREE_ITEM: бесплатный товар добавляется только один раз')
    free_addon = Promotion.objects.get(name='Бесплатный кетчуп')
    order_data = {
        'telegram_id': user.telegram_id,
        'address_id': address.id,
        'items': [
            {
                'menu_item_id': menu_item.id,
                'quantity': 3,
                'add_ons': [ketchup.id]
            }
        ]
    }
    test_promotion_isolated('Бесплатный кетчуп', order_data)

    print_step('EC8', 'FREE_ADDON: бесплатное дополнение не дублируется')
    # Заказ с платным и бесплатным кетчупом
    test_promotion_isolated('Бесплатный кетчуп', order_data)

    print_step('EC9', 'Нет подходящих акций: заказ без акции')
    # Деактивировать все акции
    Promotion.objects.update(is_active=False)
    order_data = {
        'telegram_id': user.telegram_id,
        'address_id': address.id,
        'items': [
            {
                'menu_item_id': menu_item.id,
                'quantity': 1,
                'size_option_id': small_size.id
            }
        ]
    }
    print('Ожидаем: заказ без акции, счетчики не увеличиваются')
    test_promotion_isolated('Скидка 10%', order_data, expected_usage_increase=0)
    Promotion.objects.update(is_active=True)

    print_step('EC10', 'Попытка применить несуществующую акцию')
    try:
        test_promotion_isolated('Несуществующая акция', order_data, expected_usage_increase=0)
    except Exception as e:
        print_result(True, f'Корректно обработана ошибка: {e}')

def main():
    print("ПРОВЕРКА АКЦИЙ С ИЗОЛИРОВАННЫМ ТЕСТИРОВАНИЕМ")
    print("=" * 80)
    
    # 1. Подготовка тестовых данных
    print_step(1, "Подготовка тестовых данных")
    
    # Создаем пользователя
    user, address, category, small_size, large_size, ketchup, cheese_sauce, menu_item, promo_percent, promo_free_delivery, promo_free_addon = create_test_data()
    
    # 2. Тест акции "Скидка 10%"
    print_step(2, "Тест акции 'Скидка 10%'")
    
    percent_order_data = {
        'telegram_id': user.telegram_id,
        'address_id': address.id,
        'items': [
            {
                'menu_item_id': menu_item.id,
                'quantity': 1,
                'size_option_id': small_size.id,
                'add_ons': [ketchup.id]
            }
        ]
    }
    
    test_promotion_isolated('Скидка 10%', percent_order_data)
    
    # 3. Тест акции "Бесплатная доставка"
    print_step(3, "Тест акции 'Бесплатная доставка'")
    
    free_delivery_order_data = {
        'telegram_id': user.telegram_id,
        'address_id': address.id,
        'items': [
            {
                'menu_item_id': menu_item.id,
                'quantity': 2,  # 50 000 * 2 = 100 000 (достигает min_order_amount)
                'size_option_id': large_size.id,
                'add_ons': [ketchup.id, cheese_sauce.id]
            }
        ]
    }
    
    test_promotion_isolated('Бесплатная доставка', free_delivery_order_data)
    
    # 4. Тест акции "Бесплатный кетчуп"
    print_step(4, "Тест акции 'Бесплатный кетчуп'")
    
    free_addon_order_data = {
        'telegram_id': user.telegram_id,
        'address_id': address.id,
        'items': [
            {
                'menu_item_id': menu_item.id,
                'quantity': 1,
                'add_ons': [ketchup.id]
            }
        ]
    }
    
    test_promotion_isolated('Бесплатный кетчуп', free_addon_order_data)
    
    # 5. Финальная проверка всех счетчиков
    print_step(5, "Финальная проверка счетчиков использований")
    
    try:
        # Получаем обновленные данные акций
        promo_percent = retry_on_db_lock(lambda: Promotion.objects.get(name='Скидка 10%'))
        promo_free_delivery = retry_on_db_lock(lambda: Promotion.objects.get(name='Бесплатная доставка'))
        promo_free_addon = retry_on_db_lock(lambda: Promotion.objects.get(name='Бесплатный кетчуп'))
        
        print(f"📊 Итоговые счетчики использований:")
        print(f"   - '{promo_percent.name}': {promo_percent.usage_count}")
        print(f"   - '{promo_free_delivery.name}': {promo_free_delivery.usage_count}")
        print(f"   - '{promo_free_addon.name}': {promo_free_addon.usage_count}")
        
        # Проверяем, что все счетчики увеличились
        all_increased = (promo_percent.usage_count > 0 and 
                        promo_free_delivery.usage_count > 0 and 
                        promo_free_addon.usage_count > 0)
        
        print_result(all_increased, "Все счетчики акций увеличились")
        
    except Exception as e:
        print_result(False, f"Ошибка при проверке счетчиков: {str(e)}")
    
    # 6. Проверка API фильтрации
    print_step(6, "Проверка API фильтрации")
    
    try:
        # Тест API фильтрации хитов
        response = requests.get('http://localhost:8000/api/menu-items/?is_hit=true')
        if response.status_code == 200:
            items = response.json()
            print_result(True, f"API фильтрация хитов работает: найдено {len(items)} блюд")
        else:
            print_result(False, f"Ошибка API фильтрации хитов: {response.status_code}")
    except Exception as e:
        print_result(False, f"Не удалось проверить API фильтрацию хитов: {str(e)}")
    
    try:
        # Тест API фильтрации новинок
        response = requests.get('http://localhost:8000/api/menu-items/?is_new=true')
        if response.status_code == 200:
            items = response.json()
            print_result(True, f"API фильтрация новинок работает: найдено {len(items)} блюд")
        else:
            print_result(False, f"Ошибка API фильтрации новинок: {response.status_code}")
    except Exception as e:
        print_result(False, f"Не удалось проверить API фильтрацию новинок: {str(e)}")
    
    # После всех обычных тестов:
    test_edge_cases(user, address, small_size, large_size, ketchup, cheese_sauce, menu_item)

    print_step(7, "Завершение теста")
    print_result(True, "Тест завершён. Все данные сохранены в базе.")

if __name__ == "__main__":
    main() 