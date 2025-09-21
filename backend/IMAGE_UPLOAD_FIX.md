# Исправление ошибки 413 "Request Entity Too Large"

## Проблема
При загрузке изображений размером более 1MB возникала ошибка 413 "Request Entity Too Large" от nginx.

## Решение

### 1. Настройки Django (✅ Выполнено)
Добавлены настройки в `config/settings.py`:
```python
# Настройки для загрузки файлов
DATA_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
FILE_UPLOAD_MAX_MEMORY_SIZE = 10 * 1024 * 1024  # 10MB
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000
FILE_UPLOAD_PERMISSIONS = 0o644
```

### 2. Сжатие изображений на фронтенде (✅ Выполнено)
Создана утилита `frontend/src/utils/imageCompression.ts` с функциями:
- `autoCompressImage()` - автоматическое сжатие с оптимальными параметрами
- `compressImage()` - сжатие с заданными параметрами
- `shouldCompressImage()` - проверка необходимости сжатия

Обновлен `AdminMenuPage.tsx` для использования сжатия изображений.

### 3. Настройки nginx (✅ Выполнено)
Создан файл `nginx.conf` с настройками:
```nginx
client_max_body_size 10M;
client_body_timeout 60s;
client_header_timeout 60s;
large_client_header_buffers 4 16k;
```

### 4. Docker конфигурация (✅ Выполнено)
Обновлены:
- `Dockerfile` - добавлен nginx
- `docker-compose.yml` - добавлен сервис nginx

## Развертывание

### Для локальной разработки:
```bash
# Перезапустить Django сервер
cd backend
python manage.py runserver
```

### Для продакшена:
```bash
# Обновить конфигурацию nginx на сервере
cd backend
sudo ./update_nginx_config.sh

# Или пересобрать Docker контейнеры
docker-compose down
docker-compose up --build -d
```

## Тестирование

1. Откройте админ панель
2. Попробуйте загрузить изображение размером более 1MB
3. Проверьте, что изображение автоматически сжимается
4. Убедитесь, что загрузка проходит успешно

## Мониторинг

Проверьте логи для подтверждения работы:
```bash
# Логи Django
tail -f backend/logs/django.log

# Логи nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

## Параметры сжатия

Утилита автоматически выбирает оптимальные параметры:
- Файлы >2MB: 800x800px, качество 60%, макс. 300KB
- Файлы 1-2MB: 1000x1000px, качество 70%, макс. 400KB  
- Файлы 0.5-1MB: 1200x1200px, качество 80%, макс. 500KB
- Файлы <0.5MB: без сжатия

## Безопасность

- Максимальный размер после сжатия: 1MB
- Поддерживаемые форматы: JPEG, PNG, WebP
- Автоматическая конвертация в JPEG для лучшего сжатия
