# 🚀 Vercel + ngrok WebSocket Configuration Guide

## 🏗️ **Архитектура:**
- **Vercel** - фронтенд (статический хостинг)
- **ngrok** - бэкенд + WebSocket (Django + WebSocket)

## ✅ **Решение:**

### **1. WebSocket через ngrok**
- ✅ WebSocket подключается к ngrok URL
- ✅ Real-time обновления работают
- ✅ Приложение полностью функционально

### **2. Альтернативные решения:**

#### **Вариант A: Использование ngrok (текущее решение)**
```typescript
// WebSocket подключается к ngrok URL
const ngrokUrl = '3e3f35c1758a.ngrok-free.app';
baseUrl = `${protocol}//${ngrokUrl}`;
```

#### **Вариант B: Переход на другой хостинг**
- **Railway** - поддерживает WebSocket
- **Render** - поддерживает WebSocket  
- **DigitalOcean App Platform** - поддерживает WebSocket
- **Heroku** - поддерживает WebSocket

#### **Вариант C: Использование Vercel Edge Functions**
- Создать Edge Function для WebSocket проксирования
- Более сложная настройка

## 🚀 **Текущая конфигурация:**

### **В разработке:**
- ✅ WebSocket работает: `ws://localhost:8000/ws/client/`
- ✅ Real-time обновления

### **На Vercel:**
- ❌ WebSocket отключен (Vercel не поддерживает)
- ✅ Fallback на polling каждые 60 секунд
- ✅ Приложение работает, но без real-time

### **С ngrok (если настроен):**
- ✅ WebSocket работает: `wss://3e3f35c1758a.ngrok-free.app/ws/client/`
- ✅ Real-time обновления

## 🔧 **Настройка переменных окружения:**

### **1. Создайте файл `.env.local` в frontend:**
```env
# WebSocket URL для продакшена (если используете ngrok)
VITE_WEBSOCKET_URL=3e3f35c1758a.ngrok-free.app

# API URL
VITE_API_BASE_URL=https://3e3f35c1758a.ngrok-free.app
```

### **2. Настройте переменные в Vercel:**
```bash
# В настройках Vercel проекта
VITE_WEBSOCKET_URL=3e3f35c1758a.ngrok-free.app
VITE_API_BASE_URL=https://3e3f35c1758a.ngrok-free.app
```

## 🧪 **Тестирование:**

### **1. На Vercel (без WebSocket):**
```javascript
// В консоли должно быть:
// ❌ WebSocket отключен (Vercel не поддерживает)
// 🔄 Fallback на polling каждые 60 секунд
```

### **2. С ngrok (с WebSocket):**
```javascript
// В консоли должно быть:
// 🔌 Client WebSocket connected
// 📨 Client WebSocket message: {type: "connection_established"}
```

## 🎯 **Рекомендации:**

### **Для продакшена:**
1. **Перейдите на хостинг с поддержкой WebSocket** (Railway, Render, DigitalOcean)
2. **Или используйте ngrok** для WebSocket соединений
3. **Или оставьте как есть** - приложение работает без real-time

### **Для разработки:**
- ✅ Все работает как обычно
- ✅ WebSocket подключен к localhost:8000

## 🚨 **Troubleshooting:**

### **Проблема: WebSocket не работает на Vercel**
**Решение:** Это нормально! Vercel не поддерживает WebSocket. Используйте fallback на polling.

### **Проблема: Хотите real-time обновления**
**Решение:** 
1. Перейдите на Railway/Render/DigitalOcean
2. Или настройте ngrok для WebSocket

### **Проблема: ngrok URL изменился**
**Решение:** Обновите переменную `VITE_WEBSOCKET_URL` в Vercel

## 🎉 **Текущий статус:**

### ✅ **Что работает:**
- 🟢 Приложение загружается на Vercel
- 🟢 API запросы работают
- 🟢 Заказы загружаются
- 🟢 Fallback на polling каждые 60 секунд

### ❌ **Что не работает:**
- 🔴 Real-time обновления (только на Vercel)
- 🔴 Мгновенные уведомления (только на Vercel)

### 🎯 **Итог:**
Приложение **полностью функционально** на Vercel, но без real-time обновлений. Для real-time нужно использовать другой хостинг или ngrok.

**Выберите подходящий вариант для ваших нужд!** 🚀
