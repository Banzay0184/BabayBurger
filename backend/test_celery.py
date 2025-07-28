#!/usr/bin/env python
"""
Скрипт для тестирования Celery
"""
import os
import sys
import django
import time

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.tasks import send_telegram_notification, send_bulk_notifications
from config.celery import debug_task

def test_celery_connection():
    """Тестирует подключение к Celery"""
    print("🔧 Тестирование подключения к Celery")
    print("=" * 50)
    
    try:
        # Тестируем простую задачу
        result = debug_task.delay()
        print(f"✅ Задача отправлена: {result.id}")
        
        # Ждем результат
        task_result = result.get(timeout=10)
        print(f"✅ Результат задачи: {task_result}")
        
        return True
    except Exception as e:
        print(f"❌ Ошибка подключения к Celery: {str(e)}")
        return False

def test_notification_task():
    """Тестирует задачу отправки уведомлений"""
    print("\n📧 Тестирование задачи отправки уведомлений")
    print("=" * 50)
    
    try:
        # Тестовые данные
        test_chat_id = 123456789  # Замените на реальный chat_id
        test_message = "🧪 Тестовое уведомление от Celery"
        
        # Отправляем тестовое уведомление
        result = send_telegram_notification.delay(test_chat_id, test_message)
        print(f"✅ Уведомление отправлено в очередь: {result.id}")
        
        # Ждем результат
        task_result = result.get(timeout=30)
        print(f"✅ Результат отправки: {task_result}")
        
        return True
    except Exception as e:
        print(f"❌ Ошибка отправки уведомления: {str(e)}")
        return False

def test_bulk_notifications():
    """Тестирует массовую отправку уведомлений"""
    print("\n📨 Тестирование массовой отправки уведомлений")
    print("=" * 50)
    
    try:
        # Тестовые данные
        notifications_data = [
            {
                'chat_id': 123456789,
                'message': '🧪 Тестовое уведомление 1',
                'parse_mode': 'HTML'
            },
            {
                'chat_id': 123456789,
                'message': '🧪 Тестовое уведомление 2',
                'parse_mode': 'HTML'
            }
        ]
        
        # Отправляем массовые уведомления
        result = send_bulk_notifications.delay(notifications_data)
        print(f"✅ Массовые уведомления отправлены в очередь: {result.id}")
        
        # Ждем результат
        task_result = result.get(timeout=60)
        print(f"✅ Результат массовой отправки: {task_result}")
        
        return True
    except Exception as e:
        print(f"❌ Ошибка массовой отправки: {str(e)}")
        return False

def test_celery_monitoring():
    """Тестирует мониторинг Celery"""
    print("\n📊 Тестирование мониторинга Celery")
    print("=" * 50)
    
    try:
        from celery.result import AsyncResult
        from config.celery import app
        
        # Получаем статистику
        inspect = app.control.inspect()
        
        # Активные задачи
        active = inspect.active()
        if active:
            print(f"✅ Активные задачи: {len(active)}")
        else:
            print("ℹ️  Нет активных задач")
        
        # Зарегистрированные задачи
        registered = inspect.registered()
        if registered:
            print(f"✅ Зарегистрированные задачи: {list(registered.keys())}")
        else:
            print("ℹ️  Нет зарегистрированных задач")
        
        # Статистика воркеров
        stats = inspect.stats()
        if stats:
            print(f"✅ Воркеры: {list(stats.keys())}")
        else:
            print("ℹ️  Нет активных воркеров")
        
        return True
    except Exception as e:
        print(f"❌ Ошибка мониторинга: {str(e)}")
        return False

def main():
    """Основная функция тестирования"""
    print("🚀 Тестирование Celery")
    print("=" * 50)
    
    tests = [
        test_celery_connection,
        test_notification_task,
        test_bulk_notifications,
        test_celery_monitoring
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
        except Exception as e:
            print(f"❌ Ошибка в тесте {test.__name__}: {str(e)}")
    
    print(f"\n📊 Результаты тестирования: {passed}/{total} тестов пройдено")
    
    if passed == total:
        print("✅ Все тесты пройдены успешно!")
    else:
        print("⚠️  Некоторые тесты не пройдены")
    
    print("\n💡 Для запуска Celery worker:")
    print("1. Убедитесь, что Redis запущен")
    print("2. Запустите: python start_celery.py")
    print("3. Или: celery -A config worker --loglevel=info")

if __name__ == "__main__":
    main() 