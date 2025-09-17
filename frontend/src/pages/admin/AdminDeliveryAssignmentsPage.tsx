import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api/adminApi';
import type { DeliveryAssignment } from '../../types/delivery';

export const AdminDeliveryAssignmentsPage: React.FC = () => {
  const [assignments, setAssignments] = useState<DeliveryAssignment[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    driver_id: undefined as number | undefined,
    date_from: '',
    date_to: '',
    page: 1,
    page_size: 20
  });
  const [pagination, setPagination] = useState({
    count: 0,
    total_pages: 0,
    has_next: false,
    has_previous: false
  });

  useEffect(() => {
    loadAssignments();
    loadDrivers();
  }, [filters]);

  const loadAssignments = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await adminApi.getDeliveryAssignments(filters);
      if (response.data) {
        const data = response.data as any;
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
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
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
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">📦 Назначения доставки</h1>
        <p className="text-gray-600 mt-1">Управление назначениями заказов курьерам</p>
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-lg border shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Все статусы</option>
              <option value="assigned">Назначен</option>
              <option value="accepted">Принят</option>
              <option value="picked_up">Забран</option>
              <option value="delivering">Доставляется</option>
              <option value="delivered">Доставлен</option>
              <option value="cancelled">Отменен</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Курьер</label>
            <select
              value={filters.driver_id}
              onChange={(e) => handleFilterChange('driver_id', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Все курьеры</option>
              {drivers.map((driver) => (
                <option key={driver.id} value={driver.id}>
                  {driver.user_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата от</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Дата до</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => handleFilterChange('date_to', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">На странице</label>
            <select
              value={filters.page_size}
              onChange={(e) => handleFilterChange('page_size', parseInt(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>
      </div>

      {/* Список назначений */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600">{error}</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Заказ
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Курьер
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Клиент
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Статус
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Сумма
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Время доставки
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Чек
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {assignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          #{assignment.order_id}
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatDate(assignment.assigned_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{assignment.driver_name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{assignment.customer_name}</div>
                        <div className="text-sm text-gray-500">{assignment.customer_phone}</div>
                        <div className="text-sm text-gray-500 max-w-xs truncate">{assignment.address}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(assignment.status)}`}>
                          {getStatusText(assignment.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {assignment.total_price.toLocaleString()} сум
                        </div>
                        <div className="text-sm text-gray-500">{assignment.payment_method}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {assignment.delivery_time || 'Не завершено'}
                        </div>
                        {assignment.delivered_at && (
                          <div className="text-sm text-gray-500">
                            {formatDate(assignment.delivered_at)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {assignment.receipt_photo_url ? (
                          <div className="flex items-center space-x-2">
                            <img 
                              src={assignment.receipt_photo_url} 
                              alt="Чек" 
                              className="w-12 h-12 object-cover rounded border"
                            />
                            <span className="text-xs text-green-600 font-medium">✓ Чек</span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">Нет чека</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Пагинация */}
          {pagination.total_pages > 1 && (
            <div className="bg-white rounded-lg border shadow-sm p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">
                  Показано {((filters.page - 1) * filters.page_size) + 1} - {Math.min(filters.page * filters.page_size, pagination.count)} из {pagination.count} назначений
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(filters.page - 1)}
                    disabled={!pagination.has_previous}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Назад
                  </button>
                  <span className="px-3 py-1 text-sm text-gray-700">
                    Страница {filters.page} из {pagination.total_pages}
                  </span>
                  <button
                    onClick={() => handlePageChange(filters.page + 1)}
                    disabled={!pagination.has_next}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Вперед
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {assignments.length === 0 && !loading && !error && (
        <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
          <div className="text-4xl mb-4">📦</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Назначения не найдены</h3>
          <p className="text-gray-600">Попробуйте изменить фильтры поиска</p>
        </div>
      )}
    </div>
  );
};

export default AdminDeliveryAssignmentsPage;
