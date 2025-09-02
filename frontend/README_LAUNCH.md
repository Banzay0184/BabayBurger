# 🚀 Инструкции по запуску Babay Burger

## 📱 Telegram Bot (Основное приложение)

### Запуск в режиме разработки:
```bash
cd frontend
npm run dev
```

**Открыть в браузере:** `http://localhost:5173`

**Что это:** Основной интерфейс Telegram бота для клиентов

---

## 👨‍💼 Операторский интерфейс

### Запуск в режиме разработки:
```bash
cd frontend
npm run dev:operator
```

**Открыть в браузере:** `http://localhost:5174`

**Что это:** Интерфейс для операторов ресторана (управление заказами)

---

## 🏗️ Сборка для продакшена

### Telegram Bot:
```bash
cd frontend
npm run build
```

### Операторский интерфейс:
```bash
cd frontend
npm run build:operator
```

---

## 🌐 Структура URL

| Интерфейс | URL | Порт | Описание |
|-----------|-----|------|----------|
| **Telegram Bot** | `http://localhost:5173` | 5173 | Клиентский интерфейс |
| **Оператор** | `http://localhost:5174` | 5174 | Управление заказами |

---

## 🔧 Настройка

### Переменные окружения
Создайте файл `.env.local` в папке `frontend`:
```env
VITE_API_BASE_URL=https://your-backend-url.com
```

### Прокси настройки
API запросы автоматически проксируются на backend через Vite.

---

## 📁 Структура файлов

```
frontend/
├── index.html              # Telegram Bot (порт 5173)
├── operator.html           # Операторский интерфейс (порт 5174)
├── src/
│   ├── main.tsx           # Точка входа для Telegram Bot
│   ├── operator-main.tsx  # Точка входа для операторов
│   ├── App.tsx            # Основное приложение Telegram Bot
│   ├── pages/
│   │   ├── AuthPage.tsx   # Авторизация клиентов
│   │   ├── MainPage.tsx   # Главная страница клиентов
│   │   └── operator/      # Операторский интерфейс
│   └── ...
├── vite.config.ts         # Конфигурация для Telegram Bot
└── vite.operator.config.ts # Конфигурация для операторов
```

---

## 🚨 Важно!

- **Telegram Bot** и **Операторский интерфейс** работают **независимо**
- У каждого свой порт и конфигурация
- Можно запускать одновременно в разных терминалах
- Операторский интерфейс НЕ содержит Telegram Web App функциональность

---

## 🐛 Отладка

### Проверка портов:
```bash
# Проверить, какие порты заняты
lsof -i :5173
lsof -i :5174
```

### Логи:
- Telegram Bot: `http://localhost:5173` → консоль браузера
- Оператор: `http://localhost:5174` → консоль браузера

---

## 📱 Тестирование

### Telegram Bot:
1. Запустить: `npm run dev`
2. Открыть: `http://localhost:5173`
3. Имитировать Telegram Web App в браузере

### Операторский интерфейс:
1. Запустить: `npm run dev:operator`
2. Открыть: `http://localhost:5174`
3. Войти как оператор

---

## 🚀 Продакшн

### Telegram Bot:
```bash
npm run build
# Файлы в папке dist/
```

### Операторский интерфейс:
```bash
npm run build:operator
# Файлы в папке dist-operator/
```

### Деплой:
- Скопировать содержимое `dist/` для Telegram Bot
- Скопировать содержимое `dist-operator/` для операторов
