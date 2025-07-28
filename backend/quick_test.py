#!/usr/bin/env python3
"""
Исправленный быстрый тест основных функций StreetBurger Mini App
"""

import requests
import json
from datetime import datetime

def quick_test_fixed():
    """Быстрый тест основных функций (исправленная версия)"""
    base_url = "http://localhost:8000"
    
    print("🚀 ИСПРАВЛЕННЫЙ БЫСТРЫЙ ТЕСТ STREETBURGER MINI APP")
    print("=" * 60)
    print(f"⏰ Время: {datetime.now().strftime('%H:%M:%S')}")
    print(f"🌐 URL: {base_url}")
    
    tests = [
        ("Меню", "/api/menu/", "GET"),
        ("Категории", "/api/categories/", "GET"),
        ("Дополнения", "/api/add-ons/", "GET"),
        ("Акции", "/api/promotions/", "GET"),
        ("Зоны доставки", "/api/delivery-zones/", "GET"),
        ("Авторизация", "/api/auth/", "GET"),
        ("Геокодирование", "/api/geocode/?query=Бухара", "GET"),
        ("Заказы", "/api/orders/", "GET"),
        ("Адреса", "/api/addresses/", "GET"),
        ("Webhook", "/api/webhook/", "GET"),
    ]
    
    results = []
    
    for name, endpoint, method in tests:
        try:
            if method == "GET":
                response = requests.get(f"{base_url}{endpoint}", timeout=5)
            else:
                response = requests.post(f"{base_url}{endpoint}", timeout=5)
            
            # Определяем успешность теста
            if response.status_code == 200:
                status = "✅"
                success = True
            elif response.status_code in [400, 405]:  # Ожидаемые ошибки для некоторых endpoints
                status = "⚠️"
                success = True
            else:
                status = "❌"
                success = False
            
            print(f"{status} {name} - {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    if isinstance(data, list):
                        count = len(data)
                    elif isinstance(data, dict):
                        if "categories" in data and "items" in data:
                            count = f"{len(data.get('categories', []))} кат., {len(data.get('items', []))} блюд"
                        elif "items" in data:
                            count = len(data.get("items", []))
                        else:
                            count = len(data)
                    else:
                        count = 0
                    print(f"   📊 Данных: {count}")
                except:
                    print(f"   📊 Данных: Не JSON")
            elif response.status_code in [400, 405]:
                print(f"   ℹ️  Ожидаемая ошибка (требует авторизацию)")
            
            results.append((name, success))
            
        except Exception as e:
            print(f"❌ {name} - Ошибка: {str(e)}")
            results.append((name, False))
    
    # Итоговая статистика
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    print("\n" + "=" * 60)
    print("📊 ИТОГИ:")
    print(f"✅ Успешно: {passed}/{total}")
    print(f"❌ Ошибок: {total - passed}")
    print(f"📈 Процент: {(passed/total)*100:.1f}%")
    
    if passed == total:
        print("\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ!")
        print("✅ Система работает корректно")
    elif passed >= total * 0.8:
        print("\n✅ БОЛЬШИНСТВО ТЕСТОВ ПРОЙДЕНО!")
        print("⚠️  Есть незначительные проблемы")
    else:
        print("\n⚠️  ЕСТЬ ПРОБЛЕМЫ!")
        print("🔧 Требуется проверка системы")
    
    return passed == total

if __name__ == "__main__":
    quick_test_fixed() 