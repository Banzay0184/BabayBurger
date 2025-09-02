#!/usr/bin/env python3
"""
Live тест WebSocket функциональности
Создает тестовый заказ и проверяет WebSocket уведомления
"""

import os
import sys
import django
import json
import time
import asyncio
import websockets
from pathlib import Path

# Добавляем путь к проекту
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Order, User, Address, MenuItem, OrderItem
from app_operator.models import Operator
from django.utils import timezone
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

async def test_websocket_connection():
    """Тестирует WebSocket соединение"""
    print("🔌 Тестирование WebSocket соединения...")
    
    try:
        # Подключаемся к WebSocket
        uri = "ws://localhost:8000/ws/operator/"
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket подключен успешно")
            
            # Отправляем ping
            ping_message = {
                "type": "ping",
                "timestamp": int(time.time() * 1000)
            }
            await websocket.send(json.dumps(ping_message))
            print("📤 Ping отправлен")
            
            # Ждем pong ответ
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(response)
            
            if data.get("type") == "pong":
                print("✅ Pong получен - соединение работает")
                return True
            else:
                print(f"❌ Неожиданный ответ: {data}")
                return False
                
    except Exception as e:
        print(f"❌ Ошибка WebSocket соединения: {e}")
        return False

def create_test_order():
    """Создает тестовый заказ"""
    print("📝 Создание тестового заказа...")
    
    try:
        # Создаем тестового пользователя
        user, created = User.objects.get_or_create(
            telegram_id=999999999,
            defaults={
                'username': 'test_websocket_user',
                'first_name': 'WebSocket',
                'last_name': 'Test'
            }
        )
        
        # Создаем тестовый адрес
        address, created = Address.objects.get_or_create(
            user=user,
            street='Test Street',
            house_number='123',
            city='Test City',
            latitude=41.2995,
            longitude=69.2401,
            defaults={
                'is_primary': True,
                'phone_number': '+998901234567'
            }
        )
        
        # Получаем первый доступный товар
        menu_item = MenuItem.objects.first()
        if not menu_item:
            print("❌ Нет доступных товаров в меню")
            return None
        
        # Создаем заказ
        order = Order.objects.create(
            user=user,
            total_price=50000.00,
            status='pending',
            service_type='delivery',
            address=address,
            phone='+998901234567'
        )
        
        # Добавляем товар в заказ
        OrderItem.objects.create(
            order=order,
            menu_item=menu_item,
            quantity=1,
            price=menu_item.price
        )
        
        print(f"✅ Тестовый заказ #{order.id} создан")
        return order
        
    except Exception as e:
        print(f"❌ Ошибка создания заказа: {e}")
        return None

async def test_order_notification():
    """Тестирует уведомления о заказах через WebSocket"""
    print("🔔 Тестирование уведомлений о заказах...")
    
    try:
        # Подключаемся к WebSocket
        uri = "ws://localhost:8000/ws/operator/"
        async with websockets.connect(uri) as websocket:
            print("✅ WebSocket подключен для тестирования уведомлений")
            
            # Подписываемся на обновления заказов
            subscribe_message = {
                "type": "subscribe_orders"
            }
            await websocket.send(json.dumps(subscribe_message))
            print("📤 Подписка на заказы отправлена")
            
            # Ждем подтверждение подписки
            response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
            data = json.loads(response)
            print(f"📨 Ответ на подписку: {data}")
            
            # Создаем тестовый заказ
            order = create_test_order()
            if not order:
                return False
            
            # Ждем уведомление о новом заказе
            print("⏳ Ожидание уведомления о новом заказе...")
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=10.0)
                data = json.loads(response)
                
                if data.get("type") == "order_created":
                    print("✅ Уведомление о новом заказе получено!")
                    print(f"📋 Заказ ID: {data.get('order', {}).get('id')}")
                    print(f"💰 Сумма: {data.get('order', {}).get('total_price')} UZS")
                    return True
                else:
                    print(f"❌ Неожиданный тип сообщения: {data.get('type')}")
                    return False
                    
            except asyncio.TimeoutError:
                print("❌ Таймаут ожидания уведомления о заказе")
                return False
                
    except Exception as e:
        print(f"❌ Ошибка тестирования уведомлений: {e}")
        return False

async def test_channel_layer():
    """Тестирует Channel Layer"""
    print("🔗 Тестирование Channel Layer...")
    
    try:
        channel_layer = get_channel_layer()
        if not channel_layer:
            print("❌ Channel Layer не настроен")
            return False
        
        # Отправляем тестовое сообщение
        await channel_layer.group_send(
            'operators',
            {
                'type': 'test_message',
                'message': 'Тестовое сообщение от Channel Layer',
                'timestamp': timezone.now().isoformat()
            }
        )
        
        print("✅ Тестовое сообщение отправлено через Channel Layer")
        return True
        
    except Exception as e:
        print(f"❌ Ошибка Channel Layer: {e}")
        return False

async def main():
    """Основная функция тестирования"""
    print("🚀 Запуск live тестирования WebSocket функциональности\n")
    
    tests = [
        ("WebSocket соединение", test_websocket_connection),
        ("Channel Layer", test_channel_layer),
        ("Уведомления о заказах", test_order_notification)
    ]
    
    passed = 0
    total = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n{'='*50}")
        print(f"🧪 Тест: {test_name}")
        print('='*50)
        
        try:
            if asyncio.iscoroutinefunction(test_func):
                result = await test_func()
            else:
                result = test_func()
                
            if result:
                print(f"✅ {test_name} - ПРОЙДЕН")
                passed += 1
            else:
                print(f"❌ {test_name} - НЕ ПРОЙДЕН")
                
        except Exception as e:
            print(f"❌ {test_name} - ОШИБКА: {e}")
    
    print(f"\n{'='*50}")
    print(f"📊 Результаты live тестирования: {passed}/{total} тестов прошли успешно")
    print('='*50)
    
    if passed == total:
        print("🎉 Все live тесты прошли! WebSocket полностью функционален.")
        return True
    else:
        print("❌ Некоторые live тесты не прошли. Проверьте настройки.")
        return False

if __name__ == '__main__':
    try:
        success = asyncio.run(main())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️ Тестирование прервано пользователем")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Критическая ошибка: {e}")
        sys.exit(1)
