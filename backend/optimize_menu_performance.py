#!/usr/bin/env python3
"""
Скрипт для оптимизации производительности загрузки меню
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

from django.db import connection
from django.conf import settings
from api.models import MenuItem, Category, SizeOption, AddOn
import time

def analyze_menu_performance():
    """Анализ производительности загрузки меню"""
    
    print('🔍 Анализ производительности загрузки меню')
    print('=' * 50)
    
    # 1. Проверяем количество записей
    menu_items_count = MenuItem.objects.filter(is_active=True).count()
    categories_count = Category.objects.count()
    size_options_count = SizeOption.objects.filter(is_active=True).count()
    addons_count = AddOn.objects.filter(is_active=True).count()
    
    print(f'📊 Количество записей:')
    print(f'   - Товары: {menu_items_count}')
    print(f'   - Категории: {categories_count}')
    print(f'   - Размеры: {size_options_count}')
    print(f'   - Дополнения: {addons_count}')
    print()
    
    # 2. Тестируем оптимизированный запрос
    print('⏱️ Тестирование оптимизированного запроса...')
    start_time = time.time()
    
    # Очищаем кэш запросов
    connection.queries_log.clear()
    
    # Оптимизированный запрос
    from django.db.models import Q
    from django.utils import timezone
    
    current_time = timezone.now().time()
    time_condition = Q(use_time_restriction=False) | (
        Q(use_time_restriction=True) & 
        Q(available_from_time__lte=current_time) & 
        Q(available_to_time__gte=current_time)
    )
    
    all_items = MenuItem.objects.filter(
        is_active=True
    ).filter(
        time_condition
    ).select_related('category').prefetch_related(
        'size_options', 'add_on_options'
    ).order_by('priority', '-created_at')
    
    items_list = list(all_items)
    query_time = time.time() - start_time
    
    print(f'   - Время выполнения: {query_time:.3f}s')
    print(f'   - Количество SQL запросов: {len(connection.queries)}')
    print(f'   - Загружено товаров: {len(items_list)}')
    print()
    
    # 3. Анализируем SQL запросы
    print('🔍 Анализ SQL запросов:')
    for i, query in enumerate(connection.queries[-5:], 1):  # Последние 5 запросов
        print(f'   {i}. {query["time"]}s - {query["sql"][:80]}...')
    print()
    
    # 4. Тестируем сериализацию
    print('⏱️ Тестирование сериализации...')
    start_time = time.time()
    
    from api.serializers import MenuItemSerializer
    serializer = MenuItemSerializer(items_list[:10], many=True)  # Первые 10 для теста
    serialization_time = time.time() - start_time
    
    print(f'   - Время сериализации 10 товаров: {serialization_time:.3f}s')
    print(f'   - Размер данных: {len(str(serializer.data))} символов')
    print()
    
    # 5. Проверяем индексы
    print('🔍 Проверка индексов базы данных...')
    with connection.cursor() as cursor:
        try:
            cursor.execute("""
                SELECT indexname, tablename, indexdef 
                FROM pg_indexes 
                WHERE tablename IN ('api_menuitem', 'api_category', 'api_sizeoption', 'api_addon')
                ORDER BY tablename, indexname;
            """)
            
            indexes = cursor.fetchall()
            print(f'   - Найдено индексов: {len(indexes)}')
            for index in indexes[:10]:  # Показываем первые 10
                print(f'     * {index[0]} on {index[1]}')
        except Exception as e:
            print(f'   - Ошибка при проверке индексов: {e}')
    print()
    
    # 6. Рекомендации по оптимизации
    print('💡 Рекомендации по оптимизации:')
    
    if query_time > 2.0:
        print('   ⚠️  Запрос выполняется медленно (>2s)')
        print('   - Рассмотрите добавление индексов на поля is_active, priority, created_at')
        print('   - Проверьте настройки базы данных')
    
    if len(connection.queries) > 5:
        print('   ⚠️  Слишком много SQL запросов')
        print('   - Убедитесь, что prefetch_related работает корректно')
        print('   - Проверьте сериализаторы на дополнительные запросы')
    
    if serialization_time > 0.1:
        print('   ⚠️  Сериализация медленная')
        print('   - Оптимизируйте сериализаторы')
        print('   - Используйте предзагруженные данные')
    
    if menu_items_count > 500:
        print('   ⚠️  Большое количество товаров')
        print('   - Рассмотрите пагинацию')
        print('   - Используйте ленивую загрузку')
    
    print()
    print('✅ Анализ завершен')

if __name__ == '__main__':
    analyze_menu_performance()
