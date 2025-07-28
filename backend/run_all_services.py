#!/usr/bin/env python3
"""
Скрипт для запуска всех сервисов одновременно
"""

import os
import sys
import subprocess
import time
import signal
import threading
from pathlib import Path
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

class ServiceManager:
    def __init__(self):
        self.processes = []
        self.running = True
        
    def start_django(self):
        """Запускает Django сервер"""
        print("🚀 Запуск Django сервера...")
        try:
            process = subprocess.Popen([
                sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.processes.append(('Django', process))
            print("✅ Django сервер запущен на http://localhost:8000")
            return True
        except Exception as e:
            print(f"❌ Ошибка запуска Django: {e}")
            return False
    
    def start_celery(self):
        """Запускает Celery worker"""
        print("🔄 Запуск Celery worker...")
        try:
            process = subprocess.Popen([
                'celery', '-A', 'config', 'worker', '-l', 'info'
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.processes.append(('Celery', process))
            print("✅ Celery worker запущен")
            return True
        except Exception as e:
            print(f"⚠️  Ошибка запуска Celery: {e}")
            print("💡 Убедитесь, что Redis запущен")
            return False
    
    def wait_for_django(self, timeout=30):
        """Ждет, пока Django сервер будет готов"""
        print("⏳ Ожидание готовности Django сервера...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                import requests
                response = requests.get("http://localhost:8000/admin/", timeout=2)
                if response.status_code in [200, 302, 403]:
                    print("✅ Django сервер готов!")
                    return True
            except:
                pass
            time.sleep(1)
        
        print("❌ Django сервер не готов за отведенное время")
        return False
    
    def setup_webhook(self):
        """Настраивает webhook"""
        print("🔧 Настройка webhook...")
        try:
            result = subprocess.run([
                sys.executable, 'setup_ngrok_webhook.py'
            ], capture_output=True, text=True, timeout=60)
            
            if result.returncode == 0:
                print("✅ Webhook настроен успешно")
                return True
            else:
                print("❌ Ошибка настройки webhook")
                print(result.stderr)
                return False
        except Exception as e:
            print(f"❌ Ошибка настройки webhook: {e}")
            return False
    
    def check_services(self):
        """Проверяет статус всех сервисов"""
        print("\n📊 СТАТУС СЕРВИСОВ")
        print("=" * 50)
        
        # Проверяем Django
        try:
            import requests
            response = requests.get("http://localhost:8000/admin/", timeout=5)
            if response.status_code in [200, 302, 403]:
                print("✅ Django сервер: Работает")
            else:
                print("❌ Django сервер: Не отвечает")
        except:
            print("❌ Django сервер: Недоступен")
        
        # Проверяем ngrok
        try:
            response = requests.get("http://localhost:4040/api/tunnels", timeout=5)
            if response.status_code == 200:
                tunnels = response.json()['tunnels']
                if tunnels:
                    ngrok_url = tunnels[0]['public_url']
                    print(f"✅ Ngrok: {ngrok_url}")
                else:
                    print("❌ Ngrok: Туннели не найдены")
            else:
                print("❌ Ngrok: Недоступен")
        except:
            print("❌ Ngrok: Недоступен")
        
        # Проверяем Celery
        try:
            result = subprocess.run([
                'celery', '-A', 'config', 'inspect', 'ping'
            ], capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                print("✅ Celery: Работает")
            else:
                print("⚠️  Celery: Не отвечает")
        except:
            print("⚠️  Celery: Недоступен")
    
    def stop_all(self):
        """Останавливает все процессы"""
        print("\n🛑 Остановка всех сервисов...")
        for name, process in self.processes:
            try:
                process.terminate()
                process.wait(timeout=5)
                print(f"✅ {name} остановлен")
            except:
                try:
                    process.kill()
                    print(f"⚠️  {name} принудительно остановлен")
                except:
                    pass
    
    def signal_handler(self, signum, frame):
        """Обработчик сигналов для корректного завершения"""
        print("\n🛑 Получен сигнал завершения...")
        self.running = False
        self.stop_all()
        sys.exit(0)
    
    def run(self):
        """Главная функция запуска"""
        print("🚀 ЗАПУСК ВСЕХ СЕРВИСОВ")
        print("=" * 50)
        
        # Регистрируем обработчик сигналов
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)
        
        # Проверяем .env файл
        env_file = Path('.env')
        if not env_file.exists():
            print("❌ Файл .env не найден")
            print("💡 Создайте .env файл на основе env_example.txt")
            return False
        
        # Проверяем BOT_TOKEN
        bot_token = os.getenv('BOT_TOKEN')
        if not bot_token or bot_token == 'your_bot_token_here':
            print("❌ BOT_TOKEN не настроен")
            print("💡 Добавьте реальный токен бота в .env файл")
            return False
        
        print("✅ Переменные окружения загружены")
        
        # Запускаем Django
        if not self.start_django():
            return False
        
        # Ждем готовности Django
        if not self.wait_for_django():
            return False
        
        # Запускаем Celery в отдельном потоке
        def start_celery_thread():
            self.start_celery()
        
        celery_thread = threading.Thread(target=start_celery_thread)
        celery_thread.daemon = True
        celery_thread.start()
        
        # Ждем немного для запуска Celery
        time.sleep(3)
        
        # Настраиваем webhook
        if not self.setup_webhook():
            print("⚠️  Webhook не настроен, но система работает")
        
        # Проверяем статус
        self.check_services()
        
        print("\n🎉 Система запущена!")
        print("📋 Доступные URL:")
        print("   🏠 Локальный сервер: http://localhost:8000")
        print("   🔧 Админ панель: http://localhost:8000/admin/")
        print("   📊 Ngrok мониторинг: http://localhost:4040")
        
        print("\n🤖 Тестирование бота:")
        print("   1. Откройте бота в Telegram")
        print("   2. Отправьте команду /start")
        print("   3. Проверьте ответ бота")
        
        print("\n🔄 Для остановки нажмите Ctrl+C")
        
        # Ждем завершения
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            pass
        finally:
            self.stop_all()

def main():
    """Главная функция"""
    manager = ServiceManager()
    try:
        manager.run()
    except KeyboardInterrupt:
        print("\n🛑 Завершение работы...")
        manager.stop_all()

if __name__ == '__main__':
    main() 