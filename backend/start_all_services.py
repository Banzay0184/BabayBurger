#!/usr/bin/env python3
"""
Скрипт для запуска всех сервисов
"""

import os
import sys
import subprocess
import time
import signal
import threading
from pathlib import Path

class ServiceManager:
    def __init__(self):
        self.processes = {}
        self.running = True
        
    def start_django(self):
        """Запускает Django сервер"""
        print("🚀 Запуск Django сервера...")
        try:
            process = subprocess.Popen([
                sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            self.processes['django'] = process
            print("✅ Django сервер запущен")
            return True
        except Exception as e:
            print(f"❌ Ошибка запуска Django: {e}")
            return False
    
    def start_celery(self):
        """Запускает Celery worker"""
        print("🚀 Запуск Celery worker...")
        try:
            process = subprocess.Popen([
                sys.executable, '-m', 'celery', '-A', 'config', 'worker', '--loglevel=info'
            ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            
            self.processes['celery'] = process
            print("✅ Celery worker запущен")
            return True
        except Exception as e:
            print(f"❌ Ошибка запуска Celery: {e}")
            return False
    
    def check_ngrok(self):
        """Проверяет ngrok"""
        print("🔍 Проверка ngrok...")
        try:
            import requests
            response = requests.get("http://localhost:4040/api/tunnels", timeout=5)
            if response.status_code == 200:
                tunnels = response.json()['tunnels']
                if tunnels:
                    ngrok_url = tunnels[0]['public_url']
                    print(f"✅ Ngrok работает: {ngrok_url}")
                    return True
                else:
                    print("⚠️  Ngrok запущен, но туннели не найдены")
                    return False
            else:
                print("❌ Ngrok недоступен")
                return False
        except Exception as e:
            print(f"❌ Ошибка проверки ngrok: {e}")
            return False
    
    def setup_webhook(self):
        """Настраивает webhook"""
        print("🔧 Настройка webhook...")
        try:
            result = subprocess.run([
                sys.executable, 'setup_ngrok_webhook.py'
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                print("✅ Webhook настроен")
                return True
            else:
                print("❌ Ошибка настройки webhook")
                print(result.stderr)
                return False
        except Exception as e:
            print(f"❌ Ошибка настройки webhook: {e}")
            return False
    
    def wait_for_django(self, timeout=60):
        """Ожидает готовности Django"""
        print("⏳ Ожидание готовности Django...")
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            try:
                import requests
                response = requests.get("http://localhost:8000/admin/", timeout=5)
                if response.status_code in [200, 302, 403]:
                    print("✅ Django готов")
                    return True
            except:
                pass
            
            time.sleep(2)
        
        print("❌ Django не готов")
        return False
    
    def monitor_processes(self):
        """Мониторит процессы"""
        while self.running:
            for name, process in self.processes.items():
                if process.poll() is not None:
                    print(f"⚠️  Процесс {name} завершился")
                    self.processes.pop(name, None)
            time.sleep(5)
    
    def stop_all(self):
        """Останавливает все процессы"""
        print("\n🛑 Остановка всех сервисов...")
        self.running = False
        
        for name, process in self.processes.items():
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
    
    def run(self):
        """Запускает все сервисы"""
        print("🚀 ЗАПУСК ВСЕХ СЕРВИСОВ")
        print("=" * 50)
        
        # Проверяем ngrok
        if not self.check_ngrok():
            print("⚠️  Ngrok не запущен")
            print("💡 Запустите в отдельном терминале: ngrok http 8000")
        
        # Запускаем Django
        if not self.start_django():
            print("❌ Не удалось запустить Django")
            return False
        
        # Ждем готовности Django
        if not self.wait_for_django():
            print("❌ Django не готов")
            return False
        
        # Запускаем Celery
        self.start_celery()
        
        # Настраиваем webhook
        if self.check_ngrok():
            self.setup_webhook()
        
        # Запускаем мониторинг
        monitor_thread = threading.Thread(target=self.monitor_processes)
        monitor_thread.daemon = True
        monitor_thread.start()
        
        print("\n🎉 Все сервисы запущены!")
        print("📋 Статус:")
        print("   ✅ Django сервер")
        print("   ✅ Celery worker")
        print("   ✅ Webhook настроен")
        print("\n🤖 Теперь можете тестировать бота!")
        print("   Команды: /start, /menu, /orders, /status, /help")
        
        # Ожидаем сигнала завершения
        try:
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n🛑 Получен сигнал завершения")
        finally:
            self.stop_all()

def main():
    """Главная функция"""
    manager = ServiceManager()
    
    # Обработчик сигналов
    def signal_handler(signum, frame):
        manager.stop_all()
        sys.exit(0)
    
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    try:
        manager.run()
    except Exception as e:
        print(f"❌ Ошибка: {e}")
        manager.stop_all()

if __name__ == '__main__':
    main() 