import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import type { DeliveryAssignment } from '../../types/delivery';

export const AdminDeliveryAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    driver_id: undefined as number | undefined,
    date_from: '',
    date_to: '',
    order_id: '',
    page: 1,
    page_size: 50
  });
  const [pagination, setPagination] = useState({
    count: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false
  });

  // Debounced search effect
  useEffect(() => {
    if (filters.order_id) {
      setSearchLoading(true);
    }
    const timeoutId = setTimeout(() => {
      loadAssignments();
      setSearchLoading(false);
    }, 300); // 300ms delay for search

    return () => clearTimeout(timeoutId);
  }, [filters.order_id]);

  useEffect(() => {
    loadAssignments();
    loadDrivers();
  }, [filters.status, filters.driver_id, filters.date_from, filters.date_to, filters.page]);

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Отправляем фильтры:', filters);
      const response = await adminApi.getDeliveryAssignments(filters);
      console.log('📡 Ответ API:', response);
      
      if (response.data) {
        const data = response.data as any;
        console.log('📊 Данные назначений:', data);
        setAssignments(data.results || data);
        setPagination({
          count: data.count || 0,
          total_pages: data.total_pages || 0,
          has_next: data.has_next || false,
          has_previous: data.has_previous || false
        });
      } else {
        setError(response.error || 'Ошибка загрузки назначений');
      }
    } catch (err) {
      console.error('❌ Ошибка загрузки назначений:', err);
      setError('Ошибка загрузки назначений');
    } finally {
      setLoading(false);
    }
  };

  const loadDrivers = async () => {
    try {
      const response = await adminApi.getDeliveryDrivers();
      if (response.data) {
        const data = response.data as any;
        setDrivers(data.results || data);
      }
    } catch (err) {
      console.error('Ошибка загрузки курьеров:', err);
    }
  };

  const handleFilterChange = (key: string, value: any) => {
    console.log(`🔄 Изменение фильтра ${key}:`, value);
    
    // Обрабатываем пустые значения
    if (value === '' || value === null || value === undefined) {
      value = key === 'driver_id' ? undefined : '';
    }
    
    // Преобразуем driver_id в число, если это не пустая строка
    if (key === 'driver_id' && value !== '' && value !== undefined) {
      value = parseInt(value, 10);
    }
    
    setFilters(prev => {
      const newFilters = { ...prev, [key]: value, page: 1 };
      console.log('📝 Новые фильтры:', newFilters);
      return newFilters;
    });
  };

  const handlePageChange = (newPage: number) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'delivering': return 'bg-blue-100 text-blue-800';
      case 'picked_up': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'assigned': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned': return 'Назначен';
      case 'accepted': return 'Принят';
      case 'picked_up': return 'Забран';
      case 'delivering': return 'Доставляется';
      case 'delivered': return 'Доставлен';
      case 'cancelled': return 'Отменен';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Заголовок - фиксированный */}
      <div className="flex-shrink-0 border-b border-gray-200 px-2 py-1 bg-white">
        <h1 className="text-base font-bold text-gray-900">📦 Назначения доставки</h1>
        <p className="text-xs text-gray-600">Управление назначениями заказов курьерам</p>
      </div>

      {/* Фильтры - фиксированные */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-2 py-1 shadow-sm">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-2 py-1 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-gray-900 flex items-center">
              <span className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-md flex items-center justify-center text-white text-xs mr-1">🔍</span>
              Фильтры
            </h3>
          </div>
          
          <div className="p-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-1">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">🔍 Заказ</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="№ заказа"
                    value={filters.order_id}
                    onChange={(e) => handleFilterChange('order_id', e.target.value)}
                    className="w-full text-black border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white pr-6"
                  />
                  {searchLoading && (
                    <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Статус</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full text-black border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Все</option>
                  <option value="assigned">📋 Назначен</option>
                  <option value="accepted">✅ Принят</option>
                  <option value="picked_up">📦 Забран</option>
                  <option value="delivering">🚚 Доставляется</option>
                  <option value="delivered">🎯 Доставлен</option>
                  <option value="cancelled">❌ Отменен</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">Курьер</label>
                <select
                  value={filters.driver_id}
                  onChange={(e) => handleFilterChange('driver_id', e.target.value)}
                  className="w-full text-black border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                >
                  <option value="">Все</option>
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      🚚 {driver.user_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">От</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => handleFilterChange('date_from', e.target.value)}
                  className="w-full text-black border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-0.5">До</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => handleFilterChange('date_to', e.target.value)}
                  className="w-full text-black border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* Список назначений - с прокруткой */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 bg-gray-50">
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      ) : (
        <>
          {/* Десктопная таблица - скрыта на мобильных */}
          <div className="hidden lg:block bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      📦 Заказ
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      🚚 Курьер
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      👤 Клиент
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      📊 Статус
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      💰 Сумма
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      ⏱️ Время
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                      🧾 Чек
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-blue-50 transition-colors">
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-xs font-semibold text-gray-900">
                          #{assignment.order_id}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatDate(assignment.assigned_at)}
                        </div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-xs text-gray-900 font-medium">{assignment.driver_name}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-xs text-gray-900 font-medium">{assignment.customer_name}</div>
                        <div className="text-xs text-gray-500">{assignment.customer_phone}</div>
                        <div className="text-xs text-gray-500 max-w-xs truncate">{assignment.address}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                          {getStatusText(assignment.status)}
                        </span>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-xs text-gray-900 font-semibold">
                          {assignment.total_price.toLocaleString()} сум
                        </div>
                        <div className="text-xs text-gray-500">{assignment.payment_method}</div>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="text-xs text-gray-900 font-medium">
                          {assignment.delivery_time || 'Не завершено'}
                        </div>
                        {assignment.delivered_at && (
                          <div className="text-xs text-gray-500">
                            {formatDate(assignment.delivered_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {assignment.receipt_photo_url ? (
                          <div className="flex items-center space-x-1">
                            <img 
                              src={assignment.receipt_photo_url} 
                              alt="Чек" 
                              className="w-8 h-8 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                              onClick={() => window.open(assignment.receipt_photo_url, '_blank')}
                              title="Нажмите для открытия в полном размере"
                            />
                            <span className="text-xs text-green-600 font-medium">✓</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Мобильные карточки - показаны только на мобильных */}
          <div className="lg:hidden space-y-1">
            {assignments.map((assignment) => (
              <div key={assignment.id} className="bg-white rounded-lg border shadow-sm p-2">
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1">
                    <div className="flex items-center space-x-1.5 mb-0.5">
                      <span className="text-sm font-bold text-gray-900">#{assignment.order_id}</span>
                      <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                        {getStatusText(assignment.status)}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatDate(assignment.assigned_at)}
                    </div>
                  </div>
                  {assignment.receipt_photo_url && (
                    <img 
                      src={assignment.receipt_photo_url} 
                      alt="Чек" 
                      className="w-6 h-6 object-cover rounded border cursor-pointer hover:opacity-80 transition-opacity"
                      onClick={() => window.open(assignment.receipt_photo_url, '_blank')}
                      title="Нажмите для открытия в полном размере"
                    />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-gray-500">🚚</span>
                    <span className="text-xs text-gray-900 font-medium">{assignment.driver_name}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-gray-500">👤</span>
                    <div>
                      <div className="text-xs text-gray-900 font-medium">{assignment.customer_name}</div>
                      <div className="text-xs text-gray-500">{assignment.customer_phone}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start space-x-1.5">
                    <span className="text-xs text-gray-500 mt-0.5">📍</span>
                    <div className="text-xs text-gray-500 flex-1">{assignment.address}</div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs text-gray-500">💰</span>
                      <div>
                        <div className="text-xs text-gray-900 font-semibold">
                          {assignment.total_price.toLocaleString()} сум
                        </div>
                        <div className="text-xs text-gray-500">{assignment.payment_method}</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-xs text-gray-500">⏱️</div>
                      <div className="text-xs text-gray-900 font-medium">
                        {assignment.delivery_time || 'Не завершено'}
                      </div>
                      {assignment.delivered_at && (
                        <div className="text-xs text-gray-500">
                          {formatDate(assignment.delivered_at)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            </div>

        </>
      )}

        {assignments.length === 0 && !loading && !error && (
          <div className="bg-white rounded-lg border shadow-sm p-6 text-center">
            <div className="text-2xl mb-2">📦</div>
            <h3 className="text-sm font-medium text-gray-900 mb-1">Назначения не найдены</h3>
            <p className="text-xs text-gray-600">Попробуйте изменить фильтры поиска</p>
          </div>
        )}
      </div>

      {/* Пагинация - видимая */}
      {pagination.total_pages > 1 && (
        <div className="flex-shrink-0 bg-white border-t border-gray-200 px-2 py-2 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600">
              {pagination.count > 0 ? (
                <>Показано {((filters.page - 1) * filters.page_size) + 1} - {Math.min(filters.page * filters.page_size, pagination.count)} из {pagination.count}</>
              ) : (
                <>Назначения не найдены</>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(filters.page - 1)}
                disabled={!pagination.has_previous}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm"
              >
                ← Назад
              </button>
              <span className="px-3 py-1.5 text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-md font-medium">
                {filters.page} из {pagination.total_pages}
              </span>
              <button
                onClick={() => handlePageChange(filters.page + 1)}
                disabled={!pagination.has_next}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed bg-white shadow-sm"
              >
                Вперед →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDeliveryAssignmentsPage;
