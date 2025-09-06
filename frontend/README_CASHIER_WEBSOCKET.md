# WebSocket для интерфейса кассира

## Обзор

Добавлена поддержка WebSocket для интерфейса кассира, что обеспечивает **реальное время обновления** заказов без необходимости обновления страницы.

## Функциональность

### ✅ Что работает в реальном времени:

1. **Новые заказы** - автоматически появляются в колонке "Готовятся"
2. **Изменения статусов** - заказы перемещаются между колонками автоматически
3. **Обновления статистики** - счетчики обновляются в реальном времени
4. **Статус соединения** - визуальный индикатор подключения

### 🔄 Поток обновлений:

```
Новый заказ → WebSocket → Кассир видит в "Готовятся"
     ↓
Кассир нажимает "Готов" → API → WebSocket → Заказ перемещается в "Доставляется"
     ↓
Кассир нажимает "Отправить на доставку" → API → WebSocket → Заказ перемещается в "Завершенные"
```

## Техническая реализация

### Frontend

#### 1. Хук `useCashierWebSocket`
```typescript
// frontend/src/hooks/useCashierWebSocket.ts
export const useCashierWebSocket = (options: UseCashierWebSocketOptions = {}) => {
  // Подключение к WebSocket
  // Обработка сообщений
  // Автоматическое переподключение
}
```

**Поддерживаемые события:**
- `order_created` - новый заказ
- `order_updated` - обновление заказа
- `order_status_changed` - изменение статуса
- `dashboard_update` - обновление статистики

#### 2. Интеграция в `CashierDashboardPage`
```typescript
// Обработчики WebSocket событий
const handleOrderCreated = useCallback((newOrder: Order) => {
  setOrders(prevOrders => [newOrder, ...prevOrders]);
}, []);

const handleOrderStatusChanged = useCallback((orderId: number, newStatus: string) => {
  setOrders(prevOrders => 
    prevOrders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    )
  );
}, []);
```

#### 3. Визуальный индикатор статуса
```typescript
// Статус WebSocket соединения
<div className="flex items-center space-x-2">
  <div className={`w-3 h-3 rounded-full ${
    isConnected ? 'bg-green-500' : 
    isConnecting ? 'bg-yellow-500' : 'bg-red-500'
  }`}></div>
  <span>{isConnected ? 'Подключено' : 'Отключено'}</span>
</div>
```

### Backend

#### 1. WebSocket Consumer
```python
# backend/app_operator/consumers.py
class CashierConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Подключение к группе кассиров
        self.cashier_id = self.scope['url_route']['kwargs'].get('cashier_id')
        self.cashier_group_name = f'cashier_{self.cashier_id}'
        
    async def order_created(self, event):
        # Отправка нового заказа
        await self.send(text_data=json.dumps({
            'type': 'order_created',
            'order': event['order']
        }))
```

#### 2. Сигналы Django
```python
# backend/app_cashier/signals.py
@receiver(post_save, sender=Order)
def notify_cashiers_order_update(sender, instance, created, **kwargs):
    if created and instance.status == 'pending':
        # Отправка WebSocket уведомления
        async_to_sync(channel_layer.group_send)(
            'cashiers',
            {
                'type': 'order_created',
                'order': order_data
            }
        )
```

#### 3. Роутинг WebSocket
```python
# backend/config/routing.py
websocket_urlpatterns = [
    re_path(r'ws/cashier/$', consumers.CashierConsumer.as_asgi()),
    re_path(r'ws/cashier/(?P<cashier_id>\w+)/$', consumers.CashierConsumer.as_asgi()),
]
```

## URL структура

### WebSocket endpoints:
- `ws://localhost:8000/ws/cashier/` - общая группа кассиров
- `ws://localhost:8000/ws/cashier/{cashier_id}/` - индивидуальный кассир

### HTTP API endpoints:
- `POST /api/cashier/orders/{id}/start_processing/` - начать приготовление
- `POST /api/cashier/orders/{id}/mark_ready/` - отметить готовым
- `POST /api/cashier/orders/{id}/mark_delivering/` - отправить на доставку
- `POST /api/cashier/orders/{id}/complete/` - завершить заказ

## Преимущества

### 🚀 Производительность:
- **Нет polling** - данные обновляются мгновенно
- **Экономия трафика** - только необходимые обновления
- **Меньше нагрузки на сервер** - нет постоянных HTTP запросов

### 👥 UX для кассиров:
- **Мгновенные обновления** - заказы появляются сразу
- **Визуальная обратная связь** - статус соединения
- **Автоматическое переподключение** - стабильная работа

### 🔧 Для разработчиков:
- **Простая интеграция** - один хук для всего
- **Типизация TypeScript** - безопасность типов
- **Логирование** - подробные логи для отладки

## Отладка

### Логи в браузере:
```javascript
// В консоли браузера
📨 Cashier WebSocket message: {type: "order_created", order: {...}}
🆕 New order received via WebSocket: {id: 123, status: "preparing"}
🔄 Order status changed via WebSocket: 123, "on_delivery"
```

### Логи на сервере:
```python
# В логах Django
🔔 Cashier Signal triggered: Order #123, created=True, status=pending
📨 Cashier WebSocket: sending order_created event for order #123
WebSocket уведомление о новом заказе #123 отправлено кассирам
```

## Тестирование

### 1. Создание заказа:
1. Создайте заказ через клиентский интерфейс
2. Заказ должен **мгновенно** появиться в колонке "Готовятся" у кассира

### 2. Изменение статуса:
1. Кассир нажимает "Готов"
2. Заказ должен **мгновенно** переместиться в колонку "Доставляется"

### 3. Статус соединения:
1. Отключите интернет
2. Индикатор должен стать красным "Отключено"
3. Включите интернет
4. Индикатор должен стать зеленым "Подключено"

## Возможные проблемы

### ❌ WebSocket не подключается:
- Проверьте, что бэкенд запущен
- Проверьте URL в `useCashierWebSocket.ts`
- Проверьте CORS настройки

### ❌ Заказы не обновляются:
- Проверьте логи в браузере и на сервере
- Убедитесь, что сигналы подключены в `apps.py`
- Проверьте, что кассир авторизован

### ❌ Медленные обновления:
- Проверьте сеть
- Убедитесь, что WebSocket соединение активно
- Проверьте логи на предмет ошибок

## Заключение

WebSocket для кассиров обеспечивает **полностью асинхронный** интерфейс с обновлениями в реальном времени. Кассиры теперь видят новые заказы мгновенно и могут эффективно управлять процессом приготовления без необходимости обновления страницы.


