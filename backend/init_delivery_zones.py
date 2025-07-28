#!/usr/bin/env python
"""
Скрипт для инициализации зон доставки
Создает зоны доставки для Бухары и Кагана с правильными координатами
"""

import os
import sys
import django

# Настройка Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from api.models import DeliveryZone

def init_delivery_zones():
    """Инициализирует зоны доставки для Бухары и Кагана"""
    print("🗺️ Инициализация зон доставки...")
    
    # Удаляем существующие зоны доставки
    DeliveryZone.objects.all().delete()
    print("   ✅ Удалены существующие зоны доставки")
    
    # Зона доставки для Бухары
    bukhara_zone = DeliveryZone.objects.create(
        name="Бухара - Центр города",
        city="Бухара",
        center_latitude=39.7747,
        center_longitude=64.4286,
        radius_km=20.0,
        is_active=True
    )
    print(f"   ✅ Создана зона доставки: {bukhara_zone}")
    print(f"      Центр: {bukhara_zone.center_latitude}, {bukhara_zone.center_longitude}")
    print(f"      Радиус: {bukhara_zone.radius_km} км")
    
    # Зона доставки для Кагана
    kagan_zone = DeliveryZone.objects.create(
        name="Каган - Центр города",
        city="Каган",
        center_latitude=39.7167,
        center_longitude=64.5500,
        radius_km=10.0,
        is_active=True
    )
    print(f"   ✅ Создана зона доставки: {kagan_zone}")
    print(f"      Центр: {kagan_zone.center_latitude}, {kagan_zone.center_longitude}")
    print(f"      Радиус: {kagan_zone.radius_km} км")
    
    # Дополнительная зона для Бухары (расширенная)
    bukhara_extended = DeliveryZone.objects.create(
        name="Бухара - Расширенная зона",
        city="Бухара",
        center_latitude=39.7747,
        center_longitude=64.4286,
        radius_km=30.0,
        is_active=True
    )
    print(f"   ✅ Создана расширенная зона доставки: {bukhara_extended}")
    print(f"      Центр: {bukhara_extended.center_latitude}, {bukhara_extended.center_longitude}")
    print(f"      Радиус: {bukhara_extended.radius_km} км")
    
    print(f"\n📊 Статистика:")
    print(f"   Всего зон доставки: {DeliveryZone.objects.count()}")
    print(f"   Активных зон: {DeliveryZone.objects.filter(is_active=True).count()}")
    
    # Показываем все созданные зоны
    print(f"\n📍 Созданные зоны доставки:")
    for zone in DeliveryZone.objects.all():
        print(f"   - {zone.name} ({zone.city}): радиус {zone.radius_km} км")
        print(f"     Координаты: {zone.center_latitude}, {zone.center_longitude}")
        print(f"     Статус: {'Активна' if zone.is_active else 'Неактивна'}")
        print()
    
    print("✅ Инициализация зон доставки завершена успешно!")

def test_coordinates():
    """Тестирует координаты зон доставки"""
    print("\n🧪 Тестирование координат зон доставки...")
    
    from api.models import calculate_distance
    
    # Тестовые адреса
    test_addresses = [
        {
            "name": "Центр Бухары",
            "lat": 39.7747,
            "lon": 64.4286,
            "city": "Бухара"
        },
        {
            "name": "Центр Кагана",
            "lat": 39.7167,
            "lon": 64.5500,
            "city": "Каган"
        },
        {
            "name": "Ташкент (вне зоны)",
            "lat": 41.2995,
            "lon": 69.2401,
            "city": "Ташкент"
        }
    ]
    
    for address in test_addresses:
        print(f"\n📍 Тестирование адреса: {address['name']}")
        
        # Получаем зоны доставки для города
        zones = DeliveryZone.objects.filter(city=address['city'], is_active=True)
        
        if not zones.exists():
            print(f"   ❌ Нет зон доставки для города: {address['city']}")
            continue
        
        for zone in zones:
            distance = zone.get_distance_to_zone(address['lat'], address['lon'])
            is_in_zone = zone.is_address_in_zone(address['lat'], address['lon'])
            
            print(f"   Зона: {zone.name}")
            print(f"   Расстояние до центра: {distance:.1f} км")
            print(f"   В зоне доставки: {is_in_zone}")
            print(f"   Радиус зоны: {zone.radius_km} км")

def main():
    """Основная функция"""
    print("🚀 Инициализация зон доставки для StreetBurger")
    print("=" * 50)
    
    try:
        # Инициализируем зоны доставки
        init_delivery_zones()
        
        # Тестируем координаты
        test_coordinates()
        
        print("\n🎉 Инициализация завершена успешно!")
        
    except Exception as e:
        print(f"\n❌ Ошибка во время инициализации: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 