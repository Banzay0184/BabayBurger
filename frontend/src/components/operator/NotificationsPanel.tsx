import React, { useState } from 'react';
import type { OperatorNotification } from '../../types/operator';

interface NotificationsPanelProps {
  notifications: OperatorNotification[];
  onClose: () => void;
  onMarkAsRead: (notificationId: number) => Promise<void>;
}

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({
  notifications,
  onClose,
  onMarkAsRead
}) => {
  const [isLoading, setIsLoading] = useState<number | null>(null);

  // Обработка отметки уведомления как прочитанного
  const handleMarkAsRead = async (notificationId: number) => {
    try {
      setIsLoading(notificationId);
      await onMarkAsRead(notificationId);
    } catch (error) {
      console.error('Ошибка отметки уведомления:', error);
    } finally {
      setIsLoading(null);
    }
  };

  // Получение иконки типа уведомления
  const getNotificationIcon = (type: string): string => {
    switch (type) {
      case 'new_order': return '🆕';
      case 'order_assigned': return '👤';
      case 'order_confirmed': return '✅';
      case 'order_cancelled': return '❌';
      case 'order_completed': return '🎉';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  // Получение цвета типа уведомления
  const getNotificationColor = (type: string): string => {
    switch (type) {
      case 'new_order': return 'border-l-yellow-500';
      case 'order_assigned': return 'border-l-blue-500';
      case 'order_confirmed': return 'border-l-green-500';
      case 'order_cancelled': return 'border-l-red-500';
      case 'order_completed': return 'border-l-blue-600';
      case 'system': return 'border-l-gray-500';
      default: return 'border-l-blue-500';
    }
  };

  // Получение текста типа уведомления
  const getNotificationTypeText = (type: string): string => {
    switch (type) {
      case 'new_order': return 'Новый заказ';
      case 'order_assigned': return 'Заказ назначен';
      case 'order_confirmed': return 'Заказ подтвержден';
      case 'order_cancelled': return 'Заказ отменен';
      case 'order_completed': return 'Заказ завершен';
      case 'system': return 'Система';
      default: return 'Уведомление';
    }
  };

  // Форматирование даты
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return 'Только что';
    } else if (diffInHours < 24) {
      return `${diffInHours} ч. назад`;
    } else {
      return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  // Группировка уведомлений по типу
  const groupedNotifications = notifications.reduce((groups, notification) => {
    const type = notification.notification_type;
    if (!groups[type]) {
      groups[type] = [];
    }
    groups[type].push(notification);
    return groups;
  }, {} as Record<string, OperatorNotification[]>);

  // Сортировка уведомлений по времени (новые сначала)
  const sortedNotifications = Object.entries(groupedNotifications).map(([type, notifs]) => ({
    type,
    notifications: notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  }));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Заголовок */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">🔔</span>
            <h2 className="text-xl font-semibold text-white">Уведомления</h2>
            {notifications.filter(n => !n.is_read).length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {notifications.filter(n => !n.is_read).length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl transition-colors"
          >
            ×
          </button>
        </div>

        {/* Содержимое */}
        <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
          {notifications.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🔕</div>
              <p className="text-gray-400 text-lg">Нет уведомлений</p>
              <p className="text-gray-500 text-sm">Новые уведомления появятся здесь</p>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {sortedNotifications.map(({ type, notifications: typeNotifications }) => (
                <div key={type} className="space-y-3">
                  {/* Заголовок группы */}
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">{getNotificationIcon(type)}</span>
                    <h3 className="text-gray-300 font-medium">
                      {getNotificationTypeText(type)}
                    </h3>
                    <span className="text-gray-500 text-sm">
                      ({typeNotifications.length})
                    </span>
                  </div>

                  {/* Уведомления группы */}
                  <div className="space-y-3">
                    {typeNotifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`bg-gray-700 rounded-lg p-4 border-l-4 ${getNotificationColor(type)} ${
                          !notification.is_read ? 'ring-2 ring-blue-500/30' : ''
                        }`}
                      >
                        {/* Заголовок уведомления */}
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="text-white font-medium">{notification.title}</h4>
                          <div className="flex items-center space-x-2">
                            {!notification.is_read && (
                              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                Новое
                              </span>
                            )}
                            <span className="text-gray-400 text-xs">
                              {formatDate(notification.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Сообщение */}
                        <p className="text-gray-300 text-sm mb-3">
                          {notification.message}
                        </p>

                        {/* Действия */}
                        <div className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            {notification.order && (
                              <span className="text-blue-400 text-sm">
                                Заказ #{notification.order}
                              </span>
                            )}
                          </div>
                          
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              disabled={isLoading === notification.id}
                              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
                            >
                              {isLoading === notification.id ? '...' : 'Отметить прочитанным'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Нижняя панель */}
        <div className="p-6 border-t border-gray-700 bg-gray-800">
          <div className="flex justify-between items-center">
            <div className="text-gray-400 text-sm">
              Всего: {notifications.length} • 
              Непрочитанных: {notifications.filter(n => !n.is_read).length}
            </div>
            
            <div className="flex space-x-2">
              {notifications.filter(n => !n.is_read).length > 0 && (
                <button
                  onClick={() => {
                    // Отметить все как прочитанные
                    notifications
                      .filter(n => !n.is_read)
                      .forEach(n => handleMarkAsRead(n.id));
                  }}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
                >
                  Отметить все прочитанными
                </button>
              )}
              
              <button
                onClick={onClose}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
