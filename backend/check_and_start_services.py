#!/usr/bin/env python3
"""
Скрипт для проверки и запуска всех необходимых сервисов
"""

import os
import sys
import subprocess
import time
import requests
import json
from pathlib import Path

def check_port(port):
    """Проверяет, занят ли порт"""
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    result = sock.connect_ex(('localhost', port))
    sock.close()
    return result == 0

def check_ngrok():
    """Проверяет ngrok туннель"""
    try:
        response = requests.get('http://localhost:4040/api/tunnels', timeout=5)
        if response.status_code == 200:
            tunnels = response.json()
            if tunnels.get('tunnels'):
                tunnel = tunnels['tunnels'][0]
                return {
                    'active': True,
                    'url': tunnel['public_url'],
                    'proto': tunnel['proto']
                }
    except Exception as e:
        print(f"❌ Ошибка проверки ngrok: {e}")
    
    return {'active': False}

def start_django():
    """Запускает Django сервер"""
    if check_port(8000):
        print("✅ Django сервер уже запущен на порту 8000")
        return True
    
    print("🚀 Запускаем Django сервер...")
    try:
        # Запускаем Django в фоновом режиме
        process = subprocess.Popen([
            sys.executable, 'manage.py', 'runserver', '0.0.0.0:8000'
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Ждем немного для запуска
        time.sleep(3)
        
        if check_port(8000):
            print("✅ Django сервер успешно запущен")
            return True
        else:
            print("❌ Не удалось запустить Django сервер")
            return False
    except Exception as e:
        print(f"❌ Ошибка запуска Django: {e}")
        return False

def test_api():
    """Тестирует API"""
    try:
        response = requests.get('http://localhost:8000/api/test/', timeout=10)
        if response.status_code == 200:
            print("✅ API тест успешен")
            return True
        else:
            print(f"❌ API тест неудачен: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Ошибка тестирования API: {e}")
        return False

def main():
    print("🔍 Проверка сервисов...")
    
    # Проверяем ngrok
    ngrok_status = check_ngrok()
    if ngrok_status['active']:
        print(f"✅ Ngrok активен: {ngrok_status['url']}")
    else:
        print("❌ Ngrok не активен. Запустите ngrok отдельно.")
    
    # Запускаем Django
    if start_django():
        # Тестируем API
        if test_api():
            print("🎉 Все сервисы работают!")
            
            # Выводим информацию для frontend
            if ngrok_status['active']:
                print(f"\n📋 Конфигурация для frontend:")
                print(f"VITE_API_URL={ngrok_status['url']}/api/")
                print(f"VITE_TELEGRAM_AUTH_URL={ngrok_status['url']}/api/auth/telegram-widget/")
        else:
            print("❌ API не отвечает")
    else:
        print("❌ Не удалось запустить Django")

if __name__ == '__main__':
    main() 