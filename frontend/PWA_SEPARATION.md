# 🔧 Разделение PWA для разных интерфейсов

## 🎯 Проблема

Ранее при установке PWA с любой страницы устанавливалась клиентская версия, потому что клиентский манифест (`client-manifest.json`) имел `scope: "/"`, что означало, что он применялся ко всему сайту.

## ✅ Решение

Созданы отдельные HTML файлы и манифесты для каждого интерфейса:

### 📁 Структура файлов

```
public/
├── manifest.json          # Манифест кассира (scope: /cashier)
├── client-manifest.json   # Манифест клиента (scope: /)
├── operator-manifest.json # Манифест оператора (scope: /operator)
├── sw.js                  # Service Worker кассира
├── client-sw.js           # Service Worker клиента
└── operator-sw.js         # Service Worker оператора

HTML файлы:
├── index.html             # Основной интерфейс (без PWA)
├── client.html            # Клиентский интерфейс с PWA
├── cashier.html           # Интерфейс кассира с PWA
└── operator.html          # Интерфейс оператора с PWA
```

### 🔧 Конфигурация Vite

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',      // Основной (без PWA)
        client: 'client.html',   // Клиент с PWA
        cashier: 'cashier.html', // Кассир с PWA
        operator: 'operator.html' // Оператор с PWA
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

### 1. Service Worker клиента (`client-sw.js`)
- Кэширует ресурсы для клиентской части
- Обрабатывает API запросы меню и категорий
- Push уведомления для клиентов

### 2. Service Worker кассира (`sw.js`)
- Кэширует ресурсы для `/cashier`
- Обрабатывает API запросы кассира
- Push уведомления для кассира

### 3. Service Worker оператора (`operator-sw.js`)
- Кэширует ресурсы для `/operator`
- Обрабатывает API запросы оператора
- Push уведомления для оператора

## 📋 HTML файлы

### 1. `index.html` - Основной интерфейс (без PWA)
```html
<!-- PWA Manifest отключен, чтобы не конфликтовать с административными разделами -->
<!-- <link rel="manifest" href="/client-manifest.json" /> -->
```

### 2. `client.html` - Клиентский интерфейс с PWA
```html
<link rel="manifest" href="/client-manifest.json" />
<script>
  navigator.serviceWorker.register('/client-sw.js');
</script>
```

### 3. `cashier.html` - Интерфейс кассира с PWA
```html
<link rel="manifest" href="/manifest.json" />
<script>
  navigator.serviceWorker.register('/sw.js');
</script>
```

### 4. `operator.html` - Интерфейс оператора с PWA
```html
<link rel="manifest" href="/operator-manifest.json" />
<script>
  navigator.serviceWorker.register('/operator-sw.js');
</script>
```

## 🎯 Результат

Теперь каждый интерфейс имеет свой собственный PWA:

- **Клиент** (`/client.html`) → устанавливается клиентское приложение
- **Кассир** (`/cashier.html`) → устанавливается приложение кассира  
- **Оператор** (`/operator.html`) → устанавливается приложение оператора
- **Основной** (`/index.html`) → без PWA (чтобы не конфликтовать)

## 🔍 Тестирование

1. **Откройте** `/operator.html` в браузере
2. **Дождитесь** появления prompt установки
3. **Установите** приложение
4. **Проверьте**, что установлено приложение оператора

5. **Откройте** `/cashier.html` в браузере
6. **Дождитесь** появления prompt установки
7. **Установите** приложение
8. **Проверьте**, что установлено приложение кассира

## 📝 Примечания

- Каждый манифест имеет свой `scope`, что предотвращает конфликты
- Service Workers регистрируются только для соответствующих интерфейсов
- PWA компоненты автоматически определяют правильный контекст
- Основной интерфейс (`index.html`) не имеет PWA, чтобы не конфликтовать с административными разделами
