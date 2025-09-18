#!/usr/bin/env python3
"""
Скрипт для проверки фотографий чека заказа #102
"""
import os
import sys
import django

# Добавляем путь к проекту
sys.path.append('/Users/shakhzodabidov/Projects/BabayBurgerMiniApp/backend')

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import Order, DeliveryAssignment

def check_order_receipt_photos(order_id):
    """Проверяем фотографии чека для заказа"""
    try:
        # Получаем заказ
        order = Order.objects.get(id=order_id)
        print(f"🔍 Проверяем заказ #{order.id}")
        print(f"   Статус: {order.status}")
        print(f"   Тип услуги: {order.service_type}")
        print(f"   Способ оплаты: {order.payment_method}")
        
        # Получаем назначения доставки
        assignments = DeliveryAssignment.objects.filter(order=order)
        print(f"   Найдено назначений доставки: {assignments.count()}")
        
        for assignment in assignments:
            print(f"   Назначение #{assignment.id}:")
            print(f"     Статус: {assignment.status}")
            print(f"     Курьер: {assignment.driver.user.first_name} {assignment.driver.user.last_name}")
            print(f"     Фото чека: {assignment.receipt_photo}")
            print(f"     Время доставки: {assignment.delivered_at}")
            print()
        
        # Проверяем фотографии чека
        assignments_with_photos = DeliveryAssignment.objects.filter(
            order=order,
            receipt_photo__isnull=False
        ).exclude(receipt_photo='')
        
        print(f"   Назначений с фотографиями чека: {assignments_with_photos.count()}")
        
        if assignments_with_photos.count() > 0:
            print("✅ У заказа есть фотографии чека!")
            for assignment in assignments_with_photos:
                print(f"     Фото: {assignment.receipt_photo}")
        else:
            print("❌ У заказа нет фотографий чека")
            
    except Order.DoesNotExist:
        print(f"❌ Заказ #{order_id} не найден")
    except Exception as e:
        print(f"❌ Ошибка: {str(e)}")

if __name__ == "__main__":
    check_order_receipt_photos(102)
