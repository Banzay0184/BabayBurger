#!/usr/bin/env python3
"""
Тестовый скрипт для проверки CORS настроек и API доступности
"""

import requests
import json
import sys
import os

# Добавляем путь к Django проекту
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Настройки Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django
django.setup()

from django.test import RequestFactory
from django.http import HttpResponse
from corsheaders.middleware import CorsMiddleware
from django.middleware.common import CommonMiddleware

def test_cors_middleware():
    """Тестируем CORS middleware"""
    print("🔧 Тестируем CORS middleware...")
    
    # Создаем тестовый запрос
    factory = RequestFactory()
    request = factory.get('/api/auth/telegram-widget/')
    
    # Добавляем заголовки как будто запрос приходит с Vercel
    request.META['HTTP_ORIGIN'] = 'https://babay-burger.vercel.app'
    request.META['HTTP_HOST'] = 'ec5b3f679bd2.ngrok-free.app'
    
    # Создаем middleware
    cors_middleware = CorsMiddleware()
    common_middleware = CommonMiddleware()
    
    # Обрабатываем запрос
    response = cors_middleware.process_request(request)
    if response is None:
        response = HttpResponse("OK")
    
    # Обрабатываем ответ
    response = cors_middleware.process_response(request, response)
    
    print("✅ CORS заголовки в ответе:")
    for header, value in response.items():
        if 'access-control' in header.lower():
            print(f"  {header}: {value}")
    
    return response

def test_api_endpoints():
    """Тестируем доступность API endpoints"""
    print("\n🌐 Тестируем API endpoints...")
    
    base_url = "https://ec5b3f679bd2.ngrok-free.app/api"
    endpoints = [
        "/auth/telegram-widget/",
        "/auth/test/",
        "/menu/",
    ]
    
    headers = {
        'ngrok-skip-browser-warning': 'true',
        'Content-Type': 'application/json',
    }
    
    for endpoint in endpoints:
        url = f"{base_url}{endpoint}"
        print(f"\n📡 Тестируем: {url}")
        
        try:
            response = requests.get(url, headers=headers, timeout=10)
            print(f"✅ Статус: {response.status_code}")
            print(f"📋 Заголовки ответа:")
            for header, value in response.headers.items():
                if 'access-control' in header.lower():
                    print(f"  {header}: {value}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Ошибка: {e}")

def test_cors_configuration():
    """Проверяем конфигурацию CORS в settings"""
    print("\n⚙️ Проверяем конфигурацию CORS...")
    
    from config.settings import CORS_ALLOWED_ORIGINS, CORS_ALLOW_ALL_ORIGINS
    
    print(f"CORS_ALLOW_ALL_ORIGINS: {CORS_ALLOW_ALL_ORIGINS}")
    print(f"CORS_ALLOWED_ORIGINS: {CORS_ALLOWED_ORIGINS}")
    
    # Проверяем, есть ли Vercel домен в разрешенных
    vercel_domains = [origin for origin in CORS_ALLOWED_ORIGINS if 'vercel.app' in origin]
    print(f"Vercel домены в CORS: {vercel_domains}")

if __name__ == "__main__":
    print("🚀 Запуск тестов CORS и API...")
    
    test_cors_configuration()
    test_cors_middleware()
    test_api_endpoints()
    
    print("\n✅ Тестирование завершено!") 