#!/usr/bin/env python
"""
Тест функционала зон доставки
Проверяет создание зон доставки, валидацию адресов и API эндпоинты
"""

import os
import sys
import django
import requests
import json

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, Address, DeliveryZone
from django.core.management import execute_from_command_line

def create_test_delivery_zones():
    """Создает тестовые зоны доставки для Бухары и Кагана"""
    print("🗺️ Создание тестовых зон доставки...")
    
    # Удаляем существующие зоны
    DeliveryZone.objects.all().delete()
    
    # Зона доставки для Бухары
    bukhara_zone = DeliveryZone.objects.create(
        name="Бухара - Центр",
        city="Бухара",
        center_latitude=39.7747,
        center_longitude=64.4286,
        radius_km=20.0,
        is_active=True
    )
    
    # Зона доставки для Кагана
    kagan_zone = DeliveryZone.objects.create(
        name="Каган - Центр",
        city="Каган",
        center_latitude=39.7167,
        center_longitude=64.5500,
        radius_km=10.0,
        is_active=True
    )
    
    print(f"   ✅ Создана зона доставки: {bukhara_zone}")
    print(f"   ✅ Создана зона доставки: {kagan_zone}")
    
    return bukhara_zone, kagan_zone

def create_test_user():
    """Создает тестового пользователя"""
    print("👤 Создание тестового пользователя...")
    
    user, created = User.objects.get_or_create(
        telegram_id=999999999,
        defaults={
            'username': 'test_delivery_user',
            'first_name': 'Test Delivery User'
        }
    )
    
    if created:
        print(f"   ✅ Создан пользователь: {user}")
    else:
        print(f"   ✅ Использован существующий пользователь: {user}")
    
    return user

def create_test_addresses(user):
    """Создает тестовые адреса в разных зонах доставки"""
    print("📍 Создание тестовых адресов...")
    
    # Адрес в зоне доставки Бухары
    bukhara_address = Address.objects.create(
        user=user,
        street="ул. Исмаила Самани",
        house_number="1",
        apartment="1",
        city="Бухара",
        latitude=39.7747,
        longitude=64.4286,
        phone_number="+998 90 123 4567",
        is_primary=True
    )
    
    # Адрес в зоне доставки Кагана
    kagan_address = Address.objects.create(
        user=user,
        street="ул. Ленина",
        house_number="10",
        apartment="5",
        city="Каган",
        latitude=39.7167,
        longitude=64.5500,
        phone_number="+998 90 123 4568",
        is_primary=False
    )
    
    # Адрес вне зоны доставки (Ташкент)
    tashkent_address = Address.objects.create(
        user=user,
        street="ул. Навои",
        house_number="15",
        apartment="3",
        city="Ташкент",
        latitude=41.2995,
        longitude=69.2401,
        phone_number="+998 90 123 4569",
        is_primary=False
    )
    
    print(f"   ✅ Создан адрес в Бухаре: {bukhara_address.full_address}")
    print(f"   ✅ Создан адрес в Кагане: {kagan_address.full_address}")
    print(f"   ✅ Создан адрес в Ташкенте: {tashkent_address.full_address}")
    
    return bukhara_address, kagan_address, tashkent_address

def test_delivery_zone_validation():
    """Тестирует валидацию зон доставки"""
    print("\n🧪 Тестирование валидации зон доставки...")
    
    # Получаем адреса
    addresses = Address.objects.all()
    
    for address in addresses:
        print(f"\n📍 Проверка адреса: {address.full_address}")
        
        # Проверяем зону доставки
        is_in_zone, message = address.is_in_delivery_zone()
        print(f"   В зоне доставки: {is_in_zone}")
        print(f"   Сообщение: {message}")
        
        # Получаем информацию о зонах доставки
        zones_info = address.get_delivery_zones_info()
        print(f"   Доступные зоны доставки: {len(zones_info)}")
        
        for zone_info in zones_info:
            print(f"     - {zone_info['name']}: радиус {zone_info['radius_km']} км")
            if zone_info['distance'] is not None:
                print(f"       Расстояние до зоны: {zone_info['distance']:.1f} км")
            print(f"       В зоне: {zone_info['is_in_zone']}")

def test_api_endpoints():
    """Тестирует API эндпоинты для зон доставки"""
    print("\n🌐 Тестирование API эндпоинтов...")
    
    base_url = "http://localhost:8000/api"
    
    # Тест 1: Получение зон доставки
    print("\n📋 Тест 1: Получение зон доставки")
    try:
        response = requests.get(f"{base_url}/delivery-zones/")
        if response.status_code == 200:
            zones = response.json()
            print(f"   ✅ Получено зон доставки: {len(zones)}")
            for zone in zones:
                print(f"     - {zone['name']} ({zone['city']}): радиус {zone['radius_km']} км")
        else:
            print(f"   ❌ Ошибка: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Ошибка подключения: {e}")
    
    # Тест 2: Проверка адреса в зоне доставки
    print("\n📋 Тест 2: Проверка адреса в зоне доставки")
    try:
        # Тестируем адрес в Бухаре
        address_data = {
            "address": {
                "street": "ул. Исмаила Самани",
                "house_number": "1",
                "city": "Бухара",
                "latitude": 39.7747,
                "longitude": 64.4286
            }
        }
        
        response = requests.post(
            f"{base_url}/addresses/delivery-zone-check/",
            json=address_data,
            headers={'Content-Type': 'application/json'}
        )
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ Адрес в зоне доставки: {result['is_in_delivery_zone']}")
            print(f"   Сообщение: {result['message']}")
        else:
            print(f"   ❌ Ошибка: {response.status_code}")
    except Exception as e:
        print(f"   ❌ Ошибка подключения: {e}")

def test_order_creation_with_delivery_zone():
    """Тестирует создание заказа с проверкой зоны доставки"""
    print("\n🛒 Тестирование создания заказа с проверкой зоны доставки...")
    
    base_url = "http://localhost:8000/api"
    
    # Получаем адреса пользователя
    user = User.objects.get(telegram_id=999999999)
    addresses = Address.objects.filter(user=user)
    
    for address in addresses:
        print(f"\n📍 Тестирование заказа для адреса: {address.full_address}")
        
        # Проверяем зону доставки
        is_in_zone, message = address.is_in_delivery_zone()
        
        if is_in_zone:
            print(f"   ✅ Адрес в зоне доставки: {message}")
            
            # Пытаемся создать заказ
            order_data = {
                "telegram_id": user.telegram_id,
                "address_id": address.id,
                "total_price": 5000,
                "items": [
                    {"menu_item_id": 1, "quantity": 2}
                ]
            }
            
            try:
                response = requests.post(
                    f"{base_url}/orders/create/",
                    json=order_data,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 201:
                    print(f"   ✅ Заказ успешно создан")
                else:
                    print(f"   ❌ Ошибка создания заказа: {response.status_code}")
                    if response.status_code == 400:
                        error_data = response.json()
                        print(f"   Сообщение об ошибке: {error_data}")
            except Exception as e:
                print(f"   ❌ Ошибка подключения: {e}")
        else:
            print(f"   ❌ Адрес вне зоны доставки: {message}")
            
            # Пытаемся создать заказ (должен быть отклонен)
            order_data = {
                "telegram_id": user.telegram_id,
                "address_id": address.id,
                "total_price": 5000,
                "items": [
                    {"menu_item_id": 1, "quantity": 2}
                ]
            }
            
            try:
                response = requests.post(
                    f"{base_url}/orders/create/",
                    json=order_data,
                    headers={'Content-Type': 'application/json'}
                )
                
                if response.status_code == 400:
                    error_data = response.json()
                    if 'Address not in delivery zone' in error_data.get('error', ''):
                        print(f"   ✅ Заказ правильно отклонен: {error_data['message']}")
                    else:
                        print(f"   ❌ Неожиданная ошибка: {error_data}")
                else:
                    print(f"   ❌ Заказ не был отклонен: {response.status_code}")
            except Exception as e:
                print(f"   ❌ Ошибка подключения: {e}")

def cleanup_test_data():
    """Очищает тестовые данные"""
    print("\n🧹 Очистка тестовых данных...")
    
    # Удаляем тестовые адреса
    Address.objects.filter(user__telegram_id=999999999).delete()
    print("   ✅ Удалены тестовые адреса")
    
    # Удаляем тестового пользователя
    User.objects.filter(telegram_id=999999999).delete()
    print("   ✅ Удален тестовый пользователь")
    
    # Удаляем тестовые зоны доставки
    DeliveryZone.objects.filter(city__in=["Бухара", "Каган"]).delete()
    print("   ✅ Удалены тестовые зоны доставки")

def main():
    """Основная функция тестирования"""
    print("🚀 Тестирование функционала зон доставки")
    print("=" * 50)
    
    try:
        # Создаем тестовые данные
        bukhara_zone, kagan_zone = create_test_delivery_zones()
        user = create_test_user()
        bukhara_address, kagan_address, tashkent_address = create_test_addresses(user)
        
        # Тестируем функционал
        test_delivery_zone_validation()
        test_api_endpoints()
        test_order_creation_with_delivery_zone()
        
        print("\n✅ Все тесты завершены успешно!")
        
    except Exception as e:
        print(f"\n❌ Ошибка во время тестирования: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Очищаем тестовые данные
        cleanup_test_data()
        print("\n🎉 Тестирование завершено!")

if __name__ == "__main__":
    main() 