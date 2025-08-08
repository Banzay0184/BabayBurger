#!/usr/bin/env python3
"""
Скрипт для перезапуска Django с обновленными CORS настройками
"""

import os
import sys
import subprocess
import signal
import time
import psutil

def find_django_process():
    """Находим процесс Django"""
    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            if 'manage.py' in ' '.join(proc.info['cmdline'] or []):
                return proc
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue
    return None

def stop_django():
    """Останавливаем Django процесс"""
    print("🛑 Останавливаем Django...")
    
    django_proc = find_django_process()
    if django_proc:
        print(f"Найден процесс Django (PID: {django_proc.pid})")
        try:
            django_proc.terminate()
            django_proc.wait(timeout=10)
            print("✅ Django остановлен")
        except psutil.TimeoutExpired:
            print("⚠️ Принудительное завершение Django...")
            django_proc.kill()
        except Exception as e:
            print(f"❌ Ошибка остановки Django: {e}")
    else:
        print("ℹ️ Django процесс не найден")

def start_django():
    """Запускаем Django с новыми настройками"""
    print("🚀 Запускаем Django с обновленными CORS настройками...")
    
    try:
        # Запускаем Django в фоновом режиме
        process = subprocess.Popen([
            'python', 'manage.py', 'runserver', '0.0.0.0:8000'
        ], cwd=os.getcwd())
        
        print(f"✅ Django запущен (PID: {process.pid})")
        print("🌐 Сервер доступен по адресу: http://localhost:8000")
        print("🔗 Ngrok туннель: https://ec5b3f679bd2.ngrok-free.app")
        
        return process
    except Exception as e:
        print(f"❌ Ошибка запуска Django: {e}")
        return None

def test_api_connection():
    """Тестируем подключение к API"""
    print("\n🧪 Тестируем подключение к API...")
    
    import requests
    
    try:
        # Тестируем локальный сервер
        local_response = requests.get('http://localhost:8000/api/auth/test/', timeout=5)
        print(f"✅ Локальный API: {local_response.status_code}")
        
        # Тестируем через ngrok
        ngrok_response = requests.get(
            'https://ec5b3f679bd2.ngrok-free.app/api/auth/test/',
            headers={'ngrok-skip-browser-warning': 'true'},
            timeout=10
        )
        print(f"✅ Ngrok API: {ngrok_response.status_code}")
        
        # Проверяем CORS заголовки
        print("📋 CORS заголовки:")
        for header, value in ngrok_response.headers.items():
            if 'access-control' in header.lower():
                print(f"  {header}: {value}")
                
    except requests.exceptions.RequestException as e:
        print(f"❌ Ошибка подключения к API: {e}")

def main():
    """Основная функция"""
    print("🔄 Перезапуск Django с обновленными CORS настройками...")
    
    # Останавливаем старый процесс
    stop_django()
    
    # Ждем немного
    time.sleep(2)
    
    # Запускаем новый процесс
    django_process = start_django()
    
    if django_process:
        # Ждем запуска
        time.sleep(5)
        
        # Тестируем подключение
        test_api_connection()
        
        print("\n✅ Django перезапущен с новыми CORS настройками!")
        print("🔧 Теперь приложение на Vercel должно работать корректно")
        
        # Держим процесс активным
        try:
            django_process.wait()
        except KeyboardInterrupt:
            print("\n🛑 Получен сигнал остановки...")
            django_process.terminate()
            print("✅ Django остановлен")

if __name__ == "__main__":
    main() 