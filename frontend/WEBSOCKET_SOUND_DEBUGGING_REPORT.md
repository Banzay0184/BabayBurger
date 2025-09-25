# 🔍 Добавлено детальное логирование для диагностики звуков

## 🎯 Проблема
**"У меня стоит интерфейс оператора открыт я заказываю еду а попадает заказ но звука нету ну когда я нажимаю на кнопку тестовый звук звук есть"**

Тестовый звук работает, но звуки при реальных заказах не воспроизводятся. Это указывает на проблему в интеграции между WebSocket и звуковой системой.

## 🔧 Добавленное логирование

### **1. Детальная информация о сообщениях WebSocket**
```typescript
const handleMessage = useCallback((message: WebSocketMessage) => {
  console.log('📨 Operator WebSocket message:', message);
  console.log('📨 Message type:', message.type);
  console.log('📨 Device info:', { isMobile, isPWA });
  console.log('📨 Sound config:', { enabled: config?.enabled });
  // ...
});
```

### **2. Информация о доступных функциях звука**
```typescript
console.log('🔊 Available sound functions:', {
  playSound: typeof playSound,
  playSoundSafe: typeof playSoundSafe,
  playMobileSoundSafe: typeof playMobileSoundSafe,
  playSimpleMobileSound: typeof playSimpleMobileSound,
  windowPlayMobileSound: typeof (window as any).playMobileSound
});
```

### **3. Настройки звука**
```typescript
console.log('🔊 Sound settings:', {
  newOrderSound: config?.newOrderSound,
  orderUpdateSound: config?.orderUpdateSound,
  notificationSound: config?.notificationSound,
  volume: config?.volume
});
```

### **4. Состояние инициализации**
```typescript
console.log('🔊 Initialization status:', {
  pwaInitialized: localStorage.getItem('pwa_sound_initialized'),
  mobileInitialized: localStorage.getItem('mobile_sound_initialized'),
  mobileSimpleInitialized: localStorage.getItem('mobile_sound_simple_initialized')
});
```

### **5. Состояние AudioContext**
```typescript
console.log('🔊 AudioContext status:', {
  exists: !!window.audioContext,
  state: window.audioContext?.state,
  sampleRate: window.audioContext?.sampleRate
});
```

### **6. Детальное логирование вызовов функций**
```typescript
if (isMobile) {
  console.log('🔊 Using mobile sound system...');
  
  // Пробуем простую мобильную систему сначала
  console.log('🔊 Calling playSimpleMobileSound...');
  try {
    playSimpleMobileSound('new_order');
    console.log('🔊 playSimpleMobileSound called successfully');
  } catch (error) {
    console.error('🔊 playSimpleMobileSound failed:', error);
  }
  
  // Также пробуем сложную систему как fallback
  console.log('🔊 Calling playMobileSoundSafe...');
  try {
    playMobileSoundSafe('new_order');
    console.log('🔊 playMobileSoundSafe called successfully');
  } catch (error) {
    console.error('🔊 playMobileSoundSafe failed:', error);
  }
  
  // Дополнительный fallback к глобальной функции
  if ((window as any).playMobileSound) {
    console.log('🔊 Calling global playMobileSound...');
    try {
      (window as any).playMobileSound('new_order');
      console.log('🔊 Global playMobileSound called successfully');
    } catch (error) {
      console.error('🔊 Global playMobileSound failed:', error);
    }
  } else {
    console.warn('🔊 Global playMobileSound not available');
  }
}
```

### **7. Функция для тестирования из консоли**
```typescript
// Экспортируем функции для отладки
useEffect(() => {
  (window as any).testOperatorSound = (type: 'new_order' | 'order_update' | 'notification' = 'new_order') => {
    console.log('🔊 Testing operator sound:', type);
    console.log('🔊 Device detection:', { isMobile, isPWA });
    console.log('🔊 Sound config:', { enabled: config?.enabled });
    
    if (config?.enabled) {
      if (isMobile) {
        console.log('🔊 Testing mobile sound...');
        if ((window as any).playMobileSound) {
          (window as any).playMobileSound(type);
        } else {
          console.warn('🔊 Global playMobileSound not available');
        }
      } else if (isPWA) {
        console.log('🔊 Testing PWA sound...');
        playSoundSafe(type);
      } else {
        console.log('🔊 Testing desktop sound...');
        playSound(type);
      }
    } else {
      console.log('🔊 Sound disabled');
    }
  };
  
  console.log('🔊 testOperatorSound function exported to window');
}, [isMobile, isPWA, config?.enabled, playSound, playSoundSafe]);
```

## 🧪 Инструкции для диагностики

### **1. Откройте консоль браузера**
- Нажмите F12 или Ctrl+Shift+I
- Перейдите на вкладку Console

### **2. Создайте новый заказ**
- Сделайте заказ через клиентский интерфейс
- Следите за логами в консоли

### **3. Проверьте логи**
Ищите следующие сообщения:
- `📨 Operator WebSocket message:` - сообщение WebSocket получено
- `🆕 New order received:` - новый заказ получен
- `🔊 Attempting to play new order sound...` - попытка воспроизведения звука
- `🔊 Device detection:` - определение типа устройства
- `🔊 Available sound functions:` - доступные функции звука
- `🔊 Sound settings:` - настройки звука
- `🔊 Initialization status:` - состояние инициализации
- `🔊 AudioContext status:` - состояние AudioContext

### **4. Тестирование из консоли**
```javascript
// Тест звука нового заказа
testOperatorSound('new_order');

// Тест звука обновления заказа
testOperatorSound('order_update');

// Тест звука уведомления
testOperatorSound('notification');
```

### **5. Проверка глобальных функций**
```javascript
// Проверка доступности глобальной функции
console.log(typeof window.playMobileSound);

// Прямой вызов глобальной функции
if (window.playMobileSound) {
  window.playMobileSound('new_order');
}
```

## 🔍 Возможные причины проблемы

### **1. WebSocket сообщения не приходят**
- Проверьте логи `📨 Operator WebSocket message:`
- Убедитесь, что WebSocket подключен

### **2. Звуки отключены в настройках**
- Проверьте `🔊 Sound settings:` - `newOrderSound: true`
- Проверьте `🔊 Sound config:` - `enabled: true`

### **3. Система не инициализирована**
- Проверьте `🔊 Initialization status:` - должно быть `true`
- Проверьте `🔊 AudioContext status:` - должно быть `running`

### **4. Функции звука недоступны**
- Проверьте `🔊 Available sound functions:` - все должны быть `function`
- Проверьте `🔊 Global playMobileSound not available`

### **5. Ошибки при вызове функций**
- Проверьте ошибки `🔊 playSimpleMobileSound failed:`
- Проверьте ошибки `🔊 playMobileSoundSafe failed:`
- Проверьте ошибки `🔊 Global playMobileSound failed:`

## 📋 Чек-лист для диагностики

- [ ] WebSocket сообщения приходят (`📨 Operator WebSocket message:`)
- [ ] Новый заказ получен (`🆕 New order received:`)
- [ ] Попытка воспроизведения звука (`🔊 Attempting to play new order sound...`)
- [ ] Определение устройства корректно (`🔊 Device detection:`)
- [ ] Все функции звука доступны (`🔊 Available sound functions:`)
- [ ] Настройки звука корректны (`🔊 Sound settings:`)
- [ ] Система инициализирована (`🔊 Initialization status:`)
- [ ] AudioContext работает (`🔊 AudioContext status:`)
- [ ] Функции вызываются без ошибок
- [ ] Тест из консоли работает (`testOperatorSound('new_order')`)

## 🎯 Следующие шаги

1. **Создайте новый заказ** и проверьте логи в консоли
2. **Найдите проблемную строку** в логах
3. **Поделитесь логами** для дальнейшей диагностики
4. **Используйте функцию тестирования** `testOperatorSound()` для проверки

**Теперь у нас есть полная диагностика звуковой системы! 🔍🎵**
