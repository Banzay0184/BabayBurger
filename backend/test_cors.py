#!/usr/bin/env python3
"""
Тест для проверки CORS настроек
"""

import requests
import json

def test_cors():
    """Тестирует CORS настройки"""
    
    # URL для тестирования
    base_url = "https://ec5b3f679bd2.ngrok-free.app"
    test_url = f"{base_url}/api/test/"
    
    print(f"🔍 Тестируем CORS для URL: {test_url}")
    
    # Тест 1: OPTIONS запрос (preflight)
    print("\n1️⃣ Тестируем OPTIONS запрос...")
    try:
        response = requests.options(test_url, headers={
            'Origin': 'https://babay-burger.vercel.app',
            'Access-Control-Request-Method': 'GET',
            'Access-Control-Request-Headers': 'ngrok-skip-browser-warning',
        })
        
        print(f"✅ OPTIONS статус: {response.status_code}")
        print(f"📋 Заголовки ответа:")
        for header, value in response.headers.items():
            if 'access-control' in header.lower():
                print(f"   {header}: {value}")
        
        # Проверяем, есть ли ngrok-skip-browser-warning в разрешенных заголовках
        allow_headers = response.headers.get('Access-Control-Allow-Headers', '')
        if 'ngrok-skip-browser-warning' in allow_headers:
            print("✅ ngrok-skip-browser-warning разрешен")
        else:
            print("❌ ngrok-skip-browser-warning НЕ разрешен")
            print(f"   Разрешенные заголовки: {allow_headers}")
            
    except Exception as e:
        print(f"❌ Ошибка OPTIONS запроса: {e}")
    
    # Тест 2: GET запрос с ngrok заголовком
    print("\n2️⃣ Тестируем GET запрос с ngrok заголовком...")
    try:
        response = requests.get(test_url, headers={
            'ngrok-skip-browser-warning': 'true',
        })
        
        print(f"✅ GET статус: {response.status_code}")
        print(f"📋 Ответ: {response.text[:200]}...")
    except Exception as e:
        print(f"❌ Ошибка GET запроса: {e}")
    
    # Тест 3: POST запрос с ngrok заголовком
    print("\n3️⃣ Тестируем POST запрос с ngrok заголовком...")
    try:
        response = requests.post(test_url, headers={
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
        }, json={'test': 'data'})
        
        print(f"✅ POST статус: {response.status_code}")
        print(f"📋 Ответ: {response.text[:200]}...")
    except Exception as e:
        print(f"❌ Ошибка POST запроса: {e}")

if __name__ == '__main__':
    test_cors() 