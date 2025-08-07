#!/usr/bin/env python
"""
Скрипт для применения миграций и перезапуска сервера
"""
import os
import sys
import subprocess
import django

# Настраиваем Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

def apply_migrations():
    """Применяет миграции"""
    print("🔄 Применение миграций...")
    try:
        result = subprocess.run(
            ['python', 'manage.py', 'migrate'],
            capture_output=True,
            text=True,
            cwd=os.getcwd()
        )
        if result.returncode == 0:
            print("✅ Миграции применены успешно!")
            print(result.stdout)
        else:
            print("❌ Ошибка при применении миграций:")
            print(result.stderr)
            return False
    except Exception as e:
        print(f"❌ Ошибка при выполнении миграций: {e}")
        return False
    return True

def check_server():
    """Проверяет, запущен ли сервер"""
    print("🔍 Проверка состояния сервера...")
    try:
        result = subprocess.run(
            ['lsof', '-ti:8000'],
            capture_output=True,
            text=True
        )
        if result.stdout.strip():
            print("⚠️  Сервер уже запущен на порту 8000")
            return True
        else:
            print("✅ Порт 8000 свободен")
            return False
    except Exception as e:
        print(f"⚠️  Не удалось проверить состояние сервера: {e}")
        return False

def start_server():
    """Запускает сервер"""
    print("🚀 Запуск сервера...")
    try:
        subprocess.Popen(
            ['python', 'manage.py', 'runserver'],
            cwd=os.getcwd()
        )
        print("✅ Сервер запущен на http://127.0.0.1:8000/")
        print("📝 Логи сервера будут отображаться в терминале")
    except Exception as e:
        print(f"❌ Ошибка при запуске сервера: {e}")

def main():
    """Основная функция"""
    print("🔧 Исправление проблем с моделью User")
    print("=" * 50)
    
    # Применяем миграции
    if not apply_migrations():
        print("❌ Не удалось применить миграции")
        return
    
    # Проверяем состояние сервера
    server_running = check_server()
    
    if server_running:
        print("\n⚠️  Сервер уже запущен. Перезапустите его вручную:")
        print("   1. Остановите текущий сервер (Ctrl+C)")
        print("   2. Запустите: python manage.py runserver")
    else:
        # Запускаем сервер
        start_server()
    
    print("\n✅ Исправления применены!")
    print("📋 Что было исправлено:")
    print("   - Добавлено поле last_name в модель User")
    print("   - Исправлена обработка пустых значений")
    print("   - Удалены несуществующие поля из ответов API")

if __name__ == '__main__':
    main() 