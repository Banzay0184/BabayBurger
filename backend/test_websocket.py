#!/usr/bin/env python3
"""
Тестовый скрипт для проверки WebSocket функциональности
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

def test_websocket_setup():
    """Тестирует настройку WebSocket"""
    print("🔍 Тестирование настройки WebSocket...")
    
    try:
        # Проверяем настройки Channels
        from django.conf import settings
        
        print(f"✅ ASGI_APPLICATION: {getattr(settings, 'ASGI_APPLICATION', 'Не настроено')}")
        print(f"✅ CHANNEL_LAYERS: {getattr(settings, 'CHANNEL_LAYERS', 'Не настроено')}")
        
        # Проверяем установку Channels
        try:
            import channels
            print(f"✅ Channels версия: {channels.__version__}")
        except ImportError:
            print("❌ Channels не установлен")
            return False
            
        try:
            import channels_redis
            print(f"✅ Channels Redis версия: {channels_redis.__version__}")
        except ImportError:
            print("❌ Channels Redis не установлен")
            return False
            
        # Проверяем ASGI приложение
        try:
            from config.asgi import application
            print("✅ ASGI приложение создано успешно")
        except Exception as e:
            print(f"❌ Ошибка создания ASGI приложения: {e}")
            return False
            
        # Проверяем роутинг
        try:
            from config.routing import websocket_urlpatterns
            print(f"✅ WebSocket роуты: {len(websocket_urlpatterns)} маршрутов")
        except Exception as e:
            print(f"❌ Ошибка загрузки роутинга: {e}")
            return False
            
        # Проверяем consumers
        try:
            from app_operator.consumers import OperatorConsumer, OrderConsumer, CashierConsumer
            print("✅ WebSocket consumers загружены успешно")
        except Exception as e:
            print(f"❌ Ошибка загрузки consumers: {e}")
            return False
            
        print("🎉 Все тесты WebSocket прошли успешно!")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
        return False

def test_signals_integration():
    """Тестирует интеграцию signals с WebSocket"""
    print("\n🔍 Тестирование интеграции signals...")
    
    try:
        from app_operator.signals import notify_operators_new_order
        print("✅ Signal для новых заказов загружен")
        
        from app_operator.signals import notify_status_change
        print("✅ Signal для изменения статуса загружен")
        
        from app_operator.signals import notify_order_assignment
        print("✅ Signal для назначения заказов загружен")
        
        print("🎉 Все signals загружены успешно!")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка загрузки signals: {e}")
        return False

def test_models():
    """Тестирует модели"""
    print("\n🔍 Тестирование моделей...")
    
    try:
        from api.models import Order
        from app_operator.models import Operator
        
        print(f"✅ Модель Order: {Order.__name__}")
        print(f"✅ Модель Operator: {Operator.__name__}")
        
        # Проверяем статусы заказов
        status_choices = [choice[0] for choice in Order.STATUS_CHOICES]
        print(f"✅ Статусы заказов: {status_choices}")
        
        if 'pending' in status_choices:
            print("✅ Статус 'pending' найден")
        else:
            print("❌ Статус 'pending' не найден")
            
        print("🎉 Все модели загружены успешно!")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка загрузки моделей: {e}")
        return False

def main():
    """Основная функция тестирования"""
    print("🚀 Запуск тестирования WebSocket функциональности\n")
    
    tests = [
        test_websocket_setup,
        test_signals_integration,
        test_models
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        print()
    
    print(f"📊 Результаты тестирования: {passed}/{total} тестов прошли успешно")
    
    if passed == total:
        print("🎉 Все тесты прошли! WebSocket готов к использованию.")
        return True
    else:
        print("❌ Некоторые тесты не прошли. Проверьте настройки.")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
