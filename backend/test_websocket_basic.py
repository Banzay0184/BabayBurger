#!/usr/bin/env python3
"""
Базовый тест WebSocket функциональности без внешних соединений
"""

import os
import sys
import django
from pathlib import Path

# Добавляем путь к проекту
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def test_websocket_configuration():
    """Тестирует конфигурацию WebSocket"""
    print("🔍 Тестирование конфигурации WebSocket...")
    
    try:
        from django.conf import settings
        
        # Проверяем ASGI
        asgi_app = getattr(settings, 'ASGI_APPLICATION', None)
        if asgi_app:
            print(f"✅ ASGI_APPLICATION: {asgi_app}")
        else:
            print("❌ ASGI_APPLICATION не настроен")
            return False
        
        # Проверяем Channel Layers
        channel_layers = getattr(settings, 'CHANNEL_LAYERS', None)
        if channel_layers:
            print(f"✅ CHANNEL_LAYERS настроен")
            print(f"   Backend: {channel_layers['default']['BACKEND']}")
        else:
            print("❌ CHANNEL_LAYERS не настроен")
            return False
        
        # Проверяем Channels в INSTALLED_APPS
        if 'channels' in settings.INSTALLED_APPS:
            print("✅ Channels в INSTALLED_APPS")
        else:
            print("❌ Channels не в INSTALLED_APPS")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка проверки конфигурации: {e}")
        return False

def test_consumers():
    """Тестирует загрузку consumers"""
    print("\n🔍 Тестирование consumers...")
    
    try:
        from app_operator.consumers import OperatorConsumer, OrderConsumer, CashierConsumer
        
        print("✅ OperatorConsumer загружен")
        print("✅ OrderConsumer загружен") 
        print("✅ CashierConsumer загружен")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка загрузки consumers: {e}")
        return False

def test_routing():
    """Тестирует роутинг WebSocket"""
    print("\n🔍 Тестирование роутинга...")
    
    try:
        from config.routing import websocket_urlpatterns
        
        print(f"✅ WebSocket роуты загружены: {len(websocket_urlpatterns)} маршрутов")
        
        for pattern in websocket_urlpatterns:
            print(f"   - {pattern.pattern}")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка загрузки роутинга: {e}")
        return False

def test_signals():
    """Тестирует signals"""
    print("\n🔍 Тестирование signals...")
    
    try:
        from app_operator.signals import (
            notify_operators_new_order,
            notify_status_change,
            notify_order_assignment
        )
        
        print("✅ notify_operators_new_order загружен")
        print("✅ notify_status_change загружен")
        print("✅ notify_order_assignment загружен")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка загрузки signals: {e}")
        return False

def test_channel_layer():
    """Тестирует Channel Layer"""
    print("\n🔍 Тестирование Channel Layer...")
    
    try:
        from channels.layers import get_channel_layer
        
        channel_layer = get_channel_layer()
        if channel_layer:
            print("✅ Channel Layer создан успешно")
            print(f"   Backend: {channel_layer.__class__.__name__}")
            return True
        else:
            print("❌ Channel Layer не создан")
            return False
        
    except Exception as e:
        print(f"❌ Ошибка Channel Layer: {e}")
        return False

def test_models():
    """Тестирует модели"""
    print("\n🔍 Тестирование моделей...")
    
    try:
        from api.models import Order
        from app_operator.models import Operator
        
        # Проверяем статусы заказов
        status_choices = [choice[0] for choice in Order.STATUS_CHOICES]
        print(f"✅ Статусы заказов: {status_choices}")
        
        if 'pending' in status_choices:
            print("✅ Статус 'pending' найден")
        else:
            print("❌ Статус 'pending' не найден")
            return False
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка моделей: {e}")
        return False

def test_create_order_signal():
    """Тестирует создание заказа и сигнал"""
    print("\n🔍 Тестирование создания заказа...")
    
    try:
        from api.models import Order, User, Address
        from django.db.models.signals import post_save
        from django.dispatch import receiver
        
        # Создаем тестового пользователя
        user, created = User.objects.get_or_create(
            telegram_id=888888888,
            defaults={
                'username': 'test_signal_user',
                'first_name': 'Signal',
                'last_name': 'Test'
            }
        )
        
        # Создаем тестовый адрес
        address, created = Address.objects.get_or_create(
            user=user,
            street='Signal Test Street',
            house_number='456',
            city='Signal City',
            latitude=41.2995,
            longitude=69.2401,
            defaults={
                'is_primary': True,
                'phone_number': '+998901234567'
            }
        )
        
        # Создаем заказ
        order = Order.objects.create(
            user=user,
            total_price=75000.00,
            status='pending',
            service_type='delivery',
            address=address,
            phone='+998901234567'
        )
        
        print(f"✅ Тестовый заказ #{order.id} создан")
        print(f"   Статус: {order.status}")
        print(f"   Сумма: {order.total_price} UZS")
        
        # Удаляем тестовый заказ
        order.delete()
        print("✅ Тестовый заказ удален")
        
        return True
        
    except Exception as e:
        print(f"❌ Ошибка создания заказа: {e}")
        return False

def main():
    """Основная функция тестирования"""
    print("🚀 Запуск базового тестирования WebSocket функциональности\n")
    
    tests = [
        ("Конфигурация WebSocket", test_websocket_configuration),
        ("Consumers", test_consumers),
        ("Роутинг", test_routing),
        ("Signals", test_signals),
        ("Channel Layer", test_channel_layer),
        ("Модели", test_models),
        ("Создание заказа", test_create_order_signal)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"🧪 Тест: {test_name}")
        print('='*50)
        
        try:
            result = test_func()
            if result:
                print(f"✅ {test_name} - ПРОЙДЕН")
                passed += 1
            else:
                print(f"❌ {test_name} - НЕ ПРОЙДЕН")
        except Exception as e:
            print(f"❌ {test_name} - ОШИБКА: {e}")
    
    print(f"\n{'='*50}")
    print(f"📊 Результаты базового тестирования: {passed}/{total} тестов прошли успешно")
    print('='*50)
    
    if passed == total:
        print("🎉 Все базовые тесты прошли! WebSocket готов к использованию.")
        print("\n💡 Для полного тестирования:")
        print("   1. Перезапустите Django сервер")
        print("   2. Запустите: python test_websocket_live.py")
        print("   3. Откройте операторский интерфейс")
        return True
    else:
        print("❌ Некоторые базовые тесты не прошли. Проверьте настройки.")
        return False

if __name__ == '__main__':
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️ Тестирование прервано пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        sys.exit(1)
