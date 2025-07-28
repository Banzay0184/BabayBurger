#!/usr/bin/env python3
"""
Главный скрипт для запуска всех комплексных тестов системы доставки
"""

import os
import sys
import time
import subprocess
from datetime import datetime

def run_command(command, description):
    """Запуск команды с выводом результата"""
    print(f"\n🔄 {description}")
    print(f"Команда: {command}")
    print("-" * 50)
    
    start_time = time.time()
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            capture_output=True, 
            text=True,
            cwd=os.path.dirname(os.path.abspath(__file__))
        )
        duration = time.time() - start_time
        
        if result.returncode == 0:
            print(f"✅ {description} - УСПЕШНО ({duration:.2f}s)")
            if result.stdout:
                print("Вывод:")
                print(result.stdout)
            return True
        else:
            print(f"❌ {description} - ПРОВАЛЕН ({duration:.2f}s)")
            print("Ошибка:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"❌ {description} - ОШИБКА: {e}")
        return False

def main():
    """Главная функция запуска тестов"""
    print("🧪 КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ СИСТЕМЫ ДОСТАВКИ")
    print("=" * 60)
    print(f"Время запуска: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Результаты тестов
    test_results = {
        'database_migrations': False,
        'create_test_data': False,
        'comprehensive_system_test': False,
        'api_integration_test': False,
        'django_tests': False
    }
    
    # 1. Проверяем и применяем миграции
    test_results['database_migrations'] = run_command(
        "python manage.py migrate",
        "Применение миграций базы данных"
    )
    
    # 2. Создаем тестовые данные
    test_results['create_test_data'] = run_command(
        "python manage.py create_test_operators --clear",
        "Создание тестовых операторов и зон доставки"
    )
    
    # 3. Запускаем комплексный системный тест
    test_results['comprehensive_system_test'] = run_command(
        "python comprehensive_system_test.py",
        "Комплексный системный тест"
    )
    
    # 4. Запускаем API интеграционные тесты
    test_results['api_integration_test'] = run_command(
        "python api_integration_test.py",
        "API интеграционные тесты"
    )
    
    # 5. Запускаем стандартные Django тесты
    test_results['django_tests'] = run_command(
        "python manage.py test app_operator api --verbosity=2",
        "Стандартные Django тесты"
    )
    
    # Выводим итоговые результаты
    print("\n" + "=" * 60)
    print("📊 ИТОГОВЫЕ РЕЗУЛЬТАТЫ ТЕСТИРОВАНИЯ")
    print("=" * 60)
    
    passed_tests = sum(test_results.values())
    total_tests = len(test_results)
    
    for test_name, result in test_results.items():
        status = "✅ ПРОЙДЕН" if result else "❌ ПРОВАЛЕН"
        print(f"{test_name.replace('_', ' ').title()}: {status}")
    
    print(f"\nОбщий результат: {passed_tests}/{total_tests} тестов пройдено")
    
    if passed_tests == total_tests:
        print("\n🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!")
        print("✅ Система готова к продакшену")
        sys.exit(0)
    else:
        print(f"\n⚠️  ПРОВАЛЕНО {total_tests - passed_tests} ТЕСТОВ")
        print("🔧 Требуется исправление ошибок")
        sys.exit(1)

if __name__ == "__main__":
    main() 