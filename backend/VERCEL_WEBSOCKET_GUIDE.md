# 🚀 Vercel + ngrok WebSocket Configuration Guide

## 🏗️ **Архитектура:**
- **Vercel** - фронтенд (статический хостинг)
- **ngrok** - бэкенд + WebSocket (Django + WebSocket)

## ✅ **Решение:**

### **1. WebSocket через ngrok**
- ✅ WebSocket подключается к ngrok URL
- ✅ Real-time обновления работают
- ✅ Приложение полностью функционально

### **2. Конфигурация:**

#### **Текущая архитектура (рекомендуется):**
```typescript
// WebSocket подключается к ngrok URL
const ngrokUrl = '3e3f35c1758a.ngrok-free.app';
baseUrl = `${protocol}//${ngrokUrl}`;
```

#### **Альтернативные решения:**
- **Railway** - фронтенд + бэкенд + WebSocket
- **Render** - фронтенд + бэкенд + WebSocket  
- **DigitalOcean App Platform** - фронтенд + бэкенд + WebSocket
- **Heroku** - фронтенд + бэкенд + WebSocket

## 🚀 **Текущая конфигурация:**

### **В разработке:**
- ✅ WebSocket работает: `ws://localhost:8000/ws/client/`
- ✅ Real-time обновления

### **В продакшене (Vercel + ngrok):**
- ✅ WebSocket работает: `wss://3e3f35c1758a.ngrok-free.app/ws/client/`
- ✅ Real-time обновления
- ✅ Полная функциональность

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

### **1. В разработке:**
```javascript
// В консоли должно быть:
// 🔌 Client WebSocket connected
// 📨 Client WebSocket message: {type: "connection_established"}
```

### **2. В продакшене (Vercel + ngrok):**
```javascript
// В консоли должно быть:
// 🔌 Client WebSocket connected
// 📨 Client WebSocket message: {type: "connection_established"}
```

## 🎯 **Рекомендации:**

### **Для продакшена:**
1. **Текущая архитектура (рекомендуется):** Vercel + ngrok
2. **Альтернатива:** Перейти на хостинг с поддержкой WebSocket (Railway, Render, DigitalOcean)

### **Для разработки:**
- ✅ Все работает как обычно
- ✅ WebSocket подключен к localhost:8000

## 🚨 **Troubleshooting:**

### **Проблема: WebSocket не подключается**
**Решение:** 
1. Проверьте, что ngrok запущен: `ngrok http 8000`
2. Обновите переменную `VITE_WEBSOCKET_URL` в Vercel
3. Проверьте, что Django сервер запущен

### **Проблема: ngrok URL изменился**
**Решение:** Обновите переменную `VITE_WEBSOCKET_URL` в Vercel

### **Проблема: WebSocket подключается, но нет обновлений**
**Решение:** 
1. Проверьте логи Django сервера
2. Проверьте, что WebSocket consumer работает
3. Проверьте, что сигналы Django отправляют сообщения

## 🎉 **Текущий статус:**

### ✅ **Что работает:**
- 🟢 Приложение загружается на Vercel
- 🟢 API запросы работают через ngrok
- 🟢 WebSocket соединения работают через ngrok
- 🟢 Real-time обновления работают
- 🟢 Мгновенные уведомления работают

### 🎯 **Итог:**
Приложение **полностью функционально** с real-time обновлениями через архитектуру Vercel + ngrok!

**Идеальная настройка для продакшена!** 🚀
