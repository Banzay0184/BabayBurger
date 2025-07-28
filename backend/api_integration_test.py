#!/usr/bin/env python3
"""
Тест интеграции API для операторов доставки
Проверяет все API эндпоинты и их функциональность
"""

import os
import sys
import django
import json
import time
from decimal import Decimal

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status

from app_operator.models import (
    Operator, OperatorSession, OrderAssignment, 
    OrderStatusHistory, OperatorNotification, OperatorAnalytics
)
from api.models import (
    User, Address, DeliveryZone, Category, MenuItem, 
    AddOn, SizeOption, Order, OrderItem, Promotion
)

User = get_user_model()

class APIIntegrationTest:
    """
    Тест интеграции API для операторов
    """
    
    def __init__(self):
        self.client = APIClient()
        self.test_results = {
            'passed': 0,
            'failed': 0,
            'errors': [],
            'api_tests': {}
        }
        self.test_operator = None
        self.test_order = None
        self.test_session = None
        
    def log_test(self, test_name, success=True, error=None, response_data=None):
        """Логирование результатов теста"""
        if success:
            self.test_results['passed'] += 1
            print(f"✅ {test_name} - ПРОЙДЕН")
        else:
            self.test_results['failed'] += 1
            self.test_results['errors'].append({
                'test': test_name,
                'error': str(error),
                'response': response_data
            })
            print(f"❌ {test_name} - ПРОВАЛЕН: {error}")
    
    def setup_test_data(self):
        """Создание тестовых данных"""
        try:
            # Создаем зону доставки
            self.zone = DeliveryZone.objects.create(
                name="API Test Zone",
                city="Бухара",
                center_latitude=39.7681,
                center_longitude=64.4556,
                radius_km=3.0,
                delivery_fee=5000,
                min_order_amount=30000
            )
            
            # Создаем оператора
            self.test_operator = Operator.objects.create(
                username="api_test_operator",
                password="api123",
                first_name="API",
                last_name="Test",
                email="api@test.com",
                phone="901234572",
                is_active_operator=True
            )
            self.test_operator.assigned_zones.add(self.zone)
            
            # Создаем пользователя и заказ
            self.test_user = User.objects.create(
                telegram_id=300000000,
                username="api_test_user",
                first_name="APIUser",
                created_at=timezone.now()
            )
            
            self.test_address = Address.objects.create(
                street="API Test Street",
                house_number="3",
                city="Бухара",
                phone_number="901234573",
                user=self.test_user
            )
            
            self.test_order = Order.objects.create(
                total_price=35000,
                status="pending",
                delivery_fee=5000,
                discounted_total=35000,
                address=self.test_address,
                user=self.test_user
            )
            
            return True
        except Exception as e:
            print(f"Ошибка создания тестовых данных: {e}")
            return False
    
    def cleanup_test_data(self):
        """Очистка тестовых данных"""
        try:
            if hasattr(self, 'test_session'):
                self.test_session.delete()
            if hasattr(self, 'test_order'):
                self.test_order.delete()
            if hasattr(self, 'test_address'):
                self.test_address.delete()
            if hasattr(self, 'test_user'):
                self.test_user.delete()
            if hasattr(self, 'test_operator'):
                self.test_operator.delete()
            if hasattr(self, 'zone'):
                self.zone.delete()
        except Exception as e:
            print(f"Ошибка очистки данных: {e}")
    
    def test_operator_registration(self):
        """Тест регистрации оператора"""
        try:
            url = reverse('operator-register')
            data = {
                'username': 'new_operator',
                'password': 'newpass123',
                'first_name': 'Новый',
                'last_name': 'Оператор',
                'email': 'new@operator.com',
                'phone': '901234574',
                'telegram_id': 123456789
            }
            
            response = self.client.post(url, data, format='json')
            
            if response.status_code == status.HTTP_201_CREATED:
                # Проверяем, что оператор создан
                operator = Operator.objects.get(username='new_operator')
                assert operator.first_name == 'Новый'
                assert operator.phone == '901234574'
                
                # Очищаем тестового оператора
                operator.delete()
                
                self.log_test("Регистрация оператора")
                return True
            else:
                self.log_test("Регистрация оператора", False, f"Status: {response.status_code}", response.data)
                return False
                
        except Exception as e:
            self.log_test("Регистрация оператора", False, e)
            return False
    
    def test_operator_login(self):
        """Тест входа оператора"""
        try:
            url = reverse('operator-login')
            data = {
                'username': 'api_test_operator',
                'password': 'api123'
            }
            
            response = self.client.post(url, data, format='json')
            
            if response.status_code == status.HTTP_200_OK:
                assert 'access' in response.data
                assert 'refresh' in response.data
                
                # Сохраняем токен для других тестов
                self.access_token = response.data['access']
                self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
                
                self.log_test("Вход оператора")
                return True
            else:
                self.log_test("Вход оператора", False, f"Status: {response.status_code}", response.data)
                return False
                
        except Exception as e:
            self.log_test("Вход оператора", False, e)
            return False
    
    def test_operator_profile(self):
        """Тест получения профиля оператора"""
        try:
            url = reverse('operator-profile')
            response = self.client.get(url)
            
            if response.status_code == status.HTTP_200_OK:
                data = response.data
                assert data['username'] == 'api_test_operator'
                assert data['first_name'] == 'API'
                assert data['phone'] == '901234572'
                
                self.log_test("Получение профиля оператора")
                return True
            else:
                self.log_test("Получение профиля оператора", False, f"Status: {response.status_code}", response.data)
                return False
                
        except Exception as e:
            self.log_test("Получение профиля оператора", False, e)
            return False
    
    def test_operator_sessions(self):
        """Тест управления сессиями оператора"""
        try:
            # Создание сессии
            url = reverse('operator-sessions')
            data = {
                'notes': 'Тестовая сессия'
            }
            
            response = self.client.post(url, data, format='json')
            
            if response.status_code == status.HTTP_201_CREATED:
                session_id = response.data['id']
                
                # Получение текущей сессии
                url = reverse('operator-sessions-current')
                response = self.client.get(url)
                
                if response.status_code == status.HTTP_200_OK:
                    assert response.data['status'] == 'active'
                    
                    # Завершение сессии
                    url = reverse('operator-sessions-end', kwargs={'id': session_id})
                    response = self.client.post(url)
                    
                    if response.status_code == status.HTTP_200_OK:
                        assert response.data['status'] == 'completed'
                        
                        self.log_test("Управление сессиями оператора")
                        return True
                    else:
                        self.log_test("Управление сессиями оператора", False, "Ошибка завершения сессии", response.data)
                        return False
                else:
                    self.log_test("Управление сессиями оператора", False, "Ошибка получения сессии", response.data)
                    return False
            else:
                self.log_test("Управление сессиями оператора", False, "Ошибка создания сессии", response.data)
                return False
                
        except Exception as e:
            self.log_test("Управление сессиями оператора", False, e)
            return False
    
    def test_orders_list(self):
        """Тест получения списка заказов"""
        try:
            url = reverse('operator-orders')
            response = self.client.get(url)
            
            if response.status_code == status.HTTP_200_OK:
                # Проверяем структуру ответа
                assert 'results' in response.data or isinstance(response.data, list)
                
                self.log_test("Получение списка заказов")
                return True
            else:
                self.log_test("Получение списка заказов", False, f"Status: {response.status_code}", response.data)
                return False
                
        except Exception as e:
            self.log_test("Получение списка заказов", False, e)
            return False
    
    def test_order_details(self):
        """Тест получения деталей заказа"""
        try:
            url = reverse('operator-order-details', kwargs={'id': self.test_order.id})
            response = self.client.get(url)
            
            if response.status_code == status.HTTP_200_OK:
                data = response.data
                assert data['id'] == self.test_order.id
                assert 'address' in data
                assert 'items' in data
                
                self.log_test("Получение деталей заказа")
                return True
            else:
                self.log_test("Получение деталей заказа", False, f"Status: {response.status_code}", response.data)
                return False
                
        except Exception as e:
            self.log_test("Получение деталей заказа", False, e)
            return False
    
    def test_order_assignment(self):
        """Тест назначения заказа оператору"""
        try:
            url = reverse('operator-order-assign', kwargs={'id': self.test_order.id})
            response = self.client.post(url)
            
            if response.status_code == status.HTTP_200_OK:
                # Проверяем, что назначение создано
                assignment = OrderAssignment.objects.get(order=self.test_order)
                assert assignment.operator == self.test_operator
                assert assignment.status == 'assigned'
                
                self.log_test("Назначение заказа оператору")
                return True
            else:
                self.log_test("Назначение заказа оператору", False, f"Status: {response.status_code}", response.data)
                return False
                
        except Exception as e:
            self.log_test("Назначение заказа оператору", False, e)
            return False
    
    def test_order_status_change(self):
        """Тест изменения статуса заказа"""
        try:
            url = reverse('operator-order-change-status', kwargs={'id': self.test_order.id})
            data = {
                'new_status': 'processing',
                'reason': 'Заказ принят в обработку'
            }
            
            response = self.client.put(url, data, format='json')
            
            if response.status_code == status.HTTP_200_OK:
                # Проверяем, что статус изменился
                self.test_order.refresh_from_db()
                assert self.test_order.status == 'processing'
                
                # Проверяем, что создана история
                history = OrderStatusHistory.objects.filter(order=self.test_order).first()
                assert history is not None
                assert history.new_status == 'processing'
                
                self.log_test("Изменение статуса заказа")
                return True
            else:
                self.log_test("Изменение статуса заказа", False, f"Status: {response.status_code}", response.data)
                return False
                
        except Exception as e:
            self.log_test("Изменение статуса заказа", False, e)
            return False
    
    def test_notifications(self):
        """Тест уведомлений оператора"""
        try:
            # Создаем тестовое уведомление
            notification = OperatorNotification.objects.create(
                operator=self.test_operator,
                notification_type='new_order',
                title='Тестовое уведомление',
                message='Это тестовое уведомление',
                order=self.test_order
            )
            
            # Получаем список уведомлений
            url = reverse('operator-notifications')
            response = self.client.get(url)
            
            if response.status_code == status.HTTP_200_OK:
                assert len(response.data) > 0
                
                # Отмечаем как прочитанное
                url = reverse('operator-notifications-mark-read')
                data = {'notification_ids': [notification.id]}
                response = self.client.post(url, data, format='json')
                
                if response.status_code == status.HTTP_200_OK:
                    notification.refresh_from_db()
                    assert notification.is_read == True
                    
                    self.log_test("Управление уведомлениями")
                    return True
                else:
                    self.log_test("Управление уведомлениями", False, "Ошибка отметки прочитанного", response.data)
                    return False
            else:
                self.log_test("Управление уведомлениями", False, "Ошибка получения уведомлений", response.data)
                return False
                
        except Exception as e:
            self.log_test("Управление уведомлениями", False, e)
            return False
    
    def test_analytics(self):
        """Тест аналитики оператора"""
        try:
            # Создаем тестовую аналитику
            analytics = OperatorAnalytics.objects.create(
                operator=self.test_operator,
                date=timezone.now().date(),
                total_orders=5,
                completed_orders=4,
                cancelled_orders=1,
                total_delivery_time=120,
                avg_delivery_time=30,
                total_earnings=150000
            )
            
            # Получаем аналитику
            url = reverse('operator-analytics-daily')
            response = self.client.get(url)
            
            if response.status_code == status.HTTP_200_OK:
                assert len(response.data) > 0
                
                self.log_test("Получение аналитики")
                return True
            else:
                self.log_test("Получение аналитики", False, f"Status: {response.status_code}", response.data)
                return False
                
        except Exception as e:
            self.log_test("Получение аналитики", False, e)
            return False
    
    def test_delivery_zones(self):
        """Тест получения зон доставки"""
        try:
            url = reverse('operator-delivery-zones')
            response = self.client.get(url)
            
            if response.status_code == status.HTTP_200_OK:
                assert len(response.data) > 0
                
                self.log_test("Получение зон доставки")
                return True
            else:
                self.log_test("Получение зон доставки", False, f"Status: {response.status_code}", response.data)
                return False
                
        except Exception as e:
            self.log_test("Получение зон доставки", False, e)
            return False
    
    def run_all_api_tests(self):
        """Запуск всех API тестов"""
        print("🌐 ЗАПУСК ТЕСТОВ API ИНТЕГРАЦИИ")
        print("=" * 50)
        
        # Создаем тестовые данные
        if not self.setup_test_data():
            print("❌ Ошибка создания тестовых данных")
            return False
        
        try:
            # Запускаем тесты
            self.test_operator_registration()
            self.test_operator_login()
            self.test_operator_profile()
            self.test_operator_sessions()
            self.test_orders_list()
            self.test_order_details()
            self.test_order_assignment()
            self.test_order_status_change()
            self.test_notifications()
            self.test_analytics()
            self.test_delivery_zones()
            
            # Выводим результаты
            self.print_results()
            
            return self.test_results['failed'] == 0
            
        finally:
            # Очищаем тестовые данные
            self.cleanup_test_data()
    
    def print_results(self):
        """Вывод результатов API тестирования"""
        print("\n" + "=" * 50)
        print("📊 РЕЗУЛЬТАТЫ API ТЕСТИРОВАНИЯ")
        print("=" * 50)
        
        print(f"✅ Пройдено тестов: {self.test_results['passed']}")
        print(f"❌ Провалено тестов: {self.test_results['failed']}")
        
        if self.test_results['errors']:
            print("\n🔍 ОШИБКИ API:")
            for error in self.test_results['errors']:
                print(f"  - {error['test']}: {error['error']}")
                if error.get('response'):
                    print(f"    Ответ: {error['response']}")
        
        print("\n" + "=" * 50)

if __name__ == "__main__":
    # Запускаем API тесты
    api_test = APIIntegrationTest()
    success = api_test.run_all_api_tests()
    
    if success:
        print("\n🎉 ВСЕ API ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        sys.exit(0)
    else:
        print("\n💥 ЕСТЬ ПРОВАЛЕННЫЕ API ТЕСТЫ!")
        sys.exit(1) 