# 🔧 PWA Routing и разделение манифестов

## 🎯 Проблема

Ранее при установке PWA с любой страницы устанавливалась версия кассира, потому что основной манифест (`manifest.json`) имел `scope: "/"`, что означало, что он применялся ко всему сайту.

## ✅ Решение

Созданы отдельные манифесты и HTML файлы для каждого интерфейса:

### 📁 Структура файлов

```
public/
├── manifest.json          # Манифест кассира (scope: /cashier)
├── client-manifest.json   # Манифест клиента (scope: /)
├── operator-manifest.json # Манифест оператора (scope: /operator)
├── sw.js                  # Service Worker кассира
└── operator-sw.js         # Service Worker оператора

HTML файлы:
├── index.html             # Клиентский интерфейс
├── cashier.html           # Интерфейс кассира
└── operator.html          # Интерфейс оператора
```

### 🔧 Конфигурация Vite

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',      // Клиент
        cashier: 'cashier.html', // Кассир
        operator: 'operator.html' // Оператор
      }
    }
  }
});
```

## 📱 Манифесты

### 1. Клиентский манифест (`client-manifest.json`)
```json
{
  "name": "Babay Food - Доставка еды",
  "short_name": "Babay Food",
  "start_url": "/",
  "scope": "/",
  "theme_color": "#f97316",
  "orientation": "portrait-primary"
}
```

### 2. Манифест кассира (`manifest.json`)
```json
{
  "name": "Babay Burger - Кассир",
  "short_name": "Babay Кассир",
  "start_url": "/cashier",
  "scope": "/cashier",
  "theme_color": "#f97316",
  "orientation": "portrait-primary"
}
```

### 3. Манифест оператора (`operator-manifest.json`)
```json
{
  "name": "Babay Burger - Оператор",
  "short_name": "Babay Оператор",
  "start_url": "/operator",
  "scope": "/operator",
  "theme_color": "#3b82f6",
  "orientation": "landscape-primary"
}
```

## 🚀 Service Workers

### 1. Service Worker кассира (`sw.js`)
- Кэширует ресурсы для `/cashier`
- Обрабатывает API запросы кассира
- Push уведомления для кассира

### 2. Service Worker оператора (`operator-sw.js`)
- Кэширует ресурсы для `/operator`
- Обрабатывает API запросы оператора
- Push уведомления для оператора

## 📋 HTML файлы

### 1. `index.html` - Клиентский интерфейс
```html
<link rel="manifest" href="/client-manifest.json" />
```

### 2. `cashier.html` - Интерфейс кассира
```html
<link rel="manifest" href="/manifest.json" />
<script>
  navigator.serviceWorker.register('/sw.js');
</script>
```

### 3. `operator.html` - Интерфейс оператора
```html
<link rel="manifest" href="/operator-manifest.json" />
<script>
  navigator.serviceWorker.register('/operator-sw.js');
</script>
```

## 🎯 Результат

Теперь каждый интерфейс имеет свой собственный PWA:

- **Клиент**: Устанавливается с главной страницы (`/`)
- **Кассир**: Устанавливается со страницы кассира (`/cashier`)
- **Оператор**: Устанавливается со страницы оператора (`/operator`)

## 🔍 Тестирование

1. **Откройте** `/operator` в браузере
2. **Дождитесь** появления prompt установки
3. **Установите** приложение
4. **Проверьте**, что установлено приложение оператора

## 📝 Примечания

- Каждый манифест имеет свой `scope`, что предотвращает конфликты
- Service Workers регистрируются только для соответствующих интерфейсов
- PWA компоненты автоматически определяют правильный контекст
