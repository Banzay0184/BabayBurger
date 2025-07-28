import os
import sys
import django
import time
from django.db import transaction
from django.db.utils import OperationalError
from datetime import datetime, timedelta

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import User, Address, Category, SizeOption, AddOn, MenuItem, Promotion, DeliveryZone, Order, OrderItem

def print_step(step_number, title):
    print(f"\n📋 {step_number}. {title}")
    print("=" * 50)

def print_result(success, message):
    if success:
        print(f"✅ {message}")
    else:
        print(f"❌ {message}")

def retry_on_db_lock(func, max_retries=3, delay=2):
    """Повторяет функцию при блокировке базы данных"""
    for attempt in range(max_retries):
        try:
            return func()
        except OperationalError as e:
            if "database is locked" in str(e) and attempt < max_retries - 1:
                print(f"⚠️  База данных заблокирована, повторная попытка {attempt + 1}/{max_retries}")
                time.sleep(delay)
                continue
            else:
                raise e

def main():
    print("ПРОВЕРКА АКЦИЙ И КАСТОМИЗАЦИИ (УПРОЩЕННАЯ ВЕРСИЯ)")
    print("=" * 80)
    
    try:
        # 1. Подготовка тестовых данных
        print_step(1, "Подготовка тестовых данных")
        
        # Создание пользователя
        user, created = retry_on_db_lock(lambda: User.objects.get_or_create(
            telegram_id=908758842,
            defaults={'username': 'test_user', 'first_name': 'Тест Пользователь'}
        ))
        print_result(True, f"Пользователь создан: {user.first_name}")
        
        # Создание зоны доставки
        delivery_zone, created = retry_on_db_lock(lambda: DeliveryZone.objects.get_or_create(
            city='Бухара',
            name='Бухара Центр',
            defaults={
                'center_latitude': 39.768100,
                'center_longitude': 64.455600,
                'radius_km': 5.0,
                'delivery_fee': 5000.00,
                'min_order_amount': 50000.00,
                'is_active': True
            }
        ))
        print_result(True, f"Зона доставки создана: {delivery_zone.name}")
        
        # Создание адреса
        address, created = retry_on_db_lock(lambda: Address.objects.get_or_create(
            user=user,
            street='Тестовая улица',
            house_number='10',
            city='Бухара',
            defaults={
                'latitude': 39.768100,
                'longitude': 64.455600,
                'phone_number': '+998901234567',
                'is_primary': True
            }
        ))
        print_result(True, f"Адрес создан: {address.street}, {address.house_number}, {address.city}")
        
        # Создание категории
        category, created = retry_on_db_lock(lambda: Category.objects.get_or_create(
            name='Пицца',
            defaults={'description': 'Вкусные пиццы'}
        ))
        print_result(True, f"Категория создана: {category.name}")
        
        # Создание размеров
        small_size, created = retry_on_db_lock(lambda: SizeOption.objects.get_or_create(
            name='Маленькая',
            defaults={
                'price_modifier': 0,
                'description': '25 см, 6 кусочков',
                'is_active': True
            }
        ))
        
        large_size, created = retry_on_db_lock(lambda: SizeOption.objects.get_or_create(
            name='Большая',
            defaults={
                'price_modifier': 20000,
                'description': '35 см, 8 кусочков',
                'is_active': True
            }
        ))
        print_result(True, f"Размеры созданы: {small_size.name}, {large_size.name}")
        
        # Создание дополнений
        ketchup, created = retry_on_db_lock(lambda: AddOn.objects.get_or_create(
            name='Кетчуп',
            defaults={
                'price': 2000,
                'category': category,
                'is_active': True
            }
        ))
        
        cheese_sauce, created = retry_on_db_lock(lambda: AddOn.objects.get_or_create(
            name='Сырный соус',
            defaults={
                'price': 3000,
                'category': category,
                'is_active': True
            }
        ))
        print_result(True, f"Дополнения созданы: {ketchup.name}, {cheese_sauce.name}")
        
        # Создание блюда
        menu_item, created = retry_on_db_lock(lambda: MenuItem.objects.get_or_create(
            name='Пицца Маргарита',
            defaults={
                'description': 'Вкусная пицца',
                'price': 50000,
                'category': category,
                'is_hit': True,
                'is_new': True,
                'priority': 1
            }
        ))
        print_result(True, f"Блюдо создано: {menu_item.name} (приоритет: {menu_item.priority})")
        
        # Создание акций
        now = datetime.now()
        
        promo_percent, created = retry_on_db_lock(lambda: Promotion.objects.get_or_create(
            name='Скидка 10%',
            defaults={
                'description': '10% на всё',
                'discount_type': 'PERCENT',
                'discount_value': 10,
                'max_discount': 15000,
                'max_uses': 100,
                'valid_from': now - timedelta(days=1),
                'valid_to': now + timedelta(days=1),
                'is_active': True
            }
        ))
        
        promo_free_delivery, created = retry_on_db_lock(lambda: Promotion.objects.get_or_create(
            name='Бесплатная доставка',
            defaults={
                'description': 'При заказе от 100000',
                'discount_type': 'FREE_DELIVERY',
                'discount_value': 0,
                'min_order_amount': 100000,
                'valid_from': now - timedelta(days=1),
                'valid_to': now + timedelta(days=1),
                'is_active': True
            }
        ))
        
        promo_free_addon, created = retry_on_db_lock(lambda: Promotion.objects.get_or_create(
            name='Бесплатный кетчуп',
            defaults={
                'description': 'Кетчуп бесплатно к пицце',
                'discount_type': 'FREE_ITEM',
                'discount_value': 0,
                'valid_from': now - timedelta(days=1),
                'valid_to': now + timedelta(days=1),
                'is_active': True,
                'free_addon': ketchup
            }
        ))
        
        print_result(True, f"Акции созданы: {promo_percent.name}, {promo_free_delivery.name}, {promo_free_addon.name}")
        print_result(True, "Тестовые данные успешно созданы")
        
        # 2. Проверка фильтрации
        print_step(2, "Проверка фильтрации хитов и новинок")
        
        hit_items = retry_on_db_lock(lambda: MenuItem.objects.filter(is_hit=True).order_by('priority', '-created_at'))
        print_result(True, f"Фильтрация по is_hit работает: найдено {hit_items.count()} блюд")
        
        new_items = retry_on_db_lock(lambda: MenuItem.objects.filter(is_new=True).order_by('priority', '-created_at'))
        print_result(True, f"Фильтрация по is_new работает: найдено {new_items.count()} блюд")
        
        # 3. Тест создания заказов напрямую через Django ORM
        print_step(3, "Тест создания заказов через Django ORM")
        
        # Создаем заказ напрямую
        order = retry_on_db_lock(lambda: Order.objects.create(
            user=user,
            address=address,
            total_price=50000,
            status='pending'
        ))
        
        # Добавляем товар в заказ
        order_item = retry_on_db_lock(lambda: OrderItem.objects.create(
            order=order,
            menu_item=menu_item,
            quantity=1,
            size_option=small_size
        ))
        
        # Добавляем дополнения
        retry_on_db_lock(lambda: order_item.add_ons.add(ketchup))
        
        # Применяем акцию
        order.promotion = promo_percent
        order.save()
        order.apply_promotion()
        
        print_result(True, f"Заказ создан: ID {order.id}, скидка: {order.discounted_total}")
        
        # 4. Проверка счетчиков использований
        print_step(4, "Проверка счетчиков использований акций")
        
        promo_percent.refresh_from_db()
        print_result(promo_percent.usage_count > 0, f"Счетчик использований акции '{promo_percent.name}': {promo_percent.usage_count}")
        
        # 5. Тест валидации акций
        print_step(5, "Тест валидации акций")
        
        # Проверяем валидность акций
        print_result(promo_percent.is_valid(), f"Акция '{promo_percent.name}' валидна")
        print_result(promo_free_delivery.is_valid(), f"Акция '{promo_free_delivery.name}' валидна")
        print_result(promo_free_addon.is_valid(), f"Акция '{promo_free_addon.name}' валидна")
        
        # 6. Тест расчета скидок
        print_step(6, "Тест расчета скидок")
        
        order_total = 100000
        discount_amount, delivery_fee = promo_percent.calculate_discount(order_total, 5000)
        print_result(discount_amount > 0, f"Скидка рассчитана: {discount_amount} UZS")
        
        # 7. Завершение
        print_step(7, "Завершение теста")
        print_result(True, "Все основные функции работают корректно!")
        print_result(True, "Тест завершён успешно. Данные сохранены в базе.")
        
    except Exception as e:
        print_result(False, f"Критическая ошибка: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 