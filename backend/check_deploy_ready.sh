#!/bin/bash

# Проверка готовности к деплою
echo "🔍 Проверка готовности BabayBurger Backend к деплою"
echo "=================================================="

# Проверка структуры проекта
echo "📁 Проверка структуры проекта..."
required_dirs=("api" "app_cashier" "app_operator" "config" "media" "logs" "static")
for dir in "${required_dirs[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir"
    else
        echo "❌ $dir - ОТСУТСТВУЕТ!"
    fi
done

# Проверка обязательных файлов
echo ""
echo "📄 Проверка обязательных файлов..."
required_files=("manage.py" "requirements.txt" "Dockerfile" "docker-compose.yml" ".gitignore" "env.example" "deploy.sh")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - ОТСУТСТВУЕТ!"
    fi
done

# Проверка размера проекта
echo ""
echo "📊 Статистика проекта..."
echo "Размер: $(du -sh . | cut -f1)"
echo "Файлов: $(find . -type f | wc -l)"
echo "Python файлов: $(find . -name "*.py" | wc -l)"

# Проверка лишних файлов
echo ""
echo "🧹 Проверка на лишние файлы..."
unwanted_patterns=("test_" "debug_" "setup_" "start_" "restart_" "create_" "check_" "fix_" "run_" "simple_" "working_")
found_unwanted=false
for pattern in "${unwanted_patterns[@]}"; do
    files=$(find . -name "*${pattern}*" -type f | grep -v "__pycache__" | grep -v "migrations")
    if [ ! -z "$files" ]; then
        echo "⚠️  Найдены файлы с паттерном '$pattern':"
        echo "$files"
        found_unwanted=true
    fi
done

if [ "$found_unwanted" = false ]; then
    echo "✅ Лишние файлы не найдены"
fi

# Проверка .env файла
echo ""
echo "⚙️ Проверка конфигурации..."
if [ -f ".env" ]; then
    echo "✅ .env файл существует"
    # Проверка обязательных переменных
    required_vars=("SECRET_KEY" "DB_NAME" "DB_USER" "DB_PASSWORD" "DB_HOST")
    for var in "${required_vars[@]}"; do
        if grep -q "^${var}=" .env; then
            echo "✅ $var настроен"
        else
            echo "⚠️  $var не найден в .env"
        fi
    done
else
    echo "❌ .env файл не найден! Создайте его из env.example"
fi

# Проверка зависимостей
echo ""
echo "📦 Проверка зависимостей..."
if [ -f "requirements.txt" ]; then
    echo "✅ requirements.txt существует"
    echo "Зависимостей: $(wc -l < requirements.txt)"
    
    # Проверка ключевых зависимостей
    key_deps=("Django" "psycopg2" "redis" "celery" "channels")
    for dep in "${key_deps[@]}"; do
        if grep -q "$dep" requirements.txt; then
            echo "✅ $dep"
        else
            echo "❌ $dep - ОТСУТСТВУЕТ!"
        fi
    done
else
    echo "❌ requirements.txt не найден!"
fi

# Проверка Docker конфигурации
echo ""
echo "🐳 Проверка Docker конфигурации..."
if [ -f "Dockerfile" ] && [ -f "docker-compose.yml" ]; then
    echo "✅ Docker файлы существуют"
    
    # Проверка PostgreSQL в docker-compose
    if grep -q "postgres" docker-compose.yml; then
        echo "✅ PostgreSQL настроен в Docker"
    else
        echo "❌ PostgreSQL не настроен в Docker"
    fi
    
    # Проверка Redis в docker-compose
    if grep -q "redis" docker-compose.yml; then
        echo "✅ Redis настроен в Docker"
    else
        echo "❌ Redis не настроен в Docker"
    fi
else
    echo "❌ Docker файлы не найдены!"
fi

echo ""
echo "🎯 Итоговая оценка готовности:"
echo "==============================="

# Подсчет ошибок
errors=0
if [ ! -f ".env" ]; then
    ((errors++))
fi

if [ "$found_unwanted" = true ]; then
    ((errors++))
fi

if [ $errors -eq 0 ]; then
    echo "🎉 Backend ГОТОВ к деплою!"
    echo ""
    echo "Следующие шаги:"
    echo "1. Настройте .env файл"
    echo "2. Запустите: ./quick_deploy.sh"
    echo "3. Или с Docker: docker-compose up -d"
else
    echo "⚠️  Найдены проблемы, требующие исправления"
    echo "Исправьте ошибки выше и запустите проверку снова"
fi

echo ""
echo "📚 Документация:"
echo "- README.md - основная документация"
echo "- DEPLOY_README.md - руководство по деплою"
echo "- MIGRATION_GUIDE.md - миграция на PostgreSQL"
