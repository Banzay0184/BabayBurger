#!/usr/bin/env python3
"""
Скрипт для проверки Django сервера
"""

import requests
import time

def check_django():
    """Проверяет Django сервер"""
    print("🔍 ПРОВЕРКА DJANGO СЕРВЕРА")
    print("=" * 50)
    
    urls = [
        "http://localhost:8000/",
        "http://localhost:8000/admin/",
        "http://localhost:8000/api/menu/",
    ]
    
    for url in urls:
        try:
            print(f"📡 Проверяем: {url}")
            response = requests.get(url, timeout=5)
            print(f"   Статус: {response.status_code}")
            if response.status_code in [200, 302, 403]:
                print("   ✅ Доступен")
            else:
                print("   ❌ Недоступен")
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Ошибка подключения")
        except Exception as e:
            print(f"   ❌ Ошибка: {e}")
        print()

def main():
    """Главная функция"""
    print("🚀 Проверка Django сервера...")
    
    # Проверяем несколько раз
    for i in range(3):
        print(f"\n🔄 Попытка {i+1}/3")
        check_django()
        if i < 2:
            print("⏳ Ожидание 5 секунд...")
            time.sleep(5)

if __name__ == '__main__':
    main() 