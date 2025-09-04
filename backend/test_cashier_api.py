#!/usr/bin/env python
import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from app_cashier.models import Cashier, CashierToken
from app_cashier.serializers import CashierLoginSerializer
from django.contrib.auth.models import update_last_login
from api.models import Order, User, Address

def test_cashier_api():
    print("=== ТЕСТИРОВАНИЕ API КАССИРА ===")
    
    # Получаем кассира
    cashier = Cashier.objects.get(username='cashier_babay1')
    print(f'Тестируем API для кассира: {cashier.get_full_name()}')

    # Тест 1: Логин кассира через сериализатор
    print('\n=== ТЕСТ 1: ЛОГИН КАССИРА ===')
    login_data = {
        'username': 'cashier_babay1',
        'password': 'cashier123'
    }

    serializer = CashierLoginSerializer(data=login_data)
    if serializer.is_valid():
        cashier = serializer.validated_data['cashier']
        token, created = CashierToken.objects.get_or_create(cashier=cashier)
        update_last_login(None, cashier)
        print('✅ Логин успешен!')
        print(f'Токен: {token.key[:20]}...')
        print(f'Кассир: {cashier.get_full_name()}')
        print(f'Ресторан: {cashier.restaurant.name}')
        print(f'Телефон: {cashier.phone}')
    else:
        print(f'❌ Ошибка логина: {serializer.errors}')
        return

    # Тест 2: Создаем тестовый заказ для проверки
    print('\n=== ТЕСТ 2: СОЗДАНИЕ ТЕСТОВОГО ЗАКАЗА ===')
    
    # Получаем или создаем тестового пользователя (НЕ кассира!)
    user, created = User.objects.get_or_create(
        telegram_id=123456789,
        defaults={
            'username': 'test_user',
            'first_name': 'Тест',
            'last_name': 'Пользователь'
        }
    )

    # Создаем тестовый адрес
    address, created = Address.objects.get_or_create(
        user=user,
        street='Тестовая улица',
        house_number='1',
        city='Каган',
        defaults={
            'latitude': 39.7,
            'longitude': 66.0
        }
    )

    # Создаем тестовый заказ самовывоза
    order, created = Order.objects.get_or_create(
        user=user,
        restaurant=cashier.restaurant,
        address=address,
        service_type='pickup',
        defaults={
            'total_price': 50000,
            'final_price': 50000,
            'status': 'pending',
            'payment_method': 'cash'
        }
    )

    if created:
        print(f'✅ Создан тестовый заказ #{order.id}')
    else:
        print(f'📋 Используем существующий заказ #{order.id}')

    print(f'Заказ: {order.service_type} - {order.status}')
    print(f'Ресторан: {order.restaurant.name}')
    print(f'Клиент: {order.user.first_name} {order.user.last_name}')

    # Тест 3: Проверка метода can_handle_order
    print('\n=== ТЕСТ 3: ПРОВЕРКА can_handle_order ===')
    can_handle, message = cashier.can_handle_order(order)
    print(f'Заказ #{order.id}: {can_handle} - {message}')
    
    # Тест 4: Тестируем ViewSet для получения заказов
    print('\n=== ТЕСТ 4: ТЕСТИРОВАНИЕ VIEWSET ===')
    from app_cashier.views import CashierOrderViewSet
    from rest_framework.test import APIRequestFactory
    from rest_framework.test import force_authenticate
    
    factory = APIRequestFactory()
    request = factory.get('/api/cashier/orders/')
    force_authenticate(request, user=cashier)
    
    viewset = CashierOrderViewSet()
    viewset.request = request
    viewset.format_kwarg = None
    
    queryset = viewset.get_queryset()
    print(f'Заказов для кассира: {queryset.count()}')
    
    for order in queryset[:3]:
        print(f'  Заказ #{order.id}: {order.service_type} - {order.status}')
    
    # Тест 5: Тестируем дашборд
    print('\n=== ТЕСТ 5: ТЕСТИРОВАНИЕ ДАШБОРДА ===')
    request = factory.get('/api/cashier/orders/dashboard/')
    force_authenticate(request, user=cashier)
    
    viewset.request = request
    response = viewset.dashboard(request)
    print(f'Статус дашборда: {response.status_code}')
    if response.status_code == 200:
        print(f'Данные дашборда: {response.data}')
    
    print('\n✅ Все тесты завершены!')

if __name__ == '__main__':
    test_cashier_api()
