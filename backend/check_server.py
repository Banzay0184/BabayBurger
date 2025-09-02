#!/usr/bin/env python3
"""
Проверка статуса Django сервера
"""

import requests
import sys

def check_server():
    """Проверяет статус Django сервера"""
    try:
        # Проверяем HTTP API
        response = requests.get('http://localhost:8000/api/', timeout=5)
        if response.status_code == 200:
            print("✅ HTTP API доступен на http://localhost:8000/api/")
        else:
            print(f"⚠️ HTTP API отвечает с кодом: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ HTTP API недоступен - сервер не запущен")
        return False
    except Exception as e:
        print(f"❌ Ошибка проверки HTTP API: {e}")
        return False
    
    try:
        # Проверяем WebSocket endpoint (должен вернуть 404 для HTTP запроса)
        response = requests.get('http://localhost:8000/ws/operator/', timeout=5)
        if response.status_code == 404:
            print("✅ WebSocket endpoint настроен (404 для HTTP запроса - это нормально)")
        else:
            print(f"⚠️ WebSocket endpoint отвечает с кодом: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("❌ WebSocket endpoint недоступен")
        return False
    except Exception as e:
        print(f"❌ Ошибка проверки WebSocket endpoint: {e}")
        return False
    
    return True

def main():
    print("🔍 Проверка статуса Django сервера...")
    print("=" * 50)
    
    if check_server():
        print("\n🎉 Сервер работает корректно!")
        print("💡 Для WebSocket тестирования убедитесь, что сервер запущен с ASGI:")
        print("   python run_asgi.py")
        return True
    else:
        print("\n❌ Проблемы с сервером!")
        print("💡 Запустите сервер:")
        print("   python manage.py runserver")
        print("   или")
        print("   python run_asgi.py")
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
