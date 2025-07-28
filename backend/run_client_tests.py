#!/usr/bin/env python3
"""
Скрипт запуска тестирования StreetBurger Mini App
Проверяет функциональность с точки зрения клиента
"""

import os
import sys
import subprocess
import time
import requests
from datetime import datetime

def check_django_server():
    """Проверяет, запущен ли Django сервер"""
    try:
        response = requests.get("http://localhost:8000/api/menu/", timeout=5)
        return response.status_code == 200
    except:
        return False

def start_django_server():
    """Запускает Django сервер"""
    print("🚀 Запуск Django сервера...")
    
    # Переходим в директорию backend
    os.chdir("backend")
    
    # Проверяем, установлены ли зависимости
    if not os.path.exists("venv"):
        print("📦 Создание виртуального окружения...")
        subprocess.run(["python", "-m", "venv", "venv"], check=True)
    
    # Активируем виртуальное окружение
    if os.name == "nt":  # Windows
        activate_script = "venv\\Scripts\\activate"
    else:  # Unix/Linux/MacOS
        activate_script = "venv/bin/activate"
    
    # Устанавливаем зависимости
    print("📦 Установка зависимостей...")
    subprocess.run([f"source {activate_script} && pip install -r requirements.txt"], 
                  shell=True, check=True)
    
    # Запускаем миграции
    print("🗄️  Применение миграций...")
    subprocess.run([f"source {activate_script} && python manage.py migrate"], 
                  shell=True, check=True)
    
    # Запускаем сервер в фоне
    print("🌐 Запуск Django сервера...")
    server_process = subprocess.Popen([
        f"source {activate_script} && python manage.py runserver 0.0.0.0:8000"
    ], shell=True)
    
    # Ждем запуска сервера
    print("⏳ Ожидание запуска сервера...")
    for i in range(30):  # Ждем максимум 30 секунд
        if check_django_server():
            print("✅ Django сервер запущен успешно!")
            return server_process
        time.sleep(1)
        print(f"⏳ Попытка {i+1}/30...")
    
    print("❌ Не удалось запустить Django сервер")
    return None

def run_client_tests():
    """Запускает тесты клиента"""
    print("\n🧪 ЗАПУСК ТЕСТОВ КЛИЕНТА")
    print("=" * 50)
    
    # Запускаем основной скрипт тестирования
    result = subprocess.run([sys.executable, "test_client_scenario.py"], 
                          capture_output=True, text=True)
    
    # Выводим результат
    print(result.stdout)
    if result.stderr:
        print("ОШИБКИ:")
        print(result.stderr)
    
    return result.returncode == 0

def run_specific_tests():
    """Запускает специфические тесты"""
    print("\n🎯 СПЕЦИФИЧЕСКИЕ ТЕСТЫ")
    print("=" * 50)
    
    # Тест 1: Проверка API endpoints
    print("\n📡 Тест API endpoints...")
    endpoints = [
        "/api/menu/",
        "/api/categories/",
        "/api/add-ons/",
        "/api/promotions/",
        "/api/delivery-zones/",
        "/api/orders/",
        "/api/addresses/"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
            status = "✅" if response.status_code == 200 else "❌"
            print(f"{status} {endpoint} - {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint} - Ошибка: {str(e)}")
    
    # Тест 2: Проверка базы данных
    print("\n🗄️  Тест базы данных...")
    try:
        response = requests.get("http://localhost:8000/api/menu/", timeout=5)
        if response.status_code == 200:
            data = response.json()
            items_count = len(data.get("items", []))
            categories_count = len(data.get("categories", []))
            print(f"✅ Меню загружено: {items_count} блюд, {categories_count} категорий")
        else:
            print(f"❌ Ошибка загрузки меню: {response.status_code}")
    except Exception as e:
        print(f"❌ Ошибка теста БД: {str(e)}")
    
    # Тест 3: Проверка геокодирования
    print("\n📍 Тест геокодирования...")
    try:
        test_address = "ул. Ленина, 15, Бухара"
        response = requests.post(
            "http://localhost:8000/api/geocode/",
            json={"address": test_address},
            timeout=10
        )
        if response.status_code == 200:
            print("✅ Геокодирование работает")
        else:
            print(f"❌ Ошибка геокодирования: {response.status_code}")
    except Exception as e:
        print(f"❌ Ошибка теста геокодирования: {str(e)}")

def check_system_requirements():
    """Проверяет системные требования"""
    print("🔍 ПРОВЕРКА СИСТЕМНЫХ ТРЕБОВАНИЙ")
    print("=" * 50)
    
    # Проверяем Python
    python_version = sys.version_info
    print(f"🐍 Python {python_version.major}.{python_version.minor}.{python_version.micro}")
    
    if python_version < (3, 8):
        print("❌ Требуется Python 3.8 или выше")
        return False
    else:
        print("✅ Версия Python подходит")
    
    # Проверяем необходимые пакеты
    required_packages = ["requests", "django", "celery", "redis"]
    missing_packages = []
    
    for package in required_packages:
        try:
            __import__(package)
            print(f"✅ {package}")
        except ImportError:
            print(f"❌ {package} - не установлен")
            missing_packages.append(package)
    
    if missing_packages:
        print(f"\n📦 Установите недостающие пакеты:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    return True

def main():
    """Главная функция"""
    print("🎯 ТЕСТИРОВАНИЕ STREETBURGER MINI APP")
    print("=" * 60)
    print(f"⏰ Время запуска: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Проверяем системные требования
    if not check_system_requirements():
        print("\n❌ Системные требования не выполнены")
        sys.exit(1)
    
    # Проверяем, запущен ли сервер
    if not check_django_server():
        print("\n🚀 Django сервер не запущен. Запускаем...")
        server_process = start_django_server()
        if not server_process:
            print("❌ Не удалось запустить сервер")
            sys.exit(1)
    else:
        print("✅ Django сервер уже запущен")
        server_process = None
    
    try:
        # Запускаем специфические тесты
        run_specific_tests()
        
        # Запускаем основные тесты клиента
        success = run_client_tests()
        
        if success:
            print("\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
            print("✅ Система готова к использованию клиентами")
        else:
            print("\n⚠️  НЕКОТОРЫЕ ТЕСТЫ ПРОВАЛЕНЫ!")
            print("🔧 Требуется доработка системы")
        
    finally:
        # Останавливаем сервер, если мы его запускали
        if server_process:
            print("\n🛑 Остановка Django сервера...")
            server_process.terminate()
            server_process.wait()

if __name__ == "__main__":
    main() 