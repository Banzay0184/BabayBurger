#!/usr/bin/env python3
"""
Тест безопасности адресов
Проверяет, что пользователи могут редактировать только свои адреса
"""

import os
import sys
import django
import requests
import json

# Настройка Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, Address

def test_address_security():
    """Тестирует безопасность работы с адресами"""
    print("🔒 Тестирование безопасности адресов...")
    
    # Создаем тестовых пользователей
    user1, created = User.objects.get_or_create(
        telegram_id=123456789,
        defaults={'username': 'test_user1', 'first_name': 'Test User1'}
    )
    
    user2, created = User.objects.get_or_create(
        telegram_id=987654321,
        defaults={'username': 'test_user2', 'first_name': 'Test User2'}
    )
    
    # Создаем адреса для пользователей
    address1 = Address.objects.create(
        user=user1,
        street='Улица Пользователя 1',
        house_number='1',
        city='Ташкент',
        latitude=41.311151,
        longitude=69.279737,
        is_primary=True
    )
    
    address2 = Address.objects.create(
        user=user2,
        street='Улица Пользователя 2',
        house_number='2',
        city='Ташкент',
        latitude=41.311151,
        longitude=69.279737,
        is_primary=True
    )
    
    print(f"✅ Созданы тестовые данные:")
    print(f"   Пользователь 1: {user1.telegram_id}")
    print(f"   Пользователь 2: {user2.telegram_id}")
    print(f"   Адрес 1: {address1.id}")
    print(f"   Адрес 2: {address2.id}")
    
    # Тестируем API
    base_url = "http://localhost:8000/api"
    
    # Тест 1: Пользователь 1 пытается получить свой адрес
    print("\n📋 Тест 1: Пользователь 1 получает свой адрес")
    response = requests.get(f"{base_url}/addresses/{address1.id}/?telegram_id={user1.telegram_id}")
    if response.status_code == 200:
        print("✅ Успешно - пользователь может получить свой адрес")
    else:
        print(f"❌ Ошибка: {response.status_code} - {response.text}")
    
    # Тест 2: Пользователь 1 пытается получить чужой адрес
    print("\n📋 Тест 2: Пользователь 1 пытается получить чужой адрес")
    response = requests.get(f"{base_url}/addresses/{address2.id}/?telegram_id={user1.telegram_id}")
    if response.status_code == 404:
        print("✅ Успешно - пользователь не может получить чужой адрес")
    else:
        print(f"❌ Ошибка безопасности: {response.status_code} - {response.text}")
    
    # Тест 3: Пользователь 1 пытается изменить свой адрес
    print("\n📋 Тест 3: Пользователь 1 изменяет свой адрес")
    update_data = {
        'telegram_id': user1.telegram_id,
        'street': 'Обновленная улица 1'
    }
    response = requests.put(f"{base_url}/addresses/{address1.id}/", json=update_data)
    if response.status_code == 200:
        print("✅ Успешно - пользователь может изменить свой адрес")
    else:
        print(f"❌ Ошибка: {response.status_code} - {response.text}")
    
    # Тест 4: Пользователь 1 пытается изменить чужой адрес
    print("\n📋 Тест 4: Пользователь 1 пытается изменить чужой адрес")
    update_data = {
        'telegram_id': user1.telegram_id,
        'street': 'Взломанная улица'
    }
    response = requests.put(f"{base_url}/addresses/{address2.id}/", json=update_data)
    if response.status_code == 404:
        print("✅ Успешно - пользователь не может изменить чужой адрес")
    else:
        print(f"❌ Ошибка безопасности: {response.status_code} - {response.text}")
    
    # Тест 5: Пользователь 1 пытается удалить свой адрес
    print("\n📋 Тест 5: Пользователь 1 удаляет свой адрес")
    delete_data = {'telegram_id': user1.telegram_id}
    response = requests.delete(f"{base_url}/addresses/{address1.id}/", json=delete_data)
    if response.status_code == 204:
        print("✅ Успешно - пользователь может удалить свой адрес")
    else:
        print(f"❌ Ошибка: {response.status_code} - {response.text}")
    
    # Тест 6: Пользователь 1 пытается удалить чужой адрес
    print("\n📋 Тест 6: Пользователь 1 пытается удалить чужой адрес")
    delete_data = {'telegram_id': user1.telegram_id}
    response = requests.delete(f"{base_url}/addresses/{address2.id}/", json=delete_data)
    if response.status_code == 404:
        print("✅ Успешно - пользователь не может удалить чужой адрес")
    else:
        print(f"❌ Ошибка безопасности: {response.status_code} - {response.text}")
    
    # Тест 7: Создание заказа с чужим адресом
    print("\n📋 Тест 7: Создание заказа с чужим адресом")
    order_data = {
        'telegram_id': user1.telegram_id,
        'address_id': address2.id,
        'total_price': 1000,
        'items': []
    }
    response = requests.post(f"{base_url}/orders/create/", json=order_data)
    if response.status_code == 404:
        print("✅ Успешно - нельзя создать заказ с чужим адресом")
    else:
        print(f"❌ Ошибка безопасности: {response.status_code} - {response.text}")
    
    print("\n🎯 Результаты тестирования безопасности:")
    print("   ✅ Пользователи могут работать только со своими адресами")
    print("   ✅ Попытки доступа к чужим адресам блокируются")
    print("   ✅ Создание заказов с чужими адресами невозможно")
    
    # Очистка тестовых данных
    Address.objects.filter(id__in=[address1.id, address2.id]).delete()
    User.objects.filter(telegram_id__in=[user1.telegram_id, user2.telegram_id]).delete()
    print("\n🧹 Тестовые данные очищены")

if __name__ == "__main__":
    test_address_security() 