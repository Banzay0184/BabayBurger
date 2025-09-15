import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';

interface Order {
  id: number;
  user: {
    first_name: string;
    username?: string;
  };
  status: string;
  service_type: string;
  total_price: number;
  final_price: number;
  delivery_fee: number;
  created_at: string;
  address?: {
    full_address: string;
  };
  restaurant?: {
    name: string;
    city: string;
  };
}

const statusLabels: { [key: string]: string } = {
  'pending': '⏳ Ожидает',
  'new': '🆕 Новый',
  'assigned': '👤 Назначен',
  'confirmed': '✅ Подтвержден',
  'preparing': '👨‍🍳 Готовится',
  'ready_for_delivery': '📦 Готов к доставке',
  'in_transit': '🚚 В пути',
  'delivering': '🚚 Доставляется',
  'completed': '✅ Выполнен',
  'cancelled': '❌ Отменен',
  'rejected': '❌ Отклонен',
};

const serviceTypeLabels: { [key: string]: string } = {
  'delivery': '🚚 Доставка',
  'pickup': '🏪 Самовывоз',
};

export const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    service_type: '',
    search: '',
  });

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getOrders(filters);
      
      if (response.error) {
        setError(response.error);
      } else if (response.data) {
        setOrders(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      setError('Ошибка загрузки заказов');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: number, newStatus: string) => {
    try {
      const response = await adminApi.changeOrderStatus(orderId, newStatus);
      if (response.success) {
        fetchOrders(); // Обновляем список
      } else {
        setError(response.error || 'Ошибка изменения статуса');
      }
    } catch (err) {
      setError('Ошибка изменения статуса');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-600">Загрузка заказов...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">📋 Управление заказами</h1>
        <p className="text-gray-600 mt-1">Просмотр и управление всеми заказами</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Ошибка</div>
          <div className="text-red-600">{error}</div>
        </div>
      )}

      {/* Фильтры */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Фильтры</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Все статусы</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Тип услуги</label>
            <select
              value={filters.service_type}
              onChange={(e) => setFilters({ ...filters, service_type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Все типы</option>
              {Object.entries(serviceTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Поиск</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Поиск по клиенту, адресу..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Список заказов */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Заказы ({orders.length})
          </h3>
        </div>
        
        {orders.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => (
              <div key={order.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="text-lg font-semibold text-gray-900">
                        Заказ #{order.id}
                      </div>
                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                        order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        order.status === 'cancelled' || order.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        order.status === 'preparing' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {statusLabels[order.status] || order.status}
                      </div>
                      <div className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs">
                        {serviceTypeLabels[order.service_type] || order.service_type}
                      </div>
                    </div>
                    
                    <div className="mt-2 text-sm text-gray-600">
                      <div>👤 Клиент: {order.user.first_name} {order.user.username && `(@${order.user.username})`}</div>
                      {order.address && (
                        <div>📍 Адрес: {order.address.full_address}</div>
                      )}
                      {order.restaurant && (
                        <div>🏪 Ресторан: {order.restaurant.name} ({order.restaurant.city})</div>
                      )}
                      <div>💰 Сумма: {order.final_price.toLocaleString()} ₽ {order.delivery_fee > 0 && `(+ ${order.delivery_fee.toLocaleString()} ₽ доставка)`}</div>
                      <div>📅 Дата: {new Date(order.created_at).toLocaleString('ru-RU')}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            Заказы не найдены
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminOrdersPage;
