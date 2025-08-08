#!/usr/bin/env python
"""
Скрипт для тестирования API endpoints
"""
import requests
import json
from datetime import datetime

# Базовый URL
BASE_URL = "http://localhost:8000/api"

def test_endpoint(endpoint, method="GET", data=None, description=""):
    """Тестирует API endpoint"""
    url = f"{BASE_URL}{endpoint}"
    
    print(f"\n{'='*60}")
    print(f"Тестируем: {method} {endpoint}")
    if description:
        print(f"Описание: {description}")
    print(f"URL: {url}")
    
    try:
        if method == "GET":
            response = requests.get(url)
        elif method == "POST":
            response = requests.post(url, json=data)
        elif method == "PUT":
            response = requests.put(url, json=data)
        elif method == "DELETE":
            response = requests.delete(url, json=data)
        elif method == "PATCH":
            response = requests.patch(url, json=data)
        
        print(f"Статус: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Успешно!")
            try:
                result = response.json()
                print(f"Данные: {json.dumps(result, indent=2, ensure_ascii=False)}")
            except:
                print(f"Ответ: {response.text}")
        else:
            print("❌ Ошибка!")
            try:
                error = response.json()
                print(f"Ошибка: {json.dumps(error, indent=2, ensure_ascii=False)}")
            except:
                print(f"Ошибка: {response.text}")
                
    except requests.exceptions.ConnectionError:
        print("❌ Ошибка подключения! Убедитесь, что сервер запущен на порту 8000")
    except Exception as e:
        print(f"❌ Ошибка: {str(e)}")

def main():
    """Основная функция тестирования"""
    print("🧪 Тестирование API Babay Burger")
    print(f"Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Тестируем основные endpoints
    
    # 1. Статистика
    test_endpoint("/statistics/", "GET", description="Получение статистики")
    
    # 2. Категории
    test_endpoint("/categories/", "GET", description="Получение категорий")
    
    # 3. Меню
    test_endpoint("/menu/", "GET", description="Получение меню")
    
    # 4. Хиты
    test_endpoint("/menu/hits/", "GET", description="Получение хитов")
    
    # 5. Новинки
    test_endpoint("/menu/new/", "GET", description="Получение новинок")
    
    # 6. Избранные
    test_endpoint("/menu/featured/", "GET", description="Получение избранных товаров")
    
    # 7. Поиск
    test_endpoint("/menu/search/?q=бургер", "GET", description="Поиск товаров")
    
    # 8. Фильтр по цене
    test_endpoint("/menu/price-range/?min_price=10000&max_price=30000", "GET", description="Фильтр по цене")
    
    # 9. Акции
    test_endpoint("/promotions/", "GET", description="Получение акций")
    
    # 10. Зоны доставки
    test_endpoint("/delivery-zones/", "GET", description="Получение зон доставки")
    
    # 11. Детали товара
    test_endpoint("/menu/items/1/", "GET", description="Получение деталей товара")
    
    # 12. Товары по категории
    test_endpoint("/categories/1/items/", "GET", description="Получение товаров по категории")
    
    # 13. Корзина (получить)
    test_endpoint("/cart/", "GET", description="Получение корзины")
    
    # 14. Корзина (добавить товар)
    test_endpoint("/cart/", "POST", {
        "item_id": 1,
        "quantity": 2
    }, description="Добавление товара в корзину")
    
    # 15. Корзина (обновить количество)
    test_endpoint("/cart/", "PUT", {
        "item_id": 1,
        "quantity": 3
    }, description="Обновление количества в корзине")
    
    # 16. Проверка зоны доставки
    test_endpoint("/addresses/delivery-zone-check/", "POST", {
        "address": {
            "street": "Улица Пушкина",
            "house_number": "10",
            "city": "Бухара",
            "latitude": 39.7681,
            "longitude": 64.4556
        }
    }, description="Проверка адреса в зоне доставки")
    
    # 17. Геокодирование
    test_endpoint("/geocode/?query=Бухара, улица Пушкина 10", "GET", description="Геокодирование адреса")
    
    # 18. ViewSets
    test_endpoint("/menu-items/", "GET", description="MenuItem ViewSet")
    test_endpoint("/add-ons/", "GET", description="AddOn ViewSet")
    test_endpoint("/size-options/", "GET", description="SizeOption ViewSet")
    test_endpoint("/promotions/", "GET", description="Promotion ViewSet")
    
    print(f"\n{'='*60}")
    print("✅ Тестирование завершено!")
    print(f"Время: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

if __name__ == "__main__":
    main() 