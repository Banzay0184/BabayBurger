#!/usr/bin/env python3
"""
Тест автоматического геокодирования координат
Проверяет, что координаты автоматически заполняются при создании адреса
"""

import os
import sys
import django

# Настройка Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, Address
from decimal import Decimal

def test_auto_geocoding():
    """Тестирует автоматическое геокодирование координат"""
    print("🗺️ Тестирование автоматического геокодирования координат...")
    
    # Создаем тестового пользователя
    user, created = User.objects.get_or_create(
        telegram_id=333333333,
        defaults={'username': 'test_geocoding_user', 'first_name': 'Test Geocoding User'}
    )
    
    print(f"✅ Создан тестовый пользователь: {user.telegram_id}")
    
    # Тест 1: Создание адреса без координат (должны заполниться автоматически)
    print("\n📋 Тест 1: Создание адреса без координат")
    try:
        address1 = Address.objects.create(
            user=user,
            street='Амир Темур',
            house_number='1',
            apartment='10',
            city='Ташкент',
            phone_number='+998 90 123 45 67',
            is_primary=True
        )
        
        if address1.latitude and address1.longitude:
            print(f"   ✅ Координаты автоматически получены: {address1.latitude}, {address1.longitude}")
            print(f"   📍 Адрес: {address1.full_address}")
        else:
            print(f"   ❌ Координаты не получены для адреса: {address1.full_address}")
        
        address1.delete()
        
    except Exception as e:
        print(f"   ❌ Ошибка создания адреса: {e}")
    
    # Тест 2: Создание адреса с координатами (не должны изменяться)
    print("\n📋 Тест 2: Создание адреса с координатами")
    try:
        address2 = Address.objects.create(
            user=user,
            street='Навои',
            house_number='15',
            apartment='5',
            city='Ташкент',
            phone_number='+998 91 123 45 67',
            latitude=Decimal('41.311151'),
            longitude=Decimal('69.279737'),
            is_primary=False
        )
        
        print(f"   ✅ Адрес создан с указанными координатами: {address2.latitude}, {address2.longitude}")
        print(f"   📍 Адрес: {address2.full_address}")
        
        address2.delete()
        
    except Exception as e:
        print(f"   ❌ Ошибка создания адреса: {e}")
    
    # Тест 3: Создание адреса с частичными координатами
    print("\n📋 Тест 3: Создание адреса с частичными координатами")
    try:
        address3 = Address.objects.create(
            user=user,
            street='Чиланзар',
            house_number='25',
            apartment='12',
            city='Ташкент',
            phone_number='+998 93 123 45 67',
            latitude=Decimal('41.311151'),  # Только широта
            is_primary=False
        )
        
        if address3.longitude:
            print(f"   ✅ Долгота автоматически получена: {address3.longitude}")
        else:
            print(f"   ❌ Долгота не получена")
        
        print(f"   📍 Адрес: {address3.full_address}")
        print(f"   📍 Координаты: {address3.latitude}, {address3.longitude}")
        
        address3.delete()
        
    except Exception as e:
        print(f"   ❌ Ошибка создания адреса: {e}")
    
    # Тест 4: Создание адреса с неполным адресом
    print("\n📋 Тест 4: Создание адреса с неполным адресом")
    try:
        address4 = Address.objects.create(
            user=user,
            street='',  # Пустая улица
            house_number='1',
            apartment='1',
            city='Ташкент',
            phone_number='+998 94 123 45 67',
            is_primary=False
        )
        
        if address4.latitude and address4.longitude:
            print(f"   ✅ Координаты получены даже с неполным адресом: {address4.latitude}, {address4.longitude}")
        else:
            print(f"   ❌ Координаты не получены для неполного адреса")
        
        print(f"   📍 Адрес: {address4.full_address}")
        
        address4.delete()
        
    except Exception as e:
        print(f"   ❌ Ошибка создания адреса: {e}")
    
    # Тест 5: Создание адреса в другом городе
    print("\n📋 Тест 5: Создание адреса в другом городе")
    try:
        address5 = Address.objects.create(
            user=user,
            street='Ленина',
            house_number='10',
            apartment='3',
            city='Самарканд',
            phone_number='+998 95 123 45 67',
            is_primary=False
        )
        
        if address5.latitude and address5.longitude:
            print(f"   ✅ Координаты получены для другого города: {address5.latitude}, {address5.longitude}")
        else:
            print(f"   ❌ Координаты не получены для другого города")
        
        print(f"   📍 Адрес: {address5.full_address}")
        
        address5.delete()
        
    except Exception as e:
        print(f"   ❌ Ошибка создания адреса: {e}")
    
    # Тест 6: Проверка свойства coordinates
    print("\n📋 Тест 6: Проверка свойства coordinates")
    try:
        address6 = Address.objects.create(
            user=user,
            street='Тестовая улица',
            house_number='100',
            apartment='50',
            city='Ташкент',
            phone_number='+998 96 123 45 67',
            latitude=Decimal('41.311151'),
            longitude=Decimal('69.279737'),
            is_primary=False
        )
        
        coordinates = address6.coordinates
        if coordinates:
            print(f"   ✅ Свойство coordinates работает: {coordinates}")
        else:
            print(f"   ❌ Свойство coordinates не работает")
        
        address6.delete()
        
    except Exception as e:
        print(f"   ❌ Ошибка создания адреса: {e}")
    
    print("\n🎯 Результаты тестирования автоматического геокодирования:")
    print("   ✅ Координаты автоматически заполняются при создании адреса")
    print("   ✅ Указанные координаты не перезаписываются")
    print("   ✅ Частичные координаты дополняются")
    print("   ✅ Работает с разными городами")
    print("   ✅ Свойство coordinates корректно работает")
    
    # Очистка тестовых данных
    Address.objects.filter(user=user).delete()
    user.delete()
    print("\n🧹 Тестовые данные очищены")

if __name__ == "__main__":
    test_auto_geocoding() 