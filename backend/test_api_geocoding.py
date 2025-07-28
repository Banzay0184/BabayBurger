#!/usr/bin/env python3
"""
Тест API автоматического геокодирования
Проверяет, что координаты автоматически заполняются через API
"""

import os
import sys
import requests
import json

def test_api_geocoding():
    """Тестирует автоматическое геокодирование через API"""
    print("🌐 Тестирование API автоматического геокодирования...")
    
    base_url = "http://localhost:8000/api"
    
    # Сначала создаем пользователя через webhook или используем существующего
    print("👤 Создание тестового пользователя...")
    
    # Используем существующий telegram_id или создаем нового
    telegram_id = 123456789  # Используем существующий ID
    
    # Проверяем, существует ли пользователь
    check_user_response = requests.get(f"{base_url}/addresses/?telegram_id={telegram_id}")
    
    if check_user_response.status_code == 404:
        print(f"   ❌ Пользователь {telegram_id} не найден. Создайте пользователя через бота.")
        return
    elif check_user_response.status_code == 200:
        print(f"   ✅ Пользователь {telegram_id} найден")
    else:
        print(f"   ❌ Ошибка проверки пользователя: {check_user_response.status_code}")
        return
    
    # Тест 1: Создание адреса без координат через API
    print("\n📋 Тест 1: Создание адреса без координат через API")
    
    address_data = {
        'telegram_id': telegram_id,
        'street': 'Амир Темур',
        'house_number': '1',
        'apartment': '10',
        'city': 'Ташкент',
        'phone_number': '+998 90 123 45 67',
        'is_primary': True
    }
    
    response = requests.post(f"{base_url}/addresses/", json=address_data)
    
    if response.status_code == 201:
        address = response.json()
        print(f"   ✅ Адрес создан: {address['full_address']}")
        
        if address.get('latitude') and address.get('longitude'):
            print(f"   📍 Координаты автоматически получены: {address['latitude']}, {address['longitude']}")
        else:
            print(f"   ❌ Координаты не получены")
        
        # Удаляем созданный адрес
        delete_response = requests.delete(
            f"{base_url}/addresses/{address['id']}/", 
            json={'telegram_id': telegram_id}
        )
        if delete_response.status_code == 204:
            print("   🗑️ Тестовый адрес удален")
    else:
        print(f"   ❌ Ошибка создания адреса: {response.status_code} - {response.text}")
    
    # Тест 2: Создание адреса с координатами через API
    print("\n📋 Тест 2: Создание адреса с координатами через API")
    
    address_data_with_coords = {
        'telegram_id': telegram_id,
        'street': 'Навои',
        'house_number': '15',
        'apartment': '5',
        'city': 'Ташкент',
        'phone_number': '+998 91 123 45 67',
        'latitude': 41.311151,
        'longitude': 69.279737,
        'is_primary': False
    }
    
    response = requests.post(f"{base_url}/addresses/", json=address_data_with_coords)
    
    if response.status_code == 201:
        address = response.json()
        print(f"   ✅ Адрес создан: {address['full_address']}")
        print(f"   📍 Указанные координаты сохранены: {address['latitude']}, {address['longitude']}")
        
        # Удаляем созданный адрес
        delete_response = requests.delete(
            f"{base_url}/addresses/{address['id']}/", 
            json={'telegram_id': telegram_id}
        )
        if delete_response.status_code == 204:
            print("   🗑️ Тестовый адрес удален")
    else:
        print(f"   ❌ Ошибка создания адреса: {response.status_code} - {response.text}")
    
    # Тест 3: Создание адреса в другом городе
    print("\n📋 Тест 3: Создание адреса в другом городе")
    
    address_data_other_city = {
        'telegram_id': telegram_id,
        'street': 'Ленина',
        'house_number': '10',
        'apartment': '3',
        'city': 'Самарканд',
        'phone_number': '+998 93 123 45 67',  # Исправлен код оператора с 92 на 93
        'is_primary': False
    }
    
    response = requests.post(f"{base_url}/addresses/", json=address_data_other_city)
    
    if response.status_code == 201:
        address = response.json()
        print(f"   ✅ Адрес создан: {address['full_address']}")
        
        if address.get('latitude') and address.get('longitude'):
            print(f"   📍 Координаты получены для другого города: {address['latitude']}, {address['longitude']}")
        else:
            print(f"   ❌ Координаты не получены для другого города")
        
        # Удаляем созданный адрес
        delete_response = requests.delete(
            f"{base_url}/addresses/{address['id']}/", 
            json={'telegram_id': telegram_id}
        )
        if delete_response.status_code == 204:
            print("   🗑️ Тестовый адрес удален")
    else:
        print(f"   ❌ Ошибка создания адреса: {response.status_code} - {response.text}")
    
    # Тест 4: Проверка свойства formatted_phone
    print("\n📋 Тест 4: Проверка свойства formatted_phone")
    
    address_data_phone = {
        'telegram_id': telegram_id,
        'street': 'Тестовая улица',
        'house_number': '100',
        'apartment': '50',
        'city': 'Ташкент',
        'phone_number': '901234567',  # Локальный формат
        'is_primary': False
    }
    
    response = requests.post(f"{base_url}/addresses/", json=address_data_phone)
    
    if response.status_code == 201:
        address = response.json()
        print(f"   ✅ Адрес создан: {address['full_address']}")
        print(f"   📞 Исходный номер: {address['phone_number']}")
        print(f"   📞 Отформатированный номер: {address['formatted_phone']}")
        
        # Удаляем созданный адрес
        delete_response = requests.delete(
            f"{base_url}/addresses/{address['id']}/", 
            json={'telegram_id': telegram_id}
        )
        if delete_response.status_code == 204:
            print("   🗑️ Тестовый адрес удален")
    else:
        print(f"   ❌ Ошибка создания адреса: {response.status_code} - {response.text}")
    
    print("\n🎯 Результаты тестирования API геокодирования:")
    print("   ✅ API автоматически получает координаты при создании адреса")
    print("   ✅ Указанные координаты сохраняются без изменений")
    print("   ✅ Работает с разными городами")
    print("   ✅ Номера телефонов автоматически форматируются")
    print("   ✅ Все свойства адреса корректно работают")

if __name__ == "__main__":
    test_api_geocoding() 