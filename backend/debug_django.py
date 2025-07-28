#!/usr/bin/env python3
"""
Скрипт для диагностики проблем с Django
"""

import os
import sys
import subprocess
import django
from pathlib import Path

def check_environment():
    """Проверяет окружение"""
    print("🔍 ДИАГНОСТИКА DJANGO")
    print("=" * 50)
    
    # Проверяем Python
    print(f"🐍 Python версия: {sys.version}")
    
    # Проверяем текущую директорию
    print(f"📁 Текущая директория: {os.getcwd()}")
    
    # Проверяем наличие manage.py
    manage_py = Path('manage.py')
    if manage_py.exists():
        print("✅ manage.py найден")
    else:
        print("❌ manage.py не найден")
        return False
    
    # Проверяем .env файл
    env_file = Path('.env')
    if env_file.exists():
        print("✅ .env файл найден")
    else:
        print("⚠️  .env файл не найден")
    
    return True

def check_django_settings():
    """Проверяет настройки Django"""
    print("\n⚙️  ПРОВЕРКА НАСТРОЕК DJANGO")
    print("=" * 50)
    
    try:
        # Настраиваем Django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
        django.setup()
        
        from django.conf import settings
        
        print("✅ Django настроен успешно")
        print(f"📊 DEBUG: {settings.DEBUG}")
        print(f"📊 ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
        print(f"📊 DATABASES: {list(settings.DATABASES.keys())}")
        
        return True
    except Exception as e:
        print(f"❌ Ошибка настройки Django: {e}")
        return False

def check_database():
    """Проверяет базу данных"""
    print("\n🗄️  ПРОВЕРКА БАЗЫ ДАННЫХ")
    print("=" * 50)
    
    try:
        from django.core.management import execute_from_command_line
        
        # Проверяем миграции
        result = subprocess.run([
            sys.executable, 'manage.py', 'showmigrations'
        ], capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✅ Миграции проверены")
            print(result.stdout)
        else:
            print("❌ Ошибка проверки миграций")
            print(result.stderr)
            return False
        
        return True
    except Exception as e:
        print(f"❌ Ошибка проверки базы данных: {e}")
        return False

def check_models():
    """Проверяет модели"""
    print("\n📊 ПРОВЕРКА МОДЕЛЕЙ")
    print("=" * 50)
    
    try:
        from api.models import User, Category, MenuItem, Order
        
        print("✅ Модели загружены:")
        print(f"   - User: {User}")
        print(f"   - Category: {Category}")
        print(f"   - MenuItem: {MenuItem}")
        print(f"   - Order: {Order}")
        
        return True
    except Exception as e:
        print(f"❌ Ошибка загрузки моделей: {e}")
        return False

def check_urls():
    """Проверяет URL конфигурацию"""
    print("\n🔗 ПРОВЕРКА URL")
    print("=" * 50)
    
    try:
        from django.urls import get_resolver
        
        resolver = get_resolver()
        print("✅ URL resolver настроен")
        
        # Проверяем основные URL
        urls_to_check = [
            '/admin/',
            '/api/auth/',
            '/api/menu/',
            '/api/orders/',
            '/api/webhook/',
        ]
        
        for url in urls_to_check:
            try:
                resolver.resolve(url)
                print(f"   ✅ {url}")
            except Exception as e:
                print(f"   ❌ {url}: {e}")
        
        return True
    except Exception as e:
        print(f"❌ Ошибка проверки URL: {e}")
        return False

def test_server_start():
    """Тестирует запуск сервера"""
    print("\n🚀 ТЕСТ ЗАПУСКА СЕРВЕРА")
    print("=" * 50)
    
    try:
        # Запускаем сервер в фоновом режиме
        process = subprocess.Popen([
            sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Ждем немного
        import time
        time.sleep(3)
        
        # Проверяем, что процесс запущен
        if process.poll() is None:
            print("✅ Сервер запущен успешно")
            process.terminate()
            process.wait()
            return True
        else:
            stdout, stderr = process.communicate()
            print("❌ Ошибка запуска сервера:")
            print(f"STDOUT: {stdout.decode()}")
            print(f"STDERR: {stderr.decode()}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка тестирования сервера: {e}")
        return False

def main():
    """Главная функция"""
    print("🔧 ДИАГНОСТИКА DJANGO СЕРВЕРА")
    print("=" * 50)
    
    # Проверяем окружение
    if not check_environment():
        print("\n❌ Проблемы с окружением")
        return False
    
    # Проверяем настройки Django
    if not check_django_settings():
        print("\n❌ Проблемы с настройками Django")
        return False
    
    # Проверяем базу данных
    if not check_database():
        print("\n❌ Проблемы с базой данных")
        return False
    
    # Проверяем модели
    if not check_models():
        print("\n❌ Проблемы с моделями")
        return False
    
    # Проверяем URL
    if not check_urls():
        print("\n❌ Проблемы с URL")
        return False
    
    # Тестируем запуск сервера
    if not test_server_start():
        print("\n❌ Проблемы с запуском сервера")
        return False
    
    print("\n✅ Все проверки пройдены успешно!")
    print("🚀 Django сервер готов к запуску")
    
    return True

if __name__ == '__main__':
    main() 