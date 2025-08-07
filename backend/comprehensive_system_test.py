#!/usr/bin/env python3
"""
Комплексный тест системы доставки StreetBurger
Проверяет все компоненты системы и нагрузочное тестирование
"""

import os
import sys
import django
import time
import random
import threading
from decimal import Decimal
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import connection
from django.core.cache import cache
from django.db import models

# Импорт моделей
from app_operator.models import (
    Operator, OperatorSession, OrderAssignment, 
    OrderStatusHistory, OperatorNotification, OperatorAnalytics
)
from api.models import (
    User, Address, DeliveryZone, Category, MenuItem, 
    AddOn, SizeOption, Order, OrderItem, Promotion
)

User = get_user_model()

class ComprehensiveSystemTest:
    """
    Комплексный тест системы доставки
    """
    
    def __init__(self):
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': [],
            'performance': {},
            'load_test_results': {}
        }
        self.start_time = time.time()
        self.test_counter = 0
        
    def get_unique_id(self):
        """Генерирует уникальный ID для тестов"""
        self.test_counter += 1
        return self.test_counter
        
    def log_test(self, test_name, success=True, error=None, duration=None):
        """Логирование результатов теста"""
        if success:
            self.test_results['passed'] += 1
            print(f"✅ {test_name} - ПРОЙДЕН" + (f" ({duration:.2f}s)" if duration else ""))
        else:
            self.test_results['failed'] += 1
            self.test_results['errors'].append({
                'test': test_name,
                'error': str(error)
            })
            print(f"❌ {test_name} - ПРОВАЛЕН: {error}")
    
    def test_database_connection(self):
        """Тест подключения к базе данных"""
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                assert result[0] == 1
            self.log_test("Подключение к базе данных")
            return True
        except Exception as e:
            self.log_test("Подключение к базе данных", False, e)
            return False
    
    def test_model_creation(self):
        """Тест создания всех моделей"""
        try:
            unique_id = self.get_unique_id()
            
            # Создаем тестовые данные с уникальными ID
            # Используем api.models.User для Address и Order
            api_user = User.objects.create(
                telegram_id=999999999 + unique_id,
                username=f"test_user_{unique_id}",
                first_name="Тест",
                created_at=timezone.now()
            )
            
            # Создаем зону доставки
            zone = DeliveryZone.objects.create(
                name=f"Тестовая зона {unique_id}",
                city="Бухара",
                center_latitude=39.7681,
                center_longitude=64.4556,
                radius_km=3.0,
                delivery_fee=5000,
                min_order_amount=30000
            )
            
            # Создаем категорию
            category = Category.objects.create(
                name=f"Тестовая категория {unique_id}",
                description="Описание тестовой категории"
            )
            
            # Создаем меню
            menu_item = MenuItem.objects.create(
                name=f"Тестовый бургер {unique_id}",
                description="Описание тестового бургера",
                price=25000,
                category=category
            )
            
            # Создаем адрес с api.models.User
            address = Address.objects.create(
                street=f"Тестовая улица {unique_id}",
                house_number=str(unique_id),
                city="Бухара",
                phone_number=f"9012345{unique_id:03d}",
                user=api_user  # Используем api.models.User
            )
            
            # Создаем заказ с api.models.User
            order = Order.objects.create(
                total_price=25000,
                status="pending",
                delivery_fee=5000,
                discounted_total=25000,
                address=address,
                user=api_user  # Используем api.models.User
            )
            
            # Создаем оператора с уникальным номером телефона
            operator = Operator.objects.create(
                username=f"test_operator_{unique_id}",
                password="testpass123",
                first_name="Оператор",
                last_name="Тестовый",
                email=f"operator{unique_id}@test.com",
                phone=f"9012245{unique_id:03d}",
                is_active_operator=True
            )
            operator.assigned_zones.add(zone)
            
            # Создаем сессию оператора
            session = OperatorSession.objects.create(
                operator=operator,
                status="active"
            )
            
            # Создаем назначение заказа
            assignment = OrderAssignment.objects.create(
                order=order,
                operator=operator,
                status="assigned"
            )
            
            # Создаем уведомление
            notification = OperatorNotification.objects.create(
                operator=operator,
                notification_type="new_order",
                title="Новый заказ",
                message="Поступил новый заказ",
                order=order
            )
            
            # Создаем аналитику (только с существующими полями)
            analytics = OperatorAnalytics.objects.create(
                operator=operator,
                date=timezone.now().date(),
                total_orders=1,
                completed_orders=1,
                cancelled_orders=0,
                total_delivery_time=30,
                avg_delivery_time=30,
                total_earnings=25000
            )
            
            # Проверяем связи
            assert order.user == api_user
            assert order.address == address
            assert assignment.order == order
            assert assignment.operator == operator
            assert notification.operator == operator
            assert analytics.operator == operator
            
            # Очищаем тестовые данные
            analytics.delete()
            notification.delete()
            assignment.delete()
            session.delete()
            operator.delete()
            order.delete()
            address.delete()
            menu_item.delete()
            category.delete()
            zone.delete()
            api_user.delete()
            
            self.log_test("Создание всех моделей")
            return True
            
        except Exception as e:
            self.log_test("Создание всех моделей", False, e)
            return False
    
    def test_operator_workflow(self):
        """Тест полного workflow оператора"""
        try:
            unique_id = self.get_unique_id()
            
            # Создаем тестовые данные
            api_user = User.objects.create(
                telegram_id=888888888 + unique_id,
                username=f"workflow_user_{unique_id}",
                first_name="Workflow",
                created_at=timezone.now()
            )
            
            zone = DeliveryZone.objects.create(
                name=f"Workflow зона {unique_id}",
                city="Бухара",
                center_latitude=39.7681,
                center_longitude=64.4556,
                radius_km=3.0,
                delivery_fee=5000,
                min_order_amount=30000
            )
            
            address = Address.objects.create(
                street=f"Workflow улица {unique_id}",
                house_number=str(unique_id),
                city="Бухара",
                phone_number=f"9012345{unique_id:03d}",
                user=api_user  # Используем api.models.User
            )
            
            order = Order.objects.create(
                total_price=35000,
                status="pending",
                delivery_fee=5000,
                discounted_total=35000,
                address=address,
                user=api_user  # Используем api.models.User
            )
            
            # Создаем оператора с уникальным номером телефона
            operator = Operator.objects.create(
                username=f"workflow_operator_{unique_id}",
                password="workflow123",
                first_name="Workflow",
                last_name="Оператор",
                email=f"workflow{unique_id}@test.com",
                phone=f"9012345{unique_id:03d}",
                is_active_operator=True
            )
            operator.assigned_zones.add(zone)
            
            # Создаем сессию оператора
            session = OperatorSession.objects.create(
                operator=operator,
                status="active"
            )
            
            # Создаем назначение заказа
            assignment = OrderAssignment.objects.create(
                order=order,
                operator=operator,
                status="assigned"
            )
            
            # Симулируем полный workflow
            # 1. Оператор принимает заказ
            assignment.accept_assignment()
            assert assignment.status == "accepted"
            
            # 2. Изменяем статус заказа
            order.status = "confirmed"
            order.save()
            
            # Создаем запись в истории статусов
            OrderStatusHistory.objects.create(
                order=order,
                operator=operator,
                old_status="pending",
                new_status="confirmed",
                reason="Заказ подтвержден оператором"
            )
            
            # 3. Заказ готовится
            order.status = "preparing"
            order.save()
            
            OrderStatusHistory.objects.create(
                order=order,
                operator=operator,
                old_status="confirmed",
                new_status="preparing",
                reason="Заказ готовится"
            )
            
            # 4. Заказ готов к доставке
            order.status = "ready_for_delivery"
            order.save()
            
            OrderStatusHistory.objects.create(
                order=order,
                operator=operator,
                old_status="preparing",
                new_status="ready_for_delivery",
                reason="Заказ готов к доставке"
            )
            
            # 5. Заказ в доставке
            order.status = "in_delivery"
            order.save()
            
            OrderStatusHistory.objects.create(
                order=order,
                operator=operator,
                old_status="ready_for_delivery",
                new_status="in_delivery",
                reason="Заказ в доставке"
            )
            
            # 6. Заказ доставлен
            order.status = "delivered"
            order.save()
            
            OrderStatusHistory.objects.create(
                order=order,
                operator=operator,
                old_status="in_delivery",
                new_status="delivered",
                reason="Заказ доставлен"
            )
            
            # 7. Завершаем назначение
            assignment.complete_assignment()
            assert assignment.status == "completed"
            
            # 8. Завершаем сессию
            session.end_session()
            assert session.status == "completed"
            
            # Проверяем статистику
            assert session.orders_handled >= 1
            assert session.start_time is not None
            assert session.end_time is not None
            
            # Очищаем тестовые данные
            OrderStatusHistory.objects.filter(order=order).delete()
            assignment.delete()
            session.delete()
            operator.delete()
            order.delete()
            address.delete()
            zone.delete()
            api_user.delete()
            
            self.log_test("Workflow оператора")
            return True
            
        except Exception as e:
            self.log_test("Workflow оператора", False, e)
            return False
    
    def test_performance_queries(self):
        """Тест производительности запросов"""
        try:
            unique_id = self.get_unique_id()
            
            # Создаем тестовые данные
            api_user = User.objects.create(
                telegram_id=777777777 + unique_id,
                username=f"perf_user_{unique_id}",
                first_name="Performance",
                created_at=timezone.now()
            )
            
            zone = DeliveryZone.objects.create(
                name=f"Performance зона {unique_id}",
                city="Бухара",
                center_latitude=39.7681,
                center_longitude=64.4556,
                radius_km=3.0,
                delivery_fee=5000,
                min_order_amount=30000
            )
            
            address = Address.objects.create(
                street=f"Performance улица {unique_id}",
                house_number=str(unique_id),
                city="Бухара",
                phone_number=f"9012345{unique_id:03d}",
                user=api_user
            )
            
            # Создаем оператора с уникальным номером телефона
            operator = Operator.objects.create(
                username=f"perf_operator_{unique_id}",
                password="perf123",
                first_name="Оператор",
                last_name="Тест",
                email=f"perf{unique_id}@test.com",
                phone=f"9012345{unique_id:03d}",
                is_active_operator=True
            )
            operator.assigned_zones.add(zone)
            
            # Создаем несколько заказов для тестирования
            orders = []
            for i in range(10):
                order = Order.objects.create(
                    total_price=25000 + (i * 1000),
                    status="pending",
                    delivery_fee=5000,
                    discounted_total=25000 + (i * 1000),
                    address=address,
                    user=api_user
                )
                orders.append(order)
                
                # Создаем назначения
                OrderAssignment.objects.create(
                    order=order,
                    operator=operator,
                    status="assigned"
                )
            
            # Тестируем производительность запросов
            start_time = time.time()
            
            # 1. Запрос активных операторов
            active_operators = Operator.objects.filter(is_active_operator=True)
            active_count = active_operators.count()
            
            # 2. Запрос заказов по статусу
            pending_orders = Order.objects.filter(status="pending")
            pending_count = pending_orders.count()
            
            # 3. Запрос назначений оператора
            operator_assignments = OrderAssignment.objects.filter(operator=operator)
            assignment_count = operator_assignments.count()
            
            # 4. Запрос сессий оператора
            operator_sessions = OperatorSession.objects.filter(operator=operator)
            session_count = operator_sessions.count()
            
            # 5. Сложный запрос с JOIN
            orders_with_assignments = Order.objects.select_related('assignment__operator').filter(
                assignment__operator=operator
            )
            complex_count = orders_with_assignments.count()
            
            query_time = time.time() - start_time
            
            # Проверяем результаты
            assert active_count >= 1
            assert pending_count >= 10
            assert assignment_count >= 10
            assert session_count >= 0
            assert complex_count >= 10
            
            # Сохраняем метрики производительности
            self.test_results['performance']['query_time'] = query_time
            self.test_results['performance']['active_operators'] = active_count
            self.test_results['performance']['pending_orders'] = pending_count
            
            # Очищаем тестовые данные
            OrderAssignment.objects.filter(operator=operator).delete()
            for order in orders:
                order.delete()
            operator.delete()
            address.delete()
            zone.delete()
            api_user.delete()
            
            self.log_test("Производительность запросов")
            return True
            
        except Exception as e:
            self.log_test("Производительность запросов", False, e)
            return False
    
    def load_test_concurrent_orders(self, num_orders=50, num_threads=5):
        """Нагрузочный тест с одновременными заказами"""
        print(f"🚀 Нагрузочный тест: {num_orders} заказов, {num_threads} потоков")
        
        try:
            unique_id = self.get_unique_id()
            
            # Создаем тестовые данные
            api_user = User.objects.create(
                telegram_id=666666666 + unique_id,
                username=f"load_user_{unique_id}",
                first_name="Load",
                created_at=timezone.now()
            )
            
            zone = DeliveryZone.objects.create(
                name=f"Load Test Zone",
                city="Бухара",
                center_latitude=39.7681,
                center_longitude=64.4556,
                radius_km=3.0,
                delivery_fee=5000,
                min_order_amount=30000
            )
            
            address = Address.objects.create(
                street=f"Load Test Street {unique_id}",
                house_number=str(unique_id),
                city="Бухара",
                phone_number=f"9012345{unique_id:03d}",
                user=api_user
            )
            
            # Создаем оператора с уникальным номером телефона
            operator = Operator.objects.create(
                username=f"load_test_operator",
                password="load123",
                first_name="Load",
                last_name="Test",
                email=f"load{unique_id}@test.com",
                phone=f"9012345{unique_id:03d}",
                is_active_operator=True
            )
            operator.assigned_zones.add(zone)
            
            # Создаем начальную аналитику
            try:
                analytics, created = OperatorAnalytics.objects.get_or_create(
                    operator=operator,
                    date=timezone.now().date(),
                    defaults={
                        'total_orders': 0,
                        'completed_orders': 0,
                        'cancelled_orders': 0,
                        'total_delivery_time': 0,
                        'avg_delivery_time': 0,
                        'total_earnings': 0
                    }
                )
            except Exception as e:
                print(f"Ошибка при создании начальной аналитики: {e}")
            
            # Создаем пользователей для нагрузочного теста
            load_users = []
            for i in range(num_orders):
                user = User.objects.create(
                    telegram_id=200000000 + i,
                    username=f"load_user_{i}",
                    first_name=f"LoadUser{i}",
                    created_at=timezone.now()
                )
                load_users.append(user)
            
            orders_created = []
            orders_processed = []
            
            def create_order(order_id):
                """Создает заказ в отдельном потоке"""
                try:
                    user = load_users[order_id % len(load_users)]
                    order = Order.objects.create(
                        total_price=25000 + (order_id * 100),
                        status="pending",
                        delivery_fee=5000,
                        discounted_total=25000 + (order_id * 100),
                        address=address,
                        user=user
                    )
                    
                    # Создаем назначение
                    assignment = OrderAssignment.objects.create(
                        order=order,
                        operator=operator,
                        status="assigned"
                    )
                    
                    return {
                        'order_id': order_id,
                        'order': order,
                        'assignment': assignment,
                        'success': True
                    }
                except Exception as e:
                    return {
                        'order_id': order_id,
                        'error': str(e),
                        'success': False
                    }
            
            def process_order(order_id):
                """Обрабатывает заказ в отдельном потоке"""
                try:
                    # Симулируем обработку заказа
                    time.sleep(random.uniform(0.1, 0.5))
                    
                    # Находим заказ
                    order = Order.objects.filter(
                        user__username=f"load_user_{order_id % len(load_users)}"
                    ).first()
                    
                    if order:
                        # Изменяем статус
                        order.status = "confirmed"
                        order.save()
                        
                        # Создаем историю статуса
                        OrderStatusHistory.objects.create(
                            order=order,
                            operator=operator,
                            old_status="pending",
                            new_status="confirmed",
                            reason=f"Заказ {order_id} обработан"
                        )
                        
                        return {
                            'order_id': order_id,
                            'success': True,
                            'status': 'confirmed'
                        }
                    else:
                        return {
                            'order_id': order_id,
                            'success': False,
                            'error': 'Order not found'
                        }
                        
                except Exception as e:
                    return {
                        'order_id': order_id,
                        'success': False,
                        'error': str(e)
                    }
            
            # Запускаем создание заказов в параллельных потоках
            start_time = time.time()
            
            with ThreadPoolExecutor(max_workers=num_threads) as executor:
                # Создаем заказы
                create_futures = [executor.submit(create_order, i) for i in range(num_orders)]
                
                for future in as_completed(create_futures):
                    result = future.result()
                    if result['success']:
                        orders_created.append(result)
                    else:
                        print(f"Ошибка создания заказа {result['order_id']}: {result['error']}")
            
            # Запускаем обработку заказов
            with ThreadPoolExecutor(max_workers=num_threads) as executor:
                process_futures = [executor.submit(process_order, i) for i in range(num_orders)]
                
                for future in as_completed(process_futures):
                    result = future.result()
                    if result['success']:
                        orders_processed.append(result)
                    else:
                        print(f"Ошибка обработки заказа {result['order_id']}: {result['error']}")
            
            end_time = time.time()
            total_time = end_time - start_time
            
            # Сохраняем результаты
            test_key = f"load_test_{unique_id}"
            self.test_results['load_test_results'][test_key] = {
                'total_orders': num_orders,
                'orders_created': len(orders_created),
                'orders_processed': len(orders_processed),
                'total_time': total_time,
                'orders_per_second': num_orders / total_time if total_time > 0 else 0,
                'success_rate': len(orders_created) / num_orders * 100 if num_orders > 0 else 0
            }
            
            print(f"📊 Результаты нагрузочного теста:")
            print(f"   Заказов создано: {len(orders_created)}/{num_orders}")
            print(f"   Заказов обработано: {len(orders_processed)}/{num_orders}")
            print(f"   Общее время: {total_time:.2f}с")
            print(f"   Заказов в секунду: {num_orders / total_time:.2f}")
            print(f"   Успешность: {len(orders_created) / num_orders * 100:.1f}%")
            
            # Очищаем тестовые данные
            OrderStatusHistory.objects.filter(operator=operator).delete()
            OrderAssignment.objects.filter(operator=operator).delete()
            Order.objects.filter(address=address).delete()
            for user in load_users:
                user.delete()
            operator.delete()
            address.delete()
            zone.delete()
            api_user.delete()
            
            return True
            
        except Exception as e:
            print(f"❌ Ошибка нагрузочного теста: {e}")
            return False
    
    def test_cache_performance(self):
        """Тест производительности кэша"""
        try:
            # Очищаем кэш
            cache.clear()
            
            # Тестируем запись в кэш
            start_time = time.time()
            
            cache.set('test_key', 'test_value', 300)  # 5 минут
            cache.set('test_key_2', 'test_value_2', 300)
            cache.set('test_key_3', 'test_value_3', 300)
            
            # Тестируем чтение из кэша
            value1 = cache.get('test_key')
            value2 = cache.get('test_key_2')
            value3 = cache.get('test_key_3')
            
            end_time = time.time()
            cache_time = end_time - start_time
            
            # Проверяем результаты
            assert value1 == 'test_value'
            assert value2 == 'test_value_2'
            assert value3 == 'test_value_3'
            
            # Сохраняем метрики
            self.test_results['performance']['cache_time'] = cache_time
            
            self.log_test("Производительность кэша")
            return True
            
        except Exception as e:
            self.log_test("Производительность кэша", False, e)
            return False
    
    def test_memory_usage(self):
        """Тест использования памяти"""
        try:
            # Пытаемся импортировать psutil
            try:
                import psutil
                process = psutil.Process()
                
                # Получаем информацию о памяти
                memory_info = process.memory_info()
                memory_percent = process.memory_percent()
                
                # Сохраняем метрики
                self.test_results['performance']['memory_rss'] = memory_info.rss
                self.test_results['performance']['memory_percent'] = memory_percent
                
                print(f"💾 Использование памяти:")
                print(f"   RSS: {memory_info.rss / 1024 / 1024:.2f} MB")
                print(f"   Процент: {memory_percent:.2f}%")
                
                self.log_test("Использование памяти")
                return True
                
            except ImportError:
                print("⚠️  psutil не установлен, пропускаем тест памяти")
                self.log_test("Использование памяти", False, "psutil не установлен")
                return False
                
        except Exception as e:
            self.log_test("Использование памяти", False, e)
            return False
    
    def run_all_tests(self):
        """Запуск всех тестов"""
        print("🧪 ЗАПУСК КОМПЛЕКСНОГО ТЕСТА СИСТЕМЫ")
        print("=" * 60)
        
        # Тест подключения к БД
        self.test_database_connection()
        
        # Тест создания моделей
        self.test_model_creation()
        
        # Тест workflow оператора
        self.test_operator_workflow()
        
        # Тест производительности запросов
        self.test_performance_queries()
        
        # Тест производительности кэша
        self.test_cache_performance()
        
        # Тест использования памяти
        self.test_memory_usage()
        
        # Нагрузочный тест
        self.load_test_concurrent_orders(50, 5)
        
        # Выводим результаты
        self.print_results()
    
    def print_results(self):
        """Выводит итоговые результаты"""
        print("\n" + "=" * 60)
        print("📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ")
        print("=" * 60)
        
        total_tests = self.test_results['passed'] + self.test_results['failed']
        
        print(f"✅ Пройдено тестов: {self.test_results['passed']}")
        print(f"❌ Провалено тестов: {self.test_results['failed']}")
        print(f"📈 Общий результат: {self.test_results['passed']}/{total_tests}")
        
        if self.test_results['errors']:
            print("\n🚨 ОШИБКИ:")
            for error in self.test_results['errors']:
                print(f"   {error['test']}: {error['error']}")
        
        if self.test_results['performance']:
            print("\n⚡ МЕТРИКИ ПРОИЗВОДИТЕЛЬНОСТИ:")
            for key, value in self.test_results['performance'].items():
                if isinstance(value, float):
                    print(f"   {key}: {value:.4f}")
                else:
                    print(f"   {key}: {value}")
        
        if self.test_results['load_test_results']:
            print("\n🚀 РЕЗУЛЬТАТЫ НАГРУЗОЧНЫХ ТЕСТОВ:")
            for test_key, results in self.test_results['load_test_results'].items():
                print(f"   {test_key}:")
                print(f"     Заказов: {results['total_orders']}")
                print(f"     Создано: {results['orders_created']}")
                print(f"     Обработано: {results['orders_processed']}")
                print(f"     Время: {results['total_time']:.2f}с")
                print(f"     Заказов/сек: {results['orders_per_second']:.2f}")
                print(f"     Успешность: {results['success_rate']:.1f}%")
        
        total_time = time.time() - self.start_time
        print(f"\n⏱️  Общее время тестирования: {total_time:.2f}с")
        print("=" * 60)


if __name__ == "__main__":
    # Запускаем тесты
    test_suite = ComprehensiveSystemTest()
    test_suite.run_all_tests() 