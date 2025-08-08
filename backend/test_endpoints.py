#!/usr/bin/env python3
"""
Тест для проверки всех API endpoints
"""

import requests
import json

def test_endpoints():
    """Тестирует все API endpoints"""
    
    base_url = "https://ec5b3f679bd2.ngrok-free.app/api"
    headers = {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
    }
    
    endpoints = [
        'test/',
        'menu/',
        'categories/',
        'promotions/',
        'statistics/',
        'menu/hits/',
        'menu/new/',
        'menu/featured/',
        'menu/price-range/',
        'menu/search/',
    ]
    
    print("🔍 Тестируем все API endpoints...")
    
    for endpoint in endpoints:
        url = f"{base_url}/{endpoint}"
        print(f"\n📋 Тестируем: {endpoint}")
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                print(f"✅ {endpoint} - OK (статус: {response.status_code})")
                # Показываем первые 100 символов ответа
                data = response.text[:100]
                print(f"   Ответ: {data}...")
            else:
                print(f"❌ {endpoint} - Ошибка (статус: {response.status_code})")
                print(f"   Ответ: {response.text[:200]}")
                
        except Exception as e:
            print(f"❌ {endpoint} - Исключение: {e}")
    
    print("\n🎉 Тест завершен!")

if __name__ == '__main__':
    test_endpoints() 