# 🚀 Настройка Telegram Bot для авторизации

## Шаг 1: Создание бота

### 1. Откройте Telegram и найдите @BotFather
```
https://t.me/BotFather
```

### 2. Создайте нового бота
Отправьте команду:
```
/newbot
```

### 3. Укажите данные бота
- **Имя бота**: `Babay Food`
- **Username бота**: `BabayBurgerBot` (должен заканчиваться на "bot")

### 4. Получите токен
BotFather выдаст токен вида:
```
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

## Шаг 2: Настройка Web App

### 1. Установите команду для бота
Отправьте BotFather:
```
/setcommands
```

Выберите вашего бота и отправьте:
```
start - Запустить приложение
menu - Открыть меню
cart - Корзина
```

### 2. Настройте Web App
Отправьте BotFather:
```
/setmenubutton
```

Выберите вашего бота и отправьте:
```
Babay Food
```

### 3. Настройте URL для Web App
Отправьте BotFather:
```
/setdomain
```

Выберите вашего бота и отправьте:
```
b05836c13049.ngrok-free.app
```

## Шаг 3: Обновление конфигурации

### 1. Обновите имя бота в конфигурации
В файле `src/config/telegram.ts` замените:
```typescript
BOT_NAME: 'BabayBurgerBot', // Ваше реальное имя бота
```

### 2. Сохраните токен бота
Создайте файл `.env` в корне проекта:
```env
TELEGRAM_BOT_TOKEN=ваш_токен_бота
```

## Шаг 4: Настройка бэкенда

### 1. Обновите настройки Django
В файле `backend/config/settings.py` добавьте:
```python
TELEGRAM_BOT_TOKEN = os.getenv('TELEGRAM_BOT_TOKEN')
```

### 2. Настройте webhook
В файле `backend/api/views.py` обновите обработчик:
```python
@csrf_exempt
def telegram_auth_widget(request):
    if request.method == 'POST':
        data = request.POST
        
        # Проверяем подпись
        if not verify_telegram_data(data):
            return JsonResponse({'error': 'Неверная подпись'}, status=400)
        
        # Создаем пользователя
        user = create_or_update_user(data)
        
        return JsonResponse({'success': True, 'user_id': user.id})
```

## Шаг 5: Тестирование

### 1. Запустите бэкенд
```bash
cd backend
python manage.py runserver
```

### 2. Запустите фронтенд
```bash
cd frontend
npm run dev
```

### 3. Протестируйте в Telegram
1. Найдите вашего бота в Telegram
2. Отправьте `/start`
3. Нажмите на кнопку "Babay Food"
4. Должно открыться приложение с авторизацией

## 🔧 Устранение проблем

### Проблема: "Неверные данные авторизации"
**Решение**: Проверьте, что:
- Имя бота в конфигурации совпадает с реальным
- URL авторизации правильный
- Бэкенд правильно обрабатывает данные

### Проблема: Виджет не загружается
**Решение**: 
- Проверьте, что бот существует и активен
- Убедитесь, что URL доступен извне (для продакшена)

### Проблема: Ошибка CORS
**Решение**:
- Добавьте домен в настройки CORS в Django
- Проверьте, что фронтенд и бэкенд на правильных портах

## 📝 Примеры команд для BotFather

### Создание бота:
```
/newbot
Babay Food
BabayBurgerBot
```

### Настройка команд:
```
/setcommands
@BabayBurgerBot
start - Запустить приложение
menu - Открыть меню
cart - Корзина
```

### Настройка Web App:
```
/setmenubutton
@BabayBurgerBot
Babay Food
```

### Настройка домена:
```
/setdomain
@BabayBurgerBot
localhost:5173
``` 