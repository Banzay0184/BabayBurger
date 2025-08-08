#!/usr/bin/env python3
"""
Тест для проверки всех API endpoints
"""

import requests
import json

def test_all_endpoints():
    """Тестирует все API endpoints"""
    
    base_url = "https://ec5b3f679bd2.ngrok-free.app"
    headers = {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
    }
    
    endpoints = [
        '/api/test/',
        '/api/menu/',
        '/api/categories/',
        '/api/menu/hits/',
        '/api/menu/new/',
        '/api/menu/featured/',
        '/api/promotions/',
    ]
    
    print(f"🔍 Тестируем все endpoints для URL: {base_url}")
    
    for endpoint in endpoints:
        url = f"{base_url}{endpoint}"
        print(f"\n📋 Тестируем: {endpoint}")
        
        try:
            # Тест GET запроса
            response = requests.get(url, headers=headers, timeout=10)
            print(f"✅ GET {endpoint}: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict):
                    if 'categories' in data:
                        print(f"   📊 Категорий: {len(data['categories'])}")
                    if 'items' in data:
                        print(f"   📊 Товаров: {len(data['items'])}")
                    if 'message' in data:
                        print(f"   📝 Сообщение: {data['message']}")
                elif isinstance(data, list):
                    print(f"   📊 Элементов: {len(data)}")
            else:
                print(f"   ❌ Ошибка: {response.text[:100]}")
                
        except Exception as e:
            print(f"❌ Ошибка {endpoint}: {e}")
    
    print("\n🎉 Тест завершен!")

if __name__ == '__main__':
    test_all_endpoints() 