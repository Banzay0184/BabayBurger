#!/usr/bin/env python3
"""
Скрипт для создания тестовых адресов
"""

import os
import sys
import django
from pathlib import Path

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, Address

def create_test_addresses():
    """Создает тестовые адреса"""
    print("🏠 СОЗДАНИЕ ТЕСТОВЫХ АДРЕСОВ")
    print("=" * 50)
    
    try:
        # Получаем пользователей
        users = User.objects.all()
        
        if not users.exists():
            print("❌ Пользователи не найдены")
            print("💡 Сначала создайте пользователей через бота")
            return False
        
        # Тестовые адреса для Ташкента
        test_addresses = [
            {
                'street': 'Амир Темур',
                'house_number': '123',
                'apartment': '45',
                'city': 'Ташкент',
                'latitude': 41.2995,
                'longitude': 69.2401,
                'phone_number': '+998901234567',
                'comment': 'Около метро Амир Темур'
            },
            {
                'street': 'Чиланзар',
                'house_number': '78',
                'apartment': '12',
                'city': 'Ташкент',
                'latitude': 41.2847,
                'longitude': 69.2045,
                'phone_number': '+998901234568',
                'comment': 'Рядом с парком'
            },
            {
                'street': 'Сергели',
                'house_number': '15',
                'apartment': '3',
                'city': 'Ташкент',
                'latitude': 41.2750,
                'longitude': 69.2150,
                'phone_number': '+998901234569',
                'comment': 'Улица с хорошим доступом'
            }
        ]
        
        created_count = 0
        for user in users:
            for i, address_data in enumerate(test_addresses):
                # Первый адрес делаем основным
                address_data['is_primary'] = (i == 0)
                
                address, created = Address.objects.get_or_create(
                    user=user,
                    street=address_data['street'],
                    house_number=address_data['house_number'],
                    defaults=address_data
                )
                
                if created:
                    print(f"✅ Создан адрес для {user.first_name}: {address.full_address}")
                    created_count += 1
                else:
                    print(f"⏭️  Адрес уже существует: {address.full_address}")
        
        print(f"\n✅ Создано адресов: {created_count}")
        print(f"✅ Всего адресов в базе: {Address.objects.count()}")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка создания адресов: {e}")
        return False

def main():
    """Главная функция"""
    print("🏠 НАСТРОЙКА АДРЕСОВ")
    print("=" * 50)
    
    if create_test_addresses():
        print("\n🎉 Адреса успешно созданы!")
        print("📋 Что готово:")
        print("   ✅ Модель Address создана")
        print("   ✅ API endpoints настроены")
        print("   ✅ Тестовые адреса добавлены")
        print("\n�� Следующие шаги:")
        print("   1. Примените миграции: python manage.py migrate")
        print("   2. Протестируйте API: /api/addresses/")
        print("   3. Проверьте админ-панель")
    else:
        print("\n❌ Ошибка настройки адресов")

if __name__ == '__main__':
    main()