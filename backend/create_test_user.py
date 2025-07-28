#!/usr/bin/env python3
"""
Создание тестового пользователя для тестирования API
"""

import os
import sys
import django

# Настройка Django
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User

def create_test_user():
    """Создает тестового пользователя"""
    print("👤 Создание тестового пользователя...")
    
    telegram_id = 123456789
    
    try:
        user, created = User.objects.get_or_create(
            telegram_id=telegram_id,
            defaults={
                'username': 'test_user',
                'first_name': 'Test User'
            }
        )
        
        if created:
            print(f"   ✅ Пользователь создан: telegram_id={telegram_id}")
        else:
            print(f"   ✅ Пользователь уже существует: telegram_id={telegram_id}")
        
        print(f"   📋 Данные пользователя:")
        print(f"      ID: {user.id}")
        print(f"      Telegram ID: {user.telegram_id}")
        print(f"      Username: {user.username}")
        print(f"      First Name: {user.first_name}")
        print(f"      Created: {user.created_at}")
        
        return user
        
    except Exception as e:
        print(f"   ❌ Ошибка создания пользователя: {e}")
        return None

if __name__ == "__main__":
    create_test_user() 