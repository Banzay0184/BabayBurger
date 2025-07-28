#!/usr/bin/env python
"""
Скрипт для запуска всей системы StreetBurger
"""
import os
import sys
import subprocess
import time
import signal
import threading
from pathlib import Path

def check_redis():
    """Проверяет доступность Redis"""
    try:
        import redis
        r = redis.Redis(host='localhost', port=6379, db=0)
        r.ping()
        print("✅ Redis доступен")
        return True
    except Exception as e:
        print(f"❌ Redis недоступен: {str(e)}")
        return False

def start_redis():
    """Запускает Redis если он не запущен"""
    try:
        # Проверяем, запущен ли Redis
        result = subprocess.run(['redis-cli', 'ping'], 
                              capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and 'PONG' in result.stdout:
            print("✅ Redis уже запущен")
            return True
    except:
        pass
    
    print("🔄 Запуск Redis...")
    try:
        # Пытаемся запустить Redis через brew (macOS)
        subprocess.run(['brew', 'services', 'start', 'redis'], 
                      capture_output=True, timeout=10)
        time.sleep(2)
        
        if check_redis():
            return True
    except:
        pass
    
    try:
        # Пытаемся запустить Redis через systemctl (Linux)
        subprocess.run(['sudo', 'systemctl', 'start', 'redis-server'], 
                      capture_output=True, timeout=10)
        time.sleep(2)
        
        if check_redis():
            return True
    except:
        pass
    
    print("⚠️  Не удалось автоматически запустить Redis")
    print("💡 Запустите Redis вручную:")
    print("   macOS: brew services start redis")
    print("   Linux: sudo systemctl start redis-server")
    return False

def start_celery_worker():
    """Запускает Celery worker"""
    print("🔄 Запуск Celery worker...")
    
    try:
        # Запускаем Celery worker в фоновом режиме
        process = subprocess.Popen([
            sys.executable, 'start_celery.py'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Ждем немного для запуска
        time.sleep(3)
        
        if process.poll() is None:
            print("✅ Celery worker запущен")
            return process
        else:
            print("❌ Не удалось запустить Celery worker")
            return None
    except Exception as e:
        print(f"❌ Ошибка запуска Celery: {str(e)}")
        return None

def start_django_server():
    """Запускает Django сервер"""
    print("🔄 Запуск Django сервера...")
    
    try:
        # Запускаем Django сервер
        process = subprocess.Popen([
            sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Ждем немного для запуска
        time.sleep(3)
        
        if process.poll() is None:
            print("✅ Django сервер запущен на http://localhost:8000")
            return process
        else:
            print("❌ Не удалось запустить Django сервер")
            return None
    except Exception as e:
        print(f"❌ Ошибка запуска Django: {str(e)}")
        return None

def test_system():
    """Тестирует работу системы"""
    print("\n🧪 Тестирование системы...")
    
    try:
        # Тестируем Celery
        result = subprocess.run([
            sys.executable, 'test_celery.py'
        ], capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("✅ Celery работает корректно")
        else:
            print("⚠️  Проблемы с Celery")
            
    except Exception as e:
        print(f"❌ Ошибка тестирования: {str(e)}")

def cleanup(processes):
    """Очищает процессы при завершении"""
    print("\n🛑 Завершение работы...")
    
    for process in processes:
        if process and process.poll() is None:
            try:
                process.terminate()
                process.wait(timeout=5)
            except:
                process.kill()

def main():
    """Основная функция"""
    print("🚀 Запуск системы StreetBurger")
    print("=" * 50)
    
    processes = []
    
    try:
        # Проверяем и запускаем Redis
        if not check_redis():
            if not start_redis():
                print("❌ Не удалось запустить Redis. Завершение работы.")
                return
        
        # Запускаем Celery worker
        celery_process = start_celery_worker()
        if celery_process:
            processes.append(celery_process)
        
        # Запускаем Django сервер
        django_process = start_django_server()
        if django_process:
            processes.append(django_process)
        
        # Тестируем систему
        test_system()
        
        print("\n🎉 Система запущена!")
        print("📱 API доступен по адресу: http://localhost:8000/api/")
        print("🔧 Админ-панель: http://localhost:8000/admin/")
        print("📊 Celery мониторинг: celery -A config inspect stats")
        print("\n💡 Для остановки нажмите Ctrl+C")
        
        # Ждем завершения
        try:
            while True:
                time.sleep(1)
                # Проверяем, что процессы еще работают
                for process in processes:
                    if process.poll() is not None:
                        print(f"⚠️  Процесс завершился с кодом {process.returncode}")
        except KeyboardInterrupt:
            pass
            
    except Exception as e:
        print(f"❌ Ошибка запуска системы: {str(e)}")
    finally:
        cleanup(processes)
        print("✅ Система остановлена")

if __name__ == "__main__":
    main() 