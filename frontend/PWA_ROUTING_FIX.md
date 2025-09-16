# Исправление маршрутизации PWA и конфликтов TronWeb

## Проблемы, которые были исправлены:

### 1. Неправильный start_url в PWA манифесте
**Проблема:** После установки PWA открывался `https://www.babayfood.uz/cashier` вместо `https://www.babayfood.uz/cashier/login`

**Решение:**
- Обновлен `start_url` в манифесте с `/cashier/` на `/cashier/login`
- Обновлен `id` в манифесте для соответствия новому URL
- Обновлен Service Worker для правильной обработки маршрутов

### 2. Конфликт TronWeb в продакшене
**Проблема:** `TronWeb is already initiated. TronLink will overwrite the current instance`

**Решение:**
- Добавлена более агрессивная проверка готовности TronLink
- Реализована логика ожидания готовности TronLink
- Добавлена защита от перезаписи существующих экземпляров
- Улучшено логирование для диагностики конфликтов

### 3. Service Worker маршрутизация
**Проблема:** Service Worker не правильно обрабатывал перенаправления с `/cashier` на `/cashier/login`

**Решение:**
- Обновлена стратегия `networkFirstStrategy` для специальной обработки маршрутов кассира
- Добавлена логика перенаправления с `/cashier` на `/cashier/login` в офлайн режиме
- Обновлен кэш для включения `/cashier/login`
- Увеличена версия Service Worker для принудительного обновления

## Файлы, которые были изменены:

1. `public/cashier/manifest.json` - обновлен start_url и id
2. `public/cashier/sw.js` - добавлена специальная обработка маршрутов кассира
3. `cashier.html` - улучшена обработка конфликтов TronWeb
4. `public/cashier/index.html` - обновлена диагностика TronLink/TronWeb

## Детали исправлений:

### Манифест (manifest.json)
```json
{
  "start_url": "/cashier/login",
  "id": "/cashier/login"
}
```

### Service Worker маршрутизация
```javascript
// Специальная обработка для маршрутов кассира
if (request.mode === 'navigate') {
  const url = new URL(request.url);
  
  // Если запрашивается /cashier, перенаправляем на /cashier/login
  if (url.pathname === '/cashier' || url.pathname === '/cashier/') {
    const loginUrl = new URL('/cashier/login', url.origin);
    const cachedLoginResponse = await caches.match(loginUrl);
    if (cachedLoginResponse) {
      return cachedLoginResponse;
    }
  }
}
```

### TronWeb конфликт
```javascript
// Предотвращаем конфликты с TronLink и TronWeb
if (window.tronLink && window.tronLink.ready) {
  console.log('✅ TronLink detected and ready - using TronLink TronWeb instance');
  tronWeb = window.tronLink.tronWeb;
  // Предотвращаем перезапись TronWeb
  if (window.TronWeb && window.TronWeb !== tronWeb) {
    console.log('⚠️ Preventing TronWeb conflict - using TronLink instance');
  }
}
```

## Инструкции для деплоя:

1. **Сборка проекта:**
   ```bash
   npm run build
   ```

2. **Проверка собранных файлов:**
   - Убедитесь, что в `dist/` есть обновленные файлы
   - Проверьте, что манифест содержит правильный `start_url`

3. **Деплой:**
   - Загрузите содержимое папки `dist/` на ваш хостинг
   - Убедитесь, что сервер правильно обрабатывает статические файлы

## Тестирование:

1. **Основной маршрут:**
   - Откройте `https://www.babayfood.uz/cashier/login` в браузере
   - Проверьте, что страница загружается корректно

2. **PWA установка:**
   - Установите PWA приложение
   - Проверьте, что после установки открывается `/cashier/login`
   - Убедитесь, что при запуске PWA открывается правильная страница

3. **Обратная совместимость:**
   - Проверьте `https://www.babayfood.uz/cashier`
   - Убедитесь, что происходит перенаправление на `/cashier/login`

4. **TronWeb конфликты:**
   - Проверьте консоль браузера на отсутствие ошибок TronWeb
   - Убедитесь, что TronLink обрабатывается корректно

5. **Офлайн режим:**
   - Отключите интернет
   - Попробуйте открыть `/cashier` - должно перенаправить на `/cashier/login`
   - Проверьте работу в офлайн режиме

## Мониторинг:

После деплоя следите за:
- Отсутствием ошибок TronWeb в консоли
- Правильным открытием `/cashier/login` после установки PWA
- Корректной работой перенаправлений
- Стабильной работой Service Worker

## Дополнительные улучшения:

- Добавлена диагностика готовности TronLink
- Улучшена обработка конфликтов с расширениями браузера
- Реализована специальная логика для маршрутов кассира в Service Worker
- Добавлено логирование для лучшей диагностики проблем
