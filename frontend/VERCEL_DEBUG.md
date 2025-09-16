# 🔧 Диагностика проблем Vercel

## ✅ Что исправлено:

### 1. **Изменён vercel.json на `routes`**
```json
{
  "routes": [
    { "src": "/cashier.html", "dest": "/cashier.html" },
    { "src": "/operator.html", "dest": "/operator.html" },
    { "src": "/client.html", "dest": "/client.html" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

### 2. **Добавлены правильные заголовки для PWA**
- `Content-Type: application/manifest+json` для манифеста
- `Service-Worker-Allowed: /` для service worker

## 🚨 Диагностика проблем:

### **Шаг 1: Проверьте деплой**
После `git push` проверьте:
1. Vercel успешно задеплоил?
2. Есть ли ошибки в логах Vercel?

### **Шаг 2: Проверьте файлы на сервере**
Откройте в браузере:
- `https://yourdomain.com/cashier.html` - должен показать страницу кассира
- `https://yourdomain.com/cashier-manifest.json` - должен показать JSON манифест
- `https://yourdomain.com/cashier-sw.js` - должен показать JavaScript service worker
- `https://yourdomain.com/logo.jpg` - должен показать логотип

### **Шаг 3: Проверьте консоль браузера**
1. Откройте `https://yourdomain.com/cashier.html`
2. Откройте DevTools (F12)
3. Во вкладке Console ищите:
   ```
   🔍 TELEGRAM DETECTION:
   - window.Telegram exists: ...
   - isTelegramWebApp: ...
   ```

### **Шаг 4: Проверьте Network tab**
1. Откройте DevTools → Network
2. Обновите страницу
3. Проверьте:
   - `cashier-manifest.json` загружается с статусом 200?
   - `cashier-sw.js` загружается с статусом 200?
   - Есть ли ошибки 404?

## 🎯 Возможные проблемы и решения:

### **Проблема 1: cashier.html показывает index.html**
**Симптомы:** Вместо интерфейса кассира показывается главная страница

**Решение:**
```bash
# Очистить кэш Vercel
vercel --prod --force

# Или пересоздать деплой
git commit --allow-empty -m "force redeploy"
git push
```

### **Проблема 2: 404 на PWA файлы**
**Симптомы:** cashier-manifest.json или cashier-sw.js не найдены

**Проверьте:**
1. Файлы есть в dist/ после сборки?
2. vercel.json правильно настроен?
3. Нет ли .vercelignore, который их исключает?

### **Проблема 3: PWA не показывает кнопку установки**
**Симптомы:** В браузере нет предложения установить PWA

**Проверьте:**
1. Манифест загружается с правильным Content-Type?
2. Service Worker регистрируется без ошибок?
3. Все иконки доступны?

### **Проблема 4: Telegram предупреждение не показывается**
**Симптомы:** В Telegram WebApp нет предупреждения

**Проверьте:**
1. JavaScript выполняется без ошибок?
2. В консоли есть логи "TELEGRAM DETECTION"?
3. Функция showTelegramWarning() определена?

## 🔍 Команды для диагностики:

### **Проверить статус деплоя:**
```bash
vercel ls
vercel logs
```

### **Принудительный редеплой:**
```bash
vercel --prod --force
```

### **Проверить файлы локально:**
```bash
ls -la dist/cashier*
```

### **Тест в браузере:**
```javascript
// В консоли браузера на странице кассира:
console.log('Telegram:', !!window.Telegram);
console.log('Service Worker:', 'serviceWorker' in navigator);

// Проверить манифест
fetch('/cashier-manifest.json')
  .then(r => r.json())
  .then(console.log);
```

## 📱 Пошаговый тест:

### **1. Проверьте URL:**
- ✅ `https://yourdomain.com/cashier.html` (правильно)
- ❌ `https://yourdomain.com/cashier` (неправильно)
- ❌ `https://yourdomain.com/#/cashier` (неправильно)

### **2. Очистите кэш:**
- Ctrl+Shift+Del в браузере
- Или откройте в режиме инкогнито

### **3. Проверьте в разных браузерах:**
- Chrome (должен показать кнопку установки)
- Safari (должен работать на iOS)
- Telegram WebApp (должен показать предупреждение)

---

**После git push проверьте все пункты выше и сообщите, что именно не работает!** 🚀
