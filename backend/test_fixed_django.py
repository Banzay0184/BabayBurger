#!/usr/bin/env python3
"""
Скрипт для проверки Django после исправления middleware
"""

import os
import sys
import subprocess
import time
import requests

def test_django_startup():
    """Тестирует запуск Django"""
    print("🚀 ТЕСТ ЗАПУСКА DJANGO")
    print("=" * 50)
    
    try:
        # Запускаем Django в фоновом режиме
        process = subprocess.Popen([
            sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Ждем запуска
        time.sleep(5)
        
        # Проверяем, что процесс запущен
        if process.poll() is None:
            print("✅ Django процесс запущен")
            
            # Проверяем доступность сервера
            try:
                response = requests.get("http://localhost:8000/admin/", timeout=10)
                print(f"✅ Сервер отвечает: {response.status_code}")
                
                # Останавливаем процесс
                process.terminate()
                process.wait()
                
                return True
            except requests.exceptions.RequestException as e:
                print(f"❌ Сервер не отвечает: {e}")
                process.terminate()
                process.wait()
                return False
        else:
            stdout, stderr = process.communicate()
            print("❌ Django не запустился:")
            print(f"STDOUT: {stdout.decode()}")
            print(f"STDERR: {stderr.decode()}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
        return False

def test_api_endpoints():
    """Тестирует API endpoints"""
    print("\n🔗 ТЕСТ API ENDPOINTS")
    print("=" * 50)
    
    endpoints = [
        ("http://localhost:8000/admin/", "Admin панель"),
        ("http://localhost:8000/api/menu/", "API меню"),
        ("http://localhost:8000/api/auth/", "API авторизация"),
    ]
    
    for url, name in endpoints:
        try:
            response = requests.get(url, timeout=5)
            print(f"✅ {name}: {response.status_code}")
        except requests.exceptions.RequestException as e:
            print(f"❌ {name}: {e}")

def main():
    """Главная функция"""
    print("🔧 ПРОВЕРКА DJANGO ПОСЛЕ ИСПРАВЛЕНИЯ")
    print("=" * 50)
    
    # Тестируем запуск
    if test_django_startup():
        print("\n✅ Django запускается успешно!")
        
        # Тестируем endpoints
        test_api_endpoints()
        
        print("\n🎉 Все тесты пройдены!")
        print("🚀 Django готов к работе")
    else:
        print("\n❌ Проблемы с запуском Django")
        sys.exit(1)

if __name__ == '__main__':
    main() 