import React, { useEffect } from 'react';
import { useSoundNotifications } from './SoundNotificationManager';

// Компонент для тестирования звуковых уведомлений
export const SoundTestComponent: React.FC = () => {
  const { playSound, testSound, config } = useSoundNotifications();

  useEffect(() => {
    // Тестируем звук при загрузке компонента
    console.log('🔊 SoundTestComponent: Testing sound system...');
    console.log('🔊 SoundTestComponent: Config:', config);
    
    // Тестируем через 1 секунду после загрузки
    const timer = setTimeout(() => {
      console.log('🔊 SoundTestComponent: Playing test sound...');
      testSound();
    }, 1000);

    return () => clearTimeout(timer);
  }, [testSound, config]);

  const handleTestNewOrder = () => {
    console.log('🔊 Testing new order sound...');
    playSound('new_order');
  };

  const handleTestOrderUpdate = () => {
    console.log('🔊 Testing order update sound...');
    playSound('order_update');
  };

  const handleTestNotification = () => {
    console.log('🔊 Testing notification sound...');
    playSound('notification');
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4 mb-4">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
        <span className="mr-2">🧪</span>
        Тест звуковых уведомлений
      </h3>
      
      <div className="space-y-3">
        <div className="text-sm text-gray-300">
          <p><strong>Статус:</strong> {config.enabled ? '✅ Включено' : '❌ Выключено'}</p>
          <p><strong>Громкость:</strong> {Math.round(config.volume * 100)}%</p>
          <p><strong>Новые заказы:</strong> {config.newOrderSound ? '✅' : '❌'}</p>
          <p><strong>Обновления:</strong> {config.orderUpdateSound ? '✅' : '❌'}</p>
          <p><strong>Уведомления:</strong> {config.notificationSound ? '✅' : '❌'}</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleTestNewOrder}
            className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            🆕 Тест нового заказа
          </button>
          
          <button
            onClick={handleTestOrderUpdate}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            🔄 Тест обновления
          </button>
          
          <button
            onClick={handleTestNotification}
            className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            🔔 Тест уведомления
          </button>
          
          <button
            onClick={testSound}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            🔊 Общий тест
          </button>
        </div>
        
        <div className="text-xs text-gray-400">
          <p>Откройте консоль браузера (F12) для просмотра логов</p>
        </div>
      </div>
    </div>
  );
};
