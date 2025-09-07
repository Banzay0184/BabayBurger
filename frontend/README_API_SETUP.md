# 🚀 Настройка API для Babay Food

## 📡 Продакшн API

Ваш API развернут по адресу: **https://api.babayfood.uz/**

### 🔗 Доступные эндпоинты:

Согласно ответу API, доступны следующие эндпоинты:
- **Profile**: https://api.babayfood.uz/profile/
- **Sessions**: https://api.babayfood.uz/sessions/
- **Orders**: https://api.babayfood.uz/orders/
- **Operator Orders**: https://api.babayfood.uz/operator-orders/
- **Notifications**: https://api.babayfood.uz/notifications/
- **Analytics**: https://api.babayfood.uz/analytics/
- **Delivery Zones**: https://api.babayfood.uz/delivery-zones/
- **Map**: https://api.babayfood.uz/map/

## ⚙️ Конфигурация фронтенда

### 1. Переменные окружения

Создайте файл `.env.production` в корне фронтенда:

```bash
# Production Environment Variables
VITE_API_URL=https://api.babayfood.uz/
VITE_API_BASE_URL=https://api.babayfood.uz
VITE_WEBSOCKET_URL=api.babayfood.uz
VITE_TELEGRAM_AUTH_URL=https://api.babayfood.uz/auth/telegram-widget/

# Production settings
VITE_APP_ENV=production
VITE_APP_NAME=Babay Food
VITE_APP_VERSION=1.0.0
```

### 2. Обновленная конфигурация

Файл `src/config/api.ts` уже обновлен для использования вашего продакшн API:

```typescript
export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 
    (import.meta.env.DEV 
      ? '/api/'  // Локальная разработка
      : 'https://api.babayfood.uz/'),  // Продакшн
  
  TELEGRAM_WIDGET_URL: import.meta.env.VITE_TELEGRAM_AUTH_URL || 
    (import.meta.env.DEV 
      ? '/api/auth/telegram-widget/'
      : 'https://api.babayfood.uz/auth/telegram-widget/'),
  
  TIMEOUT: 15000,
  ENV: {
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD,
    isTest: import.meta.env.MODE === 'test'
  }
};
```

## 🔧 Унифицированный API клиент

Создан унифицированный API клиент (`src/api/unifiedClient.ts`) который:

### ✅ Преимущества:
- **Единая логика** для всех API запросов
- **Автоматическая обработка ошибок**
- **Поддержка разных типов авторизации** (Bearer, Token, None)
- **Централизованное управление токенами**
- **Автоматические заголовки** для ngrok и CSRF

### 🎯 Типы клиентов:
- `clientApi` - для клиентов (Bearer токены)
- `operatorApi` - для операторов (Token авторизация)
- `cashierApi` - для кассиров (Token авторизация)
- `publicApi` - для публичных запросов (без авторизации)

## 🌐 WebSocket конфигурация

WebSocket настроен для использования вашего продакшн сервера:

```typescript
// В продакшене используем ваш развернутый API
const productionUrl = import.meta.env.VITE_WEBSOCKET_URL || 'api.babayfood.uz';
baseUrl = `${protocol}//${productionUrl}`;
```

## 🚀 Сборка для продакшена

### 1. Установка зависимостей:
```bash
npm install
```

### 2. Сборка для продакшена:
```bash
npm run build
```

### 3. Предварительный просмотр:
```bash
npm run preview
```

## 🔍 Тестирование API

### Проверка доступности:
```bash
curl https://api.babayfood.uz/
```

### Тестирование эндпоинтов:
```bash
# Проверка профиля
curl https://api.babayfood.uz/profile/

# Проверка заказов
curl https://api.babayfood.uz/orders/

# Проверка зон доставки
curl https://api.babayfood.uz/delivery-zones/
```

## 📱 Интеграция с Telegram

### Настройка Telegram Web App:
1. Убедитесь, что ваш бот настроен для работы с доменом
2. Добавьте домен в настройки бота
3. Настройте Web App URL для использования вашего фронтенда

### Авторизация через Telegram:
```typescript
// Автоматически использует https://api.babayfood.uz/auth/telegram-widget/
const authData = {
  id: userId,
  first_name: userData.first_name,
  // ... другие поля
};

const response = await publicApi.post('auth/telegram-widget/', authData);
```

## 🛠️ Отладка

### Логи в консоли:
- 🌐 API запросы и ответы
- 🔌 WebSocket подключения
- ❌ Ошибки и их детали
- 🔧 Конфигурация и настройки

### Проверка CORS:
Убедитесь, что ваш API сервер настроен для работы с CORS для вашего фронтенд домена.

## 📋 Следующие шаги

1. ✅ **API развернут** - https://api.babayfood.uz/
2. ✅ **Конфигурация обновлена** - использует продакшн API
3. ✅ **Унифицированный клиент** - создан и настроен
4. 🔄 **Тестирование** - проверьте все эндпоинты
5. 🚀 **Деплой фронтенда** - настройте хостинг для фронтенда
6. 🔗 **Интеграция** - подключите Telegram бота

## 🆘 Поддержка

Если возникнут проблемы:
1. Проверьте логи в консоли браузера
2. Убедитесь, что API доступен
3. Проверьте CORS настройки
4. Проверьте переменные окружения

---

**🎉 Поздравляем! Ваш API успешно интегрирован с фронтендом!**
