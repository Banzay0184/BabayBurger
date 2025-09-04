# 🔄 Руководство по перезапуску сервера

## ⚠️ Важно! После изменений в бэкенде нужно перезапустить сервер

### 🐛 Проблема:
После внесения изменений в код бэкенда (особенно в модели, сериализаторы, views), изменения не применяются автоматически. Нужно перезапустить Django сервер.

### ✅ Решение:

#### 1. **Остановить текущий сервер**
```bash
# Нажмите Ctrl+C в терминале где запущен Django
```

#### 2. **Перезапустить сервер**
```bash
cd backend
python manage.py runserver
```

#### 3. **Или использовать скрипт перезапуска**
```bash
cd backend
./restart_django.sh
```

### 🔧 Что было исправлено:

#### **1. Добавлен payment_method в создание заказа:**
```python
# backend/api/views.py - OrderCreateView
order = Order.objects.create(
    # ... другие поля ...
    payment_method=request.data.get('payment_method', 'cash')  # ← ДОБАВЛЕНО
)
```

#### **2. Добавлен payment_method в сериализаторы:**
```python
# backend/api/serializers.py - OrderSerializer
fields = [
    # ... другие поля ...
    'payment_method',  # ← ДОБАВЛЕНО
    # ... остальные поля ...
]

# backend/api/serializers.py - OrderCreateSerializer  
fields = [
    # ... другие поля ...
    'payment_method',  # ← ДОБАВЛЕНО
    # ... остальные поля ...
]
```

#### **3. Добавлен payment_method в старый API:**
```python
# backend/api/views.py - OrderView
order_info = {
    # ... другие поля ...
    'payment_method': order.payment_method,  # ← ДОБАВЛЕНО
    # ... остальные поля ...
}
```

### 🎯 Результат после перезапуска:

#### **JSON ответ заказа теперь будет включать:**
```json
{
  "id": 61,
  "user": 5,
  "restaurant": null,
  "items": [...],
  "total_price": "108000.00",
  "status": "pending",
  "service_type": "delivery",
  "payment_method": "cash",  // ← ТЕПЕРЬ ЕСТЬ!
  "address": 28,
  "phone": "+998904150184",
  "created_at": "2025-09-03T22:00:43.900233+05:00",
  "delivery_fee": "0.00",
  "discount_amount": "0.00",
  "final_price": "108000.00",
  "notes": "",
  "promo_code": null,
  "promotion": {...}
}
```

### 🚀 Проверка работы:

#### **1. Создайте новый заказ**
- Выберите тип оплаты "Наличными"
- Оформите заказ

#### **2. Проверьте JSON ответ**
- В консоли браузера должен появиться `payment_method: "cash"`

#### **3. Проверьте интерфейсы**
- **Операторский интерфейс**: `http://localhost:5173/operator`
- **Кассирский интерфейс**: `http://localhost:5173/cashier`
- Должен отображаться тип оплаты с иконкой

### 📝 Команды для быстрого перезапуска:

```bash
# Остановить сервер
Ctrl+C

# Перезапустить
cd backend && python manage.py runserver

# Или одной командой
cd backend && ./restart_django.sh
```

### ⚡ Автоматический перезапуск:

Если у вас есть скрипт `restart_django.sh`:
```bash
cd backend
chmod +x restart_django.sh
./restart_django.sh
```

Теперь после перезапуска сервера `payment_method` будет корректно сохраняться и отображаться! 🎉
