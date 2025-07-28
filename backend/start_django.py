#!/usr/bin/env python3
"""
Простой скрипт для запуска Django сервера
"""

import os
import sys
import subprocess
import signal
import time

def start_django():
    """Запускает Django сервер с подробным выводом"""
    print("🚀 ЗАПУСК DJANGO СЕРВЕРА")
    print("=" * 50)
    
    # Проверяем наличие manage.py
    if not os.path.exists('manage.py'):
        print("❌ manage.py не найден")
        return False
    
    # Проверяем .env файл
    if not os.path.exists('.env'):
        print("⚠️  .env файл не найден")
        print("💡 Создайте .env файл на основе env_example.txt")
    
    print("✅ Файлы проверены")
    
    # Запускаем Django сервер
    try:
        print("🔄 Запуск сервера...")
        
        # Запускаем с выводом в реальном времени
        process = subprocess.Popen([
            sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'
        ], stdout=subprocess.PIPE, stderr=subprocess.STDOUT, 
        universal_newlines=True, bufsize=1)
        
        print("✅ Процесс запущен")
        print("📝 Логи сервера:")
        print("-" * 50)
        
        # Читаем вывод в реальном времени
        while True:
            output = process.stdout.readline()
            if output == '' and process.poll() is not None:
                break
            if output:
                print(output.strip())
        
        # Ждем завершения
        return_code = process.poll()
        if return_code == 0:
            print("✅ Сервер завершен нормально")
            return True
        else:
            print(f"❌ Сервер завершен с кодом {return_code}")
            return False
            
    except KeyboardInterrupt:
        print("\n🛑 Получен сигнал остановки...")
        process.terminate()
        process.wait()
        print("✅ Сервер остановлен")
        return True
    except Exception as e:
        print(f"❌ Ошибка запуска сервера: {e}")
        return False

def main():
    """Главная функция"""
    print("🔧 ЗАПУСК DJANGO СЕРВЕРА")
    print("=" * 50)
    
    # Регистрируем обработчик сигналов
    def signal_handler(signum, frame):
        print("\n🛑 Получен сигнал завершения...")
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Запускаем сервер
    success = start_django()
    
    if success:
        print("\n✅ Django сервер запущен успешно!")
        print("🌐 Доступен по адресу: http://localhost:8000")
        print("🔧 Админ панель: http://localhost:8000/admin/")
    else:
        print("\n❌ Ошибка запуска Django сервера")
        sys.exit(1)

if __name__ == '__main__':
    main() 