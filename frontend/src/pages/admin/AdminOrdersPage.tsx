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
      console.log('🔄 Загружаем заказы с фильтрами:', filters);
      const response = await adminApi.getOrders(filters);
      
      console.log('📊 Ответ заказов:', response);
      
      if (response.error) {
        console.error('❌ Ошибка загрузки заказов:', response.error);
        setError(response.error);
      } else if (response.data) {
        // API возвращает {count: X, results: [...]}, нужно извлечь results
        const ordersData = Array.isArray((response.data as any)?.results) ? (response.data as any).results : [];
        setOrders(ordersData);
        console.log('✅ Заказы загружены:', ordersData);
      }
    } catch (err) {
      console.error('💥 Исключение при загрузке заказов:', err);
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
        <div className="text-lg text-black">Загрузка заказов...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Заголовок */}
      <div className="text-center pb-4 lg:pb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl lg:rounded-2xl mb-3 lg:mb-4 shadow-lg">
          <span className="text-2xl lg:text-3xl text-white">📋</span>
        </div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Управление заказами</h1>
        <p className="text-black text-base lg:text-lg">Просмотр и управление всеми заказами</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800 font-medium">Ошибка</div>
          <div className="text-red-600">{error}</div>
        </div>
      )}

      {/* Фильтры */}
      <div className="bg-white rounded-xl lg:rounded-2xl border border-gray-200/50 shadow-lg p-4 lg:p-6">
        <h3 className="text-lg lg:text-xl font-bold text-gray-900 mb-4 lg:mb-6 flex items-center">
          <span className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md lg:rounded-lg flex items-center justify-center text-white text-xs lg:text-sm mr-2 lg:mr-3">🔍</span>
          Фильтры
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <div>
            <label className="block text-sm lg:text-base font-semibold text-gray-700 mb-2 lg:mb-3">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 lg:px-6 py-2 lg:py-3 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-sm lg:text-base"
            >
              <option value="">Все статусы</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm lg:text-base font-semibold text-gray-700 mb-2 lg:mb-3">Тип услуги</label>
            <select
              value={filters.service_type}
              onChange={(e) => setFilters({ ...filters, service_type: e.target.value })}
              className="w-full px-4 lg:px-6 py-2 lg:py-3 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-sm lg:text-base"
            >
              <option value="">Все типы</option>
              {Object.entries(serviceTypeLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm lg:text-base font-semibold text-gray-700 mb-2 lg:mb-3">Поиск</label>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Поиск по клиенту, адресу..."
              className="w-full px-4 lg:px-6 py-2 lg:py-3 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm text-sm lg:text-base"
            />
          </div>
        </div>
      </div>

      {/* Список заказов */}
      <div className="bg-white rounded-xl lg:rounded-2xl border border-gray-200/50 shadow-lg overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h3 className="text-lg lg:text-xl font-bold text-gray-900 flex items-center">
            <span className="w-6 h-6 lg:w-8 lg:h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-md lg:rounded-lg flex items-center justify-center text-white text-xs lg:text-sm mr-2 lg:mr-3">📋</span>
            Заказы ({orders.length})
          </h3>
        </div>
        
        {orders.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {orders.map((order) => (
              <div key={order.id} className="p-4 lg:p-6 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 transition-all duration-200">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                      <div className="text-lg lg:text-xl font-bold text-gray-900">
                        Заказ #{order.id}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800 border border-green-200' :
                          order.status === 'cancelled' || order.status === 'rejected' ? 'bg-red-100 text-red-800 border border-red-200' :
                          order.status === 'preparing' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                          'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {statusLabels[order.status] || order.status}
                        </div>
                        <div className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-bold border border-gray-200">
                          {serviceTypeLabels[order.service_type] || order.service_type}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                      <div className="bg-gray-50 rounded-lg lg:rounded-xl p-3 lg:p-4">
                        <div className="font-semibold text-gray-700 mb-2 text-xs lg:text-sm">👤 Клиент</div>
                        <div className="text-gray-600 text-sm lg:text-base">{order.user.first_name} {order.user.username && `(@${order.user.username})`}</div>
                      </div>
                      {order.address && (
                        <div className="bg-gray-50 rounded-lg lg:rounded-xl p-3 lg:p-4">
                          <div className="font-semibold text-gray-700 mb-2 text-xs lg:text-sm">📍 Адрес</div>
                          <div className="text-gray-600 text-sm lg:text-base">{order.address.full_address}</div>
                        </div>
                      )}
                      {order.restaurant && (
                        <div className="bg-gray-50 rounded-lg lg:rounded-xl p-3 lg:p-4">
                          <div className="font-semibold text-gray-700 mb-2 text-xs lg:text-sm">🏪 Ресторан</div>
                          <div className="text-gray-600 text-sm lg:text-base">{order.restaurant.name} ({order.restaurant.city})</div>
                        </div>
                      )}
                      <div className="bg-gray-50 rounded-lg lg:rounded-xl p-3 lg:p-4">
                        <div className="font-semibold text-gray-700 mb-2 text-xs lg:text-sm">💰 Сумма</div>
                        <div className="text-gray-600 text-sm lg:text-base">{order.final_price.toLocaleString()} ₽ {order.delivery_fee > 0 && `(+ ${order.delivery_fee.toLocaleString()} ₽ доставка)`}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg lg:rounded-xl p-3 lg:p-4">
                        <div className="font-semibold text-gray-700 mb-2 text-xs lg:text-sm">📅 Дата</div>
                        <div className="text-gray-600 text-sm lg:text-base">{new Date(order.created_at).toLocaleString('ru-RU')}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end lg:justify-start">
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value)}
                      className="px-4 lg:px-6 py-2 lg:py-3 border-2 border-gray-200 rounded-lg lg:rounded-xl text-sm lg:text-base font-semibold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 bg-white/80 backdrop-blur-sm min-w-0 w-full lg:w-auto"
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
