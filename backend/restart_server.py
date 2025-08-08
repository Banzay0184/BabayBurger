#!/usr/bin/env python3
"""
Скрипт для перезапуска Django сервера
"""

import os
import sys
import subprocess
import time
import signal

def restart_django():
    """Перезапускает Django сервер"""
    
    print("🔄 Перезапуск Django сервера...")
    
    # Ищем процесс Django
    try:
        result = subprocess.run(['pgrep', '-f', 'manage.py runserver'], 
                              capture_output=True, text=True)
        if result.stdout.strip():
            pids = result.stdout.strip().split('\n')
            print(f"📋 Найдены процессы Django: {pids}")
            
            # Останавливаем процессы
            for pid in pids:
                if pid:
                    try:
                        os.kill(int(pid), signal.SIGTERM)
                        print(f"🛑 Остановлен процесс {pid}")
                    except Exception as e:
                        print(f"❌ Ошибка остановки процесса {pid}: {e}")
            
            # Ждем немного
            time.sleep(2)
        else:
            print("ℹ️ Процессы Django не найдены")
    except Exception as e:
        print(f"❌ Ошибка поиска процессов: {e}")
    
    # Запускаем новый процесс
    print("🚀 Запуск нового Django сервера...")
    try:
        process = subprocess.Popen([
            sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Ждем немного для запуска
        time.sleep(3)
        
        # Проверяем, что сервер запустился
        import requests
        try:
            response = requests.get('http://localhost:8000/api/test/', timeout=5)
            if response.status_code == 200:
                print("✅ Django сервер успешно перезапущен")
                return True
            else:
                print(f"❌ Сервер отвечает, но статус: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Ошибка проверки сервера: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Ошибка запуска Django: {e}")
        return False

if __name__ == '__main__':
    restart_django() 