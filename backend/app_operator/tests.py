from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from datetime import datetime, timedelta
import json

from .models import (
    Operator, OperatorSession, OrderAssignment, 
    OrderStatusHistory, OperatorNotification, OperatorAnalytics
)
from api.models import Order, DeliveryZone, Address, User, MenuItem, Category

User = get_user_model()

class OperatorModelTest(TestCase):
    """
    Тесты для моделей операторов
    """
    
    def setUp(self):
        """Настройка тестовых данных"""
        # Создаем зону доставки
        self.delivery_zone = DeliveryZone.objects.create(
            name='Тестовая зона',
            city='Бухара',
            center_latitude=39.7681,
            center_longitude=64.4556,
            radius_km=5.0,
            delivery_fee=5000,
            is_active=True
        )
        
        # Создаем оператора
        self.operator = Operator.objects.create_user(
            username='test_operator',
            password='testpass123',
            first_name='Тест',
            last_name='Оператор',
            email='test@example.com',
            phone='901234567',
            is_active_operator=True
        )
        self.operator.assigned_zones.add(self.delivery_zone)
        
        # Создаем пользователя и адрес
        self.user = User.objects.create(
            telegram_id=123456789,
            first_name='Тест',
            username='testuser'
        )
        
        self.address = Address.objects.create(
            user=self.user,
            street='Тестовая улица',
            house_number='1',
            city='Бухара',
            latitude=39.7681,
            longitude=64.4556,
            phone_number='901234567'
        )
        
        # Создаем категорию и товар
        self.category = Category.objects.create(name='Тестовая категория')
        self.menu_item = MenuItem.objects.create(
            name='Тестовый товар',
            price=10000,
            category=self.category
        )
        
        # Создаем заказ
        self.order = Order.objects.create(
            user=self.user,
            total_price=10000,
            status='pending',
            address=self.address,
            delivery_fee=5000,
            discounted_total=15000
        )

    def test_operator_creation(self):
        """Тест создания оператора"""
        self.assertEqual(self.operator.username, 'test_operator')
        self.assertEqual(self.operator.phone, '901234567')
        self.assertTrue(self.operator.is_active_operator)
        self.assertEqual(self.operator.assigned_zones.count(), 1)

    def test_operator_can_handle_order(self):
        """Тест проверки возможности обработки заказа"""
        can_handle, message = self.operator.can_handle_order(self.order)
        self.assertTrue(can_handle)
        self.assertIn('зоне', message)

    def test_operator_session(self):
        """Тест сессии оператора"""
        session = OperatorSession.objects.create(
            operator=self.operator,
            status='active'
        )
        
        self.assertEqual(session.operator, self.operator)
        self.assertEqual(session.status, 'active')
        self.assertIsNone(session.end_time)
        
        # Завершаем сессию
        session.end_session()
        self.assertEqual(session.status, 'completed')
        self.assertIsNotNone(session.end_time)

    def test_order_assignment(self):
        """Тест назначения заказа"""
        assignment = OrderAssignment.objects.create(
            order=self.order,
            operator=self.operator,
            status='assigned'
        )
        
        self.assertEqual(assignment.order, self.order)
        self.assertEqual(assignment.operator, self.operator)
        self.assertEqual(assignment.status, 'assigned')
        
        # Принимаем заказ
        assignment.accept_assignment()
        self.assertEqual(assignment.status, 'accepted')
        self.assertIsNotNone(assignment.accepted_at)

    def test_order_status_history(self):
        """Тест истории изменений статуса заказа"""
        history = OrderStatusHistory.objects.create(
            order=self.order,
            operator=self.operator,
            old_status='pending',
            new_status='preparing',
            reason='Тестовое изменение'
        )
        
        self.assertEqual(history.order, self.order)
        self.assertEqual(history.old_status, 'pending')
        self.assertEqual(history.new_status, 'preparing')

    def test_operator_notification(self):
        """Тест уведомлений оператора"""
        notification = OperatorNotification.objects.create(
            operator=self.operator,
            notification_type='new_order',
            title='Новый заказ',
            message='Тестовое уведомление',
            order=self.order
        )
        
        self.assertEqual(notification.operator, self.operator)
        self.assertEqual(notification.notification_type, 'new_order')
        self.assertFalse(notification.is_read)

    def test_operator_analytics(self):
        """Тест аналитики оператора"""
        # Удаляем существующую аналитику, если она есть
        OperatorAnalytics.objects.filter(operator=self.operator).delete()
        
        analytics = OperatorAnalytics.objects.create(
            operator=self.operator,
            date=timezone.now().date(),
            total_orders=10,
            completed_orders=8,
            cancelled_orders=1,
            total_delivery_time=240,
            avg_delivery_time=30,
            total_earnings=150000
        )
        
        self.assertEqual(analytics.operator, self.operator)
        self.assertEqual(analytics.total_orders, 10)
        self.assertEqual(analytics.completed_orders, 8)
        self.assertEqual(analytics.avg_delivery_time, 30)

class OperatorAPITest(APITestCase):
    """
    Тесты для API операторов
    """
    
    def setUp(self):
        """Настройка тестовых данных"""
        # Создаем зону доставки
        self.delivery_zone = DeliveryZone.objects.create(
            name='Тестовая зона',
            city='Бухара',
            center_latitude=39.7681,
            center_longitude=64.4556,
            radius_km=5.0,
            delivery_fee=5000,
            is_active=True
        )
        
        # Создаем оператора
        self.operator = Operator.objects.create_user(
            username='test_operator',
            password='testpass123',
            first_name='Тест',
            last_name='Оператор',
            email='test@example.com',
            phone='901234567',
            is_active_operator=True
        )
        self.operator.assigned_zones.add(self.delivery_zone)
        
        # Создаем токен для аутентификации
        self.token = Token.objects.create(user=self.operator)
        
        # Создаем пользователя и адрес
        self.user = User.objects.create(
            telegram_id=123456789,
            first_name='Тест',
            username='testuser'
        )
        
        self.address = Address.objects.create(
            user=self.user,
            street='Тестовая улица',
            house_number='1',
            city='Бухара',
            latitude=39.7681,
            longitude=64.4556,
            phone_number='901234567'
        )
        
        # Создаем заказ
        self.order = Order.objects.create(
            user=self.user,
            total_price=10000,
            status='pending',
            address=self.address,
            delivery_fee=5000,
            discounted_total=15000
        )

    def test_operator_registration(self):
        """Тест регистрации оператора"""
        url = reverse('operator-auth-register')
        data = {
            'username': 'new_operator',
            'password': 'newpass123',
            'password_confirm': 'newpass123',
            'first_name': 'Новый',
            'last_name': 'Оператор',
            'email': 'new@example.com',
            'phone': '901234568'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertIn('operator', response.data)

    def test_operator_login(self):
        """Тест входа оператора"""
        url = reverse('operator-auth-login')
        data = {
            'username': 'test_operator',
            'password': 'testpass123'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)

    def test_operator_profile(self):
        """Тест получения профиля оператора"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        url = reverse('operator-profile-me')
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'test_operator')

    def test_order_list(self):
        """Тест получения списка заказов"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        url = reverse('operator-orders-list')
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)

    def test_order_assign(self):
        """Тест назначения заказа"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        url = reverse('order-assign', kwargs={'pk': self.order.id})
        
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Проверяем, что назначение создано
        assignment = OrderAssignment.objects.filter(
            order=self.order,
            operator=self.operator
        ).first()
        self.assertIsNotNone(assignment)

    def test_order_accept(self):
        """Тест принятия заказа"""
        # Создаем назначение
        assignment = OrderAssignment.objects.create(
            order=self.order,
            operator=self.operator,
            status='assigned'
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        url = reverse('order-accept', kwargs={'pk': self.order.id})
        
        response = self.client.post(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Проверяем, что статус изменился
        assignment.refresh_from_db()
        self.assertEqual(assignment.status, 'accepted')

    def test_order_status_change(self):
        """Тест изменения статуса заказа"""
        # Создаем назначение
        assignment = OrderAssignment.objects.create(
            order=self.order,
            operator=self.operator,
            status='accepted'
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        url = reverse('order-change-status', kwargs={'pk': self.order.id})
        data = {
            'new_status': 'preparing',
            'reason': 'Начинаем готовить'
        }
        
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Проверяем, что статус заказа изменился
        self.order.refresh_from_db()
        self.assertEqual(self.order.status, 'preparing')

    def test_operator_session(self):
        """Тест создания сессии оператора"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        url = reverse('operator-sessions-list')
        data = {
            'notes': 'Тестовая сессия'
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Проверяем, что сессия создана
        session = OperatorSession.objects.filter(
            operator=self.operator,
            status='active'
        ).first()
        self.assertIsNotNone(session)

    def test_notifications(self):
        """Тест уведомлений"""
        # Создаем уведомление
        notification = OperatorNotification.objects.create(
            operator=self.operator,
            notification_type='new_order',
            title='Тестовое уведомление',
            message='Тестовое сообщение',
            order=self.order
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        url = reverse('operator-notifications-list')
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 1)

    def test_analytics(self):
        """Тест аналитики"""
        # Удаляем существующую аналитику, если она есть
        OperatorAnalytics.objects.filter(operator=self.operator).delete()
        
        # Создаем аналитику
        analytics = OperatorAnalytics.objects.create(
            operator=self.operator,
            date=timezone.now().date(),
            total_orders=10,
            completed_orders=8,
            cancelled_orders=1,
            total_delivery_time=240,
            avg_delivery_time=30,
            total_earnings=150000
        )
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {self.token.key}')
        url = reverse('operator-analytics-list')
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsInstance(response.data, list)
        self.assertEqual(len(response.data), 1)

class OperatorIntegrationTest(TestCase):
    """
    Интеграционные тесты для операторов
    """
    
    def setUp(self):
        """Настройка тестовых данных"""
        # Создаем зону доставки
        self.delivery_zone = DeliveryZone.objects.create(
            name='Тестовая зона',
            city='Бухара',
            center_latitude=39.7681,
            center_longitude=64.4556,
            radius_km=5.0,
            delivery_fee=5000,
            is_active=True
        )
        
        # Создаем оператора
        self.operator = Operator.objects.create_user(
            username='test_operator',
            password='testpass123',
            first_name='Тест',
            last_name='Оператор',
            email='test@example.com',
            phone='901234567',
            is_active_operator=True
        )
        self.operator.assigned_zones.add(self.delivery_zone)
        
        # Создаем пользователя и адрес
        self.user = User.objects.create(
            telegram_id=123456789,
            first_name='Тест',
            username='testuser'
        )
        
        self.address = Address.objects.create(
            user=self.user,
            street='Тестовая улица',
            house_number='1',
            city='Бухара',
            latitude=39.7681,
            longitude=64.4556,
            phone_number='901234567'
        )
        
        # Создаем заказ
        self.order = Order.objects.create(
            user=self.user,
            total_price=10000,
            status='pending',
            address=self.address,
            delivery_fee=5000,
            discounted_total=15000
        )

    def test_complete_order_workflow(self):
        """Тест полного workflow обработки заказа"""
        # 1. Создаем сессию оператора
        session = OperatorSession.objects.create(
            operator=self.operator,
            status='active'
        )
        
        # 2. Назначаем заказ оператору
        assignment = OrderAssignment.objects.create(
            order=self.order,
            operator=self.operator,
            status='assigned'
        )
        
        # 3. Оператор принимает заказ
        assignment.accept_assignment()
        self.order.status = 'preparing'
        self.order.save()
        
        # 4. Оператор начинает доставку
        self.order.status = 'delivering'
        self.order.save()
        
        # 5. Оператор завершает заказ
        self.order.status = 'completed'
        self.order.save()
        
        assignment.complete_assignment()
        
        # Проверяем результаты
        self.assertEqual(self.order.status, 'completed')
        self.assertEqual(assignment.status, 'completed')
        self.assertEqual(self.operator.completed_orders_count, 1)
        self.assertGreater(self.operator.avg_delivery_time, 0)

    def test_notification_workflow(self):
        """Тест workflow уведомлений"""
        # Создаем новый заказ (должно создать уведомление)
        new_order = Order.objects.create(
            user=self.user,
            total_price=15000,
            status='pending',
            address=self.address,
            delivery_fee=5000,
            discounted_total=20000
        )
        
        # Проверяем, что уведомление создано
        notification = OperatorNotification.objects.filter(
            operator=self.operator,
            order=new_order,
            notification_type='new_order'
        ).first()
        
        self.assertIsNotNone(notification)
        self.assertFalse(notification.is_read)

    def test_analytics_workflow(self):
        """Тест workflow аналитики"""
        # Создаем несколько заказов
        for i in range(5):
            order = Order.objects.create(
                user=self.user,
                total_price=10000 + i * 1000,
                status='pending',
                address=self.address,
                delivery_fee=5000,
                discounted_total=15000 + i * 1000
            )
            
            assignment = OrderAssignment.objects.create(
                order=order,
                operator=self.operator,
                status='assigned'
            )
            
            assignment.accept_assignment()
            order.status = 'completed'
            order.save()
            assignment.complete_assignment()
        
        # Проверяем аналитику
        today = timezone.now().date()
        analytics = OperatorAnalytics.objects.filter(
            operator=self.operator,
            date=today
        ).first()
        
        self.assertIsNotNone(analytics)
        self.assertEqual(analytics.total_orders, 5)
        self.assertEqual(analytics.completed_orders, 5)
        self.assertGreater(analytics.avg_delivery_time, 0)
