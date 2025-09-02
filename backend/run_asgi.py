#!/usr/bin/env python3
"""
Запуск Django с ASGI поддержкой для WebSocket
"""

import os
import sys
import django
from pathlib import Path

# Добавляем путь к проекту
BASE_DIR = Path(__file__).resolve().parent
sys.path.append(str(BASE_DIR))

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

if __name__ == '__main__':
    try:
        import uvicorn
        print("🚀 Запуск Django с ASGI поддержкой...")
        print("📡 WebSocket будет доступен на ws://localhost:8000/ws/")
        print("🌐 HTTP API будет доступен на http://localhost:8000/")
        print("💡 Для остановки нажмите Ctrl+C")
        print("="*50)
        
        uvicorn.run(
            "config.asgi:application",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
    except ImportError:
        print("❌ uvicorn не установлен. Установите его:")
        print("   pip install uvicorn")
        print("\n🔄 Альтернативно, запустите обычный Django сервер:")
        print("   python manage.py runserver")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n⏹️ Сервер остановлен")
        sys.exit(0)
    except Exception as e:
        print(f"❌ Ошибка запуска сервера: {e}")
        sys.exit(1)
