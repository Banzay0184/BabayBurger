# Исправление API URL для кассира

## Проблема

API запросы кассира отправлялись на неправильный URL:
- **Неправильно:** `https://api.babayfood.uz/cashier/auth/login/`
- **Правильно:** `https://api.babayfood.uz/api/cashier/auth/login/`

Это приводило к ошибке 404 Not Found, так как Django URL patterns ожидают префикс `/api/` для всех API маршрутов.

## Причина

В файле `src/api/cashierApi.ts` была неправильная конфигурация:
```typescript
const API_BASE_URL = 'cashier';  // ❌ Неправильно
```

## Решение

Исправлен URL в файле `src/api/cashierApi.ts`:
```typescript
const API_BASE_URL = 'api/cashier/';  // ✅ Правильно
```

## Django URL Patterns

Согласно Django конфигурации, правильные URL patterns для кассира:
```
api/cashier/  # Основной маршрут для кассира
```

Это означает, что все API запросы кассира должны начинаться с `/api/cashier/`.

## Затронутые эндпоинты

После исправления все эндпоинты кассира будут работать правильно:

- ✅ `POST /api/cashier/auth/login/` - Авторизация кассира
- ✅ `GET /api/cashier/orders/dashboard/` - Статистика дашборда
- ✅ `GET /api/cashier/orders/` - Список заказов
- ✅ `GET /api/cashier/orders/{id}/` - Детали заказа
- ✅ `POST /api/cashier/orders/{id}/start_processing/` - Начать обработку заказа
- ✅ `POST /api/cashier/orders/{id}/mark_ready/` - Отметить заказ готовым
- ✅ `POST /api/cashier/orders/{id}/mark_delivering/` - Отметить заказ в доставке
- ✅ `POST /api/cashier/orders/{id}/complete/` - Завершить заказ
- ✅ `GET /api/cashier/stoplist/menu/` - Меню стоп-листа
- ✅ `POST /api/cashier/stoplist/{id}/toggle_status/` - Переключить статус товара
- ✅ `GET /api/cashier/stoplist/addons/` - Дополнения
- ✅ `GET /api/cashier/stoplist/sizes/` - Размеры

## Файлы, которые были изменены:

1. `src/api/cashierApi.ts` - исправлен `API_BASE_URL` с `'cashier'` на `'api/cashier/'`

## Инструкции для деплоя:

1. **Сборка проекта:**
   ```bash
   npm run build
   ```

2. **Проверка собранных файлов:**
   - Убедитесь, что в `dist/` есть обновленные файлы
   - Проверьте, что новый JS файл содержит исправление

3. **Деплой:**
   - Загрузите содержимое папки `dist/` на ваш хостинг
   - Убедитесь, что сервер правильно обрабатывает статические файлы

## Тестирование:

1. **Авторизация кассира:**
   - Откройте `https://www.babayfood.uz/cashier/login`
   - Попробуйте войти с учетными данными кассира
   - Проверьте, что авторизация проходит успешно

2. **Проверка API запросов:**
   - Откройте DevTools → Network
   - Попробуйте войти в систему
   - Убедитесь, что запросы идут на правильный URL: `/api/cashier/auth/login/`

3. **Проверка других функций:**
   - После успешной авторизации проверьте загрузку дашборда
   - Проверьте загрузку списка заказов
   - Проверьте работу со стоп-листом

## Мониторинг:

После деплоя следите за:
- Отсутствием ошибок 404 в консоли браузера
- Успешной авторизацией кассиров
- Корректной работой всех API эндпоинтов кассира
- Отсутствием ошибок в Network tab DevTools

## Дополнительная информация:

- Исправление затрагивает только фронтенд код
- Бэкенд API остается без изменений
- Все существующие токены и данные кассиров сохраняются
- Обратная совместимость полностью сохранена

## Логи для диагностики:

После исправления в консоли должны появиться правильные URL:
```
🌐 API запрос: {
  method: 'POST', 
  url: 'auth/login/', 
  baseURL: 'https://api.babayfood.uz/api/cashier/', 
  fullURL: 'https://api.babayfood.uz/api/cashier/auth/login/'
}
```

Вместо неправильного:
```
🌐 API запрос: {
  method: 'POST', 
  url: 'auth/login/', 
  baseURL: 'https://api.babayfood.uz/cashier/', 
  fullURL: 'https://api.babayfood.uz/cashier/auth/login/'  // ❌ 404 ошибка
}
```
